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
import * as enableTerminate from 'server-terminate';
const expressDomain = require('express-domaining');
const expressTracking = require('express-tracking');
const errorHandler = require('therror-connect');

import { addStartTime } from './middlewares/response-time';
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

        logger.info('Initialize chat connector for application id %s', this.settings.appId);
        this.connector = new BotBuilder.ChatConnector({
            appId: this.settings.appId,
            appPassword: this.settings.appPassword
        });

        this.bot.connector('*', this.connector);

        this.app = app;
        this.app.disable('x-powered-by');
        this.app.post('/api/messages', [
          expressDomain(), // Add domain support
          expressTracking(), // Add tracking information
          addTimeMW, // Add request start time
          this.connector.listen()
        ]);
        this.app.get('/status', statusMW);
        this.app.use('*', defaultMW);
        this.app.use([
          domainErrorMW, // manage domain errors
          errorHandler() // add useful logging errors - responses
        ]);
    }
}

/**
 * Express middleware that adds the current time to the domain,
 * in order to get from the bot middleware "response-time" later
 * @see middlewares/request-time.ts
 */
export function addTimeMW(req: http.ClientRequest, res: http.ClientResponse, next: Function): void {
  addStartTime();
  next();
}

/**
 * Express error handler that prints a domain thrown error as a fatal trace
 * expressDomainig forwards the domain error to express, so we capture them here
 * and add a fatal trace (as a domain error is an unexpected one)
 */
function domainErrorMW(err: any | Error, req: express.Request, res: express.Response, next: Function) {
  // domain thrown errors. The process will exit cleanly thanks to alfalfa when
  // the request ends and the client got it response, but we first log the fatal trace
  if (err.domainThrown) {
    // To print AFTER the request error log
    process.nextTick(() => logger.fatal(err));
  }
  next(err);
}

function statusMW(req: express.Request, res: express.Response) {
    res.status(200).send('Alive ' + process.uptime()); // XXX use express-ping
}

function defaultMW(req: express.Request, res: express.Response) {
    res.status(404).send('Not found');
}
