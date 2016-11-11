import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';
import * as https from 'https';
import * as crypto from 'crypto';

/**
 * Sends the incoming message received by the bot to Azure Event Hub
 */
export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        if (process.env.EVENTHUB_NAMESPACE) {
           sendEventHub(session.message); // best-effort, no callback
        }
        next();
    }
} as BotBuilder.IMiddlewareMap;

function sendEventHub(payload: any) {
    // Event Hubs parameters
    let namespace = process.env.EVENTHUB_NAMESPACE; // ex. 'yothub-ns'
    let hubname = process.env.EVENTHUB_HUBNAME; // ex. 'yot'
    let publisher = process.env.EVENTHUNB_PUBLISHER;

    // Shared access key (from Event Hub configuration)
    let eventHubKeyName = process.env.EVENTHUB_KEYNAME; // ex. 'send'
    let eventHubKey = process.env.EVENTHUB_KEY; // ex. 'key';

    let eventHubPulbisherUri = 'https://' + namespace + '.servicebus.windows.net' + '/' + hubname + '/publishers/' + publisher + '/messages';

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

    let req = https.request(options, (res: any) => {
        logger.info('Azure Event Hub statusCode', res.statusCode);
        logger.debug('Azure Event Hub headers', res.headers);
        let mydata: any = [];
        res.on('data', (data: any) => {
            mydata.push(data);
        });

        res.on('end', () => {
            logger.debug('Azure Event Hub response', Buffer.concat(mydata));
        });
    });

    req.on('error', (err: any) => {
        logger.error(err, 'Error sending request to Azure Event Hub');
    });

    req.write(payload);
    req.end();
}
