import * as BotBuilder from 'botbuilder';

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        if (/^\/log on/i.test(session.message.text)) {
            session.userData.isLogging = true;
            session.send('Logging is now turned on');
        } else if (/^\/log off/i.test(session.message.text)) {
            session.userData.isLogging = false;
            session.send('Logging is now turned off');
        } else {
            if (session.userData.isLogging) {
                session.send(JSON.stringify(session.message));
            }
            next();
        }
    }
} as BotBuilder.IMiddlewareMap;
