import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        // TODO
        logger.info({textLocale: session.message.textLocale, textFormat: session.message.textFormat});
        next();
    }
} as BotBuilder.IMiddlewareMap;
