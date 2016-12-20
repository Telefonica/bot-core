/**
* @license
* Copyright 2016 Telefónica I+D
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import * as fs from 'fs';

import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';
import * as request from 'request';
import Therror from 'therror';

import { ObjectStorageFactory } from '@telefonica/object-storage';
import { BingSpeechClient, VoiceRecognitionResponse } from 'bingspeech-api-client';

const streamifier = require('streamifier');

export default function factory(): BotBuilder.IMiddlewareMap {
  if (!process.env.MICROSOFT_BING_SPEECH_KEY || !process.env.AZURE_STORAGE_ACCOUNT || !process.env.AZURE_STORAGE_ACCESS_KEY) {
    logger.warn('Audio Middleware is disabled. MICROSOFT_BING_SPEECH_KEY, AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_ACCESS_KEY env vars needed');
    return {
      // To avoid botbuilder console.warn trace!! WTF
      botbuilder: (session: BotBuilder.Session, next: Function) => next()
    };
  }

  const storage = ObjectStorageFactory.get('azure');

  const bingSpeechClient = new BingSpeechClient(process.env.MICROSOFT_BING_SPEECH_KEY);

  const SUPPORTED_CONTENT_TYPES = ['audio/vnd.wave', 'audio/wav', 'audio/wave', 'audio/x-wav'];
  return {
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
      let audioOutputEnabled = process.env.ENABLE_AUDIO_OUTPUT === 'true';

      //
      // TODO determine whether the client sent an audio attachment (input) and supports audio (output).
      //      it is not so easy because we don't have the Session here.
      //

      if (!audioOutputEnabled || !event.text) {
        return next();
      }

      bingSpeechClient.synthesize(event.text)
        .then(response => {
            logger.debug('Bing Speech synthesize succeeded');
            return storage.upload(streamifier.createReadStream(response.wave));
        })
        .then(url => {
            logger.info({url: url}, 'Audio response uploaded');
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
}

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
            timeout: 2000
        }, (err, headResult) => {
            let size = headResult && headResult.headers['content-length'];

            if (parseInt(size, 10) > MAX_SIZE) {
                logger.info(`Resource size exceeds limit (${size})`);
                return reject(new Error(`Resource size exceeds limit (${size})`));
            }

            let data: any = [];
            size = 0;

            let res = request({ url, timeout: 5000 });
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
