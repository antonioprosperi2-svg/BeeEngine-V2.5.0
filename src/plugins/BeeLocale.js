/**
 * BeeLocale — stringhe per lingua, non hardcode nei fillText.
 * Pura lettura: t(key) / get(key). Nessun onTick, nessun loop.
 */

export class BeeLocale {
    /**
     * @param {{
     *   strings?: Record<string, Record<string, string>>,
     *   language?: string,
     *   fallback?: string,
     *   engine?: object
     * }} [options]
     */
    constructor(options = {}) {
        this.strings = options.strings && typeof options.strings === 'object' ? options.strings : {};
        this.language = options.language != null ? String(options.language) : 'en';
        this.fallback = options.fallback != null ? String(options.fallback) : 'en';
        this.engine = null;
        if (options.engine) this.attach(options.engine);
    }

    attach(engine) {
        this.engine = engine || null;
        if (this.engine && typeof this.engine.registerPlugin === 'function') {
            this.engine.registerPlugin('locale', this);
        }
        return this;
    }

    detach() {
        if (this.engine && typeof this.engine.unregisterPlugin === 'function') {
            this.engine.unregisterPlugin('locale');
        }
        this.engine = null;
        return this;
    }

    setLanguage(lang) {
        if (lang != null && String(lang)) this.language = String(lang);
        return this;
    }

    t(key) {
        const k = key == null ? '' : String(key);
        if (!k) return k;
        const hit = this.#lookup(this.language, k);
        if (hit != null) return hit;
        if (this.fallback !== this.language) {
            const fb = this.#lookup(this.fallback, k);
            if (fb != null) return fb;
        }
        return k;
    }

    get(key) {
        return this.t(key);
    }

    #lookup(lang, key) {
        const table = this.strings[lang];
        if (!table || typeof table !== 'object') return null;
        const value = table[key];
        if (value == null) return null;
        const text = String(value);
        return text === '' ? null : text;
    }
}
