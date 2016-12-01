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
