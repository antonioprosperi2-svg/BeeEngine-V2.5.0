import { BeeEngine } from '../BeeEngine.js';
import { BeeDialogue, BeeInventory, BeeLocale, BeeQuest } from '../src/plugins/index.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const locale = new BeeLocale({
    language: 'it',
    fallback: 'en',
    strings: {
        it: {
            guide: 'Guida',
            hi: 'Ho perso la chiave del cancello. Mi aiuti a trovarla?',
            yes: 'Sì, la cerco io',
            no: 'Non ora',
            accepted: 'Grazie! Raccogli tre monete: il mercante la cede per quelle.',
            hint: 'Ti mancano ancora delle monete. Il passaggio segreto è facoltativo.',
            thanks: 'Hai la chiave! Apriamo il cancello?',
            give: 'Ecco la chiave',
            end: 'Il cancello è aperto. Buon viaggio!',
            q_find: 'La chiave perduta',
            q_find_d: 'Aiuta la guida a ritrovare la chiave del cancello.',
            g_talk: 'Parla con la guida',
            g_coins: 'Raccogli le monete',
            g_secret: 'Trova il passaggio segreto (facoltativo)',
            q_gate: 'Il cancello',
            q_gate_d: 'Restituisci la chiave alla guida.',
            g_open: 'Apri il cancello',
            item_chiave: 'Chiave',
            item_gemma: 'Gemma',
            started: 'Nuova quest',
            done: 'Quest completata',
            got: 'Ottenuto',
            diary: 'Diario',
            empty: 'Nessuna quest',
            bag: 'Zaino',
            saved: 'Salvato',
            loaded: 'Caricato',
            nosave: 'Nessun salvataggio',
            reset: 'Ricominciato',
            hud: 'E parla · C moneta · O segreto · Q diario · S salva · L carica · G lingua · R reset'
        },
        en: {
            guide: 'Guide',
            hi: 'I lost the gate key. Will you help me find it?',
            yes: 'Yes, I will look for it',
            no: 'Not now',
            accepted: 'Thanks! Collect three coins: the merchant trades the key for them.',
            hint: 'You still need some coins. The secret passage is optional.',
            thanks: 'You have the key! Shall we open the gate?',
            give: 'Here is the key',
            end: 'The gate is open. Safe travels!',
            q_find: 'The lost key',
            q_find_d: 'Help the guide find the gate key.',
            g_talk: 'Talk to the guide',
            g_coins: 'Collect the coins',
            g_secret: 'Find the secret passage (optional)',
            q_gate: 'The gate',
            q_gate_d: 'Give the key back to the guide.',
            g_open: 'Open the gate',
            item_chiave: 'Key',
            item_gemma: 'Gem',
            started: 'New quest',
            done: 'Quest complete',
            got: 'Received',
            diary: 'Journal',
            empty: 'No quests',
            bag: 'Bag',
            saved: 'Saved',
            loaded: 'Loaded',
            nosave: 'No save found',
            reset: 'Restarted',
            hud: 'E talk · C coin · O secret · Q journal · S save · L load · G language · R reset'
        }
    },
    engine: gioco
});

const inventory = new BeeInventory({ engine: gioco, slots: 8 });
inventory.defineItem('chiave', { maxStack: 1 });
inventory.defineItem('gemma', { maxStack: 1 });
const initialBag = inventory.toJSON();

const quest = new BeeQuest({ engine: gioco, inventory, locale });
quest.defineAll({
    'cerca-chiave': {
        titleKey: 'q_find',
        descriptionKey: 'q_find_d',
        goals: [
            { id: 'parla', type: 'flag', flag: 'parlato', labelKey: 'g_talk' },
            { id: 'monete', type: 'count', target: 3, labelKey: 'g_coins' },
            {
                id: 'segreto',
                optional: true,
                labelKey: 'g_secret',
                rewards: [{ type: 'item', id: 'gemma' }]
            }
        ],
        rewards: [{ type: 'item', id: 'chiave' }]
    },
    'apri-cancello': {
        titleKey: 'q_gate',
        descriptionKey: 'q_gate_d',
        requires: ['cerca-chiave'],
        goals: [{ id: 'apri', type: 'flag', flag: 'cancello_aperto', labelKey: 'g_open' }]
    }
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
                {
                    textKey: 'yes',
                    next: 'accepted',
                    data: { startQuest: 'cerca-chiave', flag: 'parlato' }
                },
                { textKey: 'no', next: null }
            ]
        },
        { id: 'accepted', speakerKey: 'guide', textKey: 'accepted' },
        { id: 'hint', speakerKey: 'guide', textKey: 'hint' },
        {
            id: 'thanks',
            speakerKey: 'guide',
            textKey: 'thanks',
            choices: [
                {
                    textKey: 'give',
                    next: 'end',
                    data: { startQuest: 'apri-cancello', flag: 'cancello_aperto' }
                }
            ]
        },
        { id: 'end', speakerKey: 'guide', textKey: 'end' }
    ]
});

// Dialogo → quest: i `data` delle scelte avviano quest e impostano flag.
dialogue.onChange((event) => {
    if (event.type !== 'choice' || !event.data) return;
    if (event.data.startQuest) quest.start(event.data.startQuest);
    if (event.data.flag) quest.setFlag(event.data.flag, event.data.value ?? true);
});

function guideNode() {
    if (quest.isDone('apri-cancello')) return 'end';
    if (quest.isDone('cerca-chiave')) return 'thanks';
    if (quest.isActive('cerca-chiave')) return 'hint';
    return 'intro';
}

// Notifiche a schermo: nascono dagli eventi della quest.
const toasts = [];
function toast(text) {
    toasts.push({ text, ttl: 3.2 });
    if (toasts.length > 5) toasts.shift();
}

quest.onChange((event) => {
    if (event.type === 'start') {
        toast(`${locale.t('started')}: ${quest.describe(event.id).title}`);
    } else if (event.type === 'goal') {
        const goal = quest.describe(event.id).goals.find((g) => g.id === event.goalId);
        toast(`✓ ${goal.label}`);
    } else if (event.type === 'progress') {
        const goal = quest.describe(event.id).goals.find((g) => g.id === event.goalId);
        toast(`${goal.label}: ${event.value}/${event.target}`);
    } else if (event.type === 'done') {
        toast(`${locale.t('done')}: ${quest.describe(event.id).title}`);
    } else if (event.type === 'reward' && event.granted && event.reward.type === 'item') {
        toast(`${locale.t('got')}: ${locale.t(`item_${event.reward.id}`)}`);
    }
});

// Salvataggio: localStorage, con ripiego in memoria se non è disponibile.
const SAVE_KEY = 'beequest-demo';
let memorySave = null;

function writeSave(text) {
    try {
        localStorage.setItem(SAVE_KEY, text);
    } catch {
        memorySave = text;
    }
}

function readSave() {
    try {
        return localStorage.getItem(SAVE_KEY) || memorySave;
    } catch {
        return memorySave;
    }
}

function save() {
    writeSave(JSON.stringify({
        quest: quest.toJSON(),
        dialogue: dialogue.toJSON(),
        inventory: inventory.toJSON(),
        language: locale.language
    }));
    toast(locale.t('saved'));
}

function load() {
    const text = readSave();
    if (!text) {
        toast(locale.t('nosave'));
        return;
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        toast(locale.t('nosave'));
        return;
    }
    if (data.language) locale.setLanguage(data.language);
    inventory.fromJSON(data.inventory);
    quest.fromJSON(data.quest);
    quest.evaluate();
    dialogue.fromJSON(data.dialogue);
    toast(locale.t('loaded'));
}

function restart() {
    dialogue.clear();
    quest.clear();
    inventory.fromJSON(initialBag);
    toasts.length = 0;
    toast(locale.t('reset'));
}

let diaryOpen = false;

function wrap(ctx, text, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines;
}

const scene = {
    entities: [],

    update(dt, input) {
        for (let i = toasts.length - 1; i >= 0; i--) {
            toasts[i].ttl -= dt;
            if (toasts[i].ttl <= 0) toasts.splice(i, 1);
        }
        if (!input) return;

        if (input.wasPressed('KeyG')) {
            locale.setLanguage(locale.language === 'it' ? 'en' : 'it');
        }

        if (dialogue.isOpen()) {
            dialogue.handleInput(input);
            return;
        }

        if (input.wasPressed('KeyE')) dialogue.start(guideNode());
        if (input.wasPressed('KeyQ')) diaryOpen = !diaryOpen;
        if (input.wasPressed('KeyS')) save();
        if (input.wasPressed('KeyL')) load();
        if (input.wasPressed('KeyR')) restart();
        if (input.wasPressed('KeyC') && quest.isActive('cerca-chiave')) {
            quest.addProgress('cerca-chiave', 'monete');
        }
        if (input.wasPressed('KeyO') && quest.isActive('cerca-chiave') && !quest.goalDone('cerca-chiave', 'segreto')) {
            quest.complete('cerca-chiave', 'segreto');
        }
    },

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);

        // Guida
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(200, 250, 44, 90);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(206, 230, 32, 28);

        // Cancello: si apre con il flag
        const open = quest.flag('cancello_aperto') === true;
        ctx.fillStyle = '#475569';
        ctx.fillRect(560, 220, 14, 130);
        ctx.fillRect(700, 220, 14, 130);
        ctx.fillStyle = open ? '#22c55e' : '#b45309';
        if (open) {
            ctx.fillRect(574, 220, 8, 130);
            ctx.fillRect(692, 220, 8, 130);
        } else {
            ctx.fillRect(574, 220, 126, 130);
        }
    },

    draw(ctx) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '14px monospace';

        // Zaino
        ctx.fillStyle = '#94a3b8';
        const items = inventory.list().filter(Boolean);
        const bag = items.map((s) => `${locale.t(`item_${s.id}`)}${s.qty > 1 ? ` x${s.qty}` : ''}`).join(', ');
        ctx.fillText(`${locale.t('bag')}: ${bag || '-'}`, 16, 16);

        // Obiettivi attivi, sempre visibili
        ctx.fillStyle = '#ffe08a';
        let y = 44;
        const active = quest.list('active');
        for (const view of active) {
            ctx.fillStyle = '#ffe08a';
            ctx.fillText(view.title, 16, y);
            y += 20;
            for (const goal of view.goals) {
                if (goal.hidden) continue;
                const count = goal.target ? ` ${goal.progress}/${goal.target}` : '';
                ctx.fillStyle = goal.done ? '#4ade80' : '#cbd5e1';
                ctx.fillText(`${goal.done ? '[x]' : '[ ]'} ${goal.label}${count}`, 32, y);
                y += 18;
            }
            y += 8;
        }

        // Diario (Q)
        if (diaryOpen) {
            ctx.fillStyle = 'rgba(8, 10, 16, 0.92)';
            ctx.fillRect(400, 16, 384, 300);
            ctx.strokeStyle = '#ffd700';
            ctx.strokeRect(400.5, 16.5, 383, 299);
            ctx.fillStyle = '#ffd700';
            ctx.fillText(locale.t('diary'), 414, 28);
            let dy = 54;
            const all = quest.list();
            const started = all.filter((v) => v.status !== 'inactive');
            if (started.length === 0) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(locale.t('empty'), 414, dy);
            }
            for (const view of started) {
                ctx.fillStyle = view.status === 'done' ? '#4ade80' : '#ffe08a';
                ctx.fillText(`${view.status === 'done' ? '✓' : '•'} ${view.title}`, 414, dy);
                dy += 20;
                ctx.fillStyle = '#94a3b8';
                for (const line of wrap(ctx, view.description, 340)) {
                    ctx.fillText(line, 430, dy);
                    dy += 18;
                }
                dy += 8;
            }
        }

        // Notifiche
        ctx.textAlign = 'right';
        let ty = 16;
        for (const item of toasts) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, item.ttl)})`;
            ctx.fillText(item.text, 784, ty);
            ty += 20;
        }
        ctx.textAlign = 'left';

        // Comandi
        if (!dialogue.isOpen()) {
            ctx.fillStyle = '#64748b';
            ctx.fillText(locale.t('hud'), 16, 456);
        }

        dialogue.draw(ctx, { x: 40, width: ctx.canvas.width - 80 });
    }
};

gioco.scenes.add('quest', scene);
gioco.scenes.change('quest');
gioco.start();
