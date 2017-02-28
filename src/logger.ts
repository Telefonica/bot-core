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

import * as logger from 'logops';
import Therror from 'therror';

export { logger };

// But while developing, it's very boring to see them always, so we omit them
logger.formatters.dev.omit = ['trans', 'op', 'corr'];

// Set the logger for Errors to be out one
Therror.Loggable.logger = logger;

// Print in the traces out tracking info
// @see console.runner.ts#DomainedConsoleConnector
// @see server.runner.ts
// @see https://github.com/Telefonica/node-express-tracking
logger.setContextGetter(() => {
    return process.domain && (<any>process.domain).tracking;
});
