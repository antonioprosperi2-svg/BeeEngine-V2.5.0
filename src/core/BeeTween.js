/**
 * BeeEase — curve di interpolazione (t in [0, 1]).
 */

export const BeeEase = Object.freeze({
    linear: (t) => t,

    quadIn: (t) => t * t,
    quadOut: (t) => t * (2 - t),
    quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

    cubicIn: (t) => t * t * t,
    cubicOut: (t) => {
        const u = t - 1;
        return u * u * u + 1;
    },
    cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

    quartIn: (t) => t * t * t * t,
    quartOut: (t) => 1 - (t - 1) ** 4,
    quartInOut: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (t - 1) ** 4),

    sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
    sineOut: (t) => Math.sin((t * Math.PI) / 2),
    sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

    expoIn: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
    expoOut: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
    expoInOut: (t) => {
        if (t === 0 || t === 1) return t;
        return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
    },

    backIn: (t) => {
        const s = 1.70158;
        return t * t * ((s + 1) * t - s);
    },
    backOut: (t) => {
        const s = 1.70158;
        const u = t - 1;
        return u * u * ((s + 1) * u + s) + 1;
    },
    backInOut: (t) => {
        const s = 1.70158 * 1.525;
        if (t < 0.5) {
            const u = 2 * t;
            return (u * u * ((s + 1) * u - s)) / 2;
        }
        const u = 2 * t - 2;
        return (u * u * ((s + 1) * u + s) + 2) / 2;
    },

    elasticOut: (t) => {
        if (t === 0 || t === 1) return t;
        return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },

    bounceOut: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) {
            const u = t - 1.5 / d1;
            return n1 * u * u + 0.75;
        }
        if (t < 2.5 / d1) {
            const u = t - 2.25 / d1;
            return n1 * u * u + 0.9375;
        }
        const u = t - 2.625 / d1;
        return n1 * u * u + 0.984375;
    }
});

export function resolveEase(nameOrFn) {
    if (typeof nameOrFn === 'function') return nameOrFn;
    if (typeof nameOrFn === 'string' && typeof BeeEase[nameOrFn] === 'function') {
        return BeeEase[nameOrFn];
    }
    return BeeEase.linear;
}

export const BEE_TWEEN_DEFAULTS = Object.freeze({
    duration: 0.4,
    delay: 0,
    ease: 'quadOut',
    unscaled: false,
    yoyo: false,
    repeat: 0,
    autoStart: false,
    overwrite: true
});

function resolveStep(item, dtOrTime) {
    if (dtOrTime && typeof dtOrTime.delta === 'function') {
        return dtOrTime.delta(item.unscaled);
    }
    if (dtOrTime && typeof dtOrTime === 'object') {
        if (item.unscaled) {
            return typeof dtOrTime.unscaledDt === 'number' ? dtOrTime.unscaledDt : 0;
        }
        return typeof dtOrTime.dt === 'number' ? dtOrTime.dt : 0;
    }
    return Number(dtOrTime) || 0;
}

function splitPath(path) {
    return String(path).split('.');
}

function readProp(target, path) {
    const parts = splitPath(path);
    let cur = target;
    for (let i = 0; i < parts.length; i++) {
        if (cur == null) return 0;
        cur = cur[parts[i]];
    }
    const n = Number(cur);
    return Number.isFinite(n) ? n : 0;
}

function writeProp(target, path, value) {
    const parts = splitPath(path);
    let cur = target;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur == null) return;
        cur = cur[parts[i]];
    }
    if (cur == null) return;
    cur[parts[parts.length - 1]] = value;
}

function tweenOptions(durationOrOptions, extra = {}) {
    if (typeof durationOrOptions === 'number') {
        return { ...extra, duration: durationOrOptions };
    }
    return { ...extra, ...(durationOrOptions || {}) };
}

/**
 * Interpola proprietà numeriche su un target (entity.x, alpha, volume, scaleX…).
 * Non è un cooldown: BeeTimer conta, BeeTween scrive i valori ogni frame.
 */
export class BeeTween {
    constructor(options = {}) {
        const spec = options || {};
        this.target = spec.target ?? null;
        this.duration = Number(spec.duration);
        if (!Number.isFinite(this.duration) || this.duration < 0) {
            this.duration = BEE_TWEEN_DEFAULTS.duration;
        }
        this.delay = Math.max(0, Number(spec.delay) || 0);
        this.ease = resolveEase(spec.ease ?? BEE_TWEEN_DEFAULTS.ease);
        this.unscaled = spec.unscaled === true || spec.useUnscaledTime === true;
        this.yoyo = spec.yoyo === true;
        this.repeat = spec.repeat === Infinity ? Infinity : Math.max(0, Number(spec.repeat) || 0);
        this.overwrite = spec.overwrite !== false;
        this.onStart = typeof spec.onStart === 'function' ? spec.onStart : null;
        this.onUpdate = typeof spec.onUpdate === 'function' ? spec.onUpdate : null;
        this.onComplete = typeof spec.onComplete === 'function' ? spec.onComplete : null;

        this.#to = spec.to && typeof spec.to === 'object' ? { ...spec.to } : {};
        this.#fromSpec = spec.from && typeof spec.from === 'object' ? { ...spec.from } : null;
        this.#mode = spec.mode || (this.#fromSpec && Object.keys(this.#to).length ? 'fromTo' : (this.#fromSpec ? 'from' : 'to'));

        this.elapsed = 0;
        this.running = false;
        this.finished = false;
        this.cancelled = false;
        this.clock = spec.clock || null;
        this.loop = this.repeat === Infinity;
        this.#wait = this.delay;
        this.#started = false;
        this.#captured = false;
        this.#backward = false;
        this.#cycles = 0;
        this.#keys = [];
        this.#from = [];
        this.#delta = [];
        this.#paused = false;

        if (this.clock && typeof this.clock.add === 'function') this.clock.add(this);
        if (spec.autoStart === true) this.start();
    }

    #to;
    #fromSpec;
    #mode;
    #wait;
    #started;
    #captured;
    #backward;
    #cycles;
    #keys;
    #from;
    #delta;
    #paused;

    get paused() {
        return this.#paused;
    }

    get progress() {
        if (this.duration <= 0) return 1;
        return Math.min(1, this.elapsed / this.duration);
    }

    get keys() {
        return this.#keys;
    }

    static to(target, props, durationOrOptions) {
        return new BeeTween({
            target,
            to: props,
            mode: 'to',
            autoStart: true,
            ...tweenOptions(durationOrOptions)
        });
    }

    static from(target, props, durationOrOptions) {
        return new BeeTween({
            target,
            from: props,
            mode: 'from',
            autoStart: true,
            ...tweenOptions(durationOrOptions)
        });
    }

    static fromTo(target, from, to, durationOrOptions) {
        return new BeeTween({
            target,
            from,
            to,
            mode: 'fromTo',
            autoStart: true,
            ...tweenOptions(durationOrOptions)
        });
    }

    start() {
        this.elapsed = 0;
        this.finished = false;
        this.cancelled = false;
        this.running = true;
        this.#paused = false;
        this.#wait = this.delay;
        this.#started = false;
        this.#backward = false;
        this.#cycles = 0;
        this.loop = this.repeat === Infinity;
        if (this.clock && typeof this.clock.add === 'function') this.clock.add(this);
        if (this.#wait <= 0) this.#begin();
        return this;
    }

    pause() {
        if (!this.running) return this;
        this.running = false;
        this.#paused = true;
        return this;
    }

    resume() {
        if (this.finished || this.cancelled) return this;
        this.running = true;
        this.#paused = false;
        if (this.clock && typeof this.clock.add === 'function') this.clock.add(this);
        return this;
    }

    cancel() {
        this.running = false;
        this.#paused = false;
        this.finished = false;
        this.cancelled = true;
        if (this.clock && typeof this.clock.remove === 'function') this.clock.remove(this);
        return this;
    }

    steal(target, keys) {
        if (this.target !== target || this.cancelled) return this;
        const drop = new Set(keys);
        const nextKeys = [];
        const nextFrom = [];
        const nextDelta = [];
        for (let i = 0; i < this.#keys.length; i++) {
            if (drop.has(this.#keys[i])) continue;
            nextKeys.push(this.#keys[i]);
            nextFrom.push(this.#from[i]);
            nextDelta.push(this.#delta[i]);
        }
        this.#keys = nextKeys;
        this.#from = nextFrom;
        this.#delta = nextDelta;
        if (this.#keys.length === 0) this.cancel();
        return this;
    }

    seek(seconds) {
        if (!this.#started) this.#begin();
        const t = Math.max(0, Number(seconds) || 0);
        this.elapsed = this.duration <= 0 ? this.duration : Math.min(t, this.duration);
        this.#apply(this.duration <= 0 ? 1 : this.elapsed / this.duration);
        if (t >= this.duration && this.duration >= 0 && this.repeat === 0 && !this.yoyo) {
            this.finished = true;
            this.running = false;
        }
        return this;
    }

    update(dtOrTime) {
        if (!this.running || this.finished || this.cancelled) return this;
        if (this.target && this.target.destroyed === true) {
            this.cancel();
            return this;
        }

        let step = resolveStep(this, dtOrTime);
        if (this.#wait > 0) {
            this.#wait -= step;
            if (this.#wait > 0) return this;
            step = -this.#wait;
            this.#wait = 0;
        }

        if (!this.#started) this.#begin();
        if (this.duration <= 0) {
            this.#apply(1);
            this.#complete();
            return this;
        }

        this.elapsed += step;
        let u = this.elapsed / this.duration;
        if (u >= 1) {
            this.#apply(1);
            this.#complete();
            return this;
        }
        this.#apply(Math.max(0, u));
        return this;
    }

    #begin() {
        this.#started = true;
        if (!this.#captured) {
            this.#capture();
            this.#captured = true;
        }
        if (this.overwrite && this.clock && typeof this.clock.overwrite === 'function') {
            this.clock.overwrite(this);
        }
        if (this.onStart) this.onStart(this);
    }

    #capture() {
        const target = this.target;
        const keys = [];
        const from = [];
        const delta = [];

        if (this.#mode === 'from') {
            const src = this.#fromSpec || {};
            for (const key of Object.keys(src)) {
                const current = readProp(target, key);
                const start = Number(src[key]);
                keys.push(key);
                from.push(Number.isFinite(start) ? start : current);
                delta.push(current - (Number.isFinite(start) ? start : current));
            }
        } else if (this.#mode === 'fromTo') {
            const src = this.#fromSpec || {};
            const dest = this.#to || {};
            const all = new Set([...Object.keys(src), ...Object.keys(dest)]);
            for (const key of all) {
                const start = key in src ? Number(src[key]) : readProp(target, key);
                const end = key in dest ? Number(dest[key]) : start;
                keys.push(key);
                from.push(start);
                delta.push(end - start);
            }
        } else {
            const dest = this.#to || {};
            for (const key of Object.keys(dest)) {
                const start = readProp(target, key);
                const end = Number(dest[key]);
                keys.push(key);
                from.push(start);
                delta.push((Number.isFinite(end) ? end : start) - start);
            }
        }

        this.#keys = keys;
        this.#from = from;
        this.#delta = delta;
    }

    #apply(u) {
        const t = this.#backward ? 1 - u : u;
        const k = this.ease(Math.min(1, Math.max(0, t)));
        const target = this.target;
        for (let i = 0; i < this.#keys.length; i++) {
            writeProp(target, this.#keys[i], this.#from[i] + this.#delta[i] * k);
        }
        if (this.onUpdate) this.onUpdate(this);
    }

    #complete() {
        this.#cycles += 1;
        const total = this.repeat === Infinity ? Infinity : this.repeat + 1;
        if (this.#cycles < total) {
            this.elapsed = 0;
            if (this.yoyo) this.#backward = !this.#backward;
            else this.#apply(0);
            return;
        }
        this.finished = true;
        this.running = false;
        this.#paused = false;
        if (this.onComplete) this.onComplete(this);
    }
}

export class BeeTweenClock {
    constructor() {
        this.#live = [];
    }

    #live;

    get size() {
        return this.#live.length;
    }

    add(item) {
        if (!item || typeof item.update !== 'function') return item;
        item.clock = this;
        if (this.#live.indexOf(item) < 0) this.#live.push(item);
        return item;
    }

    remove(item) {
        const index = this.#live.indexOf(item);
        if (index >= 0) this.#live.splice(index, 1);
        if (item && item.clock === this) item.clock = null;
        return this;
    }

    overwrite(source) {
        if (!source || !source.target || !source.keys || source.keys.length === 0) return this;
        const live = this.#live.slice();
        for (let i = 0; i < live.length; i++) {
            const item = live[i];
            if (!item || item === source) continue;
            if (typeof item.steal === 'function') item.steal(source.target, source.keys);
        }
        return this;
    }

    kill(target) {
        const live = this.#live.slice();
        for (let i = 0; i < live.length; i++) {
            const item = live[i];
            if (!item) continue;
            if (item.target === target && typeof item.cancel === 'function') {
                item.cancel();
            } else if (typeof item.killTarget === 'function') {
                item.killTarget(target);
            }
        }
        return this;
    }

    tick(time) {
        const list = this.#live;
        let write = 0;
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item || item.cancelled) continue;
            item.update(time);
            if (item.cancelled || (item.finished && !item.loop)) continue;
            list[write] = item;
            write += 1;
        }
        list.length = write;
        return this;
    }

    clear() {
        const live = this.#live.slice();
        this.#live.length = 0;
        for (let i = 0; i < live.length; i++) {
            const item = live[i];
            if (!item) continue;
            item.clock = null;
            if (typeof item.cancel === 'function') item.cancel();
        }
        return this;
    }
}
