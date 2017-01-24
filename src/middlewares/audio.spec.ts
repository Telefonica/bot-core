import * as sinon from 'sinon';
import { expect } from 'chai';
import * as nock from 'nock';

import * as BotBuilder from 'botbuilder';
import { BingSpeechClient, VoiceRecognitionResponse } from 'bingspeech-api-client';
import { ObjectStorageFactory, IStorage } from '@telefonica/object-storage';

import * as audio from './audio';

// XXX disable logs to avoid stdout pollution

// TODO reenable tests !

describe.skip('Audio Middleware', () => {
    let bingSpeechClientStub: sinon.SinonStub;
    let objectStorageFactoryStub: sinon.SinonStub;

    beforeEach(() => {
        process.env.MICROSOFT_BING_SPEECH_KEY = 'fake';
        process.env.AZURE_STORAGE_ACCOUNT = 'fake';
        process.env.AZURE_STORAGE_ACCESS_KEY = 'fake';

        bingSpeechClientStub = sinon.stub(BingSpeechClient.prototype, 'recognizeStream', () => fakeVoiceRecognition('This is a text'));
    });

    it('should replace the message text with the STT equivalent', done => {
        nock('https://unexisting-audio-resource')
            .head('/')
            .reply(200, {
                'content-length': 1000
            });

        nock('https://unexisting-audio-resource')
            .get('/')
            .reply(200, new Buffer('fake-audio-binary-contents'));

        let session = fakeBotSession();
        let middleware: BotBuilder.ISessionMiddleware = audio.default().botbuilder as BotBuilder.ISessionMiddleware;

        middleware(session, () => {
            expect(session.message.text).to.eq('This is a text');
            done();
        });
    });

    it('should not download huge audio resources', done => {
        process.env.MAX_SIZE_ATTACHMENT = 1024;

        nock('https://unexisting-audio-resource')
            .defaultReplyHeaders({
                'Content-Length': (100 * 1024 * 1024).toString(10) // 100MB > size limit
            })
            .head('/')
            .reply(200);

        let session = fakeBotSession();
        let middleware: BotBuilder.ISessionMiddleware = audio.default().botbuilder as BotBuilder.ISessionMiddleware;

        middleware(session, () => {
            expect(session.message.text).to.eq(''); // not replaced
            done();
        });
    });

    afterEach(() => {
        bingSpeechClientStub.restore();
    });
});

function fakeVoiceRecognition(text: string, properties?: any): Promise<VoiceRecognitionResponse> {
    return Promise.resolve({
        version: '3',
        header: {
            status: 'success',
            scenario: 'ulm',
            name: text,
            lexical: text,
            properties: Object.assign({requestid: 'fake-request-id', HIGHCONF: '1'}, properties)
        },
        results: []
    });
}

// XXX this is quite fragile and will break every time MS changes the Session structure
function fakeBotSession(): BotBuilder.Session {
    let options: BotBuilder.ISessionOptions = {
        onSave: null,
        onSend: null,
        library: null,
        middleware: [],
        dialogId: null,
        localizer: null
    };

    let session = new BotBuilder.Session(options);

    session.message = {
        type: 'message',
        agent: 'botbuilder',
        source: 'directline',
        sourceEvent: null,
        address: null,
        user: null,
        timestamp: new Date().toISOString(),
        summary: '',
        text: '',
        textLocale: 'en-us',
        entities: [],
        textFormat: '',
        attachmentLayout: 'list',
        attachments: [
            {
                contentType: 'audio/wav',
                contentUrl: 'https://unexisting-audio-resource'
            }
        ]
    };

    session.send = sinon.stub(session, 'send');
    return session;
}
