import * as express from 'express';
import * as logger from 'logops';
import * as BotBuilder from 'botbuilder';
import * as http from 'http';
import enableTerminate = require('server-terminate');

import { BotRunner } from './runner';
import { ServerRunner as AlfalfaServerRunner } from 'alfalfa';

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
    /** The application passwork from the BotFramework account for the {@link Bot} */
    appPassword: string;
}

/**
 * Manages the provided {@link BotBuilder.UniversalBot} lifecycle exposed as a Web Server
 *
 * This {@link BotRunner} is used mainly for non-development environments.
 * It will connect your {@link BotBuilder.UniversalBot} implementation with the MSBotFramework
 */
export class ServerRunner extends AlfalfaServerRunner {
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

        this.app = app;
        this.bot = settings.bot;
        this.settings = settings;

        this.bot.use(BotBuilder.Middleware.sendTyping());

        logger.info('Initialize chat connector for application id %s', this.settings.appId);
        this.connector = new BotBuilder.ChatConnector({
            appId: this.settings.appId,
            appPassword: this.settings.appPassword
        });

        this.bot.connector('*', this.connector);

        this.app = express();
        this.app.disable('x-powered-by');
        this.app.post('/api/messages', this.connector.listen());
        this.app.get('/status', statusMW);
        this.app.use('*', defaultMW);
    }
}

function statusMW(req: express.Request, res: express.Response) {
    res.status(200).send('Alive');
}

function defaultMW(req: express.Request, res: express.Response) {
    res.status(404).send('Not found');
}
