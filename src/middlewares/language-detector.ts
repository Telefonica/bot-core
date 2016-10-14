import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        // TODO
        // session.preferredLocale('en-us');
        logger.info({preferredLocale: session.preferredLocale(), textLocale: session.message.textLocale}, 'Language detector');
        next();
    }
} as BotBuilder.IMiddlewareMap;
