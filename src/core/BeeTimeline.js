import { BeeTween, resolveEase, BEE_TWEEN_DEFAULTS } from './BeeTween.js';

function asOptions(durationOrOptions) {
    if (typeof durationOrOptions === 'number') return { duration: durationOrOptions };
    return durationOrOptions && typeof durationOrOptions === 'object' ? durationOrOptions : {};
}

/**
 * BeeTimeline — sequenze e paralleli di tween/call/wait.
 * Il cursor avanza in serie; `at` piazza un item in un tempo assoluto.
 */
export class BeeTimeline {
    constructor(options = {}) {
        const spec = options || {};
        this.unscaled = spec.unscaled === true || spec.useUnscaledTime === true;
        this.yoyo = spec.yoyo === true;
        this.repeat = spec.repeat === Infinity ? Infinity : Math.max(0, Number(spec.repeat) || 0);
        this.onComplete = typeof spec.onComplete === 'function' ? spec.onComplete : null;
        this.clock = spec.clock || null;

        this.elapsed = 0;
        this.duration = 0;
        this.running = false;
        this.finished = false;
        this.cancelled = false;
        this.loop = this.repeat === Infinity;
        this.#paused = false;
        this.#cursor = 0;
        this.#items = [];
        this.#backward = false;
        this.#cycles = 0;

        if (this.clock && typeof this.clock.add === 'function' && spec.autoStart === true) {
            this.start();
        }
    }

    #paused;
    #cursor;
    #items;
    #backward;
    #cycles;

    get paused() {
        return this.#paused;
    }

    get progress() {
        if (this.duration <= 0) return 1;
        return Math.min(1, this.elapsed / this.duration);
    }

    to(target, props, durationOrOptions) {
        const opt = asOptions(durationOrOptions);
        return this.#push(new BeeTween({
            target,
            to: props,
            mode: 'to',
            duration: opt.duration ?? BEE_TWEEN_DEFAULTS.duration,
            ease: resolveEase(opt.ease ?? BEE_TWEEN_DEFAULTS.ease),
            unscaled: this.unscaled,
            autoStart: false,
            overwrite: false
        }), opt.at);
    }

    from(target, props, durationOrOptions) {
        const opt = asOptions(durationOrOptions);
        return this.#push(new BeeTween({
            target,
            from: props,
            mode: 'from',
            duration: opt.duration ?? BEE_TWEEN_DEFAULTS.duration,
            ease: resolveEase(opt.ease ?? BEE_TWEEN_DEFAULTS.ease),
            unscaled: this.unscaled,
            autoStart: false,
            overwrite: false
        }), opt.at);
    }

    fromTo(target, from, to, durationOrOptions) {
        const opt = asOptions(durationOrOptions);
        return this.#push(new BeeTween({
            target,
            from,
            to,
            mode: 'fromTo',
            duration: opt.duration ?? BEE_TWEEN_DEFAULTS.duration,
            ease: resolveEase(opt.ease ?? BEE_TWEEN_DEFAULTS.ease),
            unscaled: this.unscaled,
            autoStart: false,
            overwrite: false
        }), opt.at);
    }

    wait(seconds) {
        this.#cursor += Math.max(0, Number(seconds) || 0);
        if (this.#cursor > this.duration) this.duration = this.#cursor;
        return this;
    }

    call(fn, at) {
        if (typeof fn !== 'function') return this;
        const start = this.#at(at);
        this.#items.push({ start, duration: 0, call: fn, fired: false, armed: false });
        return this;
    }

    set(target, props, at) {
        const start = this.#at(at);
        this.#items.push({ start, duration: 0, target, props: { ...props }, fired: false, armed: false });
        return this;
    }

    start() {
        this.elapsed = 0;
        this.finished = false;
        this.cancelled = false;
        this.running = true;
        this.#paused = false;
        this.#backward = false;
        this.#cycles = 0;
        this.loop = this.repeat === Infinity;
        this.#rewind();
        if (this.clock && typeof this.clock.add === 'function') this.clock.add(this);
        this.#applyTime(0, true);
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
        for (let i = 0; i < this.#items.length; i++) {
            const tween = this.#items[i].tween;
            if (tween && typeof tween.cancel === 'function') tween.cancel();
        }
        if (this.clock && typeof this.clock.remove === 'function') this.clock.remove(this);
        return this;
    }

    steal(target, keys) {
        for (let i = 0; i < this.#items.length; i++) {
            const tween = this.#items[i].tween;
            if (tween && typeof tween.steal === 'function') tween.steal(target, keys);
        }
        return this;
    }

    killTarget(target) {
        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            if (item.tween && item.tween.target === target && typeof item.tween.cancel === 'function') {
                item.tween.cancel();
            }
        }
        return this;
    }

    update(dtOrTime) {
        if (!this.running || this.finished || this.cancelled) return this;

        const step = resolveTimelineStep(this, dtOrTime);
        this.elapsed += step;

        if (this.duration <= 0) {
            this.#applyTime(0, true);
            this.#complete();
            return this;
        }

        let local = this.elapsed;
        if (local >= this.duration) {
            this.#applyTime(this.#backward ? 0 : this.duration, !this.#backward);
            this.#complete();
            return this;
        }

        const time = this.#backward ? this.duration - local : local;
        this.#applyTime(time, !this.#backward);
        return this;
    }

    #push(tween, at) {
        const start = this.#at(at);
        const duration = tween.duration;
        this.#items.push({ start, duration, tween, armed: false, fired: false });
        this.#cursor = start + duration;
        if (this.#cursor > this.duration) this.duration = this.#cursor;
        return this;
    }

    #at(at) {
        if (typeof at === 'number' && Number.isFinite(at)) return Math.max(0, at);
        return this.#cursor;
    }

    #stealSiblings(source) {
        const tween = source.tween;
        if (!tween || !tween.keys) return;
        for (let i = 0; i < this.#items.length; i++) {
            const other = this.#items[i];
            if (!other || other === source || !other.tween || !other.armed) continue;
            other.tween.steal(tween.target, tween.keys);
        }
    }

    #rewind() {
        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            item.armed = false;
            item.fired = false;
            if (item.tween) {
                item.tween.cancelled = false;
                item.tween.finished = false;
                item.tween.running = false;
            }
        }
    }

    #applyTime(time, forward) {
        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            if (item.tween) {
                if (item.tween.cancelled) continue;
                const local = time - item.start;
                if (local < 0) continue;
                if (!item.armed) {
                    item.tween.start();
                    this.#stealSiblings(item);
                    if (this.clock && typeof this.clock.overwrite === 'function') {
                        this.clock.overwrite(item.tween);
                    }
                    item.armed = true;
                }
                item.tween.seek(local);
                continue;
            }

            if (!forward || time < item.start || item.fired) continue;
            item.fired = true;
            if (typeof item.call === 'function') item.call(this);
            if (item.target && item.props) {
                const keys = Object.keys(item.props);
                for (let k = 0; k < keys.length; k++) {
                    item.target[keys[k]] = item.props[keys[k]];
                }
            }
        }
    }

    #complete() {
        this.#cycles += 1;
        const total = this.repeat === Infinity ? Infinity : this.repeat + 1;
        if (this.#cycles < total) {
            this.elapsed = 0;
            this.#rewind();
            if (this.yoyo) this.#backward = !this.#backward;
            return;
        }
        this.finished = true;
        this.running = false;
        this.#paused = false;
        if (this.onComplete) this.onComplete(this);
    }
}

function resolveTimelineStep(item, dtOrTime) {
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
