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
import * as logger from 'logops';

/**
 * Notify Slack about not recognized utterances
 */
export default {
    send: (event: BotBuilder.IEvent, next: Function) => {
        if (process.env.SLACK_WEBHOOK_URL) {
            if (event.sourceEvent.intent === 'None') {
                notifySlack(event.sourceEvent.text, process.env.SLACK_WEBHOOK_URL);
            }
        }

        next();
    }
} as BotBuilder.IMiddlewareMap;

/**
 * Fire and forget slack notification.
 */
function notifySlack(text: string, webhookUrl: string) {
    var IncomingWebhooks = require('@slack/client').IncomingWebhook;

    let webhook = new IncomingWebhooks(webhookUrl);
    webhook.send({
        text: `Not able to classify: ${text}`,
        channel: process.env.SLACK_CHANNEL || 'bot-classify',
        username: process.env.BOT_NAME || 'bot'
    });
}
