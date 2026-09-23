import { BeeEngine } from '../BeeEngine.js';
import { BeeEntity } from '../src/core/BeeEntity.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function installDom() {
    const listeners = new Map();
    const win = {
        innerWidth: 1280,
        innerHeight: 720,
        addEventListener(type, fn) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) {
            const set = listeners.get(type);
            if (set) set.delete(fn);
        },
        dispatch(type, event = {}) {
            const set = listeners.get(type);
            if (!set) return;
            for (const fn of [...set]) fn(event);
        },
        listeners
    };
    globalThis.window = win;
    return win;
}

function fakeCanvas() {
    return {
        style: {},
        width: 800,
        height: 600,
        tabIndex: 0,
        addEventListener() {},
        removeEventListener() {},
        getContext() {
            return {};
        },
        getBoundingClientRect() {
            return { left: 0, top: 0, width: 800, height: 600 };
        }
    };
}

function resizeCount(win) {
    return win.listeners.get('resize')?.size ?? 0;
}

const win = installDom();

{
    const canvas = fakeCanvas();
    const engine = new BeeEngine(canvas, 800, 600);
    const before = resizeCount(win);

    engine.enableAutoResize(800, 600);
    assert(resizeCount(win) === before + 1, 'prima enableAutoResize: un listener');

    engine.enableAutoResize(800, 600, 40);
    assert(resizeCount(win) === 1, `due enableAutoResize: un solo listener, trovati ${resizeCount(win)}`);

    let writes = 0;
    Object.defineProperty(canvas.style, 'width', {
        configurable: true,
        enumerable: true,
        set(value) {
            writes += 1;
            this._width = value;
        },
        get() {
            return this._width || '';
        }
    });

    writes = 0;
    win.dispatch('resize');
    assert(writes === 1, `resize simula un solo handler, write width ${writes}`);

    engine.destroy();
}

{
    const engine = new BeeEngine(fakeCanvas(), 800, 600);
    engine.scenes.add('hub', {});
    engine.scenes.add('arena', {});

    const crate = new BeeEntity(10, 20, 16, 16);
    crate.addRigidBody({ world: engine.physics });
    engine.addEntity(crate);

    assert(engine.entities.length === 1, 'entity su engine.entities (niente scena corrente)');
    assert(engine.physics.bodies.length === 1, 'body nel world');

    engine.setScene('arena');

    assert(crate.destroyed === true, 'setScene chiama destroy');
    assert(engine.entities.length === 0, 'lista svuotata');
    assert(engine.physics.bodies.length === 0, `body uscito dal world, restano ${engine.physics.bodies.length}`);

    const pooled = engine.createPool('leak', {
        create: () => new BeeEntity(0, 0, 8, 8),
        initial: 1,
        max: 2
    });
    const item = pooled.acquire();
    engine.addEntity(item);
    assert(pooled.inUse === 1, 'pooled in uso');

    engine.setScene('hub');
    assert(pooled.inUse === 0, 'setScene rilascia il pooled (stesso branching di destroy)');
    assert(engine.entities.length === 0, 'lista svuotata dopo pooled');

    engine.destroy();
}

console.log('BeeEngine leak tests ok');
