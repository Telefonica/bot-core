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
import * as domain from 'domain';
import * as uuid from 'uuid';

import { Runner } from './runner';
import { addStartTime } from './middlewares/response-time';

/**
 * Settings to create a {@link ConsoleRunner} instance
 */
export interface ConsoleRunnerSettings {
    /** The {@link BotBuilder.UniversalBot}  instance this runner will manage */
    bot: BotBuilder.UniversalBot;
}

/**
 * Manages the provided {@link BotBuilder.UniversalBot} lifecycle using
 * a {@link BotBuilder.ConsoleConnector}, mostly to interact with the bot
 * during the development phase.
 */
export class BotConsoleRunner extends Runner<BotBuilder.ConsoleConnector> {

    /** The Bot instance this runner will manage */
    bot: BotBuilder.UniversalBot;

    /** The settings passed when instantiated */
    protected settings: ConsoleRunnerSettings;

    /** The {@link BotBuilder.IConnector} connector used by this {@link BotRunner} */
    private connector: BotBuilder.ConsoleConnector;

    constructor(settings: ConsoleRunnerSettings) {
        super('BotConsole');
        this.bot = settings.bot;

        this.settings = settings;
        // Use our custom ConsoleConnector to add Domains to every user input
        this.connector = new DomainedConsoleConnector();

        this.bot.connector('*', this.connector);
    }

    protected doStart() {
        // We start the connector here, cause it creates the link to the TTY in this methods
        this.connector.listen();
        return Promise.resolve(this.connector);
    }

    protected doStop() {
        // No need to tear down anything, BotBuilder.ConsoleConnector does not exposes anything also
        return Promise.resolve(this.connector);
    }
}

/**
 * ConsoleConnector that adds the user input to a domain to add the tracking info
 * That tracking info will be used to correlate traces and get bot response times 
 */
class DomainedConsoleConnector extends BotBuilder.ConsoleConnector {
    public processMessage(line: string): this {
        let d = domain.create();
        d.enter();
        d.on('error', (err: Error) => logger.fatal(err));
        addTrackingInfo();
        addStartTime();
        d.run(() => super.processMessage(line));
        // TODO: There is no way with the current BotBuilder architecture to know when 
        // the message has been processed to exit the domain 
        return this;
    }
}

/**
 * Adds the tracking info to the domain as the node-express-tracking does
 * @see https://github.com/Telefonica/node-express-tracking/
 */
function addTrackingInfo() {
  let trans = uuid();
  Object.assign(process.domain, {
    tracking: {
      corr: trans,
      trans,
      op: undefined
    }
  });
}
