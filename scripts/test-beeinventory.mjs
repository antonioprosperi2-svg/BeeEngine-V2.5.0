import { readFileSync } from 'node:fs';
import { BeeInventory } from '../src/plugins/BeeInventory.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function bag(slots, equipSlots = []) {
    const inv = new BeeInventory({ slots, equipSlots });
    inv.defineItem('potion', { name: 'Pozione', maxStack: 3, consumable: true });
    inv.defineItem('sword', { name: 'Spada', maxStack: 1, equipSlot: 'hand' });
    inv.defineItem('shield', { name: 'Scudo', maxStack: 1, equipSlot: 'hand' });
    return inv;
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

{
    const inv = bag(2);
    const res = inv.add('potion', 10);
    assert(res.left > 0, 'oltre la capienza left > 0');
    assert(res.added + res.left === 10, 'added + left conserva la quantità');
    assert(inv.count('potion') === res.added, 'niente item perso né creato');
    assert(inv.count('potion') === 6, 'due stack da maxStack 3');
}

{
    const inv = bag(3);
    inv.add('potion', 2);
    inv.add('potion', 2);
    assert(inv.get(0).qty === 3, 'il secondo add riempie lo stack esistente');
    assert(inv.get(1).qty === 1, 'il resto apre uno slot nuovo');
    assert(inv.get(2) === null, 'il terzo slot resta vuoto');
    const leaked = inv.get(0);
    leaked.qty = 99;
    assert(inv.get(0).qty === 3, 'get ritorna una copia');
}

{
    const inv = bag(3);
    inv.add('potion', 5);
    const removed = inv.remove('potion', 3);
    assert(removed === 3, 'remove attraversa più stack');
    assert(inv.get(1) === null, 'toglie dall\'ultimo slot');
    assert(inv.get(0).qty === 2, 'il resto resta nel primo stack');
    const had = inv.count('potion');
    const extra = inv.remove('potion', 100);
    assert(extra === had, 'remove oltre il posseduto ritorna solo il rimosso');
    assert(inv.count('potion') === 0, 'dopo il remove eccessivo non resta nulla');
}

{
    const inv = bag(2);
    inv.add('potion', 3);
    inv.add('potion', 2);
    assert(inv.move(0, 1) === true, 'merge');
    assert(inv.get(0).qty === 2 && inv.get(1).qty === 3, 'merge parziale, il resto resta in from');

    inv.clear();
    inv.add('potion', 1);
    inv.add('sword', 1);
    assert(inv.move(0, 1) === true, 'swap');
    assert(inv.get(0).id === 'sword' && inv.get(1).id === 'potion', 'id diversi si scambiano');

    const before = JSON.stringify(inv.toJSON());
    const bad = warnsOf(() => inv.move(-1, 0));
    assert(bad.value === false, 'indice fuori range è false');
    assert(bad.messages.length > 0, 'indice fuori range avvisa');
    assert(JSON.stringify(inv.toJSON()) === before, 'move fallito non muta');
}

{
    const inv = bag(1);
    let calls = 0;
    inv.defineItem('herb', {
        name: 'Erba',
        maxStack: 2,
        consumable: true,
        onUse: () => {
            calls += 1;
            return false;
        }
    });
    inv.add('herb', 2);
    assert(inv.use(0, {}) === false, 'onUse false non consuma');
    assert(calls === 1 && inv.get(0).qty === 2, 'qty invariata se onUse rifiuta');

    inv.clear();
    inv.defineItem('bomb', {
        name: 'Bomba',
        consumable: true,
        onUse: () => {
            throw new Error('boom');
        }
    });
    inv.add('bomb', 1);
    const snap = JSON.stringify(inv.toJSON());
    let exploded = false;
    try {
        inv.use(0, { who: 'hero' });
    } catch (error) {
        exploded = error.message === 'boom';
    }
    assert(exploded, 'onUse che lancia esce');
    assert(JSON.stringify(inv.toJSON()) === snap, 'lo stato resta identico se onUse lancia');
}

{
    const inv = new BeeInventory({ slots: 2, equipSlots: ['hand'] });
    inv.defineItem('sword', { name: 'Spada', maxStack: 1, equipSlot: 'hand' });
    inv.defineItem('shield', { name: 'Scudo', maxStack: 2, equipSlot: 'hand' });
    inv.defineItem('gem', { name: 'Gemma', maxStack: 5 });
    inv.add('shield', 2);
    inv.add('gem', 5);
    inv.defineItem('dagger', { name: 'Pugnale', maxStack: 1, equipSlot: 'hand' });
    // mano occupata da una spada messa a mano nello stato: prima equip vuoto, serve un vecchio.
    inv.clear();
    inv.add('sword', 1);
    assert(inv.equip(0) === true, 'primo equip');
    inv.add('shield', 2);
    inv.add('gem', 5);
    const full = JSON.stringify(inv.toJSON());
    const blocked = warnsOf(() => inv.equip(0));
    assert(blocked.value === false, 'equip con inventario pieno è false');
    assert(blocked.messages.length > 0, 'equip pieno avvisa');
    assert(JSON.stringify(inv.toJSON()) === full, 'equip fallito non cambia toJSON');

    const swap = bag(1, ['hand']);
    swap.add('sword', 1);
    swap.equip(0);
    swap.add('shield', 1);
    assert(swap.equip(0) === true, 'equip con posto per il vecchio');
    assert(swap.equipped('hand').id === 'shield', 'in mano c\'è il nuovo');
    assert(swap.get(0).id === 'sword', 'il vecchio torna nell\'inventario');
}

{
    const inv = bag(1);
    inv.add('potion', 3);
    let hits = 0;
    const off = inv.onChange(() => {
        hits += 1;
    });
    const failed = warnsOf(() => inv.add('potion', 1));
    assert(failed.value.added === 0 && failed.value.left === 1, 'add pieno non aggiunge');
    assert(hits === 0, 'onChange non scatta se l\'add fallisce');
    off();
    inv.remove('potion', 1);
    assert(hits === 0, 'off() stacca la callback');
}

{
    const inv = bag(2, ['hand']);
    inv.add('sword', 1);
    inv.add('potion', 3);
    inv.equip(0);
    const encoded = inv.toJSON();
    const copy = bag(2, ['hand']);
    copy.fromJSON(encoded);
    assert(JSON.stringify(copy.toJSON()) === JSON.stringify(encoded), 'round trip toJSON fromJSON');

    const unknown = warnsOf(() => copy.fromJSON({
        slots: [
            { id: 'ghost', qty: 1 },
            { id: 'potion', qty: 2 },
            { id: 'potion', qty: 1 }
        ],
        equipment: { hand: null }
    }));
    assert(unknown.messages.some((line) => line.includes('ghost')), 'id sconosciuto avvisa');
    assert(unknown.messages.some((line) => line.toLowerCase().includes('eccesso') || line.includes('3')), 'voci in più avvisano');
    assert(copy.get(0) === null, 'id sconosciuto saltato');
    assert(copy.get(1).id === 'potion' && copy.get(1).qty === 2, 'la voce valida resta al suo indice');
    assert(copy.list().length === 2, 'le eccedenti non allungano gli slot');
}

{
    const plugins = new Map();
    const engine = {
        registerPlugin(name, plugin) { plugins.set(name, plugin); },
        unregisterPlugin(name) { plugins.delete(name); },
        plugin(name) { return plugins.get(name) || null; }
    };
    const inv = new BeeInventory({ slots: 4, engine });
    assert(engine.plugin('inventory') === inv, 'attach registra inventory');
    inv.detach();
    assert(engine.plugin('inventory') === null, 'detach smonta');

    const source = readFileSync(new URL('../BeeEngine.js', import.meta.url), 'utf8');
    assert(!source.includes('src/plugins'), 'BeeEngine.js non importa src/plugins');
    assert(!source.includes('BeeInventory'), 'BeeEngine.js non nomina BeeInventory');
}

{
    let threw = false;
    try {
        bag(1).defineItem('', { name: 'x' });
    } catch {
        threw = true;
    }
    assert(threw, 'id vuoto lancia');
    const inv = bag(1);
    threw = false;
    try {
        inv.defineItem('potion', { name: 'Altra' });
    } catch {
        threw = true;
    }
    assert(threw, 'id già definito lancia');
}

console.log('BeeInventory tests ok');
