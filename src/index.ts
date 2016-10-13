export { Bot, BotSettings } from './bot';
export { BotRunner, ConsoleRunner, ServerRunner } from './runner'

import * as BotBuilder from 'botbuilder';
export { BotBuilder };

import * as BotBuilderExt from './botbuilder-ext';
export { BotBuilderExt };

/// XXX: Remove the following augmentation when it is fixed in BotBuilder
declare module 'botbuilder' {
    export interface IUniversalBotSettings {
        /** (Optional) localizer settings */
        localizerSettings?: BotBuilder.ILocalizerSettings;
    }
}
