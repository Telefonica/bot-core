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
 * Exports the Channel interface from the BotBuilder, which is not natively exported.
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
