import * as BotBuilder from 'botbuilder';

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        // XXX This is a PoC
        if (session.message.text) {
            session.message.text = session.message.text.replace(/wtih/g, 'with');
            session.message.text = session.message.text.replace(/wehn/g, 'when');
        }

        next();
    }
} as BotBuilder.IMiddlewareMap;
