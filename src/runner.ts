import * as BotBuilder from 'botbuilder';

/**
 * Interface for implementing a way to start a Bot
 *
 * We ship the {ConsoleRunner} and {ServerRunner} implementations
 */
export interface BotRunner {
    /**
     * Start a runtime for the Bot
     *
     * @return {Promise} Resolves when the Bot has been successfully started
     * Rejects with an {NodeJS.Error} describing why the Bot couldn't start
     */
    start(): Promise<void>;

    /**
     * Stops a Runtime for the Bot
     *
     * @return {Promise} Resolves when the Bot has been successfully stopped
     * Rejects with an {NodeJS.Error} describing why the Bot couldn't stop gracefully
     */
    stop(): Promise<void>;
}

export { ConsoleRunner } from './console.runner';
export { ServerRunner } from './server.runner';
