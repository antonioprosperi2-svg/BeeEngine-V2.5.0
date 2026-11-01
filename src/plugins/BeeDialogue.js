/**
 * BeeDialogue — alberi di dialogo: speaker, testo, scelte, avanzamento lineare.
 * Nessun tick e nessun listener propri: il gioco chiama handleInput(input) da scene.update
 * e draw(ctx) da scene.draw. Il motore non importa questo file.
 */

const DEFAULT_ADVANCE_KEY = 'Space';

function str(value) {
    return value == null ? '' : String(value);
}

function copyData(data) {
    return data && typeof data === 'object' ? { ...data } : undefined;
}

export class BeeDialogue {
    /**
     * @param {{
     *   engine?: object,
     *   locale?: { t: Function }|null,
     *   lineAdvanceKey?: string,
     *   cancelKey?: string|null
     * }} [options]
     */
    constructor(options = {}) {
        this.#nodes = new Map();
        this.#start = null;
        this.#open = false;
        this.#currentId = null;
        this.#selected = 0;
        this.#listeners = new Set();
        this.#locale = null;

        const advance = str(options.lineAdvanceKey);
        this.#advanceKey = advance || DEFAULT_ADVANCE_KEY;
        const cancel = str(options.cancelKey);
        this.#cancelKey = cancel || null;

        this.engine = null;
        if (options.locale) this.setLocale(options.locale);
        if (options.engine) this.attach(options.engine);
    }

    #nodes;
    #start;
    #open;
    #currentId;
    #selected;
    #listeners;
    #locale;
    #advanceKey;
    #cancelKey;

    attach(engine) {
        this.engine = engine || null;
        if (this.engine && typeof this.engine.registerPlugin === 'function') {
            this.engine.registerPlugin('dialogue', this);
        }
        return this;
    }

    detach() {
        if (this.engine && typeof this.engine.unregisterPlugin === 'function') {
            this.engine.unregisterPlugin('dialogue');
        }
        this.engine = null;
        return this;
    }

    /**
     * Sostituisce l'albero. Se un dialogo era aperto lo chiude con reason 'reload'.
     * `null` svuota l'albero. Un albero malformato o con id duplicati lancia.
     */
    load(tree) {
        if (this.#open) this.close('reload');

        if (tree == null) {
            this.#nodes = new Map();
            this.#start = null;
            return this;
        }
        if (typeof tree !== 'object' || !tree.nodes || typeof tree.nodes !== 'object') {
            throw new Error('BeeDialogue.load: serve un albero con nodes');
        }

        const next = new Map();
        const raw = tree.nodes;
        if (Array.isArray(raw)) {
            for (let i = 0; i < raw.length; i++) {
                this.#addNode(next, raw[i], null);
            }
        } else {
            const keys = Object.keys(raw);
            for (let i = 0; i < keys.length; i++) {
                this.#addNode(next, raw[keys[i]], keys[i]);
            }
        }

        let start = null;
        if (next.size > 0) {
            const wanted = tree.start == null ? '' : str(tree.start);
            if (wanted && next.has(wanted)) {
                start = wanted;
            } else {
                if (wanted) console.warn(`BeeDialogue.load: start sconosciuto: ${wanted}, uso il primo nodo`);
                start = next.keys().next().value;
            }
        }

        this.#warnMissingRefs(next);
        this.#nodes = next;
        this.#start = start;
        return this;
    }

    /**
     * Apre dal nodo indicato o da `tree.start`. Già aperto: restart pulito
     * (`end` con reason 'restart', poi `start`).
     */
    start(nodeId) {
        const id = nodeId == null ? this.#start : str(nodeId);
        if (!id || !this.#nodes.has(id)) {
            console.warn(`BeeDialogue.start: nodo sconosciuto: ${id || '(nessun albero)'}`);
            return false;
        }
        if (this.#open) this.close('restart');

        this.#open = true;
        this.#currentId = id;
        this.#selected = 0;
        this.#emit({ type: 'start', id });
        if (this.#open && this.#currentId === id) {
            this.#emit({ type: 'node', id, node: this.current() });
        }
        return true;
    }

    /** Solo su nodo lineare: va a `next` o chiude. */
    advance() {
        if (!this.#open) return false;
        const node = this.#nodes.get(this.#currentId);
        if (!node) return false;
        if (node.choices) {
            console.warn(`BeeDialogue.advance: "${node.id}" ha scelte, usa choose(index)`);
            return false;
        }
        const from = node.id;
        this.#goTo(from, node.next, { type: 'advance', from, to: node.next ?? null });
        return true;
    }

    /** Solo su nodo con scelte: va a `choices[index].next` o chiude. */
    choose(index) {
        if (!this.#open) return false;
        const node = this.#nodes.get(this.#currentId);
        if (!node) return false;
        if (!node.choices) {
            console.warn(`BeeDialogue.choose: "${node.id}" non ha scelte, usa advance()`);
            return false;
        }
        if (!Number.isInteger(index) || index < 0 || index >= node.choices.length) {
            console.warn(`BeeDialogue.choose: indice fuori range: ${index}`);
            return false;
        }
        const choice = node.choices[index];
        const event = { type: 'choice', id: node.id, index };
        const data = copyData(choice.data);
        if (data) event.data = data;
        this.#goTo(node.id, choice.next, event);
        return true;
    }

    close(reason = 'close') {
        if (!this.#open) return this;
        const id = this.#currentId;
        this.#open = false;
        this.#currentId = null;
        this.#selected = 0;
        this.#emit({ type: 'end', id, reason: str(reason) || 'close' });
        return this;
    }

    isOpen() {
        return this.#open;
    }

    currentId() {
        return this.#open ? this.#currentId : null;
    }

    /** Copia del nodo corrente con speaker, testo e scelte già risolti. */
    current() {
        if (!this.#open) return null;
        const node = this.#nodes.get(this.#currentId);
        if (!node) return null;

        const out = { id: node.id };
        const speaker = this.#resolve(node.speakerKey, node.speaker);
        if (speaker != null) out.speaker = speaker;
        const text = this.#resolve(node.textKey, node.text);
        if (text != null) out.text = text;
        if (node.choices) {
            out.choices = node.choices.map((choice) => this.#choiceCopy(choice));
        }
        if (node.next != null) out.next = node.next;
        const data = copyData(node.data);
        if (data) out.data = data;
        return out;
    }

    listChoices() {
        if (!this.#open) return [];
        const node = this.#nodes.get(this.#currentId);
        if (!node || !node.choices) return [];
        const list = [];
        for (let i = 0; i < node.choices.length; i++) {
            const choice = node.choices[i];
            const item = { index: i, text: this.#resolve(choice.textKey, choice.text) ?? '' };
            const data = copyData(choice.data);
            if (data) item.data = data;
            list.push(item);
        }
        return list;
    }

    setLocale(locale) {
        if (locale == null) {
            this.#locale = null;
        } else if (typeof locale.t === 'function') {
            this.#locale = locale;
        } else {
            console.warn('BeeDialogue.setLocale: serve un oggetto con t(key)');
        }
        return this;
    }

    /**
     * Da chiamare in scene.update. Con scelte: frecce su/giù evidenziano, Digit1..9 scelgono,
     * lineAdvanceKey conferma l'evidenziata. Senza scelte: lineAdvanceKey avanza.
     * Fa una sola azione per chiamata.
     */
    handleInput(input) {
        if (!this.#open || !input || typeof input.wasPressed !== 'function') return this;

        if (this.#cancelKey && input.wasPressed(this.#cancelKey)) {
            this.close('cancel');
            return this;
        }

        const node = this.#nodes.get(this.#currentId);
        if (!node) return this;

        if (!node.choices) {
            if (input.wasPressed(this.#advanceKey)) this.advance();
            return this;
        }

        const count = node.choices.length;
        if (input.wasPressed('ArrowDown')) {
            this.#selected = (this.#selected + 1) % count;
            return this;
        }
        if (input.wasPressed('ArrowUp')) {
            this.#selected = (this.#selected + count - 1) % count;
            return this;
        }
        const limit = Math.min(count, 9);
        for (let i = 0; i < limit; i++) {
            if (input.wasPressed(`Digit${i + 1}`)) {
                this.#selected = i;
                this.choose(i);
                return this;
            }
        }
        if (input.wasPressed(this.#advanceKey)) this.choose(this.#selected);
        return this;
    }

    /** Box in spazio schermo. No-op senza ctx o a dialogo chiuso. */
    draw(ctx, options = {}) {
        if (!ctx || !this.#open) return this;
        const node = this.current();
        if (!node) return this;
        const opts = options && typeof options === 'object' ? options : {};

        const canvas = ctx.canvas || {};
        const canvasW = Number.isFinite(canvas.width) ? canvas.width : 800;
        const canvasH = Number.isFinite(canvas.height) ? canvas.height : 480;

        const padding = Number.isFinite(opts.padding) ? opts.padding : 14;
        const font = opts.font ? String(opts.font) : '16px monospace';
        const sizeMatch = /(\d+(?:\.\d+)?)px/.exec(font);
        const lineHeight = Math.round((sizeMatch ? Number(sizeMatch[1]) : 16) * 1.4);
        const width = Number.isFinite(opts.width) ? opts.width : canvasW - 80;
        const x = Number.isFinite(opts.x) ? opts.x : 40;
        const innerW = Math.max(10, width - padding * 2);

        const choices = node.choices || [];
        const selectedChoice = Number.isInteger(opts.selectedChoice) ? opts.selectedChoice : this.#selected;

        ctx.save();
        try {
            ctx.font = font;
            const lines = node.text ? this.#wrap(ctx, node.text, innerW) : [];
            const rows = (node.speaker ? 1 : 0) + lines.length + choices.length;
            const gap = choices.length > 0 ? Math.round(lineHeight / 2) : 0;
            const height = Number.isFinite(opts.height)
                ? opts.height
                : padding * 2 + rows * lineHeight + gap;
            const y = Number.isFinite(opts.y) ? opts.y : canvasH - height - 20;

            ctx.fillStyle = 'rgba(8, 10, 20, 0.88)';
            ctx.fillRect(x, y, width, height);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            let cursor = y + padding;
            const left = x + padding;

            if (node.speaker) {
                ctx.font = `bold ${font}`;
                ctx.fillStyle = opts.speakerColor || '#ffe08a';
                ctx.fillText(node.speaker, left, cursor);
                ctx.font = font;
                cursor += lineHeight;
            }

            ctx.fillStyle = opts.textColor || '#e2e8f0';
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], left, cursor);
                cursor += lineHeight;
            }

            cursor += gap;
            for (let i = 0; i < choices.length; i++) {
                const picked = i === selectedChoice;
                ctx.fillStyle = picked ? (opts.textColor || '#e2e8f0') : (opts.choiceColor || '#94a3b8');
                ctx.fillText(`${picked ? '> ' : '  '}${i + 1}. ${choices[i].text}`, left, cursor);
                cursor += lineHeight;
            }
        } finally {
            ctx.restore();
        }
        return this;
    }

    onChange(fn) {
        if (typeof fn !== 'function') return () => {};
        this.#listeners.add(fn);
        return () => {
            this.#listeners.delete(fn);
        };
    }

    toJSON() {
        const nodes = [];
        this.#nodes.forEach((node) => nodes.push(this.#nodeDTO(node)));
        return {
            tree: nodes.length > 0 ? { start: this.#start, nodes } : null,
            open: this.#open,
            currentId: this.currentId(),
            selectedChoice: this.#selected
        };
    }

    /**
     * Ripristina albero e stato. Un dialogo aperto torna aperto sul nodo salvato senza
     * un secondo `start`: scatta solo `node`.
     */
    fromJSON(data) {
        if (!data || typeof data !== 'object') {
            console.warn('BeeDialogue.fromJSON: dati non validi');
            return this;
        }

        if (data.tree != null) this.load(data.tree);

        const id = data.currentId == null ? '' : str(data.currentId);
        if (data.open === true && id && this.#nodes.has(id)) {
            this.#open = true;
            this.#currentId = id;
            const node = this.#nodes.get(id);
            const count = node.choices ? node.choices.length : 0;
            const picked = Number(data.selectedChoice);
            this.#selected = Number.isInteger(picked) && picked >= 0 && picked < count ? picked : 0;
            this.#emit({ type: 'node', id, node: this.current() });
            return this;
        }

        if (data.open === true) {
            console.warn(`BeeDialogue.fromJSON: nodo salvato sconosciuto: ${id || '(vuoto)'}`);
        }
        if (this.#open) this.close('restore');
        return this;
    }

    /** Chiude e azzera lo stato runtime. L'albero resta; `load(null)` lo svuota. */
    clear() {
        if (this.#open) this.close('clear');
        this.#selected = 0;
        return this;
    }

    #addNode(target, raw, key) {
        if (!raw || typeof raw !== 'object') {
            throw new Error('BeeDialogue.load: nodo non valido');
        }
        const own = raw.id == null ? '' : str(raw.id);
        if (key != null && own && own !== key) {
            throw new Error(`BeeDialogue.load: id "${own}" diverso dalla chiave "${key}"`);
        }
        const id = own || (key == null ? '' : key);
        if (!id) throw new Error('BeeDialogue.load: nodo senza id');
        if (target.has(id)) throw new Error(`BeeDialogue.load: id duplicato: ${id}`);

        const node = { id };
        if (raw.speaker != null) node.speaker = str(raw.speaker);
        if (raw.speakerKey != null) node.speakerKey = str(raw.speakerKey);
        if (raw.text != null) node.text = str(raw.text);
        if (raw.textKey != null) node.textKey = str(raw.textKey);
        const data = copyData(raw.data);
        if (data) node.data = data;

        const hasChoices = Array.isArray(raw.choices) && raw.choices.length > 0;
        if (hasChoices) {
            if (raw.next != null) {
                console.warn(`BeeDialogue.load: "${id}" ha choices e next, ignoro next`);
            }
            node.choices = [];
            for (let i = 0; i < raw.choices.length; i++) {
                const choice = this.#readChoice(raw.choices[i], id, i);
                if (choice) node.choices.push(choice);
            }
            if (node.choices.length === 0) delete node.choices;
        }
        if (!node.choices && raw.next != null && raw.next !== '') node.next = str(raw.next);

        target.set(id, node);
    }

    #readChoice(raw, nodeId, index) {
        if (!raw || typeof raw !== 'object') {
            console.warn(`BeeDialogue.load: scelta ${index} di "${nodeId}" non valida, saltata`);
            return null;
        }
        const choice = {};
        if (raw.text != null) choice.text = str(raw.text);
        if (raw.textKey != null) choice.textKey = str(raw.textKey);
        if (choice.text === undefined && choice.textKey === undefined) {
            console.warn(`BeeDialogue.load: scelta ${index} di "${nodeId}" senza text né textKey`);
        }
        if (raw.next != null && raw.next !== '') choice.next = str(raw.next);
        const data = copyData(raw.data);
        if (data) choice.data = data;
        return choice;
    }

    #warnMissingRefs(nodes) {
        nodes.forEach((node) => {
            if (node.next && !nodes.has(node.next)) {
                console.warn(`BeeDialogue.load: "${node.id}" punta a un nodo che non esiste: ${node.next}`);
            }
            if (!node.choices) return;
            for (let i = 0; i < node.choices.length; i++) {
                const ref = node.choices[i].next;
                if (ref && !nodes.has(ref)) {
                    console.warn(`BeeDialogue.load: scelta ${i} di "${node.id}" punta a un nodo che non esiste: ${ref}`);
                }
            }
        });
    }

    /**
     * Muove lo stato su `target` (o chiude), poi emette. L'evento dell'azione parte sempre
     * a stato coerente: dopo lo spostamento, oppure prima della chiusura.
     */
    #goTo(from, target, event) {
        if (target == null || target === '') {
            this.#emit(event);
            this.close('finished');
            return;
        }
        if (!this.#nodes.has(target)) {
            this.#emit(event);
            this.close('missing-node');
            return;
        }
        this.#currentId = target;
        this.#selected = 0;
        this.#emit(event.type === 'advance' ? { ...event, to: target } : event);
        if (this.#open && this.#currentId === target) {
            this.#emit({ type: 'node', id: target, node: this.current() });
        }
    }

    #resolve(key, literal) {
        if (key) {
            const locale = this.#activeLocale();
            if (locale) {
                const hit = str(locale.t(key));
                if (hit && hit !== key) return hit;
                if (literal !== undefined) return literal;
                return hit || key;
            }
        }
        if (literal !== undefined) return literal;
        return key || undefined;
    }

    #activeLocale() {
        if (this.#locale) return this.#locale;
        const engine = this.engine;
        if (engine && typeof engine.plugin === 'function') {
            const found = engine.plugin('locale');
            if (found && typeof found.t === 'function') return found;
        }
        return null;
    }

    #choiceCopy(choice) {
        const out = { text: this.#resolve(choice.textKey, choice.text) ?? '' };
        if (choice.textKey !== undefined) out.textKey = choice.textKey;
        if (choice.next !== undefined) out.next = choice.next;
        const data = copyData(choice.data);
        if (data) out.data = data;
        return out;
    }

    #nodeDTO(node) {
        const out = { id: node.id };
        if (node.speaker !== undefined) out.speaker = node.speaker;
        if (node.speakerKey !== undefined) out.speakerKey = node.speakerKey;
        if (node.text !== undefined) out.text = node.text;
        if (node.textKey !== undefined) out.textKey = node.textKey;
        if (node.choices) {
            out.choices = node.choices.map((choice) => {
                const c = {};
                if (choice.text !== undefined) c.text = choice.text;
                if (choice.textKey !== undefined) c.textKey = choice.textKey;
                if (choice.next !== undefined) c.next = choice.next;
                const data = copyData(choice.data);
                if (data) c.data = data;
                return c;
            });
        }
        if (node.next !== undefined) out.next = node.next;
        const data = copyData(node.data);
        if (data) out.data = data;
        return out;
    }

    #wrap(ctx, text, maxWidth) {
        const measure = (s) => {
            if (typeof ctx.measureText !== 'function') return s.length * 8;
            const m = ctx.measureText(s);
            return m && Number.isFinite(m.width) ? m.width : s.length * 8;
        };
        const lines = [];
        const paragraphs = String(text).split('\n');
        for (let p = 0; p < paragraphs.length; p++) {
            const words = paragraphs[p].split(/\s+/).filter(Boolean);
            if (words.length === 0) {
                lines.push('');
                continue;
            }
            let line = words[0];
            for (let i = 1; i < words.length; i++) {
                const attempt = `${line} ${words[i]}`;
                if (measure(attempt) <= maxWidth) {
                    line = attempt;
                } else {
                    lines.push(line);
                    line = words[i];
                }
            }
            lines.push(line);
        }
        return lines;
    }

    #emit(event) {
        const list = [];
        this.#listeners.forEach((fn) => list.push(fn));
        for (let i = 0; i < list.length; i++) list[i](event);
    }
}
