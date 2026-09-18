/**
 * BeeAudioMixer — grafo audio, non play()/cloneNode.
 * Bus (master / music / sfx / ui / voice), fade, ducking, pan 2D rispetto al listener.
 * Senza AudioContext (Node, autoplay lock) i numeri restano validi; il suono parte a unlock().
 */

export const BEE_BUS = Object.freeze({
    MASTER: 'master',
    MUSIC: 'music',
    SFX: 'sfx',
    UI: 'ui',
    VOICE: 'voice'
});

export const BEE_AUDIO_DEFAULTS = Object.freeze({
    maxDistance: 600,
    panWidth: 400,
    duckAmount: 0.35,
    duckAttack: 0.08,
    duckRelease: 0.35
});

export function spatialMix(x, y, listenerX, listenerY, options = {}) {
    const maxDistance = Number(options.maxDistance) > 0 ? Number(options.maxDistance) : BEE_AUDIO_DEFAULTS.maxDistance;
    const panWidth = Number(options.panWidth) > 0 ? Number(options.panWidth) : BEE_AUDIO_DEFAULTS.panWidth;
    const dx = (Number(x) || 0) - (Number(listenerX) || 0);
    const dy = (Number(y) || 0) - (Number(listenerY) || 0);
    const dist = Math.hypot(dx, dy);
    const volume = Math.max(0, 1 - dist / maxDistance);
    const pan = Math.max(-1, Math.min(1, dx / panWidth));
    return { volume, pan, dist };
}

function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

function moveToward(current, target, delta) {
    if (current < target) return Math.min(target, current + delta);
    if (current > target) return Math.max(target, current - delta);
    return target;
}

export class BeeAudioBus {
    constructor(name, options = {}) {
        this.name = String(name);
        this.parent = options.parent ? String(options.parent) : (this.name === BEE_BUS.MASTER ? null : BEE_BUS.MASTER);
        this.volume = clamp01(options.volume ?? 1);
        this.mute = options.mute === true;
        this.duck = 1;
        this.gain = null;
        this.duckGain = null;
        this.muteGain = null;
    }
}

export class BeeAudioVoice {
    constructor(mixer, spec = {}) {
        this.mixer = mixer;
        this.id = spec.id;
        this.bus = spec.bus || BEE_BUS.SFX;
        this.volume = clamp01(spec.volume ?? 1);
        this.loop = spec.loop === true;
        this.spatial = spec.spatial === true;
        this.x = Number(spec.x) || 0;
        this.y = Number(spec.y) || 0;
        this.stopped = false;
        this.element = spec.element || null;
        this.source = spec.source || null;
        this.gain = spec.gain || null;
        this.panner = spec.panner || null;
        this.#onEnded = spec.onEnded || null;
    }

    #onEnded;

    stop(fade = 0) {
        if (this.stopped) return this;
        const seconds = Math.max(0, Number(fade) || 0);
        if (seconds > 0 && this.gain && this.mixer.context) {
            const now = this.mixer.context.currentTime;
            this.gain.gain.cancelScheduledValues(now);
            this.gain.gain.setValueAtTime(this.gain.gain.value, now);
            this.gain.gain.linearRampToValueAtTime(0.0001, now + seconds);
            const later = this;
            setTimeout(() => later.#halt(), seconds * 1000 + 30);
            return this;
        }
        this.#halt();
        return this;
    }

    #halt() {
        if (this.stopped) return;
        this.stopped = true;
        try {
            if (this.source && typeof this.source.stop === 'function') this.source.stop();
        } catch {
            // already stopped
        }
        if (this.element) {
            this.element.pause();
            this.element.src = '';
        }
        if (typeof this.#onEnded === 'function') this.#onEnded(this);
    }
}

export class BeeAudioMixer {
    constructor(options = {}) {
        this.engine = options.engine || null;
        this.maxDistance = Number(options.maxDistance) > 0 ? Number(options.maxDistance) : BEE_AUDIO_DEFAULTS.maxDistance;
        this.panWidth = Number(options.panWidth) > 0 ? Number(options.panWidth) : BEE_AUDIO_DEFAULTS.panWidth;
        this.listenerX = Number(options.listenerX) || 0;
        this.listenerY = Number(options.listenerY) || 0;

        this.context = null;
        this.unlocked = false;
        this.#id = 1;
        this.#buses = new Map();
        this.#voices = [];
        this.#music = null;
        this.#pending = [];
        this.#masterOut = null;
        this.#duck = {
            bus: BEE_BUS.MUSIC,
            from: BEE_BUS.VOICE,
            amount: BEE_AUDIO_DEFAULTS.duckAmount,
            attack: BEE_AUDIO_DEFAULTS.duckAttack,
            release: BEE_AUDIO_DEFAULTS.duckRelease
        };

        this.bus(BEE_BUS.MASTER, { parent: null, volume: 1 });
        this.bus(BEE_BUS.MUSIC, { volume: 0.7 });
        this.bus(BEE_BUS.SFX, { volume: 1 });
        this.bus(BEE_BUS.UI, { volume: 1 });
        this.bus(BEE_BUS.VOICE, { volume: 1 });
    }

    #id;
    #buses;
    #voices;
    #music;
    #pending;
    #masterOut;
    #duck;

    get master() {
        return this.#buses.get(BEE_BUS.MASTER);
    }

    get voices() {
        return this.#voices.length;
    }

    get available() {
        return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
    }

    bus(name, options = {}) {
        const id = String(name || '');
        if (!id) throw new Error('BeeAudioMixer.bus: name required');
        let node = this.#buses.get(id);
        if (!node) {
            node = new BeeAudioBus(id, options);
            this.#buses.set(id, node);
            this.#wireBus(node);
        } else {
            if (options.volume !== undefined) node.volume = clamp01(options.volume);
            if (options.mute !== undefined) node.mute = options.mute === true;
            if (options.parent !== undefined) node.parent = options.parent ? String(options.parent) : null;
            this.#applyBus(node);
        }
        return node;
    }

    setVolume(name, volume) {
        const node = this.bus(name);
        node.volume = clamp01(volume);
        this.#applyBus(node);
        return this;
    }

    mute(name, muted = true) {
        const node = this.bus(name);
        node.mute = muted === true;
        this.#applyBus(node);
        return this;
    }

    duck(options = {}) {
        if (options.bus) this.#duck.bus = String(options.bus);
        if (options.from) this.#duck.from = String(options.from);
        if (options.amount !== undefined) this.#duck.amount = clamp01(options.amount);
        if (options.attack !== undefined) this.#duck.attack = Math.max(0.01, Number(options.attack) || BEE_AUDIO_DEFAULTS.duckAttack);
        if (options.release !== undefined) this.#duck.release = Math.max(0.01, Number(options.release) || BEE_AUDIO_DEFAULTS.duckRelease);
        return this;
    }

    listen(x, y) {
        this.listenerX = Number(x) || 0;
        this.listenerY = Number(y) || 0;
        return this;
    }

    unlock() {
        this.#ensureContext();
        if (!this.context) return this;
        const ctx = this.context;
        const resume = () => {
            this.unlocked = ctx.state === 'running';
            if (this.unlocked) this.#flushPending();
        };
        if (ctx.state === 'running') {
            resume();
            return this;
        }
        const p = ctx.resume();
        if (p && typeof p.then === 'function') {
            p.then(resume).catch(() => {});
        } else {
            resume();
        }
        return this;
    }

    play(source, options = {}) {
        this.unlock();
        const spec = this.#normalize(source, options);
        if (!spec) return null;
        if (!this.context || this.context.state !== 'running') {
            this.#pending.push(spec);
            return null;
        }
        return this.#start(spec);
    }

    music(source, options = {}) {
        const fade = options.fade !== undefined ? Number(options.fade) : 0.45;
        if (this.#music && !this.#music.stopped) {
            this.#music.stop(fade);
        }
        const voice = this.play(source, {
            ...options,
            bus: options.bus || BEE_BUS.MUSIC,
            loop: options.loop !== false,
            fadeIn: options.fadeIn !== undefined ? options.fadeIn : fade,
            slot: 'music'
        });
        this.#music = voice;
        return voice;
    }

    tone(options = {}) {
        return this.play({
            kind: 'tone',
            frequency: options.frequency ?? 440,
            type: options.type || 'sine',
            duration: options.duration ?? 0.18
        }, options);
    }

    stop(target, fade = 0) {
        if (target === 'music' || target === this.#music) {
            if (this.#music) this.#music.stop(fade);
            this.#music = null;
            return this;
        }
        if (target && typeof target.stop === 'function') {
            target.stop(fade);
            return this;
        }
        const bus = typeof target === 'string' ? target : null;
        for (let i = 0; i < this.#voices.length; i++) {
            const voice = this.#voices[i];
            if (!bus || voice.bus === bus) voice.stop(fade);
        }
        return this;
    }

    fade(name, volume, duration = 0.4) {
        const node = this.bus(name);
        const to = clamp01(volume);
        const seconds = Math.max(0, Number(duration) || 0);
        if (!this.context || seconds <= 0 || !node.gain) {
            node.volume = to;
            this.#applyBus(node);
            return this;
        }
        const now = this.context.currentTime;
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(Math.max(0.0001, to), now + seconds);
        node.volume = to;
        return this;
    }

    outputVolume(name) {
        let node = this.#buses.get(String(name));
        if (!node) return 0;
        let v = node.mute ? 0 : node.volume * node.duck;
        let parent = node.parent ? this.#buses.get(node.parent) : null;
        while (parent) {
            if (parent.mute) return 0;
            v *= parent.volume * parent.duck;
            parent = parent.parent ? this.#buses.get(parent.parent) : null;
        }
        return v;
    }

    update(time) {
        const dt = time && typeof time.delta === 'function'
            ? time.delta(true)
            : (time && typeof time.unscaledDt === 'number' ? time.unscaledDt : 0);

        this.#followListener();
        this.#updateDuck(dt);
        this.#updateVoices();
        return this;
    }

    destroy() {
        this.stop(null, 0);
        this.#pending.length = 0;
        this.#voices.length = 0;
        this.#music = null;
        if (this.context && typeof this.context.close === 'function') {
            this.context.close().catch(() => {});
        }
        this.context = null;
        this.unlocked = false;
        return this;
    }

    #normalize(source, options) {
        if (!source) return null;
        if (typeof source === 'object' && source.kind === 'tone') {
            return { ...options, source };
        }
        if (typeof source === 'string' && this.engine && this.engine.assets) {
            const asset = this.engine.assets.getSound
                ? this.engine.assets.getSound(source)
                : this.engine.getAsset?.(source);
            if (!asset) return null;
            source = asset;
        }
        return { ...options, source };
    }

    #start(spec) {
        const busName = spec.bus || BEE_BUS.SFX;
        this.bus(busName);
        const spatial = spec.x !== undefined || spec.y !== undefined || spec.spatial === true;
        let mix = { volume: 1, pan: typeof spec.pan === 'number' ? spec.pan : 0 };
        if (spatial) {
            mix = spatialMix(spec.x, spec.y, this.listenerX, this.listenerY, this);
            if (typeof spec.pan === 'number') mix.pan = spec.pan;
        }

        const ctx = this.context;
        const gain = ctx.createGain();
        const panner = ctx.createStereoPanner();
        const instance = clamp01(spec.volume ?? 1) * mix.volume;
        const fadeIn = Math.max(0, Number(spec.fadeIn) || 0);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : Math.max(0.0001, instance), now);
        if (fadeIn > 0) {
            gain.gain.linearRampToValueAtTime(Math.max(0.0001, instance), now + fadeIn);
        }
        panner.pan.setValueAtTime(mix.pan, now);

        const bus = this.#buses.get(busName);
        gain.connect(panner);
        panner.connect(bus.gain);

        let element = null;
        let sourceNode = null;
        const raw = spec.source;

        if (raw && raw.kind === 'tone') {
            sourceNode = ctx.createOscillator();
            sourceNode.type = raw.type || 'sine';
            sourceNode.frequency.setValueAtTime(raw.frequency ?? 440, now);
            sourceNode.connect(gain);
            sourceNode.start(now);
            const dur = Math.max(0.02, Number(raw.duration) || 0.18);
            sourceNode.stop(now + dur);
        } else if (raw && typeof AudioBuffer !== 'undefined' && raw instanceof AudioBuffer) {
            sourceNode = ctx.createBufferSource();
            sourceNode.buffer = raw;
            sourceNode.loop = spec.loop === true;
            sourceNode.connect(gain);
            sourceNode.start(now);
        } else if (raw && typeof raw.cloneNode === 'function') {
            element = raw.cloneNode();
            element.loop = spec.loop === true;
            element.preload = 'auto';
            sourceNode = ctx.createMediaElementSource(element);
            sourceNode.connect(gain);
            const play = element.play();
            if (play && typeof play.catch === 'function') play.catch(() => {});
        } else {
            return null;
        }

        const voice = new BeeAudioVoice(this, {
            id: this.#id++,
            bus: busName,
            volume: spec.volume ?? 1,
            loop: spec.loop === true,
            spatial,
            x: spec.x,
            y: spec.y,
            element,
            source: sourceNode,
            gain,
            panner,
            onEnded: (ended) => this.#drop(ended)
        });

        const ended = () => voice.stop(0);
        if (sourceNode) sourceNode.onended = ended;
        if (element) element.onended = ended;

        this.#voices.push(voice);
        if (spec.slot === 'music') this.#music = voice;
        return voice;
    }

    #drop(voice) {
        const index = this.#voices.indexOf(voice);
        if (index >= 0) this.#voices.splice(index, 1);
        if (this.#music === voice) this.#music = null;
    }

    #flushPending() {
        const queued = this.#pending.splice(0, this.#pending.length);
        for (let i = 0; i < queued.length; i++) {
            this.#start(queued[i]);
        }
    }

    #ensureContext() {
        if (this.context) return;
        const Ctor = typeof AudioContext !== 'undefined'
            ? AudioContext
            : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
        if (!Ctor) return;
        this.context = new Ctor();
        this.#masterOut = this.context.createGain();
        this.#masterOut.connect(this.context.destination);
        for (const node of this.#buses.values()) {
            this.#wireBus(node);
        }
    }

    #wireBus(node) {
        if (!this.context) return;
        if (!node.gain) node.gain = this.context.createGain();
        if (!node.muteGain) node.muteGain = this.context.createGain();
        if (!node.duckGain) node.duckGain = this.context.createGain();
        try {
            node.gain.disconnect();
            node.muteGain.disconnect();
            node.duckGain.disconnect();
        } catch {
            // first wire
        }
        node.gain.connect(node.muteGain);
        node.muteGain.connect(node.duckGain);
        const parent = node.parent ? this.#buses.get(node.parent) : null;
        if (parent && parent.gain) {
            node.duckGain.connect(parent.gain);
        } else {
            node.duckGain.connect(this.#masterOut);
        }
        this.#applyBus(node);
    }

    #applyBus(node) {
        if (!node.gain) return;
        node.gain.gain.value = node.volume;
        if (node.muteGain) node.muteGain.gain.value = node.mute ? 0 : 1;
        if (node.duckGain) node.duckGain.gain.value = node.duck;
    }

    #followListener() {
        const engine = this.engine;
        if (!engine) return;
        if (engine.camera) {
            this.listenerX = engine.camera.x + (engine.camera.w || 0) / 2;
            this.listenerY = engine.camera.y + (engine.camera.h || 0) / 2;
            return;
        }
        if (engine.canvas) {
            this.listenerX = engine.canvas.width / 2;
            this.listenerY = engine.canvas.height / 2;
        }
    }

    #updateDuck(dt) {
        const from = this.#duck.from;
        let active = 0;
        for (let i = 0; i < this.#voices.length; i++) {
            if (!this.#voices[i].stopped && this.#voices[i].bus === from) active += 1;
        }
        const target = active > 0 ? 1 - this.#duck.amount : 1;
        const speed = active > 0 ? 1 / this.#duck.attack : 1 / this.#duck.release;
        const node = this.#buses.get(this.#duck.bus);
        if (!node) return;
        node.duck = moveToward(node.duck, target, speed * Math.max(0, dt));
        if (node.duckGain) node.duckGain.gain.value = node.duck;
    }

    #updateVoices() {
        for (let i = 0; i < this.#voices.length; i++) {
            const voice = this.#voices[i];
            if (voice.stopped || !voice.spatial || !voice.gain) continue;
            const mix = spatialMix(voice.x, voice.y, this.listenerX, this.listenerY, this);
            const now = this.context ? this.context.currentTime : 0;
            voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.volume * mix.volume), now);
            if (voice.panner) voice.panner.pan.setValueAtTime(mix.pan, now);
        }
    }
}
