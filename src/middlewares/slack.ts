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
