import * as BotBuilder from 'botbuilder';

//
// XXX Expose classes that are part of the framework but are hidden in the SDK
//     It won't be needed once the issue is fixed https://github.com/Microsoft/BotBuilder/issues/1416
//
export interface IKeyboard {
    buttons: BotBuilder.ICardAction[];
}

export class Keyboard implements BotBuilder.IIsAttachment {
    protected data = {
        contentType: 'application/vnd.microsoft.keyboard',
        content: <IKeyboard>{}
    };

    constructor(protected session?: BotBuilder.Session) {
    }

    public buttons(list: BotBuilder.ICardAction[]|BotBuilder.IIsCardAction[]): this {
        this.data.content.buttons = [];
        if (list) {
            for (var i = 0; i < list.length; i++) {
                var action = list[i];
                this.data.content.buttons.push((<BotBuilder.IIsCardAction>action).toAction ? (<BotBuilder.IIsCardAction>action).toAction() : <BotBuilder.ICardAction>action);
            }
        }
        return this;
    }

    public toAttachment(): BotBuilder.IAttachment {
        return this.data;
    }
}
