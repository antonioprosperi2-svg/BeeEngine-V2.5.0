import { readFileSync } from 'node:fs';
import { BeeQuest } from '../src/plugins/BeeQuest.js';
import { BeeQuest as FromIndex } from '../src/plugins/index.js';
import { BeeInventory } from '../src/plugins/BeeInventory.js';
import { BeeDialogue } from '../src/plugins/BeeDialogue.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function same(a, b, message) {
    assert(JSON.stringify(a) === JSON.stringify(b), `${message}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

function warnsOf(fn) {
    const prev = console.warn;
    const messages = [];
    console.warn = (...args) => {
        messages.push(args.map((part) => String(part)).join(' '));
    };
    try {
        const value = fn();
        return { value, messages };
    } finally {
        console.warn = prev;
    }
}

function quiet(fn) {
    return warnsOf(fn).value;
}

function throws(fn) {
    try {
        quiet(fn);
    } catch {
        return true;
    }
    return false;
}

function fakeEngine() {
    const plugins = new Map();
    return {
        registerPlugin(name, plugin) { plugins.set(name, plugin); },
        unregisterPlugin(name) { plugins.delete(name); },
        plugin(name) { return plugins.get(name) || null; }
    };
}

function fakeInventory(result) {
    const inv = {
        adds: [],
        removes: [],
        add(id, qty) {
            inv.adds.push([id, qty]);
            return typeof result === 'function' ? result(id, qty) : { added: qty, left: 0 };
        },
        remove(id, qty) {
            inv.removes.push([id, qty]);
            return qty;
        }
    };
    return inv;
}

function record(quest) {
    const events = [];
    quest.onChange((event) => events.push(event));
    return events;
}

const types = (events) => events.map((event) => event.type);

const KEY_QUEST = {
    title: 'La chiave perduta',
    description: 'Trova la chiave.',
    goals: [
        { id: 'parla', type: 'flag', flag: 'parlato' },
        { id: 'monete', type: 'count', target: 3, label: 'Tre monete' },
        { id: 'segreto', optional: true, label: 'Il passaggio segreto' }
    ],
    rewards: [{ type: 'item', id: 'chiave', qty: 1 }]
};

function fresh(options = {}) {
    return new BeeQuest(options).define('chiave', KEY_QUEST);
}

// ------------------------------------------------------------------ export / sorgente

assert(FromIndex === BeeQuest, 'src/plugins/index.js esporta BeeQuest');

{
    const source = readFileSync(new URL('../src/plugins/BeeQuest.js', import.meta.url), 'utf8');
    assert(!/^\s*import\s/m.test(source) && !/import\s*\(/.test(source), 'BeeQuest.js non importa nulla');
    assert(!source.includes('onTick'), 'BeeQuest.js non usa onTick');
    assert(!source.includes('engine.loop'), 'BeeQuest.js non tocca engine.loop');
    assert(!source.includes('addEventListener'), 'BeeQuest.js non ascolta eventi');

    const engineSource = readFileSync(new URL('../BeeEngine.js', import.meta.url), 'utf8');
    assert(!engineSource.includes('BeeQuest'), 'BeeEngine.js non nomina BeeQuest');
    assert(!engineSource.includes('src/plugins'), 'BeeEngine.js non nomina src/plugins');
    assert(!/from ['"].*plugins/.test(engineSource), 'BeeEngine.js non importa plugin');
}

// ------------------------------------------------------------------ attach / detach

{
    const engine = fakeEngine();
    const quest = new BeeQuest({ engine });
    assert(engine.plugin('quest') === quest, 'il costruttore con engine attacca come "quest"');
    quest.define('a', { goals: [{ id: 'g' }] }).start('a');
    quest.detach();
    assert(engine.plugin('quest') === null, 'detach smonta');
    assert(quest.engine === null, 'detach azzera engine');
    assert(quest.status('a') === 'active', 'detach non azzera definizioni né stato');
    quest.attach(engine);
    assert(engine.plugin('quest') === quest, 'attach registra');
    assert(new BeeQuest().attach({}).engine !== null, 'attach tollera un engine senza registro');
}

// ------------------------------------------------------------------ define

{
    const quest = new BeeQuest();
    const events = record(quest);
    quest.define('a', { goals: [] });
    assert(quest.has('a') && !quest.has('b') && !quest.has(42), 'has');
    same(types(events), ['define'], 'define emette define');
    assert(events[0].id === 'a', 'define: id');
    same(quest.ids(), ['a'], 'ids');
    assert(quest.status('a') === 'inactive', 'una quest nuova è inactive');
    assert(quest.status('zzz') === null, 'quest sconosciuta: status null');

    assert(throws(() => quest.define('a', { goals: [] })), 'id duplicato lancia');
    assert(throws(() => quest.define('', { goals: [] })), 'id vuoto lancia');
    assert(throws(() => quest.define(7, { goals: [] })), 'id non stringa lancia');
    assert(throws(() => quest.define('b')), 'definizione mancante lancia');
    assert(throws(() => quest.define('b', [])), 'definizione array lancia');
    assert(throws(() => quest.define('b', {})), 'goals mancante lancia');
    assert(throws(() => quest.define('b', { goals: 'x' })), 'goals non array lancia');
    assert(throws(() => quest.define('b', { goals: [null] })), 'goal non oggetto lancia');
    assert(throws(() => quest.define('b', { goals: [{ type: 'manual' }] })), 'goal senza id lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: '' }] })), 'goal con id vuoto lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x' }, { id: 'x' }] })), 'goal duplicato lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'flag' }] })), 'flag senza flag lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'flag', flag: 'f', equals: 1, min: 1 }] })), 'equals con min lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'flag', flag: 'f', min: 'x' }] })), 'min non numerico lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'count' }] })), 'count senza target lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'count', target: 0 }] })), 'count target 0 lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'count', target: 1.5 }] })), 'count target frazionario lancia');
    assert(throws(() => quest.define('b', { goals: [{ id: 'x', type: 'count', target: '3' }] })), 'count target stringa lancia');
    assert(throws(() => quest.define('b', { goals: [], requires: 'a' })), 'requires non array lancia');
    assert(throws(() => quest.define('b', { goals: [], requires: ['b'] })), 'requires se stessa lancia');
    assert(throws(() => quest.define('b', { goals: [], rewards: 'x' })), 'rewards non array lancia');
    assert(!quest.has('b'), 'una define fallita non lascia tracce');
    same(types(events), ['define'], 'una define fallita non emette');

    const w = warnsOf(() => quest.define('c', { goals: [], mode: 'boh', order: 'boh', rewards: [{ id: 'x' }] }));
    assert(w.messages.length === 3, 'mode/order non validi e reward senza type avvisano');
    assert(quest.describe('c').mode === 'all' && quest.describe('c').order === 'free', 'default mode/order');

    const many = new BeeQuest().defineAll({ x: { goals: [] }, y: { goals: [] } });
    same(many.ids(), ['x', 'y'], 'defineAll con oggetto');
    const arr = new BeeQuest().defineAll([{ id: 'p', goals: [] }, { id: 'q', goals: [] }]);
    same(arr.ids(), ['p', 'q'], 'defineAll con array');
    assert(throws(() => new BeeQuest().defineAll(null)), 'defineAll non valido lancia');
}

// ------------------------------------------------------------------ start / requires

{
    const quest = new BeeQuest();
    quest.define('a', { goals: [{ id: 'g' }] });
    quest.define('b', { goals: [{ id: 'g' }], requires: ['a'] });
    const events = record(quest);

    assert(warnsOf(() => quest.start('zzz')).value === false, 'start su quest sconosciuta: false');
    assert(warnsOf(() => quest.start('b')).value === false, 'start con requires non soddisfatto: false');
    assert(quest.status('b') === 'inactive', 'b resta inactive');
    assert(quest.start('a') === true, 'start');
    assert(warnsOf(() => quest.start('a')).value === false, 'start su attiva: false');
    same(types(events), ['start'], 'un solo start');
    quest.completeQuest('a');
    assert(quest.start('b') === true, 'start con requires soddisfatto');
    assert(warnsOf(() => quest.start('a')).value === false, 'start su done: false');
}

// ------------------------------------------------------------------ goal manuali, mode, optional

{
    const quest = fresh();
    const events = record(quest);
    quest.start('chiave');
    assert(warnsOf(() => quest.complete('chiave', 'zzz')).value === false, 'goal sconosciuto: false');
    assert(warnsOf(() => quest.complete('zzz', 'segreto')).value === false, 'quest sconosciuta: false');
    assert(quest.complete('chiave', 'segreto') === true, 'complete su goal manuale');
    assert(warnsOf(() => quest.complete('chiave', 'segreto')).value === false, 'complete due volte: false');
    assert(quest.isActive('chiave'), 'il goal opzionale non chiude la quest');
    assert(quest.goalDone('chiave', 'segreto') && !quest.goalDone('chiave', 'parla'), 'goalDone');

    quest.setFlag('parlato', true);
    assert(quest.goalDone('chiave', 'parla'), 'il goal flag si chiude da solo');
    assert(quest.isActive('chiave'), 'mancano ancora le monete');
    quest.addProgress('chiave', 'monete', 3);
    assert(quest.isDone('chiave'), 'tutti i non opzionali fatti: quest done');
    same(types(events).filter((t) => t === 'done'), ['done'], 'done una sola volta');
}

{
    const quest = new BeeQuest();
    quest.define('a', { goals: [{ id: 'x' }, { id: 'y' }], mode: 'any' });
    quest.start('a');
    quest.complete('a', 'y');
    assert(quest.isDone('a'), 'mode any: basta un goal');
}

{
    const quest = new BeeQuest();
    quest.define('a', { goals: [{ id: 'x', optional: true }, { id: 'y', optional: true }] });
    quest.start('a');
    quest.complete('a', 'x');
    quest.complete('a', 'y');
    assert(quest.isActive('a'), 'mode all con soli goal opzionali non si chiude da solo');
    quest.define('v', { goals: [] });
    quest.start('v');
    quest.evaluate();
    assert(quest.isActive('v'), 'quest senza goal non si chiude da sola');
    assert(quest.completeQuest('v') && quest.isDone('v'), 'completeQuest la chiude');
}

// ------------------------------------------------------------------ sequential

{
    const quest = new BeeQuest();
    quest.define('a', { goals: [{ id: 'x' }, { id: 'y' }, { id: 'z' }], order: 'sequential' });
    quest.start('a');
    assert(warnsOf(() => quest.complete('a', 'y')).value === false, 'sequential: goal bloccato');
    const view = quest.describe('a');
    same(view.goals.map((g) => g.available), [true, false, false], 'available iniziale');
    quest.complete('a', 'x');
    same(quest.describe('a').goals.map((g) => g.available), [true, true, false], 'available dopo x');
    quest.complete('a', 'y');
    quest.complete('a', 'z');
    assert(quest.isDone('a'), 'sequential completo');

    const auto = new BeeQuest();
    auto.define('a', {
        order: 'sequential',
        goals: [{ id: 'x' }, { id: 'f', type: 'flag', flag: 'ok' }]
    });
    auto.start('a');
    auto.setFlag('ok', true);
    assert(!auto.goalDone('a', 'f'), 'sequential: un goal flag bloccato non si chiude');
    auto.complete('a', 'x');
    assert(auto.isDone('a'), 'sbloccato, il goal flag già vero si chiude subito');
}

// ------------------------------------------------------------------ flag

{
    const quest = new BeeQuest();
    quest.define('a', {
        goals: [
            { id: 'eq', type: 'flag', flag: 'colore', equals: 'rosso' },
            { id: 'min', type: 'flag', flag: 'oro', min: 10 },
            { id: 'def', type: 'flag', flag: 'aperta' },
            { id: 'man' }
        ]
    });
    quest.setFlag('aperta', true); // già vero prima dello start
    const events = record(quest);
    quest.start('a');
    assert(quest.goalDone('a', 'def'), 'flag già vero allo start: goal fatto');
    same(types(events), ['start', 'goal'], 'start poi goal');

    quest.setFlag('colore', 'blu');
    assert(!quest.goalDone('a', 'eq'), 'equals: valore diverso');
    quest.setFlag('colore', 'rosso');
    assert(quest.goalDone('a', 'eq'), 'equals: valore giusto');
    quest.setFlag('colore', 'blu');
    assert(quest.goalDone('a', 'eq'), 'un goal fatto resta fatto');

    quest.setFlag('oro', 9);
    assert(!quest.goalDone('a', 'min'), 'min: sotto soglia');
    quest.setFlag('oro', 'tanto');
    assert(!quest.goalDone('a', 'min'), 'min: valore non numerico');
    quest.setFlag('oro', 10);
    assert(quest.goalDone('a', 'min'), 'min: a soglia');

    const w = warnsOf(() => [
        quest.setFlag('', 1), quest.setFlag(3, 1), quest.setFlag('x', {}),
        quest.setFlag('x', undefined), quest.setFlag('x', NaN), quest.setFlag('x', Infinity)
    ]);
    assert(w.value.every((v) => v === false) && w.messages.length === 6, 'setFlag non valido: false + avviso');
    same(quest.flags().x, undefined, 'nessun flag scritto');

    const before = events.length;
    assert(quest.setFlag('oro', 10) === false, 'valore invariato: false');
    assert(events.length === before, 'valore invariato: nessun evento');
    assert(quest.flag('mancante') === undefined && quest.flag('mancante', 7) === 7, 'flag con fallback');
    assert(quest.setFlag('n', null) === true && quest.flag('n', 'fb') === null, 'null è un valore valido');

    const last = events.length;
    assert(quest.clearFlag('oro') === true && quest.flag('oro') === undefined, 'clearFlag');
    const ev = events[last];
    assert(ev.type === 'flag' && ev.key === 'oro' && ev.value === undefined && ev.previous === 10, 'clearFlag emette flag');
    assert(quest.clearFlag('oro') === false, 'clearFlag su assente: false');

    const first = events.find((e) => e.type === 'flag');
    assert(first.key === 'aperta' || first.key === 'colore', 'evento flag con key');
    const set = events.filter((e) => e.type === 'flag' && e.key === 'colore');
    assert(set[0].previous === undefined && set[0].value === 'blu', 'evento flag: previous/value');
}

{
    const quest = new BeeQuest();
    quest.setFlag('__proto__', 1);
    assert(quest.flag('__proto__') === 1, 'flag __proto__ come chiave normale');
    assert(Object.getPrototypeOf(quest.flags()) === Object.prototype, 'flags() non inquina il prototipo');
    const copy = new BeeQuest().fromJSON(JSON.parse(JSON.stringify(quest.toJSON())));
    assert(copy.flag('__proto__') === 1, '__proto__ sopravvive al salvataggio');
}

// ------------------------------------------------------------------ count

{
    const quest = fresh();
    const events = record(quest);
    quest.start('chiave');
    assert(warnsOf(() => quest.addProgress('chiave', 'parla')).value === false, 'addProgress su non count: false');
    assert(warnsOf(() => quest.addProgress('chiave', 'monete', 0)).value === false, 'amount 0: false');
    assert(warnsOf(() => quest.addProgress('chiave', 'monete', -1)).value === false, 'amount negativo: false');
    assert(warnsOf(() => quest.addProgress('chiave', 'monete', NaN)).value === false, 'amount NaN: false');
    assert(warnsOf(() => quest.addProgress('chiave', 'monete', 'x')).value === false, 'amount stringa: false');

    assert(quest.addProgress('chiave', 'monete') === true, 'addProgress default 1');
    same(quest.progress('chiave', 'monete'), { value: 1, target: 3 }, 'progress');
    quest.addProgress('chiave', 'monete', 1.5);
    same(quest.progress('chiave', 'monete'), { value: 2.5, target: 3 }, 'amount frazionario ammesso');
    quest.addProgress('chiave', 'monete', 99);
    same(quest.progress('chiave', 'monete'), { value: 3, target: 3 }, 'si ferma a target');
    assert(quest.goalDone('chiave', 'monete'), 'goal count chiuso');
    assert(warnsOf(() => quest.addProgress('chiave', 'monete')).value === false, 'goal già fatto: false');

    const prog = events.filter((e) => e.type === 'progress');
    same(prog.map((e) => e.value), [1, 2.5, 3], 'valori degli eventi progress');
    assert(prog[0].goalId === 'monete' && prog[0].target === 3 && prog[0].id === 'chiave', 'campi di progress');
    assert(quest.progress('chiave', 'parla') === null && quest.progress('zzz', 'x') === null, 'progress null se non count');

    const q2 = fresh();
    q2.start('chiave');
    q2.complete('chiave', 'monete');
    same(q2.progress('chiave', 'monete'), { value: 3, target: 3 }, 'complete su count porta a target');
    const inactive = fresh();
    assert(warnsOf(() => inactive.addProgress('chiave', 'monete')).value === false, 'addProgress su quest inattiva: false');
    assert(warnsOf(() => inactive.complete('chiave', 'segreto')).value === false, 'complete su quest inattiva: false');
}

// ------------------------------------------------------------------ tipi personalizzati

{
    const quest = new BeeQuest();
    let seen = null;
    quest.defineGoalType('boss', (goal, api) => {
        seen = { goal, api };
        return api.flag('boss_morto') === true;
    });
    quest.define('a', { goals: [{ id: 'b', type: 'boss', colore: 'rosso' }, { id: 'm' }] });
    quest.start('a');
    assert(!quest.goalDone('a', 'b'), 'check falsa');
    assert(seen.goal.colore === 'rosso' && seen.goal.id === 'b', 'la check riceve il goal con i campi extra');
    assert(typeof seen.api.flag === 'function' && typeof seen.api.progress === 'function' && typeof seen.api.status === 'function', 'api della check');
    seen.goal.id = 'manomesso';
    quest.setFlag('boss_morto', true);
    assert(quest.goalDone('a', 'b'), 'check vera: goal fatto');
    assert(quest.describe('a').goals[0].id === 'b', 'la copia passata alla check non tocca la definizione');
    assert(quest.describe('a').goals[0].data.colore === 'rosso', 'campi sconosciuti in describe().goals[].data');

    quest.defineGoalType('boom', () => { throw new Error('esplode'); });
    quest.define('b', { goals: [{ id: 'x', type: 'boom' }] });
    const w = warnsOf(() => quest.start('b'));
    assert(w.value === true && w.messages.length === 1, 'una check che lancia avvisa e conta come falsa');
    assert(!quest.goalDone('b', 'x'), 'goal non chiuso');

    assert(warnsOf(() => quest.defineGoalType('flag', () => true)).messages.length === 1, 'tipo incluso ignorato con avviso');
    assert(warnsOf(() => quest.defineGoalType('', () => true)).messages.length === 1, 'type vuoto: avviso');
    assert(warnsOf(() => quest.defineGoalType('x', 'no')).messages.length === 1, 'check non funzione: avviso');

    const unk = new BeeQuest();
    const w2 = warnsOf(() => unk.define('a', { goals: [{ id: 'g', type: 'misterioso' }] }));
    assert(w2.messages.length === 1, 'type sconosciuto: avviso');
    unk.start('a');
    unk.evaluate();
    assert(!unk.goalDone('a', 'g'), 'type sconosciuto non si chiude da solo');
    assert(unk.describe('a').goals[0].type === 'misterioso', 'il type dichiarato resta');
    assert(unk.complete('a', 'g') && unk.isDone('a'), 'type sconosciuto si chiude con complete');

    const stat = new BeeQuest();
    stat.defineGoalType('dopo', (goal, api) => api.status('prima') === 'done');
    stat.define('prima', { goals: [{ id: 'x' }] });
    stat.define('seconda', { goals: [{ id: 'y', type: 'dopo' }] });
    stat.start('prima');
    stat.start('seconda');
    stat.complete('prima', 'x');
    assert(stat.isDone('seconda'), 'api.status e rivalutazione a catena');

    const cnt = new BeeQuest();
    cnt.defineGoalType('metà', (goal, api) => api.progress('c') >= 2);
    cnt.define('a', { goals: [{ id: 'c', type: 'count', target: 4 }, { id: 'h', type: 'metà' }] });
    cnt.start('a');
    cnt.addProgress('a', 'c', 2);
    assert(cnt.goalDone('a', 'h') && !cnt.goalDone('a', 'c'), 'api.progress');
}

// ------------------------------------------------------------------ fail / reset / completeQuest

{
    const inv = fakeInventory();
    const quest = fresh({ inventory: inv });
    const events = record(quest);
    assert(warnsOf(() => quest.fail('chiave')).value === false, 'fail su inattiva: false');
    assert(warnsOf(() => quest.completeQuest('chiave')).value === false, 'completeQuest su inattiva: false');
    quest.start('chiave');
    assert(quest.fail('chiave', 'tempo scaduto') === true, 'fail');
    assert(quest.status('chiave') === 'failed', 'status failed');
    const ev = events.find((e) => e.type === 'fail');
    assert(ev.id === 'chiave' && ev.reason === 'tempo scaduto', 'evento fail con reason');
    assert(warnsOf(() => quest.complete('chiave', 'segreto')).value === false, 'su failed i goal non si chiudono');
    assert(warnsOf(() => quest.fail('chiave')).value === false, 'fail su failed: false');
    assert(warnsOf(() => quest.start('chiave')).value === false, 'start su failed: false (serve reset)');

    quest.setFlag('parlato', true);
    assert(quest.reset('chiave') === true, 'reset');
    assert(quest.status('chiave') === 'inactive' && !quest.goalDone('chiave', 'parla'), 'reset azzera stato');
    assert(quest.flag('parlato') === true, 'reset non tocca i flag');
    assert(events.some((e) => e.type === 'reset' && e.id === 'chiave'), 'evento reset');
    assert(warnsOf(() => quest.reset('zzz')).value === false, 'reset su sconosciuta: false');

    quest.start('chiave'); // flag già vero → goal parla subito
    quest.completeQuest('chiave');
    assert(quest.isDone('chiave'), 'completeQuest chiude con goal aperti');
    assert(inv.adds.length === 1, 'ricompensa data una volta');
    quest.reset('chiave');
    quest.start('chiave');
    quest.completeQuest('chiave');
    assert(inv.adds.length === 2, 'dopo reset la ricompensa si può ridare');
    assert(quest.describe('chiave').rewarded === true, 'describe().rewarded');
}

// ------------------------------------------------------------------ ricompense

{
    // item con inventario finto, ordine eventi
    const inv = fakeInventory();
    const quest = new BeeQuest({ inventory: inv });
    quest.define('a', {
        goals: [{ id: 'g', rewards: [{ type: 'item', id: 'spada', qty: 2 }] }],
        rewards: [{ type: 'item', id: 'oro' }]
    });
    quest.start('a');
    const events = record(quest);
    quest.complete('a', 'g');
    same(types(events), ['goal', 'reward', 'done', 'reward'], 'ordine: goal, ricompensa goal, done, ricompensa quest');
    same(inv.adds, [['spada', 2], ['oro', 1]], 'add chiamato con id e qty (default 1)');
    assert(events[1].goalId === 'g' && events[1].granted === true && events[1].reward.id === 'spada', 'reward del goal');
    assert(events[3].goalId === undefined && events[3].granted === true, 'reward della quest senza goalId');
}

{
    // senza inventario
    const quest = fresh();
    const events = record(quest);
    quest.start('chiave');
    quest.completeQuest('chiave');
    const reward = events.find((e) => e.type === 'reward');
    assert(reward.granted === false, 'senza inventario: granted false');
    assert(quest.isDone('chiave'), 'la quest si chiude lo stesso');
}

{
    // add rifiuta / lancia / ritorna male / metà
    const make = (result) => {
        const inv = fakeInventory(result);
        const quest = new BeeQuest({ inventory: inv });
        quest.define('a', { goals: [], rewards: [{ type: 'item', id: 'x', qty: 4 }] });
        quest.start('a');
        const events = record(quest);
        const w = warnsOf(() => quest.completeQuest('a'));
        return { inv, events, w, granted: events.find((e) => e.type === 'reward').granted };
    };
    assert(make(() => ({ added: 0, left: 4 })).granted === false, 'add rifiuta: granted false');
    assert(make(() => { throw new Error('no'); }).granted === false, 'add lancia: granted false');
    assert(make(() => { throw new Error('no'); }).w.messages.length === 1, 'add lancia: un avviso');
    const bad = make(() => 'boh');
    assert(bad.granted === false && bad.w.messages.length === 1, 'add ritorna un non-oggetto: granted false + avviso');
    const half = make(() => ({ added: 1, left: 3 }));
    assert(half.granted === false, 'consegna a metà: granted false');
    same(half.inv.removes, [['x', 1]], 'consegna a metà: annullata con remove');
    assert(make(() => ({ added: 4, left: 0 })).granted === true, 'consegna intera: granted true');
    assert(make(() => ({ added: 4, left: 1 })).granted === false, 'left > 0: granted false');
}

{
    // BeeInventory vero
    const inventory = new BeeInventory({ slots: 2 });
    inventory.defineItem('chiave', { maxStack: 1 });
    inventory.defineItem('moneta', { maxStack: 5 });
    const quest = new BeeQuest({ inventory });
    quest.define('k', { goals: [], rewards: [{ type: 'item', id: 'chiave' }] });
    quest.define('m', { goals: [], rewards: [{ type: 'item', id: 'moneta', qty: 8 }] });
    quest.define('u', { goals: [], rewards: [{ type: 'item', id: 'fantasma' }] });
    const events = record(quest);

    quest.start('k');
    quest.completeQuest('k');
    assert(inventory.count('chiave') === 1, 'BeeInventory: oggetto consegnato');
    assert(events.find((e) => e.type === 'reward').granted === true, 'BeeInventory: granted true');

    inventory.add('moneta', 2);
    quest.start('m');
    quest.completeQuest('m');
    assert(inventory.count('moneta') === 2, 'BeeInventory: consegna a metà annullata');
    assert(events.filter((e) => e.type === 'reward')[1].granted === false, 'BeeInventory: pieno, granted false');

    quest.start('u');
    const w = warnsOf(() => quest.completeQuest('u'));
    assert(events.filter((e) => e.type === 'reward')[2].granted === false, 'BeeInventory: oggetto sconosciuto, granted false');
    assert(w.messages.length >= 1, 'BeeInventory: avvisa sull\'oggetto sconosciuto');
}

{
    // flag, tipi sconosciuti
    const quest = new BeeQuest();
    quest.define('a', {
        goals: [],
        rewards: [
            { type: 'flag', id: 'ha_chiave', value: 3 },
            { type: 'flag', id: 'default' },
            { type: 'flag', id: 'cattivo', value: {} },
            { type: 'flag' },
            { type: 'xp', qty: 50 }
        ]
    });
    quest.start('a');
    const events = record(quest);
    const w = warnsOf(() => quest.completeQuest('a'));
    const rewards = events.filter((e) => e.type === 'reward');
    same(rewards.map((e) => e.granted), [true, true, false, false, false], 'granted per tipo di ricompensa');
    assert(quest.flag('ha_chiave') === 3 && quest.flag('default') === true, 'ricompensa flag scritta');
    assert(w.messages.length === 2, 'ricompense flag non valide avvisano');
    assert(rewards[4].reward.type === 'xp' && rewards[4].reward.qty === 50, 'tipo sconosciuto emesso così com\'è');
    assert(events.some((e) => e.type === 'flag' && e.key === 'ha_chiave'), 'la ricompensa flag emette flag');

    const same2 = new BeeQuest();
    same2.setFlag('f', true);
    same2.define('a', { goals: [], rewards: [{ type: 'flag', id: 'f' }] });
    same2.start('a');
    const ev2 = record(same2);
    same2.completeQuest('a');
    assert(ev2.find((e) => e.type === 'reward').granted === true, 'flag già al valore: granted true');
    assert(!ev2.some((e) => e.type === 'flag'), 'flag già al valore: nessun evento flag');
}

{
    // le ricompense di un goal aperto non partono con completeQuest; il goal si consegna una volta
    const inv = fakeInventory();
    const quest = new BeeQuest({ inventory: inv });
    quest.define('a', {
        goals: [{ id: 'g', rewards: [{ type: 'item', id: 'g-item' }] }, { id: 'h' }],
        rewards: [{ type: 'item', id: 'q-item' }]
    });
    quest.start('a');
    quest.completeQuest('a');
    same(inv.adds, [['q-item', 1]], 'solo la ricompensa della quest');
}

{
    // inventario dall'engine, esplicito vince, setInventory(null)
    const engine = fakeEngine();
    const viaEngine = fakeInventory();
    engine.registerPlugin('inventory', viaEngine);
    const quest = new BeeQuest({ engine });
    quest.define('a', { goals: [], rewards: [{ type: 'item', id: 'x' }] });
    quest.start('a');
    quest.completeQuest('a');
    assert(viaEngine.adds.length === 1, 'inventario preso da engine.plugin("inventory")');

    const explicit = fakeInventory();
    quest.setInventory(explicit);
    quest.reset('a');
    quest.start('a');
    quest.completeQuest('a');
    assert(explicit.adds.length === 1 && viaEngine.adds.length === 1, 'l\'inventario esplicito vince');

    quest.setInventory(null);
    quest.reset('a');
    quest.start('a');
    quest.completeQuest('a');
    assert(viaEngine.adds.length === 2, 'setInventory(null) torna al motore');
    assert(warnsOf(() => quest.setInventory({})).messages.length === 1, 'setInventory non valido avvisa');
}

// ------------------------------------------------------------------ eventi

{
    const quest = fresh();
    const events = record(quest);
    quest.start('chiave');
    quest.setFlag('parlato', true);
    quest.addProgress('chiave', 'monete', 3);
    same(types(events), ['start', 'flag', 'goal', 'progress', 'goal', 'done', 'reward'], 'ordine degli eventi');

    // stato coerente durante i listener
    const q = new BeeQuest();
    q.define('a', { goals: [{ id: 'x' }] });
    q.define('b', { goals: [{ id: 'y' }] });
    q.start('a');
    const seen = [];
    q.onChange((e) => {
        if (e.type === 'goal') seen.push([q.goalDone('a', 'x'), q.isDone('a')]);
    });
    q.complete('a', 'x');
    same(seen, [[true, true]], 'quando parte goal lo stato è già assestato (quest done)');
}

{
    // off, listener che lancia, onChange non valido
    const quest = new BeeQuest();
    let a = 0;
    let b = 0;
    const off = quest.onChange(() => { a++; });
    quest.onChange(() => { throw new Error('listener rotto'); });
    quest.onChange(() => { b++; });
    const w = warnsOf(() => quest.define('x', { goals: [] }));
    assert(a === 1 && b === 1, 'un listener che lancia non ferma gli altri');
    assert(w.messages.length === 1, 'un listener che lancia avvisa');
    off();
    quiet(() => quest.define('y', { goals: [] }));
    assert(a === 1 && b === 2, 'off rimuove');
    assert(typeof quest.onChange(null) === 'function', 'onChange non valido ritorna un off inerte');
}

{
    // rientranza: listener che cambia stato
    const quest = new BeeQuest();
    quest.define('a', { goals: [{ id: 'x' }] });
    quest.define('b', { goals: [{ id: 'y', type: 'flag', flag: 'a_fatta' }] });
    const log = [];
    quest.onChange((e) => {
        log.push(e.type + (e.id ? `:${e.id}` : e.key ? `:${e.key}` : ''));
        if (e.type === 'done' && e.id === 'a') {
            quest.setFlag('a_fatta', true);
            quest.start('b');
        }
    });
    quest.start('a');
    quest.complete('a', 'x');
    assert(quest.isDone('b'), 'un listener può avviare e innescare altre quest');
    const iDoneA = log.indexOf('done:a');
    const iStartB = log.indexOf('start:b');
    const iDoneB = log.indexOf('done:b');
    assert(iDoneA >= 0 && iDoneA < iStartB && iStartB < iDoneB, `ordine con rientranza: ${log.join(',')}`);
    assert(log.filter((e) => e === 'done:b').length === 1, 'nessun evento duplicato');

    // un listener che chiama evaluate() non si incastra
    const q2 = new BeeQuest();
    q2.define('a', { goals: [{ id: 'x' }] });
    q2.onChange(() => q2.evaluate());
    q2.start('a');
    q2.complete('a', 'x');
    assert(q2.isDone('a'), 'listener che chiama evaluate: nessun anello');
}

{
    // check che chiama evaluate / setFlag, e anello infinito fermato dal tetto
    const quest = new BeeQuest();
    quest.defineGoalType('auto', () => { quest.evaluate(); return false; });
    quest.define('a', { goals: [{ id: 'x', type: 'auto' }] });
    quest.start('a');
    assert(quest.isActive('a'), 'una check che chiama evaluate non si incastra');

    const loop = new BeeQuest();
    let n = 0;
    loop.defineGoalType('inquieto', () => { loop.setFlag('n', ++n); return false; });
    loop.define('a', { goals: [{ id: 'x', type: 'inquieto' }] });
    const w = warnsOf(() => loop.start('a'));
    assert(w.messages.some((m) => m.includes('troppi cambi')), 'anello infinito: il tetto avvisa');
    assert(loop.isActive('a'), 'dopo il tetto il motore è ancora usabile');
    const again = warnsOf(() => loop.setFlag('altro', 1));
    assert(again.value === true, 'il plugin risponde dopo il tetto');
}

// ------------------------------------------------------------------ describe / list / locale

{
    const quest = fresh();
    const view = quest.describe('chiave');
    assert(view.id === 'chiave' && view.title === 'La chiave perduta' && view.description === 'Trova la chiave.', 'describe: testi');
    assert(view.status === 'inactive' && view.mode === 'all' && view.order === 'free' && view.rewarded === false, 'describe: stato');
    same(view.goals.map((g) => g.id), ['parla', 'monete', 'segreto'], 'describe: goal in ordine');
    assert(view.goals[1].progress === 0 && view.goals[1].target === 3 && view.goals[1].label === 'Tre monete', 'describe: count');
    assert(view.goals[0].progress === undefined, 'describe: progress solo per count');
    assert(view.goals[2].optional === true && view.goals[0].optional === false, 'describe: optional');
    assert(quest.describe('zzz') === null, 'describe su sconosciuta: null');
    assert(new BeeQuest().define('a', { goals: [{ id: 'g' }] }).describe('a').title === '', 'senza titolo: stringa vuota');

    quest.define('altra', { goals: [] });
    quest.start('chiave');
    same(quest.list().map((v) => v.id), ['chiave', 'altra'], 'list in ordine di definizione');
    same(quest.list('active').map((v) => v.id), ['chiave'], 'list con filtro');
    same(quest.list('done'), [], 'list filtro vuoto');
}

{
    const table = { tt: 'Titolo tradotto', ll: 'Etichetta tradotta' };
    const locale = { t: (key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key) };
    const quest = new BeeQuest({ locale });
    quest.define('a', {
        titleKey: 'tt', title: 'Letterale',
        descriptionKey: 'nope', description: 'Descr letterale',
        goals: [{ id: 'g', labelKey: 'll' }, { id: 'h', labelKey: 'nope' }, { id: 'i', labelKey: 'nope', label: 'Lett' }]
    });
    const view = quest.describe('a');
    assert(view.title === 'Titolo tradotto', 'locale: la chiave vince');
    assert(view.description === 'Descr letterale', 'locale senza la chiave: letterale');
    assert(view.goals[0].label === 'Etichetta tradotta', 'locale: label dei goal');
    assert(view.goals[1].label === 'nope', 'locale senza chiave né letterale: la chiave');
    assert(view.goals[2].label === 'Lett', 'locale: letterale come ripiego');

    quest.setLocale(null);
    const bare = quest.describe('a');
    assert(bare.title === 'Letterale' && bare.goals[0].label === 'll', 'senza locale: letterale, altrimenti la chiave');

    const engine = fakeEngine();
    const viaEngine = new BeeQuest({ engine });
    viaEngine.define('a', { titleKey: 'tt', goals: [] });
    assert(viaEngine.describe('a').title === 'tt', 'senza locale la chiave');
    engine.registerPlugin('locale', locale);
    assert(viaEngine.describe('a').title === 'Titolo tradotto', 'locale preso da engine.plugin("locale")');
    assert(warnsOf(() => viaEngine.setLocale({})).messages.length === 1, 'setLocale non valido avvisa');
}

// ------------------------------------------------------------------ copie

{
    const def = {
        title: 'T', data: { tag: { a: 1 } },
        goals: [{ id: 'g', label: 'L', data: { n: { k: 1 } }, rewards: [{ type: 'item', id: 'x' }] }],
        rewards: [{ type: 'item', id: 'y' }]
    };
    const quest = new BeeQuest().define('a', def);
    def.title = 'cambiato';
    def.goals[0].label = 'cambiata';
    def.goals[0].data.n.k = 99;
    def.goals[0].rewards[0].id = 'z';
    def.data.tag.a = 99;
    def.rewards[0].id = 'z';
    const view = quest.describe('a');
    assert(view.title === 'T' && view.goals[0].label === 'L', 'define copia la definizione');
    assert(view.goals[0].data.n.k === 1 && view.data.tag.a === 1, 'define copia i data in profondità');

    view.goals[0].done = true;
    view.goals[0].data.n.k = 5;
    view.data.tag.a = 5;
    view.status = 'done';
    const again = quest.describe('a');
    assert(!again.goals[0].done && again.status === 'inactive', 'describe ritorna copie');
    assert(again.goals[0].data.n.k === 1 && again.data.tag.a === 1, 'describe copia i data');

    quest.list()[0].goals.length = 0;
    assert(quest.describe('a').goals.length === 1, 'list ritorna copie');
    quest.ids().push('x');
    assert(quest.ids().length === 1, 'ids ritorna una copia');
    quest.setFlag('f', 1);
    quest.flags().f = 2;
    assert(quest.flag('f') === 1, 'flags ritorna una copia');

    const inv = fakeInventory();
    const q2 = new BeeQuest({ inventory: inv });
    q2.define('a', { goals: [], rewards: [{ type: 'item', id: 'x' }] });
    q2.start('a');
    const events = record(q2);
    q2.completeQuest('a');
    events.find((e) => e.type === 'reward').reward.id = 'manomesso';
    q2.reset('a');
    q2.start('a');
    q2.completeQuest('a');
    assert(inv.adds[1][0] === 'x', 'l\'evento reward porta una copia');
}

// ------------------------------------------------------------------ persistenza

{
    const defs = {
        chiave: KEY_QUEST,
        dopo: { goals: [{ id: 'x' }], requires: ['chiave'] }
    };
    const invA = fakeInventory();
    const a = new BeeQuest({ inventory: invA }).defineAll(defs);
    a.start('chiave');
    a.setFlag('parlato', true);
    a.addProgress('chiave', 'monete', 2);
    a.complete('chiave', 'segreto');
    a.setFlag('oro', 7);

    const json = JSON.parse(JSON.stringify(a.toJSON()));
    assert(json.version === 1, 'toJSON: version 1');
    assert(json.quests.chiave.status === 'active', 'toJSON: status');
    assert(json.quests.chiave.goals.monete.progress === 2 && json.quests.chiave.goals.parla.progress === undefined, 'toJSON: progress solo count');
    assert(json.quests.chiave.goals.segreto.done === true, 'toJSON: done');
    assert(json.flags.oro === 7, 'toJSON: flag');

    const invB = fakeInventory();
    const b = new BeeQuest({ inventory: invB }).defineAll(defs);
    const events = record(b);
    b.fromJSON(json);
    same(b.toJSON(), a.toJSON(), 'roundtrip identico');
    same(types(events), ['restore'], 'fromJSON emette solo restore');
    assert(b.progress('chiave', 'monete').value === 2, 'progress ripristinato');
    assert(b.flag('oro') === 7, 'flag ripristinati');

    b.addProgress('chiave', 'monete');
    assert(b.isDone('chiave'), 'si può continuare dopo il ripristino');

    // ricompensa data: non riconsegnata dopo il ripristino
    a.addProgress('chiave', 'monete');
    assert(invA.adds.length === 1, 'A ha dato la ricompensa');
    const c = new BeeQuest({ inventory: fakeInventory() }).defineAll(defs);
    c.fromJSON(JSON.parse(JSON.stringify(a.toJSON())));
    c.evaluate();
    assert(c.isDone('chiave') && c.describe('chiave').rewarded === true, 'done e rewarded ripristinati');
    assert(c.status('dopo') === 'inactive', 'quest assente nei dati: inactive');
    // ripristino non chiama evaluate
    const d = new BeeQuest().define('f', { goals: [{ id: 'g', type: 'flag', flag: 'x' }] });
    d.fromJSON({ version: 1, flags: { x: true }, quests: { f: { status: 'active', goals: { g: { done: false } } } } });
    assert(d.isActive('f') && !d.goalDone('f', 'g'), 'fromJSON non chiama evaluate');
    d.evaluate();
    assert(d.isDone('f'), 'evaluate dopo fromJSON');

    // quest ripristinata done con ricompensa non ancora data (dati mancanti): reset la riconsegna
    const inv = fakeInventory();
    const e = new BeeQuest({ inventory: inv }).define('a', { goals: [], rewards: [{ type: 'item', id: 'x' }] });
    e.fromJSON({ version: 1, quests: { a: { status: 'done', rewarded: true, goals: {} } } });
    assert(inv.adds.length === 0, 'fromJSON non consegna');
    e.reset('a');
    e.start('a');
    e.completeQuest('a');
    assert(inv.adds.length === 1, 'dopo il reset la ricompensa riparte');
}

{
    // fromJSON tollerante
    const quest = fresh();
    quest.start('chiave');
    quest.setFlag('k', 1);
    const w1 = warnsOf(() => quest.fromJSON(null));
    assert(w1.messages.length === 1 && quest.isActive('chiave') && quest.flag('k') === 1, 'fromJSON(null) avvisa e non tocca nulla');
    assert(warnsOf(() => quest.fromJSON([])).messages.length === 1, 'fromJSON(array) avvisa');
    assert(warnsOf(() => quest.fromJSON('x')).messages.length === 1, 'fromJSON(stringa) avvisa');

    const w2 = warnsOf(() => quest.fromJSON({
        version: 99,
        flags: { ok: 1, no: {} },
        quests: {
            fantasma: { status: 'active' },
            chiave: { status: 'boh', goals: { monete: { done: false, progress: 'x' }, parla: 'no' } }
        }
    }));
    assert(w2.messages.some((m) => m.includes('version')), 'version futura avvisa');
    assert(w2.messages.some((m) => m.includes('fantasma')), 'quest sconosciuta avvisa');
    assert(w2.messages.some((m) => m.includes('"no"')), 'flag non valido avvisa');
    assert(quest.flag('ok') === 1 && quest.flag('no') === undefined && quest.flag('k') === undefined, 'flag: validi sì, assenti azzerati');
    assert(quest.status('chiave') === 'inactive', 'status non valido: inactive');
    assert(!quest.has('fantasma'), 'la quest sconosciuta non viene creata');
    same(quest.progress('chiave', 'monete'), { value: 0, target: 3 }, 'progress non valido: 0');

    quest.fromJSON({ version: 1, quests: { chiave: { status: 'active', goals: { monete: { done: false, progress: 99 } } } } });
    assert(quest.progress('chiave', 'monete').value === 3, 'progress oltre il target: limitato');
    quest.fromJSON({ version: 1, quests: { chiave: { status: 'active', goals: { monete: { done: true } } } } });
    assert(quest.progress('chiave', 'monete').value === 3, 'goal count done: progress a target');
}

// ------------------------------------------------------------------ clear

{
    const inv = fakeInventory();
    const quest = new BeeQuest({ inventory: inv }).define('a', {
        goals: [{ id: 'g' }], rewards: [{ type: 'item', id: 'x' }]
    });
    quest.defineGoalType('boss', () => true);
    quest.start('a');
    quest.complete('a', 'g');
    quest.setFlag('f', 1);
    const events = record(quest);
    quest.clear();
    assert(events.length === 0, 'clear non emette');
    assert(quest.has('a') && quest.status('a') === 'inactive', 'clear tiene le definizioni e azzera lo stato');
    assert(Object.keys(quest.flags()).length === 0, 'clear azzera i flag');
    quest.start('a');
    quest.complete('a', 'g');
    assert(inv.adds.length === 2, 'clear azzera anche la ricompensa data');

    quest.clear({ definitions: true });
    same(quest.ids(), [], 'clear({ definitions: true }) toglie le definizioni');
    assert(quest.status('a') === null, 'status dopo clear totale');
    quest.define('b', { goals: [{ id: 'x', type: 'boss' }] });
    quest.start('b');
    assert(quest.isDone('b'), 'i tipi di goal registrati sopravvivono a clear');
}

// ------------------------------------------------------------------ BeeDialogue

{
    const tree = {
        start: 'intro',
        nodes: [
            {
                id: 'intro', speaker: 'Guida', text: 'Mi aiuti?',
                choices: [
                    { text: 'Sì', next: null, data: { startQuest: 'aiuto', flag: 'parlato' } },
                    { text: 'No', next: null }
                ]
            }
        ]
    };
    const quest = new BeeQuest().define('aiuto', {
        goals: [{ id: 'parla', type: 'flag', flag: 'parlato' }]
    });
    const dialogue = new BeeDialogue().load(tree);
    dialogue.onChange((ev) => {
        if (ev.type !== 'choice' || !ev.data) return;
        if (ev.data.startQuest) quest.start(ev.data.startQuest);
        if (ev.data.flag) quest.setFlag(ev.data.flag, ev.data.value ?? true);
    });

    dialogue.start();
    dialogue.choose(1);
    assert(quest.status('aiuto') === 'inactive', 'una scelta senza data non fa nulla');
    dialogue.start();
    dialogue.choose(0);
    assert(quest.isDone('aiuto'), 'BeeDialogue: la scelta avvia la quest e imposta il flag');
}

console.log('test-beequest: ok');
