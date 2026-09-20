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

console.log('BeeLayer tests ok');
