import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

export default function factory(supportedLanguages: string[]): BotBuilder.IMiddlewareMap {
    return {
        botbuilder: (session: BotBuilder.Session, next: Function) => {
            resolveLocale(session, supportedLanguages)
                .then((locale) => setSessionLocale(session, locale))
                .then(() => next())
                .catch((err) => next(err));
        }
    } as BotBuilder.IMiddlewareMap;
}

function resolveLocale(session: BotBuilder.Session, supportedLanguages: string[]): Promise<string> {
    let locale = detectClientLocale(session.message);
    if (locale && supportedLanguages.indexOf(locale) >= 0) {
        return Promise.resolve(locale);
    }

    // Defaults to a locale following this rules:
    //   1. Locale stored in the session (it is also available as the property 'BotBuilder.Data.PreferredLocale'
    //      inside the userData storage).
    //   2. preferredLocale from the userData storage which is set by the lookup-user module which knows about
    //      the user context.
    //   3. The default bot locale.
    //   4. en-us.
    // XXX: We should review 1. and 2. to homogenize places where locales are stored.
    locale = session.preferredLocale() || session.userData.preferredLocale || process.env.BOT_DEFAULT_LOCALE || 'en-us';
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
