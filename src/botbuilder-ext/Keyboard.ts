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

/**
 * Exports the Keyboard interface from the BotBuilder, which es not natively exported.
 * XXX: This interface is already natively exported by the BotBuilder in master,
 *      remember to remove this once the BotBuilder publishes it.
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
