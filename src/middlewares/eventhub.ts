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

let namespace = process.env.EVENTHUB_NAMESPACE;
let accessKeyName = process.env.EVENTHUB_KEYNAME;
let accessKey = process.env.EVENTHUB_KEY;
let hubname = process.env.EVENTHUB_HUBNAME;

let msg = process.argv[1];

export default function factory(): BotBuilder.IMiddlewareMap {
    if(!process.env.EVENTHUB_NAMESPACE) {
        logger.warn('Eventhub Middleware is disable. EVENTHUB_NAMESPACE env var needed');
        return {
            botbuilder: (session: BotBuilder.Session, next: Function) => next()
        }
    }
    return {
        botbuilder: (session: BotBuilder.Session, next: Function) => {
            sendEventHub(msg);
            next();
        }
    } as BotBuilder.IMiddlewareMap;
}

function sendEventHub(payload: any): void {
    let Eventhub = EventHub.Client;
    let client = Eventhub.fromConnectionString(`Endpoint=sb://${namespace}.servicebus.windows.net/;SharedAccessKeyName=${accessKeyName};SharedAccessKey=${accessKey}`, hubname);
    client.open()
        .then(() => {
            return client.createSender('0'); //Partition should be between 0 and 1
        })
        .then((sender) => {
            sender.on('errorReceived', (err) => { logger.error(err, 'Error sending request to Azure Event Hub'); });
            sender.send(payload);
        });
}
