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
const IncomingWebhooks = require('@slack/client').IncomingWebhook;

export default function factory(): BotBuilder.IMiddlewareMap {
  if (!process.env.SLACK_WEBHOOK_URL) {
    logger.warn('Slack Middleware is disabled. SLACK_WEBHOOK_URL env var needed');
    return {
      // To avoid botbuilder console.warn trace!! WTF
      botbuilder: (session: BotBuilder.Session, next: Function) => next()
    };
  }

  let webhook = new IncomingWebhooks(process.env.SLACK_WEBHOOK_URL);

  return {
    /**
     * Notify Slack (fire and forget) about unrecognized utterances
     */
    send: (event: BotBuilder.IEvent, next: Function) => {
      if (event.sourceEvent.intent === 'None') {
        let debugInfo = {
          id: event.address.user.id,
          name: event.address.user.name,
          conversation: event.address.conversation.id
        };

        webhook.send({
          text: `Not able to classify: ${event.sourceEvent.text} ${JSON.stringify(debugInfo)}`,
          channel: process.env.SLACK_CHANNEL || 'bot-classify',
          username: process.env.BOT_NAME || 'bot'
        });
      }

      next();
    }
  } as BotBuilder.IMiddlewareMap;
}

