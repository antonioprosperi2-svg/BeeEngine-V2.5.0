import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BeeEngine } from '../BeeEngine.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engineSrc = readFileSync(join(root, 'BeeEngine.js'), 'utf8');
assert(!engineSrc.includes('BeeLocale'), 'BeeEngine.js non cita BeeLocale');
assert(!engineSrc.includes('src/plugins'), 'BeeEngine.js non importa src/plugins');
assert(!/from ['"].*plugins/.test(engineSrc), 'BeeEngine.js non importa plugin');

function installDom() {
    const listeners = new Map();
    globalThis.window = {
        addEventListener(type, fn) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) {
            listeners.get(type)?.delete(fn);
        }
    };
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
            return {
                clearRect() {},
                save() {},
                restore() {}
            };
        },
        getBoundingClientRect() {
            return { left: 0, top: 0, width: 800, height: 600 };
        }
    };
}

class FakeAnt {
    constructor() {
        this.engine = null;
        this.ticks = 0;
        this.off = null;
    }

    attach(engine) {
        this.engine = engine;
        engine.registerPlugin('ant', this);
        this.off = engine.onTick(() => { this.ticks += 1; });
        return this;
    }

    detach() {
        if (this.off) this.off();
        this.off = null;
        if (this.engine) this.engine.unregisterPlugin('ant');
        this.engine = null;
        return this;
    }
}

class FakeSpider {
    attach(engine) {
        this.engine = engine;
        engine.registerPlugin('spider', this);
        return this;
    }

    detach() {
        if (this.engine) this.engine.unregisterPlugin('spider');
        this.engine = null;
        return this;
    }
}

installDom();
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
if (!globalThis.performance) globalThis.performance = { now: () => 0 };

const engine = new BeeEngine(fakeCanvas(), 800, 600);
const ant = new FakeAnt().attach(engine);
const spider = new FakeSpider().attach(engine);

assert(engine.plugin('ant') === ant, 'ant registrato');
assert(engine.plugin('spider') === spider, 'spider registrato');
assert(engine.plugins.size === 2, 'due plugin, contenuto sconosciuto al motore');

engine.isRunning = true;
engine.loop(16);
engine.stop();
assert(ant.ticks >= 1, 'onTick chiama il plugin, il plugin non tocca loop()');

spider.detach();
assert(engine.plugin('spider') === null, 'detach toglie spider');
assert(engine.plugin('ant') === ant, 'ant resta');

ant.detach();
assert(engine.plugin('ant') === null, 'detach toglie ant');
assert(engine.plugins.size === 0, 'registro vuoto');

engine.destroy();
console.log('BeePlugin contract tests ok');
