import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        resolveLocale(session)
            .then((locale) => setSessionLocale(session, locale))
            .then(() => next())
            .catch((err) => next(err));
    }
} as BotBuilder.IMiddlewareMap;

function setSessionLocale(session: BotBuilder.Session, locale: string): Promise<void> {
    return new Promise((resolve, reject) => {
        session.preferredLocale(locale, (err) => {
            if (err) {
                logger.error(err, 'Not able to set preferred locale');
                return reject(err);
            }

            // Save the locale as part of userData because a fallback value might be needed in future messages
            session.userData.preferredLocale = locale;

            logger.info({preferredLocale: session.preferredLocale(), textLocale: session.message.textLocale}, 'Language detector');
            return resolve();
        });
    });
}

function resolveLocale(session: BotBuilder.Session): Promise<string> {
    let locale = detectClientLocale(session.message);
    if (locale) {
        return Promise.resolve(locale);
    }

    locale = session.userData.preferredLocale || process.env.BOT_DEFAULT_LOCALE || 'en-us';
    return Promise.resolve(locale);
}

function detectClientLocale(message: BotBuilder.IMessage): string {
    if (message.source === 'directline') { // XXX use Channel.directline in the next botbuilder release
        let channelData = message.sourceEvent;
        if (channelData && channelData.headers && channelData.headers['Accept-Language']) {
            let code = channelData.headers['Accept-Language'];
            let normalizedCode = String(code).replace('_', '-').toLowerCase(); // en_US -> en-us
            return normalizedCode;
        }
    }

    return null;
}
