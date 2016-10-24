export * from './bot';
export * from './runner'

import * as BotBuilder from 'botbuilder';
export { BotBuilder };

import * as BotBuilderExt from './botbuilder-ext';
export { BotBuilderExt };

declare module 'botbuilder' {
    // XXX: Remove this augmentation when Microsoft fixes the interface
    interface IRecognizeContext {
        locale: string;
    }
    // XXX: Remove this augmentation when Microsoft fixes the interface
    interface IPromptResult<T> extends IDialogResult<T> {
        score: number;
    }
}
