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
import * as http from 'http';

export default function factory(): BotBuilder.IMiddlewareMap {
  return {
    /**
     * Prints a trace when the bot replies to track the accumulated time 
     * it last to reply to the user. 
     * 
     * You can use that as a metric
     * 
     * ```js
     * { 
     *   bot_response_time: { 
     *     time: 890 # milliseconds elapsed from the initial user request,
     *     firstReply: true # true when is the first reply of a set of replies      
     *   }
     *   msg: 'Bot response time',
     *   lvl: 'INFO'
     * }
     */
    send: function onSend(event: BotBuilder.IEvent, next: Function) {
      let domain = <any>(process.domain);
      if (!domain) {
        return next();
      }
      let start = domain.start;
      let hasReplied = domain.hasReplied;

      let now = Date.now();

      let trace = {
        time: now - (start || now),
        firstReply: false
      };

      if (!hasReplied) {
        trace.firstReply = domain.hasReplied = true;
      }

      logger.info({ bot_response_time : trace }, 'Bot response time' );
      next();
    }
  } as BotBuilder.IMiddlewareMap;
}

/**
 * Adds the current time to the domain
 */
export function addStartTime() {
  if (process.domain) {
    Object.assign(process.domain, {
      start: Date.now()
    });
  }
}
