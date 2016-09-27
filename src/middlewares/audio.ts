import * as fs from 'fs';

import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';
import * as request from 'request';
import Therror from 'therror';

import { BingSpeechClient, VoiceRecognitionResponse } from 'bingspeech-api-client';

const bingSpeechClient = new BingSpeechClient(process.env.MICROSOFT_BING_SPEECH_KEY);

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        let hasAttachment = session.message.type === 'message' &&
                            session.message &&
                            session.message.attachments &&
                            session.message.attachments.length > 0;

        if (hasAttachment) {
            let attachment = session.message.attachments[0];
            let isValidAudioAttachment = attachment.contentType.startsWith('audio');

            if (isValidAudioAttachment) {
                let voiceRecognitionResult: VoiceRecognitionResponse;
                let contentUrl = attachment.contentUrl;

                getRemoteResource(contentUrl)
                    .then(buffer => bingSpeechClient.voiceRecognition(buffer))
                    .then(voiceResult => {
                        voiceRecognitionResult = voiceResult;
                        return evaluateVoiceResponse(voiceResult);
                    })
                    .then(valid => {
                        if (valid) {
                            session.message.text = voiceRecognitionResult.header.lexical;
                            next();
                        } else {
                            session.send('Sorry, I do not understand your audio message');
                            next(new Therror('Bad audio message quality'));
                        }
                    })
                    .catch(err => {
                        logger.warn(err, 'Bing Speech transcoding failed');
                        session.send('Sorry, I do not understand your audio message');
                        next(new Therror(err, 'Bing Speech transcoding failed'));
                    });
            }
        }
    }
} as BotBuilder.IMiddlewareMap;

/**
 * TODO this won't scale. Avoid the need of loading a resource in memory.
 *
 * @param {string} url - Remote resource location
 * @return {Promise<Buffer>} A Buffer with the remote resource contents
 */
function getRemoteResource(url: string): Promise<Buffer> {
    const MAX_SIZE = 10485760;

    return new Promise<Buffer>((resolve, reject) => {
        request({
            url: url,
            method: 'HEAD'
        }, (err, headResult) => {
            let size = headResult && headResult.headers['content-length'];

            if (parseInt(size, 10) > MAX_SIZE) {
                logger.info(`Resource size exceeds limit (${size})`);
                return reject(new Error(`Resource size exceeds limit (${size})`));
            }

            let data: any = [];
            size = 0;

            let res = request({ url });
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
    logger.info({bingspeech: voiceResult}, 'Bing Speech transcoding succeeded');

    let goodAnswer = voiceResult.header.status === 'success' &&
                     (voiceResult.header.properties.HIGHCONF === '1' || voiceResult.header.properties.MIDCONF === '1');

    return Promise.resolve(goodAnswer);
}
