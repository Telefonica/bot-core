/**
 * Exports the Channel interface from the BotBuilder, which es not natively exported.
 */

import * as BotBuilder from 'botbuilder';

export interface IChannels {
    facebook: string;
    skype: string;
    telegram: string;
    kik: string;
    email: string;
    slack: string;
    groupme: string;
    sms: string;
    emulator: string;
    // The following channels are missing from the BotBuilder
    directline: string;
    console: string;
}

export interface ChannelInterface {
    channels: IChannels;
    supportsKeyboards(session: BotBuilder.Session, buttonCnt?: number): boolean;
    supportsCardActions(session: BotBuilder.Session, buttonCnt?: number): boolean;
    getChannelId(addressable: BotBuilder.Session | BotBuilder.IMessage | BotBuilder.IAddress): string;
}

export let Channel: ChannelInterface = require('botbuilder/lib/Channel');
// The following channels are missing from the BotBuilder
Channel.channels.directline = 'directline';
Channel.channels.console = 'console';
