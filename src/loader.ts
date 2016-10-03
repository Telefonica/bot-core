import * as BotBuilder from 'botbuilder';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from 'logops';

export class PluginLoader {

    constructor(public plugins: string[]) {}

    getLibraries() {
        return this.plugins
            .map(library => this.requireLibrary(library))
            .filter(lib => !!lib);
    }

    protected requireLibrary(libpath: string): BotBuilder.Library {
        let lib = require(libpath).default as BotBuilder.Library;
        if (lib instanceof BotBuilder.Library === false) {
            logger.warn(`Skip plugin at ${libpath}: not a valid Library`);
            return null;
        }

        logger.info(`Loaded [${lib.name}] library from plugin at "${path.basename(libpath)}"`);

        return lib;
    }
}
