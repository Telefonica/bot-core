import * as logger from 'logops';
import * as BotBuilder from 'botbuilder';

export class Context {
    private static getContext(session: BotBuilder.Session): any {
        session.privateConversationData.context = session.privateConversationData.context || {};
        return session.privateConversationData.context;
    }

    public static set<T>(session: BotBuilder.Session, key: string, value: T, timeout?: number): void {
        let context = Context.getContext(session);
        if (timeout) {
            let timeName = key + '_timeout';
            context[timeName] = Date.now() + timeout;
        }
        context[key] = value;
    }

    public static get<T>(session: BotBuilder.Session, key: string): T {
        let context = Context.getContext(session);
        let timeName = key + '_timeout';
        if (context[timeName] && context[timeName] < Date.now()) {
            context[timeName] = null;
            context[key] = null;
        }
        return <T>context[key];
    }
}
