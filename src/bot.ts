/**
* @license
* Copyright 2016 Telefónica I+D
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

import { LanguageDetector, Admin, Logger, Normalizer, Audio, Slack, DirectLinePrompts, EventHub } from './middlewares';
import { PluginLoader } from './loader';

export interface BotSettings extends BotBuilder.IUniversalBotSettings {
    modelMapSet: BotBuilder.ILuisModelMap[];
    plugins: string[];
    /** Blacklisted intents that should never cancel a BotBuilderExt.Prompts dialog */
    promptsCancelIntentsBlacklist?: string[];
}

export class Bot extends BotBuilder.UniversalBot {
    private loader: PluginLoader;

    constructor(settings: BotSettings) {
        // Copy the `promptsCancelIntentsBlacklist` property to the `defaultDialogArgs` property
        // which will be passed by the framework to initial dialogs
        settings.defaultDialogArgs = settings.defaultDialogArgs || {};
        settings.defaultDialogArgs.promptsCancelIntentsBlacklist = settings.promptsCancelIntentsBlacklist;

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

        let supportedLanguages = this.supportedLanguages();
        logger.debug('Bot supported languages', supportedLanguages);

        let middlewares = [
            Audio(),
            DirectLinePrompts,
            Logger,
            Normalizer,
            LanguageDetector(supportedLanguages),
            Admin,
            EventHub(),
            Slack()
        ];
        this.use(...middlewares);

        this.on('error', err => logger.error(err));

        this.endConversationAction(
            'cancel',
            'core.cancel',
            {matches: /(^cancel$)|(^never mind$)|(^forget it$)/i}
        );
    }

    private createIntentDialog(): BotBuilder.IntentDialog {
        let luisRecognizers = this.initializeLanguageRecognizers();

        let intentDialog = new BotBuilder.IntentDialog({
            recognizers: luisRecognizers
        });

        let libraries = this.loader.getLibraries();
        libraries.forEach(library => this.library(library));

        intentDialog.onBegin((session: BotBuilder.Session, args: any, next: Function) => {
            // Store the `promptsCancelIntentsBlacklist` in the `privateConversationData` so it is
            // available from the session for any dialog
            session.privateConversationData = session.privateConversationData || {};
            session.privateConversationData.promptsCancelIntentsBlacklist = args.promptsCancelIntentsBlacklist;
            next();
        });

        intentDialog.onDefault((session: BotBuilder.Session, result: any) => {
            logger.debug('Find library for intent [%s]', result.intent);

            let dialogName = this.findDialog(result.intent, libraries);

            if (dialogName) {
                logger.debug({ result }, 'Starting library dialog [%s]', dialogName);
                session.beginDialog(dialogName, result);
            } else {
                logger.warn({ intent: result.intent }, 'Unhandled intent');
                let msg = createkUnhandledMessageResponse(session, result);
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
        let modelMapSet = this.get('modelMapSet') as BotBuilder.ILuisModelMap[];

        if (!modelMapSet || !modelMapSet.length) {
            logger.error('No LUIS models defined');
            return [];
        }

        logger.info('Load LUIS models', modelMapSet);

        return modelMapSet.map((modelMap: BotBuilder.ILuisModelMap) => {
            return new BotBuilder.LuisRecognizer(modelMap);
        });
    }

    private supportedLanguages(): string[] {
        let modelMapSet = this.get('modelMapSet') as BotBuilder.ILuisModelMap[];
        let languages = modelMapSet.map((modelMap) => Object.keys(modelMap))
                                   .reduce((a, b) => a.concat(b))
                                   .filter((v, i, a) => a.indexOf(v) === i); // unique

        return languages;
    }
}

function createkUnhandledMessageResponse(session: BotBuilder.Session, args: any): BotBuilder.Message {
    let text = session.gettext('core.default') || 'I do not understand';
    return new BotBuilder.Message(session).text(text);
}
