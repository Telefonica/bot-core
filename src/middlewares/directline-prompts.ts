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

import * as BotBuilder from 'botbuilder';
import { Channel } from '../botbuilder-ext';
import * as logger from 'logops';

/**
 * Look for outgoing messages whose channel is DirectLine and carry some attachment whose contentType
 * is 'application/vnd.microsoft.keyboard' and move them to the channelData.
 * This is needed because the Bot Framework breaks attachments of such a contentType over the DirectLine channel.
 */
export default {
    send: (event: BotBuilder.IEvent, next: Function) => {
        if (event.type === 'message') {
            let message = <BotBuilder.IMessage>event;

            let channelId = Channel.getChannelId(message);
            if (channelId === Channel.channels.directline) {
                if (message.attachments && message.attachments.length) {
                    // Pick the attachment with contentType 'application/vnd.microsoft.keyboard'
                    let choicesIndex = message.attachments
                        .findIndex(attachment => attachment.contentType === 'application/vnd.microsoft.keyboard');
                    logger.debug('Found attachment of type Keyboard on index %d', choicesIndex);
                    if (choicesIndex !== -1) {
                        // Move the attachment containing the choices to the channelData
                        let choices = message.attachments.splice(choicesIndex, 1);
                        message.sourceEvent = message.sourceEvent || {};
                        message.sourceEvent.choices = choices[0];
                        logger.info('Keyboard moved from attachments to channelData');
                    }
                }
            }
        }
        next();
    }
} as BotBuilder.IMiddlewareMap;
