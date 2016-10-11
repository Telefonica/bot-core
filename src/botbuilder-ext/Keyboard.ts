/**
 * Exports the Keyboard interface from the BotBuilder, which es not natively exported.
 * NOTE: This interface is already natively exported by the BotBuilder in master,
 *       remember to remove this once the BotBuilder publishes it.
 */

import * as BotBuilder from 'botbuilder';

export interface IKeyboard {
    buttons: BotBuilder.ICardAction[];  // Set of actions applicable to the current card.
}

export interface KeyboardConstructor {
    new(session?: BotBuilder.Session): KeyboardInterface;
}

export interface KeyboardInterface extends BotBuilder.IIsAttachment {
    buttons(list: BotBuilder.ICardAction[] | BotBuilder.IIsCardAction[]): KeyboardInterface;
    toAttachment(): BotBuilder.IAttachment;
}

export let Keyboard: KeyboardConstructor = require('botbuilder/lib/cards/Keyboard').Keyboard;
