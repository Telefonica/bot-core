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
const accessKeyName = process.env.EVENTHUB_KEYNAME;
const accessKey = process.env.EVENTHUB_KEY;
const hubname = process.env.EVENTHUB_HUBNAME;

export default function factory(): BotBuilder.IMiddlewareMap {
    if (!process.env.EVENTHUB_NAMESPACE) {
        logger.warn('Eventhub Middleware is disabled. EVENTHUB_NAMESPACE env var needed');
        return {
            botbuilder: (session: BotBuilder.Session, next: Function) => next()
        };
    }

    let connectionString = `Endpoint=sb://${namespace}.servicebus.windows.net/;SharedAccessKeyName=${accessKeyName};SharedAccessKey=${accessKey}`;
    let client = EventHub.Client.fromConnectionString(connectionString, hubname);

    // XXX partition shouldn't be needed
    let partition = '0';
    let sender = client.open().then(() => client.createSender(partition));
    sender.on('errorReceived', (err: any) => { logger.error(err, 'Error sending request to Azure Event Hub'); });

    function sendEventHub(payload: any): void {
        // XXX we should verify that the sender is open and ready to send messages at this point 
        sender.send(payload);
    }

    return {
        botbuilder: (session: BotBuilder.Session, next: Function) => {
            sendEventHub(session.message);
            next();
        }
    } as BotBuilder.IMiddlewareMap;
}


