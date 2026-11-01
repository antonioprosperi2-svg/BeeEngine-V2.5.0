import { readFileSync } from 'node:fs';
import { BeeDialogue } from '../src/plugins/BeeDialogue.js';
import { BeeDialogue as FromIndex } from '../src/plugins/index.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
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

function throws(fn) {
    try {
        fn();
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

function fakeInput(...codes) {
    const down = new Set(codes);
    return { wasPressed: (code) => down.has(code) };
}

const TREE = {
    start: 'intro',
    nodes: [
        {
            id: 'intro',
            speaker: 'Guida',
            text: 'Ciao, viaggiatore.',
            choices: [
                { text: 'Chiedi della mappa', next: 'map', data: { flag: 'asked' } },
                { text: 'Addio', next: null }
            ]
        },
        { id: 'map', speaker: 'Guida', text: 'Il villaggio è a est.', next: 'tip' },
        { id: 'tip', speaker: 'Guida', text: 'Porta una torcia.' }
    ]
};

function fresh(options = {}) {
    return new BeeDialogue(options).load(TREE);
}

function record(dialogue) {
    const events = [];
    dialogue.onChange((event) => events.push(event));
    return events;
}

assert(FromIndex === BeeDialogue, 'src/plugins/index.js esporta BeeDialogue');

{
    const engine = fakeEngine();
    const dialogue = new BeeDialogue({ engine });
    assert(engine.plugin('dialogue') === dialogue, 'il costruttore con engine attacca');
    dialogue.detach();
    assert(engine.plugin('dialogue') === null, 'detach smonta');
    assert(dialogue.engine === null, 'detach azzera engine');

    dialogue.load(TREE);
    dialogue.attach(engine);
    assert(engine.plugin('dialogue') === dialogue, 'attach registra dialogue');
    dialogue.detach();
    assert(dialogue.start() === true, 'detach non azzera l\'albero');
}

{
    const engineSrc = readFileSync(new URL('../BeeEngine.js', import.meta.url), 'utf8');
    assert(!engineSrc.includes('BeeDialogue'), 'BeeEngine.js non nomina BeeDialogue');
    assert(!engineSrc.includes('src/plugins'), 'BeeEngine.js non importa src/plugins');

    const pluginSrc = readFileSync(new URL('../src/plugins/BeeDialogue.js', import.meta.url), 'utf8');
    assert(!/\.loop\s*\(/.test(pluginSrc), 'il plugin non chiama loop()');
    assert(!/engine\.onTick\s*\(/.test(pluginSrc), 'il plugin non usa onTick');
    assert(!/engine\.(update|render)\s*=/.test(pluginSrc), 'il plugin non sovrascrive update/render');
    assert(!pluginSrc.includes('addEventListener'), 'il plugin non ha listener propri');
    assert(!/^\s*import\s/m.test(pluginSrc), 'il plugin non importa nulla (Locale è soft-dep)');
}

{
    const dialogue = new BeeDialogue();
    const none = warnsOf(() => dialogue.start());
    assert(none.value === false && none.messages.length > 0, 'start senza albero è false e avvisa');

    dialogue.load(TREE);
    assert(dialogue.isOpen() === false && dialogue.currentId() === null, 'prima di start è chiuso');
    assert(dialogue.start() === true, 'start apre');
    assert(dialogue.isOpen() === true && dialogue.currentId() === 'intro', 'apre da tree.start');
    dialogue.close();
    assert(dialogue.start('map') === true && dialogue.currentId() === 'map', 'start(nodeId)');
    dialogue.close();
    const bad = warnsOf(() => dialogue.start('ghost'));
    assert(bad.value === false && bad.messages.length > 0, 'start su id sconosciuto è false');
    assert(dialogue.isOpen() === false, 'start fallito non apre');
}

{
    const dialogue = fresh();
    const events = record(dialogue);
    dialogue.start('map');
    assert(dialogue.advance() === true && dialogue.currentId() === 'tip', 'advance va a next');
    assert(dialogue.advance() === true, 'ultimo advance riesce');
    assert(dialogue.isOpen() === false && dialogue.currentId() === null, 'ultimo advance chiude');
    const end = events[events.length - 1];
    assert(end.type === 'end' && end.id === 'tip' && end.reason === 'finished', 'end con reason finished');
    assert(dialogue.advance() === false, 'advance da chiuso è false');
}

{
    const dialogue = fresh();
    dialogue.start();
    const refused = warnsOf(() => dialogue.advance());
    assert(refused.value === false && refused.messages.length > 0, 'advance con scelte è false e avvisa');
    assert(dialogue.currentId() === 'intro', 'advance rifiutato non si muove');

    const low = warnsOf(() => dialogue.choose(-1));
    assert(low.value === false && low.messages.length > 0, 'choose(-1) è false e avvisa');
    const high = warnsOf(() => dialogue.choose(2));
    assert(high.value === false && high.messages.length > 0, 'choose fuori range è false');
    const frac = warnsOf(() => dialogue.choose(0.5));
    assert(frac.value === false, 'choose non intero è false');
    assert(dialogue.currentId() === 'intro', 'choose rifiutato non si muove');

    assert(dialogue.choose(0) === true && dialogue.currentId() === 'map', 'choose(0) ramifica');
    const linear = warnsOf(() => dialogue.choose(0));
    assert(linear.value === false && linear.messages.length > 0, 'choose su nodo lineare è false');

    dialogue.close();
    dialogue.start();
    const events = record(dialogue);
    assert(dialogue.choose(1) === true, 'scelta con next null riesce');
    assert(dialogue.isOpen() === false, 'next null chiude');
    assert(events[events.length - 1].reason === 'finished', 'chiusura da scelta: finished');
}

{
    const asked = [];
    const dialogue = fresh();
    dialogue.onChange((event) => { if (event.type === 'choice') asked.push(event.data); });
    dialogue.start();
    dialogue.choose(0);
    assert(asked.length === 1 && asked[0].flag === 'asked', 'choice porta data');
}

{
    const dialogue = new BeeDialogue();
    dialogue.load({
        nodes: {
            a: { speakerKey: 'who', textKey: 'hi', choices: [{ textKey: 'yes', next: 'b' }, { text: 'No' }] },
            b: { text: 'Letterale', textKey: 'unknown_key' },
            c: { textKey: 'only_key' },
            d: { text: 'Solo letterale', speaker: 'Narratore' }
        }
    });
    const table = { who: 'La guida', hi: 'Ciao!', yes: 'Sì' };
    const locale = { t: (key) => (key in table ? table[key] : key) };

    dialogue.start('a');
    const noLocale = dialogue.current();
    assert(noLocale.speaker === 'who' && noLocale.text === 'hi', 'senza locale: key grezza');
    assert(dialogue.listChoices()[0].text === 'yes', 'senza locale: scelta con key grezza');

    dialogue.setLocale(locale);
    const shown = dialogue.current();
    assert(shown.speaker === 'La guida' && shown.text === 'Ciao!', 'con locale: *Key risolta');
    assert(dialogue.listChoices()[0].text === 'Sì', 'con locale: scelta risolta');
    assert(dialogue.listChoices()[1].text === 'No', 'scelta letterale resta');

    dialogue.choose(0);
    assert(dialogue.current().text === 'Letterale', 'locale senza la key: ripiega sul letterale');

    dialogue.start('c');
    assert(dialogue.current().text === 'only_key', 'solo key sconosciuta: mai vuoto');
    dialogue.start('d');
    assert(dialogue.current().text === 'Solo letterale' && dialogue.current().speaker === 'Narratore', 'letterale');

    dialogue.setLocale(null);
    dialogue.start('a');
    assert(dialogue.current().text === 'hi', 'setLocale(null) toglie il locale');

    const bad = warnsOf(() => dialogue.setLocale({}));
    assert(bad.messages.length > 0, 'locale senza t avvisa');

    const engine = fakeEngine();
    engine.registerPlugin('locale', locale);
    dialogue.attach(engine);
    assert(dialogue.current().text === 'Ciao!', 'soft-dep: engine.plugin(\'locale\')');

    const viaOption = new BeeDialogue({ locale }).load({ nodes: [{ id: 'x', textKey: 'hi' }] });
    viaOption.start();
    assert(viaOption.current().text === 'Ciao!', 'locale da opzione costruttore');
}

{
    const dialogue = fresh();
    const events = record(dialogue);
    const off = dialogue.onChange(() => { throw new Error('non deve scattare'); });
    off();
    dialogue.start();
    dialogue.choose(0);
    dialogue.advance();
    dialogue.advance();
    const types = events.map((event) => event.type);
    assert(
        types.join(',') === 'start,node,choice,node,advance,node,advance,end',
        `ordine eventi: ${types.join(',')}`
    );
    assert(events[0].id === 'intro', 'start porta l\'id');
    assert(events[1].node.text === 'Ciao, viaggiatore.', 'node porta il nodo risolto');
    assert(events[2].index === 0 && events[2].id === 'intro', 'choice porta indice e id');
    assert(events[4].from === 'map' && events[4].to === 'tip', 'advance porta from e to');
    assert(events[6].from === 'tip' && events[6].to === null, 'ultimo advance ha to null');
    assert(events[7].id === 'tip' && events[7].reason === 'finished', 'end porta id e reason');

    let hits = 0;
    const offLater = dialogue.onChange(() => { hits += 1; });
    dialogue.start();
    assert(hits > 0, 'il listener riceve');
    offLater();
    const before = hits;
    dialogue.close();
    assert(hits === before, 'off() stacca il listener');
    assert(typeof dialogue.onChange(null) === 'function', 'onChange(non funzione) ritorna una off innocua');
}

{
    const dialogue = fresh();
    const events = record(dialogue);
    dialogue.start('map');
    dialogue.start('intro');
    const types = events.map((event) => `${event.type}${event.reason ? ':' + event.reason : ''}`);
    assert(
        types.join(',') === 'start,node,end:restart,start,node',
        `start da aperto: restart pulito (${types.join(',')})`
    );
    assert(dialogue.currentId() === 'intro', 'dopo il restart è sul nuovo nodo');

    dialogue.load(TREE);
    const last = events[events.length - 1];
    assert(last.type === 'end' && last.reason === 'reload', 'load da aperto chiude con reload');
    assert(dialogue.isOpen() === false, 'load chiude');
}

{
    const dialogue = new BeeDialogue();
    const events = record(dialogue);
    warnsOf(() => dialogue.load({ nodes: [{ id: 'a', next: 'ghost' }] }));
    dialogue.start();
    dialogue.advance();
    const end = events[events.length - 1];
    assert(end.type === 'end' && end.reason === 'missing-node', 'next mancante a runtime: missing-node');
    assert(dialogue.isOpen() === false, 'missing-node chiude');

    const bad = new BeeDialogue();
    warnsOf(() => bad.load({ nodes: [{ id: 'a', choices: [{ text: 'x', next: 'ghost' }] }] }));
    bad.start();
    const endings = [];
    bad.onChange((event) => { if (event.type === 'end') endings.push(event.reason); });
    bad.choose(0);
    assert(endings[0] === 'missing-node', 'scelta verso nodo mancante: missing-node');
}

{
    assert(throws(() => new BeeDialogue().load({ nodes: [{ id: 'a' }, { id: 'a' }] })), 'id duplicato lancia');
    assert(throws(() => new BeeDialogue().load({ nodes: [{ text: 'senza id' }] })), 'nodo senza id lancia');
    assert(throws(() => new BeeDialogue().load({ nodes: [{ id: '' }] })), 'id vuoto lancia');
    assert(throws(() => new BeeDialogue().load({ nodes: { a: { id: 'b' } } })), 'id diverso dalla chiave lancia');
    assert(throws(() => new BeeDialogue().load('boh')), 'albero non oggetto lancia');
    assert(throws(() => new BeeDialogue().load({})), 'albero senza nodes lancia');

    const dialogue = new BeeDialogue().load({ nodes: { first: { text: 'uno' }, second: { text: 'due' } } });
    dialogue.start();
    assert(dialogue.currentId() === 'first', 'start assente: primo nodo (forma mappa)');

    const arr = new BeeDialogue().load({ nodes: [{ id: 'z' }, { id: 'y' }] });
    arr.start();
    assert(arr.currentId() === 'z', 'start assente: primo nodo (forma array)');

    const wrongStart = warnsOf(() => new BeeDialogue().load({ start: 'nope', nodes: [{ id: 'k' }] }));
    assert(wrongStart.messages.length > 0, 'start sconosciuto avvisa');

    const both = warnsOf(() => new BeeDialogue().load({
        nodes: [{ id: 'a', next: 'b', choices: [{ text: 'x', next: 'b' }] }, { id: 'b' }]
    }));
    assert(both.messages.some((line) => line.includes('choices e next')), 'choices + next avvisa');
    const ignoring = new BeeDialogue();
    warnsOf(() => ignoring.load({
        nodes: [{ id: 'a', next: 'b', choices: [{ text: 'x', next: 'b' }] }, { id: 'b' }]
    }));
    ignoring.start('a');
    const refused = warnsOf(() => ignoring.advance());
    assert(refused.value === false, 'con choices il next del nodo è ignorato');

    const refs = warnsOf(() => new BeeDialogue().load({
        nodes: [{ id: 'a', next: 'ghost' }, { id: 'b', choices: [{ text: 'x', next: 'phantom' }] }]
    }));
    assert(refs.messages.some((line) => line.includes('ghost')), 'next inesistente avvisa al load');
    assert(refs.messages.some((line) => line.includes('phantom')), 'scelta inesistente avvisa al load');

    const empty = new BeeDialogue().load({ nodes: [{ id: 'a', choices: [] }, { id: 'b' }] });
    empty.start('a');
    assert(empty.advance() === true && empty.isOpen() === false, 'choices vuoto: nodo lineare');

    empty.load(null);
    const gone = warnsOf(() => empty.start());
    assert(gone.value === false, 'load(null) svuota l\'albero');
}

{
    const dialogue = fresh();
    dialogue.start();
    const copy = dialogue.current();
    copy.text = 'manomesso';
    copy.choices[0].text = 'manomesso';
    copy.choices.push({ text: 'finta' });
    assert(dialogue.current().text === 'Ciao, viaggiatore.', 'current() è una copia');
    assert(dialogue.current().choices.length === 2, 'le scelte di current() sono copie');
    assert(dialogue.current().choices[0].text === 'Chiedi della mappa', 'scelta non manomessa');

    const list = dialogue.listChoices();
    list[0].data.flag = 'manomesso';
    list.pop();
    assert(dialogue.listChoices().length === 2, 'listChoices() è una copia');
    assert(dialogue.listChoices()[0].data.flag === 'asked', 'data di listChoices() è copia');

    const dto = dialogue.toJSON();
    dto.tree.nodes[0].text = 'manomesso';
    assert(dialogue.toJSON().tree.nodes[0].text === 'Ciao, viaggiatore.', 'toJSON() è una copia');

    assert(listOfClosed(), 'da chiuso: current() null e listChoices() vuoto');
    function listOfClosed() {
        const closed = fresh();
        return closed.current() === null && closed.listChoices().length === 0;
    }
}

{
    const dialogue = fresh();
    dialogue.start();
    dialogue.handleInput(fakeInput('ArrowDown'));
    dialogue.handleInput(fakeInput('Space'));
    assert(dialogue.currentId() === null && dialogue.isOpen() === false, 'frecce + Space scelgono l\'evidenziata (Addio)');

    dialogue.start();
    dialogue.handleInput(fakeInput('ArrowUp'));
    dialogue.handleInput(fakeInput('Space'));
    assert(dialogue.currentId() === null, 'ArrowUp gira sull\'ultima scelta');

    dialogue.start();
    dialogue.handleInput(fakeInput('Space'));
    assert(dialogue.currentId() === 'map', 'Space conferma la prima scelta');
    dialogue.handleInput(fakeInput('Space'));
    assert(dialogue.currentId() === 'tip', 'Space avanza sul nodo lineare');
    dialogue.handleInput(fakeInput('Space'));
    assert(dialogue.isOpen() === false, 'Space chiude a fine albero');

    dialogue.start();
    dialogue.handleInput(fakeInput('Digit1'));
    assert(dialogue.currentId() === 'map', 'Digit1 sceglie la prima');

    dialogue.start();
    dialogue.handleInput(fakeInput('Digit2'));
    assert(dialogue.isOpen() === false, 'Digit2 sceglie la seconda');

    dialogue.start();
    const quiet = warnsOf(() => dialogue.handleInput(fakeInput('Digit9')));
    assert(dialogue.currentId() === 'intro' && quiet.messages.length === 0, 'Digit oltre le scelte è ignorato');

    dialogue.close();
    dialogue.handleInput(fakeInput('Space'));
    assert(dialogue.isOpen() === false, 'handleInput da chiuso non fa nulla');
    assert(dialogue.handleInput(null) === dialogue, 'handleInput(null) ritorna this');
    assert(dialogue.handleInput({}) === dialogue, 'handleInput senza wasPressed ritorna this');

    const keyed = fresh({ lineAdvanceKey: 'Enter', cancelKey: 'Escape' });
    keyed.start('map');
    keyed.handleInput(fakeInput('Space'));
    assert(keyed.currentId() === 'map', 'lineAdvanceKey custom: Space non avanza');
    keyed.handleInput(fakeInput('Enter'));
    assert(keyed.currentId() === 'tip', 'lineAdvanceKey custom: Enter avanza');
    const ends = [];
    keyed.onChange((event) => { if (event.type === 'end') ends.push(event.reason); });
    keyed.handleInput(fakeInput('Escape'));
    assert(keyed.isOpen() === false && ends[0] === 'cancel', 'cancelKey chiude con reason cancel');

    const noCancel = fresh();
    noCancel.start();
    noCancel.handleInput(fakeInput('Escape'));
    assert(noCancel.isOpen() === true, 'cancelKey di default è null');
}

{
    const dialogue = fresh();
    dialogue.start();
    dialogue.handleInput(fakeInput('ArrowDown'));
    const saved = JSON.parse(JSON.stringify(dialogue.toJSON()));
    assert(saved.open === true && saved.currentId === 'intro' && saved.selectedChoice === 1, 'toJSON salva lo stato');
    assert(saved.tree.nodes.length === 3 && saved.tree.start === 'intro', 'toJSON salva l\'albero');

    const copy = new BeeDialogue();
    const events = record(copy);
    copy.fromJSON(saved);
    assert(copy.isOpen() === true && copy.currentId() === 'intro', 'fromJSON ripristina aperto + nodo');
    assert(events.length === 1 && events[0].type === 'node', 'fromJSON emette solo node, non start');
    assert(JSON.stringify(copy.toJSON()) === JSON.stringify(saved), 'round trip toJSON fromJSON');

    const closed = fresh();
    const closedSaved = closed.toJSON();
    assert(closedSaved.open === false && closedSaved.currentId === null, 'chiuso: open false, currentId null');
    const reopened = new BeeDialogue();
    reopened.fromJSON(closedSaved);
    assert(reopened.isOpen() === false && reopened.start() === true, 'fromJSON da chiuso carica l\'albero');

    const bad = warnsOf(() => new BeeDialogue().fromJSON({ tree: TREE, open: true, currentId: 'ghost' }));
    assert(bad.messages.length > 0, 'currentId sconosciuto avvisa');
    const stays = new BeeDialogue();
    stays.fromJSON({ tree: TREE, open: true, currentId: 'map' });
    assert(stays.currentId() === 'map', 'fromJSON apre su un nodo qualunque');

    const garbage = warnsOf(() => new BeeDialogue().fromJSON(null));
    assert(garbage.messages.length > 0, 'fromJSON(null) avvisa');

    const empty = new BeeDialogue();
    assert(empty.toJSON().tree === null, 'senza albero: tree null');

    const oldOpen = fresh();
    oldOpen.start();
    oldOpen.fromJSON({ open: false });
    assert(oldOpen.isOpen() === false, 'fromJSON open false chiude un dialogo aperto');
}

{
    const dialogue = fresh();
    dialogue.start();
    dialogue.clear();
    assert(dialogue.isOpen() === false && dialogue.current() === null, 'clear chiude');
    assert(dialogue.start() === true, 'clear lascia l\'albero');
    assert(dialogue.clear() === dialogue, 'clear ritorna this');
}

{
    function fakeCtx() {
        const calls = { fillText: [], fillRect: 0, save: 0, restore: 0 };
        return {
            calls,
            canvas: { width: 800, height: 480 },
            save() { calls.save += 1; },
            restore() { calls.restore += 1; },
            fillRect() { calls.fillRect += 1; },
            strokeRect() {},
            fillText(text) { calls.fillText.push(text); },
            measureText(text) { return { width: String(text).length * 8 }; }
        };
    }

    const dialogue = fresh();
    assert(dialogue.draw(null) === dialogue, 'draw(null) ritorna this senza lanciare');

    const ctx = fakeCtx();
    dialogue.draw(ctx);
    assert(ctx.calls.save === 0 && ctx.calls.fillText.length === 0, 'draw da chiuso è no-op');

    dialogue.start();
    dialogue.draw(ctx, { x: 40, y: 300, width: 720 });
    assert(ctx.calls.save === 1 && ctx.calls.restore === 1, 'draw bilancia save/restore');
    assert(ctx.calls.fillRect >= 1, 'draw dipinge il pannello');
    assert(ctx.calls.fillText.includes('Guida'), 'draw scrive lo speaker');
    assert(ctx.calls.fillText.includes('Ciao, viaggiatore.'), 'draw scrive il testo');
    assert(ctx.calls.fillText.some((line) => line.includes('1. Chiedi della mappa')), 'draw numera le scelte');
    assert(ctx.calls.fillText.some((line) => line.startsWith('> ') && line.includes('1.')), 'draw segna la scelta evidenziata');

    const ctxPlain = fakeCtx();
    delete ctxPlain.measureText;
    delete ctxPlain.canvas;
    dialogue.draw(ctxPlain);
    assert(ctxPlain.calls.fillText.length > 0, 'draw regge un ctx senza measureText né canvas');

    const wrapped = new BeeDialogue().load({
        nodes: [{ id: 'w', text: 'uno due tre quattro cinque sei sette otto nove dieci' }]
    });
    wrapped.start();
    const narrow = fakeCtx();
    wrapped.draw(narrow, { width: 120, padding: 8 });
    assert(narrow.calls.fillText.length > 2, 'draw manda a capo le righe lunghe');
    assert(narrow.calls.fillText.join(' ') === 'uno due tre quattro cinque sei sette otto nove dieci', 'il wrap non perde parole');

    const thrower = fakeCtx();
    thrower.fillText = () => { throw new Error('boom'); };
    let blew = false;
    try {
        dialogue.draw(thrower);
    } catch (error) {
        blew = error.message === 'boom';
    }
    assert(blew && thrower.calls.restore === 1, 'restore gira anche se il disegno lancia');
}

console.log('BeeDialogue tests ok');
