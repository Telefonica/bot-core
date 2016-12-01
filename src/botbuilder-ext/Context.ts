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
import * as BotBuilder from 'botbuilder';

export class Context {
    private static getContext(session: BotBuilder.Session): any {
        session.privateConversationData.context = session.privateConversationData.context || {};
        return session.privateConversationData.context;
    }

    public static set<T>(session: BotBuilder.Session, key: string, value: T, timeout?: number): void {
        let context = Context.getContext(session);
        if (timeout) {
            let timeName = key + '_timeout';
            context[timeName] = Date.now() + timeout;
        }
        context[key] = value;
    }

    public static get<T>(session: BotBuilder.Session, key: string): T {
        let context = Context.getContext(session);
        let timeName = key + '_timeout';
        if (context[timeName] && context[timeName] < Date.now()) {
            context[timeName] = null;
            context[key] = null;
        }
        return <T>context[key];
    }
}
