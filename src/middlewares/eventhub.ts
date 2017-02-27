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
import * as EventHub from 'azure-event-hubs';

const namespace = process.env.EVENTHUB_NAMESPACE;
const hubname = process.env.EVENTHUB_HUBNAME;
const accessKeyName = process.env.EVENTHUB_KEYNAME;
const accessKey = process.env.EVENTHUB_KEY;

export default function factory(): BotBuilder.IMiddlewareMap {
    if (!process.env.EVENTHUB_NAMESPACE || !process.env.EVENTHUB_HUBNAME) {
        logger.warn('Eventhub Middleware is disabled. EVENTHUB_NAMESPACE, EVENTHUB_HUBNAME env vars needed');
        return {
            botbuilder: (session: BotBuilder.Session, next: Function) => next()
        };
    }

    let connectionString = `Endpoint=sb://${namespace}.servicebus.windows.net/` +
                           `;SharedAccessKeyName=${accessKeyName};SharedAccessKey=${accessKey}`;
    let client = EventHub.Client.fromConnectionString(connectionString, hubname);
    let eventHubSender: EventHub.Sender;
    client.open()
          .then(() => {return client.createSender();})
          .then((sender) => {
              eventHubSender = sender;
              logger.debug('Azure Event Hub sender initialized');
              sender.on('errorReceived', (err: any) => {
                  logger.error(err, 'Error sending request to Azure Event Hub');
              });
              return eventHubSender;
          })
          .catch((err) => {
              logger.error('ERROR: ',err);
            }
        );
    return {
        botbuilder: (session: BotBuilder.Session, next: Function) => {
            sendEventHub(session.message);
            next();
        }
    } as BotBuilder.IMiddlewareMap;

    function sendEventHub(payload: any): void {
        if (eventHubSender) {
            eventHubSender.send(payload);
            logger.debug('Sent message');
        } else {
            logger.warn('Azure Event Hub sender still not initialized');
        }
    }
}


