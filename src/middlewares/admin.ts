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

export default {
    botbuilder: (session: BotBuilder.Session, next: Function) => {
        let command = session.message.text;

        if (/^\/set /i.test(command)) {
            // Set settings
            let args = command.split(/\s+/);
            set(args[1], args.slice(2));
        } else if (/^\/get /i.test(command)) {
            // Get settings
            let args = command.split(/\s+/);
            get(args[1]);
        } else {
            debug();
            next();
        }

        function set(key: string, values: string[]) {
            key = key.toLowerCase();

            if (key === 'debug') {
                let value = onOff(values[0]);
                if (value === null) {
                    session.send(`Value "${values[0]}" not valid for command "/set debug. Try "on" or "off"`);
                } else {
                    session.userData.debugging = value;
                    session.send(`Debugging ${session.userData.debugging ? 'enabled' : 'disabled'}`);
                }
            } else if (key === 'locale') {
                session.preferredLocale(values[0].toLowerCase());
                session.send(`Locale set to "${session.preferredLocale()}"`);
            } else {
                session.send(`Not recognized setting: ${key}`);
            }
        }

        function get(key: string) {
            key = key.toLowerCase();

            if (key === 'debug') {
                session.send(`Debugging ${session.userData.debugging ? 'enabled' : 'disabled'}`);
            } else if (key === 'locale') {
                session.send(`Locale set to "${session.preferredLocale()}"`);
            } else {
                session.send(`Not recognized setting: ${key}`);
            }
        }

        function debug() {
            if (session.userData.debugging) {
                session.send(JSON.stringify(session.message));
            }
        }
    }
} as BotBuilder.IMiddlewareMap;

function onOff(value: string) {
    if (['on', 'true', '1', 'yes'].indexOf(value.toLowerCase()) !== -1) {
        return true;
    } else if (['off', 'false', '0', 'no'].indexOf(value.toLowerCase()) !== -1) {
        return false;
    } else {
        return null;
    }
}
