import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

const cld = require('cld');

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

const MIN_CLASSIFIABLE_SENTENCE_LENGTH = 5;

function resolveLocale(session: BotBuilder.Session): Promise<string> {
    const defaultLocale = session.userData.preferredLocale || process.env.BOT_DEFAULT_LOCALE || 'en-us';

    return new Promise((resolve, reject) => {
        let text = session.message.text;

        // XXX CLD is not very reliable for short words. This algorithm can be improved (ex. use a dictionary)
        if (text.length < MIN_CLASSIFIABLE_SENTENCE_LENGTH) {
            return resolve(defaultLocale);
        }

        cld.detect(text, {}, (err: any, result: any) => {
            if (err) {
                logger.info(err, 'Not able to determine message language');
                return resolve(defaultLocale);
            }

            logger.info(result, 'Language detection (CLD)');
            if (!result.reliable) {
                return resolve(defaultLocale);
            }

            let code = result.languages[0].code;

            // XXX improve this matching algorithm
            let locale = defaultLocale;
            switch (code) {
                case 'es':
                    locale = 'es-es';
                    break;
                case 'en':
                    locale = 'en-us';
                    break;
            }

            return resolve(locale);
        });
    });
}
