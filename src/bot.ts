import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

import { LanguageDetector, Logger, ServerLogger, Normalizer, Audio, Slack } from './middlewares';
import { PluginLoader } from './loader';

export interface BotSettings extends BotBuilder.IUniversalBotSettings {
    models: BotBuilder.ILuisModelMap;
    plugins: string[];
}

export class Bot extends BotBuilder.UniversalBot {
    private loader: PluginLoader;

    constructor(settings: BotSettings) {
        super(null, settings);

        this.loader = new PluginLoader(settings.plugins);

        // the one and only dialog our bot will have
        this.dialog('/', this.createIntentDialog());

        // middlewares
        this.use(BotBuilder.Middleware.dialogVersion({
            version: 1.0,
            message: 'Conversation restarted by a main update',
            resetCommand: /^reset/i
        }));

        this.use(Audio);
        this.use(ServerLogger);
        this.use(Normalizer);
        this.use(LanguageDetector);
        this.use(Logger);
        this.use(Slack);

        this.endConversationAction(
            'cancel',
            'Good. I\'m here if you need something else',
            { matches: /(^cancel$)|(^nevermind$)/i }
        );
    }

    private createIntentDialog(): BotBuilder.IntentDialog {
        let luisRecognizers = this.initializeLanguageRecognizers();

        let intentDialog = new BotBuilder.IntentDialog({
            recognizers: luisRecognizers
        });

        let libraries = this.loader.getLibraries();
        libraries.forEach(library => this.library(library));

        intentDialog.onDefault((session: BotBuilder.Session, args: any, next: Function) => {
            logger.debug('Find library for intent [%s]', args.intent);

            let dialogName: string;
            if (args.intent !== 'None') {
                dialogName = this.findDialog(args.intent, libraries);
            }

            if (dialogName) {
                logger.debug({ args }, 'Starting library dialog [%s]', dialogName);
                session.beginDialog(dialogName, args);
            } else {
                logger.warn({ intent: args.intent }, 'Unhandled intent');
                let msg = createkUnhandledMessageResponse(session, args);
                session.endDialog(msg);
            }
        });

        return intentDialog;
    }

    private findDialog(intent: string, libraries: BotBuilder.Library[]): string {
        let dialogName: string;

        libraries.some(library => {
            if (this.library('*').findDialog(library.name, intent)) {
                dialogName = `${library.name}:${intent}`;
            }
            return !!dialogName;
        });

        return dialogName;
    }

    private initializeLanguageRecognizers(): BotBuilder.IIntentRecognizer[] {
        let modelMap = this.get('models') as BotBuilder.ILuisModelMap;

        if (!modelMap) {
            logger.error('No LUIS models defined');
            return [];
        }

        return Object.keys(modelMap).map(key => {
            let model = modelMap[key];
            if (!model) {
                logger.error('LUIS model %s is undefined. Skip.', key);
                return;
            }

            logger.info('Load LUIS model %s', key);
            return new BotBuilder.LuisRecognizer(modelMap[key]);
        }).filter(recognizer => !!recognizer);
    }
}

function createkUnhandledMessageResponse(session: BotBuilder.Session, args: any): BotBuilder.Message {
    let msg = new BotBuilder.Message(session).text('Sorry, I didn\'t understand. Type "help" when you need help.');

    // This metadata is sent in the channel data to mark this message as unhandled
    let source = session.message.source;
    msg.sourceEvent({
        [source]: {
            intent: args.intent,
            text: session.message.text
        }
    });

    return msg;
}
