import * as fs from 'fs';

import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';
import * as request from 'request';
import Therror from 'therror';

import { ObjectStorage } from '@telefonica/object-storage';

const streamifier = require('streamifier');
const storage = new ObjectStorage();

import { BingSpeechClient, VoiceRecognitionResponse } from 'bingspeech-api-client';

if (!process.env.MICROSOFT_BING_SPEECH_KEY) {
    logger.warn('No MICROSOFT_BING_SPEECH_KEY');
}

const bingSpeechClient = new BingSpeechClient(process.env.MICROSOFT_BING_SPEECH_KEY);

const SUPPORTED_CONTENT_TYPES = ['audio/vnd.wave', 'audio/wav', 'audio/wave', 'audio/x-wav'];
export default {
    receive: (event: BotBuilder.IEvent, next: Function) => {
        // TODO This is a HACK that replaces the user.id with the conversation.id
        //      We need this because it's not possible to set the user id in a directline upload (ex. audio file).
        //      That causes every incoming message to start a different dialog.
        //      We must remove this hack once Microsoft fixes this issue.
        logger.debug(`Replace user id ${event.address.user.id} with conversation id ${event.address.conversation.id}`);
        event.address.user.id = event.address.conversation.id;
        event.user.id = event.address.conversation.id;

        next();
    },
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        let hasAttachment = session.message.type === 'message' &&
                            session.message &&
                            session.message.attachments &&
                            session.message.attachments.length > 0;

        if (!hasAttachment) {
            return next();
        }

        let attachment = session.message.attachments[0]; // XXX support multiple attachments

        let isAudio = attachment.contentType.startsWith('audio/');
        if (!isAudio) {
            return next();
        }

        let isValidAudioAttachment = SUPPORTED_CONTENT_TYPES.indexOf(attachment.contentType) >= 0;

        if (!isValidAudioAttachment) {
            logger.warn(`Audio format not supported ${attachment.contentType}`);
            session.send('Sorry, I do not understand your audio message');
            return next(new Therror(`Audio format not supported ${attachment.contentType}`));
        }

        let contentUrl = attachment.contentUrl;
        let voiceRecognitionResult: VoiceRecognitionResponse;

        downloadRemoteResource(contentUrl)
            .then(buffer => bingSpeechClient.recognize(buffer))
            .then(voiceResult => {
                logger.info({bingspeech: voiceResult}, 'Bing Speech transcoding succeeded');
                voiceRecognitionResult = voiceResult;
                return evaluateVoiceResponse(voiceResult);
            })
            .then(valid => {
                if (valid) {
                    session.message.text = voiceRecognitionResult.header.lexical;
                }
            })
            .then(() => next())
            .catch(err => {
                logger.warn(err, 'Audio middleware: Bing Speech transcoding failed');
                next(err);
            });
    },
    send: (event: BotBuilder.IMessage, next: Function) => {
        let audioOutputEnabled = process.env.ENABLE_AUDIO_OUTPUT === "true";

        //
        // TODO determine whether the client sent an audio attachment (input) and supports audio (output).
        //      it is not so easy because we don't have the Session here.
        //

        if (!audioOutputEnabled || !event.text) {
            return next();
        }

        bingSpeechClient.synthesize(event.text)
            .then(response => storage.upload(streamifier.createReadStream(response.wave)))
            .then(url => {
                event.attachments = event.attachments || [];
                event.attachments.push({
                    contentType: 'audio/wave',
                    contentUrl: url
                });
            })
            .then(() => next())
            .catch(err => {
                logger.warn(err, 'Audio middleware: voice synthesis failed');
                next(err);
            });
    }
} as BotBuilder.IMiddlewareMap;

/**
 * TODO this won't scale. Avoid the need of loading a resource in memory.
 * XXX could be moved to a common 'utils'.
 *
 * @param {string} url - Remote resource location
 * @return {Promise<Buffer>} A Buffer with the remote resource contents
 */
function downloadRemoteResource(url: string): Promise<Buffer> {
    const MAX_SIZE = 10485760;

    return new Promise<Buffer>((resolve, reject) => {
        request({
            url: url,
            method: 'HEAD',
            timeout: 5000
        }, (err, headResult) => {
            let size = headResult && headResult.headers['content-length'];

            if (parseInt(size, 10) > MAX_SIZE) {
                logger.info(`Resource size exceeds limit (${size})`);
                return reject(new Error(`Resource size exceeds limit (${size})`));
            }

            let data: any = [];
            size = 0;

            let res = request({ url, timeout: 10000 });
            res.on('data', chunk => {
                data.push(chunk);
                size += data.length;

                if (size > MAX_SIZE) {
                    logger.info(`Resource stream exceeded limit (${size})`);
                    res.abort(); // Abort the response (close and cleanup the stream)
                }
            });

            res.on('end', () => resolve(Buffer.concat(data)));
            res.on('error', (err) => reject(err));
        });
    });
}

/**
 * @param {VoiceRecognitionResponse} voiceResult - Bing Speech API voice recognition
 * @return {Promise<boolean>} Flag indicating whether the voice recognition is good enough.
 */
function evaluateVoiceResponse(voiceResult: VoiceRecognitionResponse): Promise<boolean> {
    let goodAnswer = voiceResult.header.status === 'success' &&
                     (voiceResult.header.properties.HIGHCONF === '1' || voiceResult.header.properties.MIDCONF === '1');

    return Promise.resolve(goodAnswer);
}
