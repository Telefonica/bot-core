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
import * as BotBuilderExt from '.';
import * as logger from 'logops';

const consts = require('botbuilder/lib/consts');
const dl = require('botbuilder/lib/bots/Library');


declare module 'botbuilder' {
    // XXX: Remove this augmentation when Microsoft fixes the interface
    interface IPromptArgs extends IPromptOptions {
        enumValues?: string[];  // This is declared as `enumsValues` in botbuilder.d.ts (WTF!)
        retryCnt?: number;  // This is not visible in the public interface definition
    }
    // The following is needed because the Prompts.sendPrompt method has been declared as private
    // instead of protected, so it is not accessible from a child class
    interface Prompts extends Dialog {
        sendPrompt(session: Session, args: IPromptArgs, retry: boolean): void;
    }
}

export interface IPromptResult<T> extends BotBuilder.IPromptResult<T> {
    intent?: string;
    entities?: BotBuilder.IEntity[];
}

/** Strongly typed Text Prompt Result. */
export interface IPromptTextResult extends IPromptResult<string> { }

/** Strongly typed Number Prompt Result. */
export interface IPromptNumberResult extends IPromptResult<number> { }

/** Strongly typed Confirm Prompt Result. */
export interface IPromptConfirmResult extends IPromptResult<boolean> { }

/** Strongly typed Choice Prompt Result. */
export interface IPromptChoiceResult extends IPromptResult<BotBuilder.IFindMatchResult> { }

/** Strongly typed Time Prompt Result. */
export interface IPromptTimeResult extends IPromptResult<BotBuilder.IEntity> { }

/** Strongly typed Attachment Prompt Result. */
export interface IPromptAttachmentResult extends IPromptResult<BotBuilder.IAttachment[]> { }

export class Prompts extends BotBuilder.Prompts {
    public replyReceived(session: BotBuilder.Session, result?: IPromptResult<any>): void {
        var args: BotBuilder.IPromptArgs = session.dialogData;

        if (result.error || result.resumed === BotBuilder.ResumeReason.completed) {
            // There was an error or the user has replied something that has been recognized by the Prompt
            result.promptType = args.promptType;
            session.endDialogWithResult(result);
            return;
        }

        logger.debug('The reply has not been recognized. Looking for an intent to change the dialog on the fly...');

        let dlg = <BotBuilder.IntentDialog>session.library.dialog('/');
        let context: BotBuilder.IRecognizeContext = {
            message: session.message,
            locale: session.preferredLocale(),
            dialogData: session.dialogData,
            activeDialog: true
        };
        dlg.recognize(context, (err: Error, recognitionResult: BotBuilder.IIntentRecognizerResult) => {
            if (err) {
                // XXX: Maybe we prefer to remain retrying the dialog if the utterance cannot be recognized?
                logger.error(err, 'The recognition has failed');
                result.error = err;
                result.promptType = args.promptType;
                session.endDialogWithResult(result);
                return;
            }

            logger.debug('The user reply has been recognized as the intent "%s" with score %d',
                recognitionResult.intent, recognitionResult.score);

            let cancelIntentsBlacklist = session.privateConversationData.promptsCancelIntentsBlacklist || [];
            if (recognitionResult.intent && cancelIntentsBlacklist.indexOf(recognitionResult.intent) === -1) {
                // The user reply has been recognized as an intent and it is not blacklisted
                // so this dialog is gonna be cancelled
                result.promptType = args.promptType;
                result.resumed = BotBuilder.ResumeReason.canceled;
                result.score = recognitionResult.score;
                result.intent = Prompts.findDialog(session, recognitionResult.intent);
                result.entities = recognitionResult.entities;
                logger.debug('Cancelling dialog. Accepted intent "%s" with score %d', result.intent, result.score);
                session.endDialogWithResult(result);
                return;
            } else {
                logger.debug('Discarding intent "%s" with score %d because it is blacklisted',
                    recognitionResult.intent, recognitionResult.score);
            }

            if (typeof args.maxRetries === 'number' && args.retryCnt >= args.maxRetries) {
                // The dialog retries have reached `maxRetries`, so the dialog is finished as "not completed"
                result.promptType = args.promptType;
                result.resumed = BotBuilder.ResumeReason.notCompleted;
                session.endDialogWithResult(result);
            } else {
                // Retry
                args.retryCnt++;
                super.sendPrompt(session, args, true);
            }
        });
    }

    protected static findDialog(session: BotBuilder.Session, intent: string): string {
        let dialogName: string;
        // The following hack is the only way to gain access to the registered libraries from the session
        // because the Library class has not a method to list al the registered libraries
        // XXX use the `defaultDialogArgs` mechanism to pass the libraries
        let libraries = (<any>(session.library)).libraries;
        libraries = Object.keys(libraries).map(libraryName => libraries[libraryName]);

        libraries.some((library: BotBuilder.Library) => {
            if (session.library.findDialog(library.name, intent)) {
                dialogName = `${library.name}:${intent}`;
            }
            return !!dialogName;
        });

        return dialogName;
    }

    static text(session: BotBuilder.Session,
                prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
                options?: BotBuilder.IPromptOptions): void {
        logger.warn('The text method is not implemented. Use the original Prompts.text method from the BotBuilder module');
    }

    /**
     * It works like the original `Prompts.number` method but in case the user replies something different from
     * a number, it tries to recognize the reply as an intent and if it successes and the score is higher than
     * `options.scoreThresholdToCancel` the dialog is canceled and the intent and score are passed to the
     * parent dialog. In case the recognized intent is None and `options.cancelOnNone` is `false`, the dialog
     * is not cancelled.
     */
    static number(session: BotBuilder.Session,
                  prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
                  options?: BotBuilder.IPromptOptions): void {
        var args: BotBuilder.IPromptArgs = <any>options || {};

        args.promptType = BotBuilder.PromptType.number;
        args.prompt = prompt;
        beginPrompt(session, args);
    }

    /**
     * It works like the original `Prompts.confirm` method but in case the user replies something not matching
     * affirmative or negative responses, it tries to recognize the reply as an intent and if it successes
     * and the score is higher than `options.scoreThresholdToCancel` the dialog is canceled and the intent
     * and score are passed to the parent dialog. In case the recognized intent is None and `options.cancelOnNone`
     * is `false`, the dialog is not cancelled.
     */
    static confirm(session: BotBuilder.Session,
                  prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
                  options?: BotBuilder.IPromptOptions): void {
        var locale: string = session.preferredLocale();
        var args: BotBuilder.IPromptArgs = <any>options || {};

        args.promptType = BotBuilder.PromptType.confirm;
        args.prompt = prompt;
        args.enumValues = [
            session.localizer.gettext(locale, 'confirm_yes', consts.Library.system),
            session.localizer.gettext(locale, 'confirm_no', consts.Library.system)
        ];
        args.listStyle = args.hasOwnProperty('listStyle') ? args.listStyle : BotBuilder.ListStyle.auto;
        beginPrompt(session, args);
    }

    /**
     * It works like the original `Prompts.choice` method but in case the user replies something not matching
     * the choices, it tries to recognize the reply as an intent and if it successes and the score is higher than
     * `options.scoreThresholdToCancel` the dialog is canceled and the intent and score are passed to the
     * parent dialog. In case the recognized intent is None and `options.cancelOnNone` is `false`, the dialog
     * is not cancelled.
     */
    static choice(session: BotBuilder.Session,
                  prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
                  choices: string | Object | string[],
                  options?: BotBuilder.IPromptOptions): void {
        let channels = BotBuilderExt.Channel.channels;
        let channelId = BotBuilderExt.Channel.getChannelId(session);
        let args: BotBuilder.IPromptArgs = <any>options || {};

        let defaultListStyle: BotBuilder.ListStyle;
        if ([channels.directline, channels.console, channels.emulator, channels.skype].indexOf(channelId) !== -1) {
            // Set `BotBuilder.ListStyle.button` when no list style has been set from the caller code
            defaultListStyle = BotBuilder.ListStyle.button;
        } else {
            defaultListStyle = BotBuilder.ListStyle.auto;
        }
        args.listStyle = args.hasOwnProperty('listStyle') ? args.listStyle : defaultListStyle;
        args.promptType = BotBuilder.PromptType.choice;
        args.prompt = prompt;

        var c = BotBuilder.EntityRecognizer.expandChoices(choices);
        if (c.length === 0) {
            logger.error('0 length choice for prompt:', prompt);
            throw '0 length choice list supplied';
        }
        args.enumValues = c;
        beginPrompt(session, args);
    }

    /**
     * It works like the original `Prompts.time` method but in case the user replies something not matching
     * a date/time, it tries to recognize the reply as an intent and if it successes and the score is higher than
     * `options.scoreThresholdToCancel` the dialog is canceled and the intent and score are passed to the
     * parent dialog. In case the recognized intent is None and `options.cancelOnNone` is `false`, the dialog
     * is not cancelled.
     */
    static time(session: BotBuilder.Session,
                prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
                options?: BotBuilder.IPromptOptions): void {
        var args: BotBuilder.IPromptArgs = <any>options || {};

        args.promptType = BotBuilder.PromptType.time;
        args.prompt = prompt;
        beginPrompt(session, args);
    }

    /**
     * It works like the original `Prompts.attachment` method but in case the user replies something different form
     * an attachment, it tries to recognize the reply as an intent and if it successes and the score is higher than
     * `options.scoreThresholdToCancel` the dialog is canceled and the intent and score are passed to the
     * parent dialog. In case the recognized intent is None and `options.cancelOnNone` is `false`, the dialog
     * is not cancelled.
     */
    static attachment(session: BotBuilder.Session,
                      prompt: string | string[] | BotBuilder.IMessage | BotBuilder.IIsMessage,
                      options?: BotBuilder.IPromptOptions): void {
        var args: BotBuilder.IPromptArgs = <any>options || {};

        args.promptType = BotBuilder.PromptType.attachment;
        args.prompt = prompt;
        beginPrompt(session, args);
    }
}
dl.systemLib.dialog(`${consts.DialogId.Prompts}Ext`, new Prompts());

function beginPrompt(session: BotBuilder.Session, args: BotBuilder.IPromptArgs) {
    // Fixup prompts
    if (typeof args.prompt === 'object' && (<BotBuilder.IIsMessage>args.prompt).toMessage) {
        args.prompt = (<BotBuilder.IIsMessage>args.prompt).toMessage();
    }
    if (typeof args.retryPrompt === 'object' && (<BotBuilder.IIsMessage>args.retryPrompt).toMessage) {
        args.retryPrompt = (<BotBuilder.IIsMessage>args.retryPrompt).toMessage();
    }
    session.beginDialog(`${consts.DialogId.Prompts}Ext`, args);
}
