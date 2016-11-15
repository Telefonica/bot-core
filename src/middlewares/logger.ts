import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

/**
 * Logs the incoming message received by the bot from the BotFramework
 */
export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        logger.info(session.sessionState, 'Session');
        next();
    },
    receive: (event: BotBuilder.IEvent, next: Function) => {
        logger.info(event, 'Message IN');
        next();
    },
    send: (event: BotBuilder.IEvent, next: Function) => {
        logger.info(event, 'Message OUT');
        next();
    }
} as BotBuilder.IMiddlewareMap;
