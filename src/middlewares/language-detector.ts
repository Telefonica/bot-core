import * as BotBuilder from 'botbuilder';

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        // TODO
        next();
    }
} as BotBuilder.IMiddlewareMap;
