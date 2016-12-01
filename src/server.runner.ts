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

import * as express from 'express';
import * as logger from 'logops';
import * as BotBuilder from 'botbuilder';
import * as http from 'http';
import enableTerminate = require('server-terminate');

import { Runner, ServerRunner } from './runner';

/**
 * Settings to create a {@link ServerRunner} instance
 */
export interface ServerRunnerSettings {
    /** The {@link BotBuilder.UniversalBot} instance this runner will manage */
    bot: BotBuilder.UniversalBot;
    /** The port where a http server will me mounted */
    port: number;
    /** The application ID from the BotFramework account for the {@link Bot} */
    appId: string;
    /** The application password from the BotFramework account for the {@link Bot} */
    appPassword: string;
}

/**
 * Manages the provided {@link BotBuilder.UniversalBot} lifecycle exposed as a Web Server
 *
 * This {@link BotRunner} is used mainly for non-development environments.
 * It will connect your {@link BotBuilder.UniversalBot} implementation with the MSBotFramework
 */
export class BotServerRunner extends ServerRunner {
    settings: ServerRunnerSettings;
    bot: BotBuilder.UniversalBot;

    private app: express.Application;
    private connector: BotBuilder.ChatConnector;

    constructor(settings: ServerRunnerSettings) {
        let app = express();
        let server = http.createServer(app);

        super({
            server: server,
            port: settings.port
        });
        this.name = 'BotServer';

        this.bot = settings.bot;
        this.settings = settings;

        // XXX this.bot.use(BotBuilder.Middleware.sendTyping());

        logger.info('Initialize chat connector for application id %s', this.settings.appId);
        this.connector = new BotBuilder.ChatConnector({
            appId: this.settings.appId,
            appPassword: this.settings.appPassword
        });

        this.bot.connector('*', this.connector);

        this.app = app;
        this.app.disable('x-powered-by');
        this.app.post('/api/messages', this.connector.listen());
        this.app.get('/status', statusMW);
        this.app.use('*', defaultMW);
    }
}

function statusMW(req: express.Request, res: express.Response) {
    res.status(200).send('Alive ' + process.uptime()); // XXX use express-ping
}

function defaultMW(req: express.Request, res: express.Response) {
    res.status(404).send('Not found');
}
