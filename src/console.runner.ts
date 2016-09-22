import * as BotBuilder from 'botbuilder';
import * as logger from 'logops';

import { BotRunner } from './runner';

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
export class ConsoleRunner implements BotRunner {
    /** The Bot instance this runner will manage */
    bot: BotBuilder.UniversalBot;

    /** The settings passed when instantiated */
    protected settings: ConsoleRunnerSettings;

    /** The {@link BotBuilder.IConnector} connector used by this {@link BotRunner} */
    private connector: BotBuilder.ConsoleConnector;

    constructor(settings: ConsoleRunnerSettings) {
        this.bot = settings.bot;

        this.settings = settings;
        this.connector = new BotBuilder.ConsoleConnector();

        this.bot.connector('*', this.connector);
    }

    start(): Promise<void> {
        // We start the connector here, cause it creates the link to the TTY in this methods
        this.connector.listen();
        return Promise.resolve();
    }

    stop(): Promise<void> {
        // No need to tear down anything, BotBuilder.ConsoleConnector does not exposes anything also
        return Promise.resolve();
    }
}
