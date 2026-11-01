import { BeeEngine } from '../BeeEngine.js';
import { BeeDialogue, BeeLocale } from '../src/plugins/index.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const locale = new BeeLocale({
    language: 'it',
    fallback: 'en',
    strings: {
        it: {
            guide: 'Guida',
            hi: 'Ciao, viaggiatore. Cerchi qualcosa?',
            ask_map: 'Chiedi della mappa',
            bye: 'Addio',
            map: 'Il villaggio è a est, oltre il ponte.',
            tip: 'Porta una torcia: la notte è lunga.',
            talk: 'E interagisci',
            talking: 'Dialogo aperto',
            last: 'Ultima scelta'
        },
        en: {
            guide: 'Guide',
            hi: 'Hello, traveller. Looking for something?',
            ask_map: 'Ask about the map',
            bye: 'Farewell',
            map: 'The village is east, past the bridge.',
            tip: 'Bring a torch: the night is long.',
            talk: 'E to interact',
            talking: 'Dialogue open',
            last: 'Last choice'
        }
    },
    engine: gioco
});

const dialogue = new BeeDialogue({ engine: gioco, locale, cancelKey: 'Escape' });
dialogue.load({
    start: 'intro',
    nodes: [
        {
            id: 'intro',
            speakerKey: 'guide',
            textKey: 'hi',
            choices: [
                { textKey: 'ask_map', next: 'map', data: { topic: 'map' } },
                { textKey: 'bye', next: null, data: { topic: 'bye' } }
            ]
        },
        { id: 'map', speakerKey: 'guide', textKey: 'map', next: 'tip' },
        { id: 'tip', speakerKey: 'guide', textKey: 'tip' }
    ]
});

let lastTopic = '';
dialogue.onChange((event) => {
    if (event.type === 'choice' && event.data) lastTopic = event.data.topic;
});

const scene = {
    entities: [],

    update(_dt, input) {
        if (!input) return;
        if (input.wasPressed('KeyL')) {
            locale.setLanguage(locale.language === 'it' ? 'en' : 'it');
        }
        if (input.wasPressed('KeyE') && !dialogue.isOpen()) dialogue.start();
        dialogue.handleInput(input);
    },

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(360, 170, 44, 90);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(366, 150, 32, 28);
    },

    draw(ctx) {
        ctx.fillStyle = '#ffe08a';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(dialogue.isOpen() ? locale.t('talking') : locale.t('talk'), 16, 16);
        if (lastTopic) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`${locale.t('last')}: ${lastTopic}`, 16, 40);
        }
        dialogue.draw(ctx, { x: 40, width: ctx.canvas.width - 80 });
    }
};

gioco.scenes.add('talk', scene);
gioco.scenes.change('talk');
gioco.start();
