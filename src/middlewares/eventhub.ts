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
import * as https from 'https';
import * as crypto from 'crypto';
import * as EventHub from 'azure-event-hubs';
/**
 * Sends the incoming message received by the bot to Azure Event Hub
 */
/*export default function factory(): BotBuilder.IMiddlewareMap {
    console.log('entro');
  if (!process.env.EVENTHUB_NAMESPACE) {
    logger.warn('Eventhub Middleware is disabled. EVENTHUB_NAMESPACE env var needed');
    return {
      // To avoid botbuilder console.warn trace!! WTF
      botbuilder: (session: BotBuilder.Session, next: Function) => next()
    };
  }

  return {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
      sendEventHub('hola'); // best-effort, no callback
      next();
    }
  } as BotBuilder.IMiddlewareMap;
}*/
/*
function sendEventHub(payload: any) {
    // Event Hubs parameters
    //let namespace = process.env.EVENTHUB_NAMESPACE; // ex. 'yothub-ns' yot-dev-eventhub
    let namespace = 'yot-dev-eventhub';
    //let hubname = process.env.EVENTHUB_HUBNAME; // ex. 'yot' yot-dev-eu-eventhub
    let hubname = 'yot-dev-eu-eventhub';
    //let publisher = process.env.EVENTHUB_PUBLISHER; //prueba3
    let publisher = 'prueba3';

    // Shared access key (from Event Hub configuration)
    //let eventHubKeyName = process.env.EVENTHUB_KEYNAME; // ex. 'send'
    //let eventHubKey = process.env.EVENTHUB_KEY; // ex. 'key'; RwtKlxIXAjk7ujsMBO7SAiPgpVaVwMSBEkcbWVkvGrA=
    let eventHubKeyName='RootManageSharedAccessKey';
    let eventHubKey='FmywnwLXKQr5YsFlsGRkXiynBeh36sZlIFjKKLFvong=';
    let eventHubPulbisherUri = `https://${namespace}.servicebus.windows.net/${hubname}/publishers/${publisher}/messages`;
    console.log(eventHubPulbisherUri);
    console.log('Creando token')
    // See http://msdn.microsoft.com/library/azure/dn170477.aspx
    function createTokenSAS(uri: string, keyName: string, key: string) {
        let oneDayExpiry = Math.floor(new Date().getTime() / 1000 + 3600 * 24);
        let string_to_sign = encodeURIComponent(uri) + '\n' + oneDayExpiry;
        let hmac = crypto.createHmac('sha256', key).update(string_to_sign);
        let signature = hmac.digest('base64');
        let token = 'SharedAccessSignature sr=' + encodeURIComponent(uri) +
                    '&sig=' + encodeURIComponent(signature) + '&se=' + oneDayExpiry + '&skn=' + keyName;
        return token;
    }
    let sas = createTokenSAS(eventHubPulbisherUri, eventHubKeyName, eventHubKey);
    console.log(sas);
    // Send the request to the Event Hub
    let options = {
        hostname: namespace + '.servicebus.windows.net',
        port: 443,
        path: '/' + hubname + '/publishers/' + publisher + '/messages',
        method: 'POST',
        headers: {
            'Authorization': sas,
            'Content-Length': payload.length,
            'Content-Type': 'application/atom+xml;type=entry;charset=utf-8'
        }
    };
    console.log('haciendo petición')
    let req = https.request(options, (res: any) => {
        logger.info('Azure Event Hub statusCode', res.statusCode);
        logger.info('Azure Event Hub headers', res.headers);
        let mydata: any = [];
        res.on('data', (data: any) => {
            mydata.push(data);
        });

        res.on('end', () => {
            logger.info('Azure Event Hub response', Buffer.concat(mydata));
        });
    });

    req.on('error', (err: any) => {
        logger.error(err, 'Error sending request to Azure Event Hub');
    });

    req.write(payload);
    req.end();
}

sendEventHub('{\"Temperature\": \"37.0\"}');
*/
let Eventhub = EventHub.Client;
let client = Eventhub.fromConnectionString('Endpoint=sb://yot-dev-eventhub.servicebus.windows.net/;'+
                                            'SharedAccessKeyName=RootManageSharedAccessKey;'+
                                            'SharedAccessKey=FmywnwLXKQr5YsFlsGRkXiynBeh36sZlIFjKKLFvong=', 'yot-dev-eu-eventhub');
function sendEventHub(payload: any): void {
    client.open()
        .then(() => {
            return client.createSender('0'); //Partition should be between 0 and 1
        })
        .then((sender) => {
            sender.on('errorReceived', (err) => { logger.error(err, 'Error sending request to Azure Event Hub'); });
            sender.send(payload);
            console.log('ya envio');
        });
}

sendEventHub({ msg: 'Here is some text sent to partition 0.'});