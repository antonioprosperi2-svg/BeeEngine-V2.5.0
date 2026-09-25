import { BeeMenuScene } from '../src/gameplay/BeeMenuScene.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function press(keys = [], mouse = {}) {
    const down = new Set(keys);
    return {
        wasPressed: (key) => down.has(key),
        mouse: {
            x: mouse.x ?? 0,
            y: mouse.y ?? 0,
            wasPressed: mouse.wasPressed === true
        }
    };
}

function mockEngine(over = {}) {
    const changed = [];
    return {
        canvas: { width: 800, height: 600 },
        time: { elapsed: 0, unscaledElapsed: 0, dt: 1 / 60, paused: false },
        scenes: {
            change(name, data) {
                changed.push({ name, data });
            }
        },
        changed,
        ...over
    };
}

function fakeCtx() {
    const calls = { save: 0, restore: 0, fillText: [] };
    return {
        calls,
        canvas: { width: 800, height: 600 },
        fillStyle: '#000',
        strokeStyle: '#000',
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        lineWidth: 1,
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        save() { calls.save += 1; },
        restore() { calls.restore += 1; },
        fillRect() {},
        stroke() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        fillText(text) { calls.fillText.push(String(text)); }
    };
}

{
    const menu = new BeeMenuScene({ next: 'main' });
    const engine = mockEngine();
    menu.engine = engine;
    menu.update(0.016, press(['Enter']), engine);
    assert(engine.changed.length === 1 && engine.changed[0].name === 'main', 'splash: next configurabile, non game');
}

{
    let started = null;
    const menu = new BeeMenuScene({
        onStart: (eng) => { started = eng; }
    });
    const engine = mockEngine();
    menu.engine = engine;
    menu.update(0.016, press(['Space']), engine);
    assert(started === engine, 'splash: onStart se manca next');
}

{
    const menu = new BeeMenuScene({ next: 'main' });
    const warns = [];
    const orig = console.warn;
    console.warn = (msg) => { warns.push(String(msg)); };
    try {
        menu.update(0.016, press(['Enter']), null);
    } finally {
        console.warn = orig;
    }
    assert(warns.length > 0, 'senza engine: warn, non no-op muto');
}

{
    const picks = [];
    const menu = new BeeMenuScene({
        items: [
            { label: 'Gioca', next: 'main' },
            { label: 'Esci', onSelect: () => { picks.push('quit'); } }
        ]
    });
    const engine = mockEngine();
    menu.engine = engine;
    assert(menu.selected === 0, 'focus iniziale');
    menu.update(0.016, press(['ArrowDown']), engine);
    assert(menu.selected === 1, 'frecce: voce successiva');
    menu.update(0.016, press(['KeyW']), engine);
    assert(menu.selected === 0, 'WASD: voce precedente');
    menu.update(0.016, press(['Enter']), engine);
    assert(engine.changed[0].name === 'main', 'conferma: next della voce');
    menu.selected = 1;
    menu.update(0.016, press(['Space']), engine);
    assert(picks[0] === 'quit', 'conferma: onSelect della voce');
}

{
    const menu = new BeeMenuScene({
        items: [
            { label: 'A', next: 'a' },
            { label: 'B', next: 'b' }
        ]
    });
    const engine = mockEngine();
    menu.engine = engine;
    const box = menu.itemBounds(1, 800, 600);
    menu.update(0.016, press([], {
        wasPressed: true,
        x: box.x + box.w / 2,
        y: box.y + box.h / 2
    }), engine);
    assert(engine.changed[0] && engine.changed[0].name === 'b', 'click sulla voce');
}

{
    const menu = new BeeMenuScene({ title: 'TEST', subtitle: 'sub' });
    menu.engine = mockEngine({ time: { elapsed: 0.2 } });
    const ctx = fakeCtx();
    ctx.textAlign = 'left';
    menu.draw(ctx, menu.engine);
    assert(ctx.calls.save === 1 && ctx.calls.restore === 1, 'draw save/restore');
    assert(ctx.calls.fillText.some((t) => t.includes('TEST')), 'titolo da config');
}

{
    const menu = new BeeMenuScene({ title: 'BLINK' });
    const engine = mockEngine({ time: { elapsed: 0 } });
    menu.engine = engine;
    const a = fakeCtx();
    menu.draw(a, engine);
    engine.time.elapsed = 0.8;
    const b = fakeCtx();
    menu.draw(b, engine);
    const hintA = a.calls.fillText.filter((t) => t.includes('INVIO') || t.includes('PREMI'));
    const hintB = b.calls.fillText.filter((t) => t.includes('INVIO') || t.includes('PREMI'));
    assert(hintA.length && hintB.length, 'hint disegnato da elapsed, non Date.now');
}

{
    const menu = new BeeMenuScene({ next: 'main' });
    const logs = [];
    const orig = console.log;
    console.log = (msg) => { logs.push(String(msg)); };
    try {
        menu.enter();
        menu.exit();
    } finally {
        console.log = orig;
    }
    assert(logs.length === 0, 'enter/exit senza log fissi');
}

console.log('BeeMenuScene tests ok');
