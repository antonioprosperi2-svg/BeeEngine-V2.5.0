import { BeeEntity } from '../src/core/BeeEntity.js';
import { BeeText } from '../src/graphics/BeeText.js';
import { BeeLayer, BEE_DRAW, BEE_SPACE } from '../src/graphics/BeeLayer.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function mockEngine(entities) {
    const drawn = [];
    return {
        entities,
        currentScene: null,
        scenes: { currentScene: null },
        canvas: { width: 800, height: 600 },
        drawn,
        getEntityDrawBounds(entity) {
            return {
                x: entity.x,
                y: entity.y,
                width: entity.width,
                height: entity.height
            };
        },
        drawEntity(_ctx, entity) {
            drawn.push(entity.name);
        }
    };
}

{
    const layers = new BeeLayer();
    const names = layers.list().map((slot) => slot.name);
    assert(names.join(',') === 'background,world,ysort,ui', 'pass di default ' + names);
    assert(layers.get(BEE_DRAW.UI).space === BEE_SPACE.SCREEN, 'ui è spazio schermo');
    assert(layers.get(BEE_DRAW.YSORT).sort === 'y', 'ysort ordina per y');
}

{
    const back = new BeeEntity(0, 0, 10, 10);
    back.name = 'back';
    back.drawLayer = BEE_DRAW.BACKGROUND;

    const a = new BeeEntity(0, 80, 20, 40);
    a.name = 'near';
    a.drawLayer = BEE_DRAW.YSORT;

    const b = new BeeEntity(40, 20, 20, 40);
    b.name = 'far';
    b.drawLayer = BEE_DRAW.YSORT;

    const hud = new BeeEntity(8, 8, 40, 16);
    hud.name = 'hud';
    hud.drawLayer = BEE_DRAW.UI;

    const engine = mockEngine([back, a, b, hud]);
    const layers = new BeeLayer();
    layers.collect(engine);

    const ysort = layers.items(BEE_DRAW.YSORT).map((e) => e.name);
    assert(ysort.join(',') === 'far,near', 'y-sort per piedi, ottenuto ' + ysort);
    assert(layers.items(BEE_DRAW.BACKGROUND)[0].name === 'back', 'background prima');
    assert(layers.items(BEE_DRAW.UI)[0].name === 'hud', 'ui nel pass schermo');

    layers.drawWorld({}, engine);
    assert(engine.drawn.join(',') === 'back,far,near', 'world flush senza ui: ' + engine.drawn);
    engine.drawn.length = 0;
    layers.drawScreen({}, engine);
    assert(engine.drawn.join(',') === 'hud', 'screen flush solo ui: ' + engine.drawn);
}

{
    const first = new BeeEntity(0, 50, 10, 10);
    first.name = 'first';
    first.drawLayer = BEE_DRAW.YSORT;
    const second = new BeeEntity(20, 50, 10, 10);
    second.name = 'second';
    second.drawLayer = BEE_DRAW.YSORT;

    const engine = mockEngine([first, second]);
    const layers = new BeeLayer();
    layers.collect(engine);
    const order = layers.items(BEE_DRAW.YSORT).map((e) => e.name);
    assert(order.join(',') === 'first,second', 'stabile a parità di y: ' + order);
}

{
    const parent = new BeeEntity(0, 40, 20, 40);
    parent.name = 'body';
    parent.drawLayer = BEE_DRAW.YSORT;
    const hat = new BeeEntity(4, -8, 12, 12);
    hat.name = 'hat';
    parent.addChild(hat);
    const label = new BeeText('HP', 8, 8);
    label.name = 'label';
    parent.addChild(label);

    const engine = mockEngine([parent]);
    const layers = new BeeLayer();
    layers.collect(engine);
    assert(layers.items(BEE_DRAW.YSORT).length === 1, 'figlio senza layer resta sul parent');
    assert(layers.items(BEE_DRAW.UI)[0].name === 'label', 'BeeText figlia va in ui');
    assert(label.drawLayer === BEE_DRAW.UI, 'BeeText default ui');
}

{
    const layers = new BeeLayer();
    layers.add('fx', { space: BEE_SPACE.WORLD, sort: 'stable', order: 25 });
    const list = layers.list().map((slot) => slot.name);
    assert(list.indexOf('fx') === 3, 'fx tra ysort e ui: ' + list);
    let threw = false;
    try {
        layers.add('fx');
    } catch {
        threw = true;
    }
    assert(threw, 'add duplicato lancia');
}

function actor(name, layer) {
    const entity = new BeeEntity(0, 0, 10, 10);
    entity.name = name;
    if (layer) entity.drawLayer = layer;
    return entity;
}

function placed(layers) {
    const out = {};
    const slots = layers.list();
    for (let i = 0; i < slots.length; i++) {
        out[slots[i].name] = layers.items(slots[i].name).map((entity) => entity.name).join(',');
    }
    return out;
}

function paintLikeDrawEntity(entity, pass, seen) {
    if (!entity || entity.visible === false || entity.destroyed) return;
    if (seen.has(entity)) throw new Error('disegnata due volte: ' + entity.name);
    seen.add(entity);
    const kids = entity.children;
    if (!kids || kids.length === 0) return;
    for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (child && child.drawLayer && child.drawLayer !== pass) continue;
        paintLikeDrawEntity(child, pass, seen);
    }
}

function assertDrawnOnce(layers) {
    const seen = new Set();
    const slots = layers.list();
    for (let i = 0; i < slots.length; i++) {
        const batch = layers.items(slots[i].name);
        for (let k = 0; k < batch.length; k++) {
            paintLikeDrawEntity(batch[k], slots[i].name, seen);
        }
    }
}

function family() {
    const padre = actor('padre');
    const gun = actor('gun', BEE_DRAW.YSORT);
    const hud = actor('hud', BEE_DRAW.UI);
    padre.addChild(gun);
    padre.addChild(hud);
    return { padre, gun, hud };
}

{
    const { padre, gun, hud } = family();
    const forward = new BeeLayer();
    forward.collect(mockEngine([padre, gun, hud]));
    const back = new BeeLayer();
    back.collect(mockEngine([hud, gun, padre]));
    const expected = { background: '', world: 'padre', ysort: 'gun', ui: 'hud' };
    assert(JSON.stringify(placed(forward)) === JSON.stringify(expected), 'padre prima: ' + JSON.stringify(placed(forward)));
    assert(JSON.stringify(placed(back)) === JSON.stringify(placed(forward)), 'ordine lista invertito, stesso risultato');
    assertDrawnOnce(forward);
    assertDrawnOnce(back);
}

{
    const { padre, gun, hud } = family();
    const engine = mockEngine([gun, hud]);
    void padre;
    const layers = new BeeLayer();
    layers.collect(engine);
    const map = placed(layers);
    assert(map.ysort === 'gun' && map.ui === 'hud' && map.world === '', 'padre assente: ' + JSON.stringify(map));
    assertDrawnOnce(layers);
}

{
    const { padre, gun, hud } = family();
    const engine = mockEngine([padre]);
    engine.currentScene = { entities: [gun, hud] };
    const layers = new BeeLayer();
    layers.collect(engine);
    const map = placed(layers);
    assert(map.world === 'padre' && map.ysort === 'gun' && map.ui === 'hud', 'figlio in scena, padre nel motore: ' + JSON.stringify(map));
    assertDrawnOnce(layers);
}

{
    const { padre } = family();
    const engine = mockEngine([padre]);
    engine.currentScene = { entities: [padre] };
    const layers = new BeeLayer();
    layers.collect(engine);
    assert(layers.items(BEE_DRAW.WORLD).length === 1, 'stessa entità in scena e nel motore, una sola');
    assert(layers.items(BEE_DRAW.YSORT).map((e) => e.name).join(',') === 'gun', 'gun raccolto una volta');
    assertDrawnOnce(layers);
}

{
    const { padre, hud } = family();
    padre.visible = false;
    const layers = new BeeLayer();
    layers.collect(mockEngine([hud, padre]));
    assert(layers.items(BEE_DRAW.UI).length === 0, 'padre invisibile spegne il figlio ui');
    assert(layers.items(BEE_DRAW.WORLD).length === 0, 'padre invisibile non va nel bucket');
    assertDrawnOnce(layers);
}

{
    const padre = actor('padre', BEE_DRAW.YSORT);
    const hat = actor('hat');
    padre.addChild(hat);
    const layers = new BeeLayer();
    layers.collect(mockEngine([hat, padre]));
    const ysort = layers.items(BEE_DRAW.YSORT).map((e) => e.name);
    assert(ysort.join(',') === 'padre', 'figlio senza drawLayer non entra nel bucket: ' + ysort);
    assertDrawnOnce(layers);
}

{
    const layers = new BeeLayer();
    assert(layers.get(BEE_DRAW.BACKGROUND).order === 0, 'background order 0');
    assert(layers.get(BEE_DRAW.WORLD).order === 10, 'world order 10');
    assert(layers.get(BEE_DRAW.YSORT).order === 20, 'ysort order 20');
    assert(layers.get(BEE_DRAW.UI).order === 100, 'ui order 100');
    assert(layers.get(BEE_DRAW.UI).space === BEE_SPACE.SCREEN, 'ui screen');

    const ground = new BeeEntity(0, 100, 10, 40);
    ground.name = 'ground';
    ground.drawLayer = BEE_DRAW.YSORT;
    ground.sortY = 0;
    const sky = new BeeEntity(0, 10, 10, 10);
    sky.name = 'sky';
    sky.drawLayer = BEE_DRAW.YSORT;
    layers.collect(mockEngine([ground, sky]));
    assert(layers.items(BEE_DRAW.YSORT).map((e) => e.name).join(',') === 'ground,sky', 'sortY 0 è una chiave, non i piedi');

    let empty = false;
    try {
        layers.add('');
    } catch {
        empty = true;
    }
    assert(empty, "add('') lancia");

    layers.remove('assente');
    assert(layers.has('assente') === false, 'remove di un nome assente non lancia');

    const bare = new BeeLayer({ defaults: false });
    assert(bare.list().length === 0, 'defaults:false non installa i pass');
}

function paintedNames(layers) {
    const seen = new Set();
    const names = [];
    const slots = layers.list();
    for (let i = 0; i < slots.length; i++) {
        const batch = layers.items(slots[i].name);
        for (let k = 0; k < batch.length; k++) {
            paintCollect(batch[k], slots[i].name, seen, names);
        }
    }
    return names;
}

function paintCollect(entity, pass, seen, names) {
    if (!entity || entity.visible === false || entity.destroyed) return;
    if (seen.has(entity)) throw new Error('disegnata due volte: ' + entity.name);
    seen.add(entity);
    names.push(entity.name);
    const kids = entity.children;
    if (!kids || kids.length === 0) return;
    for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (child && child.drawLayer && child.drawLayer !== pass) continue;
        paintCollect(child, pass, seen, names);
    }
}

{
    const g = actor('G');
    const p = actor('P');
    const c = actor('C');
    g.addChild(p);
    p.addChild(c);
    const childFirst = new BeeLayer();
    childFirst.collect(mockEngine([c, p]));
    const parentFirst = new BeeLayer();
    parentFirst.collect(mockEngine([p, c]));
    assert(placed(childFirst).world === 'P', 'solo P nel bucket, C prima: ' + JSON.stringify(placed(childFirst)));
    assert(JSON.stringify(placed(childFirst)) === JSON.stringify(placed(parentFirst)), 'G fuori lista, [C, P] e [P, C] uguali');
    const drawn = paintedNames(childFirst);
    assert(drawn.filter((name) => name === 'C').length === 1, 'C disegnato una volta: ' + drawn);
    assert(drawn.filter((name) => name === 'P').length === 1, 'P disegnato una volta: ' + drawn);
    assertDrawnOnce(parentFirst);
}

{
    const outsideParent = actor('P');
    const outsideChild = actor('C');
    outsideParent.addChild(outsideChild);
    outsideParent.destroyed = true;
    const outside = new BeeLayer();
    outside.collect(mockEngine([outsideChild]));
    assert(paintedNames(outside).length === 0, 'padre destroyed fuori lista, figlio non disegnato');

    const insideParent = actor('P');
    const insideChild = actor('C');
    insideParent.addChild(insideChild);
    insideParent.destroyed = true;
    const inside = new BeeLayer();
    inside.collect(mockEngine([insideChild, insideParent]));
    assert(paintedNames(inside).length === 0, 'padre destroyed in lista, figlio non disegnato');
}

console.log('BeeLayer tests ok');
