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
import * as needle from 'needle';
import Therror from 'therror';

import { ObjectStorageFactory } from '@telefonica/object-storage';
import { BingSpeechClient, VoiceRecognitionResponse } from 'bingspeech-api-client';

const SUPPORTED_CONTENT_TYPES = ['audio/vnd.wave', 'audio/wav', 'audio/wave', 'audio/x-wav'];

export default function factory(): BotBuilder.IMiddlewareMap {
    if (!process.env.MICROSOFT_BING_SPEECH_KEY || !process.env.AZURE_STORAGE_ACCOUNT || !process.env.AZURE_STORAGE_ACCESS_KEY) {
        logger.warn(`Audio Middleware is disabled. No MICROSOFT_BING_SPEECH_KEY, AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_ACCESS_KEY env vars`);

        return {
            // To avoid botbuilder console.warn trace!! WTF
            botbuilder: (session: BotBuilder.Session, next: Function) => next()
        };
    }

  const storage = ObjectStorageFactory.get('azure');
  const bingSpeechClient = new BingSpeechClient(process.env.MICROSOFT_BING_SPEECH_KEY);

  const ENABLE_AUDIO_OUTPUT = process.env.ENABLE_AUDIO_OUTPUT === 'true';

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

          if (ENABLE_AUDIO_OUTPUT) {
              // XXX Hook onSend to be able to access the session (see https://github.com/Microsoft/BotBuilder/issues/2030)
              //     This is tricky because session.options.onSend is not in the typings, MS could break this anytime.
              let sessionOptions = (<any>session).options || {};
              let _onSend = sessionOptions.onSend;
              if (_onSend) {
                  sessionOptions.onSend = (messages: BotBuilder.IMessage[], done: Function) => {
                      let promises = messages.map(message => attachAudio(message));
                      Promise.all(promises)
                            .then(() => _onSend(messages, done))
                            .catch(() => _onSend(messages, done));
                  };
              } else {
                  logger.warn('Attribute session.options.onSend not found. You might be using a wrong botbuilder version');
              }
          } else {
              logger.
          }

          let isValidAudioAttachment = SUPPORTED_CONTENT_TYPES.indexOf(attachment.contentType) >= 0;

          if (!isValidAudioAttachment) {
              logger.warn(`Audio format not supported ${attachment.contentType}`);
              session.send('Sorry, I do not understand your audio message');
              return next(new Therror(`Audio format not supported ${attachment.contentType}`));
          }

          let contentUrl = attachment.contentUrl;
          let voiceRecognitionResult: VoiceRecognitionResponse;

          remoteAttachmentStream(contentUrl)
              .then(stream => bingSpeechClient.recognizeStream(stream))
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
        }
    } as BotBuilder.IMiddlewareMap;

    /**
     * Synthesizes the text in a message (if present) and adds the result as an audio attachment to the user.
     * @param message
     * @return {Promise<void>} A promise resolved when the audio attachment is complete.
     */
    function attachAudio(message: BotBuilder.IMessage): Promise<void> {
        if (!message.text) {
            return Promise.resolve();
        }

        return bingSpeechClient.synthesizeStream(message.text)
            .then(stream => {
                logger.debug('Bing Speech synthesize succeeded');
                return storage.upload(stream);
            })
            .then(url => {
                logger.info({url: url}, 'Audio response uploaded');
                message.attachments = message.attachments || [];
                message.attachments.push({
                    contentType: 'audio/wave',
                    contentUrl: url
                });
            })
            .catch(err => {
                // XXX attach a default error audio message?
                logger.error(err, 'Audio middleware: voice synthesis failed');
            });
    }
}

/**
 * @param {string} url - Remote resource location
 * @return {Promise<NodeJS.ReadWriteStream>} A Buffer with the remote resource contents
 */
function remoteAttachmentStream(url: string): Promise<NodeJS.ReadWriteStream> {
    const MAX_SIZE = parseInt(process.env.MAX_SIZE_ATTACHMENT, 10) || 10485760;

    let promise = Promise.resolve();

    if (MAX_SIZE > 0) {
        promise.then(() => validateAttachmentSize(url, MAX_SIZE));
    }

    return promise.then(() => {
        let options = {
            open_timeout: 4000
        };

        return needle.get(url, options);
    });
}

/**
 * @param {string} url - Remote resource location
 * @param {number} maxSize - Max size of the remote resource
 * @return {Promise<void>} A promise resolved when the validation finishes
 */
function validateAttachmentSize(url: string, maxSize: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let options = {
            open_timeout: 4000
        };

        needle.head(url, options, (err, headResult) => {
            if (err) {
                return reject(new Error(`Not able to valdate the content length of the attachment: ${err.message}`));
            }

            let size = headResult && headResult.headers['content-length'];

            if (parseInt(size, 10) > maxSize) {
                logger.info(`Resource size exceeds limit (${size})`);
                return reject(new Error(`Resource size exceeds limit (${size})`));
            }

            resolve();
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
