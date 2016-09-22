import * as express from 'express';
import * as logger from 'logops';
import * as BotBuilder from 'botbuilder';
import * as http from 'http';
import enableTerminate = require('server-terminate');

import { BotRunner } from './runner';

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
export class ServerRunner implements BotRunner {
    settings: ServerRunnerSettings;
    bot: BotBuilder.UniversalBot;

    private app: express.Application;
    private server: any;
    private connector: BotBuilder.ChatConnector;

    constructor(settings: ServerRunnerSettings) {
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

    start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // TODO the server must be created in the constructor
            let server = this.server = this.app.listen(this.settings.port);
            enableTerminate(this.server);

            this.server.on('error', onServerError);
            this.server.once('listening', onServerListening);
            this.server.on('close', onServerClose);

            function onServerError(err: Error) {
                unsubscribe();
                reject(err);
            }

            function onServerListening() {
                logger.info(server.address(), 'Server listening');
                resolve();
            }

            function onServerClose() {
                unsubscribe();
                logger.info('Server closed');
            }

            function unsubscribe() {
                server.removeListener('error', onServerError);
                server.removeListener('listening', onServerListening);
                server.removeListener('close', onServerClose);
            }
        });
    }

    stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.server.terminate((err: Error) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

function statusMW(req: express.Request, res: express.Response) {
    res.status(200).send('Alive');
}

function defaultMW(req: express.Request, res: express.Response) {
    res.status(404).send('Not found');
}
