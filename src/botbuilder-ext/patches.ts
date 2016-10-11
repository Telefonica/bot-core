/**
 * Several patches to augment or customize the BotBuilder behavior.
 */

import * as BotBuilder from 'botbuilder';
import * as BotBuilderExt from '.';

/**
 * Apply all the patches over the BotBuilder module.
 * Since module imports are cached by Node, patches applied here are available when the BotBuilder module
 * is imported from the index.ts file, where it is exported to the world.
 */
function applyPatches() {
    patchPromptsChoice();
}

/**
 * When the `BotBuilder.Prompts.choice` method is called without passing a `BotBuilder.ListStyle` in the `options` argument,
 * this patch set the list style to `BotBuilder.ListStyle.button` (only on selected channels)
 * so choices are sent as buttons attachment in order to be properly managed by the client application.
 */
function patchPromptsChoice() {
    let originalChoice = BotBuilder.Prompts.choice;

    BotBuilder.Prompts.choice = function choice(
            session: BotBuilder.Session,
            prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
            choices: string | Object | string[],
            options?: BotBuilder.IPromptOptions): void {
        let opts: BotBuilder.IPromptOptions = options || {};
        let channels = BotBuilderExt.Channel.channels;
        let channelId = BotBuilderExt.Channel.getChannelId(session);

        if ([channels.directline, channels.console, channels.emulator, channels.skype].indexOf(channelId) !== -1) {
            // Set `BotBuilder.ListStyle.button` when no list style has been set from the caller code
            opts.listStyle = opts.listStyle || BotBuilder.ListStyle.button;
        }
        originalChoice(session, prompt, choices, opts);
    };
}

// Apply all the patches when loading this module
applyPatches();
