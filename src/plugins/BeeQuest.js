/**
 * BeeQuest — stato di quest e obiettivi (goal), flag di gioco e ricompense dichiarative.
 * Solo logica e stato: niente disegno, niente ciclo del motore. Il gioco chiama i metodi
 * (setFlag, complete, addProgress, evaluate, ...) e legge lo stato con describe/list.
 * Il motore non carica questo file e il file non dipende da nessun altro.
 */

const SAVE_VERSION = 1;
const STATUSES = ['inactive', 'active', 'done', 'failed'];
const BUILTIN_TYPES = ['manual', 'flag', 'count'];
const GOAL_FIELDS = new Set([
    'id', 'type', 'label', 'labelKey', 'optional', 'hidden',
    'flag', 'equals', 'min', 'target', 'rewards', 'data'
]);
// Tetto di sicurezza per un solo assestamento: una check o un listener che cambia
// stato a ogni passata non deve bloccare il gioco.
const MAX_STEPS = 10000;

function str(value) {
    return value == null ? '' : String(value);
}

function setOwn(target, key, value) {
    Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

function isPlain(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/** Copia profonda di array e oggetti semplici. Funzioni e istanze di classe restano per riferimento. */
function deepCopy(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    if (Array.isArray(value)) {
        const out = [];
        seen.set(value, out);
        for (let i = 0; i < value.length; i++) out.push(deepCopy(value[i], seen));
        return out;
    }
    if (!isPlain(value)) return value;
    const out = {};
    seen.set(value, out);
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) setOwn(out, keys[i], deepCopy(value[keys[i]], seen));
    return out;
}

function isFlagValue(value) {
    return value === null
        || typeof value === 'string'
        || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value));
}

function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

export class BeeQuest {
    /**
     * @param {{
     *   engine?: object,
     *   inventory?: { add: Function }|null,
     *   locale?: { t: Function }|null
     * }} [options]
     */
    constructor(options = {}) {
        const opts = options && typeof options === 'object' ? options : {};
        this.engine = null;
        if (opts.inventory) this.setInventory(opts.inventory);
        if (opts.locale) this.setLocale(opts.locale);
        if (opts.engine) this.attach(opts.engine);
    }

    #defs = new Map();       // id → definizione normalizzata
    #state = new Map();      // id → { status, rewarded, goals: Map(goalId → { done, progress, rewarded }) }
    #flags = new Map();
    #types = new Map();      // tipi di goal registrati con defineGoalType
    #listeners = new Set();
    #inventory = null;
    #locale = null;

    // Assestamento: gli eventi si accodano e partono quando lo stato è coerente.
    #queue = [];
    #depth = 0;
    #dirty = false;
    #settling = false;
    #evaluating = false;

    // ---------------------------------------------------------------- lifecycle

    attach(engine) {
        this.engine = engine || null;
        if (this.engine && typeof this.engine.registerPlugin === 'function') {
            this.engine.registerPlugin('quest', this);
        }
        return this;
    }

    /** Smonta dal registro. Non azzera definizioni né stato. */
    detach() {
        if (this.engine && typeof this.engine.unregisterPlugin === 'function') {
            this.engine.unregisterPlugin('quest');
        }
        this.engine = null;
        return this;
    }

    // -------------------------------------------------------------- definizioni

    /** Definisce una quest. Una definizione malformata lancia. */
    define(id, def) {
        if (typeof id !== 'string' || id === '') {
            throw new Error('BeeQuest.define: id richiesto (stringa non vuota)');
        }
        if (this.#defs.has(id)) throw new Error(`BeeQuest.define: quest già definita: ${id}`);

        const norm = this.#normalize(id, def);
        this.#defs.set(id, norm);
        this.#state.set(id, this.#freshState(norm));
        this.#mutate(() => {
            this.#queue.push({ type: 'define', id });
        });
        return this;
    }

    /** `{ id: def }` oppure `[{ id, ...def }]`. Chiama `define` per ognuno, in ordine. */
    defineAll(defs) {
        if (Array.isArray(defs)) {
            for (let i = 0; i < defs.length; i++) {
                const item = defs[i];
                if (!item || typeof item !== 'object') throw new Error('BeeQuest.defineAll: voce non valida');
                const { id, ...rest } = item;
                this.define(id, rest);
            }
        } else if (defs && typeof defs === 'object') {
            const keys = Object.keys(defs);
            for (let i = 0; i < keys.length; i++) this.define(keys[i], defs[keys[i]]);
        } else {
            throw new Error('BeeQuest.defineAll: serve { id: def } oppure un array di { id, ...def }');
        }
        return this;
    }

    /**
     * Registra una condizione personalizzata. `check(goal, api)` deve essere pura:
     * `api = { flag(key), progress(goalId), status(questId) }` (progress riguarda la quest del goal).
     * Un tipo già incluso viene ignorato con un avviso.
     */
    defineGoalType(type, check) {
        if (typeof type !== 'string' || type === '' || typeof check !== 'function') {
            console.warn('BeeQuest.defineGoalType: servono un type (stringa) e una funzione check');
            return this;
        }
        if (BUILTIN_TYPES.includes(type)) {
            console.warn(`BeeQuest.defineGoalType: "${type}" è un tipo incluso, ignoro`);
            return this;
        }
        this.#types.set(type, check);
        return this;
    }

    has(id) {
        return typeof id === 'string' && this.#defs.has(id);
    }

    ids() {
        return Array.from(this.#defs.keys());
    }

    // -------------------------------------------------------------------- stato

    /** Solo da `inactive`. Manca un `requires` non `done`: `false` + avviso. */
    start(id) {
        return this.#mutate(() => {
            const found = this.#lookup(id, 'start');
            if (!found) return false;
            const { def, st } = found;
            if (st.status !== 'inactive') {
                console.warn(`BeeQuest.start: "${id}" è già ${st.status}`);
                return false;
            }
            for (let i = 0; i < def.requires.length; i++) {
                const need = this.#state.get(def.requires[i]);
                if (!need || need.status !== 'done') {
                    console.warn(`BeeQuest.start: "${id}" richiede "${def.requires[i]}" completata`);
                    return false;
                }
            }
            st.status = 'active';
            this.#queue.push({ type: 'start', id });
            this.#touch();
            return true;
        });
    }

    /** Chiude un goal di qualsiasi tipo (anche `flag`/`count`). Su `count` porta il progresso a `target`. */
    complete(questId, goalId) {
        return this.#mutate(() => {
            const found = this.#lookupGoal(questId, goalId, 'complete');
            if (!found) return false;
            const { def, st, goal, gs, index } = found;
            if (st.status !== 'active') {
                console.warn(`BeeQuest.complete: "${questId}" non è attiva (${st.status})`);
                return false;
            }
            if (gs.done) {
                console.warn(`BeeQuest.complete: goal "${goalId}" già fatto`);
                return false;
            }
            if (!this.#unlocked(def, st, index)) {
                console.warn(`BeeQuest.complete: goal "${goalId}" ancora bloccato`);
                return false;
            }
            this.#closeGoal(questId, goal, gs);
            return true;
        });
    }

    /** Solo goal `count`. `amount` finito e > 0. Il progresso si ferma a `target`. */
    addProgress(questId, goalId, amount = 1) {
        return this.#mutate(() => {
            const found = this.#lookupGoal(questId, goalId, 'addProgress');
            if (!found) return false;
            const { def, st, goal, gs, index } = found;
            if (goal.type !== 'count') {
                console.warn(`BeeQuest.addProgress: goal "${goalId}" non è di tipo count`);
                return false;
            }
            if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
                console.warn(`BeeQuest.addProgress: amount non valido: ${amount}`);
                return false;
            }
            if (st.status !== 'active') {
                console.warn(`BeeQuest.addProgress: "${questId}" non è attiva (${st.status})`);
                return false;
            }
            if (gs.done) {
                console.warn(`BeeQuest.addProgress: goal "${goalId}" già fatto`);
                return false;
            }
            if (!this.#unlocked(def, st, index)) {
                console.warn(`BeeQuest.addProgress: goal "${goalId}" ancora bloccato`);
                return false;
            }

            gs.progress = Math.min(goal.target, gs.progress + amount);
            this.#queue.push({
                type: 'progress', id: questId, goalId, value: gs.progress, target: goal.target
            });
            this.#touch();
            if (gs.progress >= goal.target) this.#closeGoal(questId, goal, gs);
            return true;
        });
    }

    /** Solo `active` → `done`, anche con goal aperti. Consegna le ricompense della quest. */
    completeQuest(id) {
        return this.#mutate(() => {
            const found = this.#lookup(id, 'completeQuest');
            if (!found) return false;
            if (found.st.status !== 'active') {
                console.warn(`BeeQuest.completeQuest: "${id}" non è attiva (${found.st.status})`);
                return false;
            }
            this.#finishQuest(id, found.def, found.st);
            return true;
        });
    }

    /** Solo `active` → `failed`. */
    fail(id, reason) {
        return this.#mutate(() => {
            const found = this.#lookup(id, 'fail');
            if (!found) return false;
            if (found.st.status !== 'active') {
                console.warn(`BeeQuest.fail: "${id}" non è attiva (${found.st.status})`);
                return false;
            }
            found.st.status = 'failed';
            this.#queue.push({ type: 'fail', id, reason: str(reason) });
            this.#touch();
            return true;
        });
    }

    /** Qualsiasi stato → `inactive`: azzera goal, progresso e ricompensa data. Non tocca i flag. */
    reset(id) {
        return this.#mutate(() => {
            const found = this.#lookup(id, 'reset');
            if (!found) return false;
            this.#state.set(id, this.#freshState(found.def));
            this.#queue.push({ type: 'reset', id });
            this.#touch();
            return true;
        });
    }

    /** Rivaluta i goal automatici (`flag` e tipi registrati) delle quest attive. */
    evaluate() {
        // Una check che chiama evaluate() mentre la passata è in corso non deve rilanciarla all'infinito.
        if (this.#evaluating) return this;
        this.#mutate(() => {
            this.#touch();
        });
        return this;
    }

    // -------------------------------------------------------------------- query

    status(id) {
        const st = typeof id === 'string' ? this.#state.get(id) : undefined;
        return st ? st.status : null;
    }

    isActive(id) {
        return this.status(id) === 'active';
    }

    isDone(id) {
        return this.status(id) === 'done';
    }

    goalDone(questId, goalId) {
        const st = typeof questId === 'string' ? this.#state.get(questId) : undefined;
        const gs = st && typeof goalId === 'string' ? st.goals.get(goalId) : undefined;
        return !!gs && gs.done;
    }

    /** `{ value, target }` per un goal `count`, altrimenti `null`. */
    progress(questId, goalId) {
        const def = typeof questId === 'string' ? this.#defs.get(questId) : undefined;
        if (!def) return null;
        const goal = def.goals.find((g) => g.id === goalId);
        if (!goal || goal.type !== 'count') return null;
        const gs = this.#state.get(questId).goals.get(goalId);
        return { value: gs.progress, target: goal.target };
    }

    /** Copia pronta per la UI con i testi risolti, oppure `null`. */
    describe(id) {
        const def = typeof id === 'string' ? this.#defs.get(id) : undefined;
        if (!def) return null;
        const st = this.#state.get(id);
        const goals = def.goals.map((goal, index) => this.#goalView(def, st, goal, index));
        return {
            id,
            status: st.status,
            title: this.#resolve(def.titleKey, def.title) ?? '',
            description: this.#resolve(def.descriptionKey, def.description) ?? '',
            mode: def.mode,
            order: def.order,
            goals,
            rewarded: st.rewarded,
            data: deepCopy(def.data)
        };
    }

    list(status) {
        const out = [];
        this.#defs.forEach((_def, id) => {
            if (status !== undefined && this.#state.get(id).status !== status) return;
            out.push(this.describe(id));
        });
        return out;
    }

    // --------------------------------------------------------------------- flag

    /** `string | number | boolean | null`. Valore invariato: `false`, nessun evento. */
    setFlag(key, value) {
        return this.#mutate(() => {
            if (typeof key !== 'string' || key === '') {
                console.warn(`BeeQuest.setFlag: chiave non valida: ${key}`);
                return false;
            }
            if (!isFlagValue(value)) {
                console.warn(`BeeQuest.setFlag: valore non valido per "${key}" (serve string, number finito, boolean o null)`);
                return false;
            }
            return this.#writeFlag(key, value) === 'changed';
        });
    }

    flag(key, fallback) {
        return typeof key === 'string' && this.#flags.has(key) ? this.#flags.get(key) : fallback;
    }

    clearFlag(key) {
        return this.#mutate(() => {
            if (typeof key !== 'string' || !this.#flags.has(key)) return false;
            const previous = this.#flags.get(key);
            this.#flags.delete(key);
            this.#queue.push({ type: 'flag', key, value: undefined, previous });
            this.#touch();
            return true;
        });
    }

    flags() {
        return Object.fromEntries(this.#flags);
    }

    // ----------------------------------------------------------------- soft-dep

    setInventory(inventory) {
        if (inventory == null) {
            this.#inventory = null;
        } else if (typeof inventory.add === 'function') {
            this.#inventory = inventory;
        } else {
            console.warn('BeeQuest.setInventory: serve un oggetto con add(id, qty)');
        }
        return this;
    }

    setLocale(locale) {
        if (locale == null) {
            this.#locale = null;
        } else if (typeof locale.t === 'function') {
            this.#locale = locale;
        } else {
            console.warn('BeeQuest.setLocale: serve un oggetto con t(key)');
        }
        return this;
    }

    // ------------------------------------------------------ eventi e persistenza

    onChange(fn) {
        if (typeof fn !== 'function') return () => {};
        this.#listeners.add(fn);
        return () => {
            this.#listeners.delete(fn);
        };
    }

    /** Solo lo stato, non le definizioni. */
    toJSON() {
        const quests = {};
        this.#defs.forEach((def, id) => {
            const st = this.#state.get(id);
            const goals = {};
            for (let i = 0; i < def.goals.length; i++) {
                const goal = def.goals[i];
                const gs = st.goals.get(goal.id);
                const entry = { done: gs.done };
                if (goal.type === 'count') entry.progress = gs.progress;
                if (gs.rewarded) entry.rewarded = true;
                setOwn(goals, goal.id, entry);
            }
            setOwn(quests, id, { status: st.status, rewarded: st.rewarded, goals });
        });
        return { version: SAVE_VERSION, flags: this.flags(), quests };
    }

    /**
     * Da chiamare dopo i `define`. Ripristina flag e stato delle quest definite (quelle assenti
     * nei dati tornano `inactive`). Non riemette `start`/`goal`/`done`, non riconsegna ricompense
     * e non chiama `evaluate()`: emette solo `restore`.
     */
    fromJSON(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            console.warn('BeeQuest.fromJSON: dati non validi');
            return this;
        }
        if (typeof data.version === 'number' && data.version > SAVE_VERSION) {
            console.warn(`BeeQuest.fromJSON: version ${data.version} più recente della ${SAVE_VERSION}, leggo il possibile`);
        }

        const nextFlags = new Map();
        if (isPlain(data.flags)) {
            const keys = Object.keys(data.flags);
            for (let i = 0; i < keys.length; i++) {
                const value = data.flags[keys[i]];
                if (isFlagValue(value)) nextFlags.set(keys[i], value);
                else console.warn(`BeeQuest.fromJSON: flag "${keys[i]}" con valore non valido, ignorato`);
            }
        }

        const saved = isPlain(data.quests) ? data.quests : {};
        const names = Object.keys(saved);
        for (let i = 0; i < names.length; i++) {
            if (!this.#defs.has(names[i])) {
                console.warn(`BeeQuest.fromJSON: quest sconosciuta, ignorata: ${names[i]}`);
            }
        }

        const nextState = new Map();
        this.#defs.forEach((def, id) => {
            nextState.set(id, this.#restoreState(def, has(saved, id) ? saved[id] : null, id));
        });

        this.#flags = nextFlags;
        this.#state = nextState;
        this.#dirty = false;
        this.#mutate(() => {
            this.#queue.push({ type: 'restore' });
        });
        return this;
    }

    /** Azzera lo stato (quest, progressi, flag, ricompense date). Le definizioni restano. */
    clear(options) {
        this.#flags = new Map();
        this.#dirty = false;
        if (options && options.definitions === true) {
            this.#defs = new Map();
            this.#state = new Map();
            return this;
        }
        const next = new Map();
        this.#defs.forEach((def, id) => next.set(id, this.#freshState(def)));
        this.#state = next;
        return this;
    }

    // ------------------------------------------------------------ normalizzazione

    #normalize(id, def) {
        if (!def || typeof def !== 'object' || Array.isArray(def)) {
            throw new Error(`BeeQuest.define: "${id}" richiede una definizione (oggetto)`);
        }
        if (!Array.isArray(def.goals)) {
            throw new Error(`BeeQuest.define: "${id}" richiede goals (array, anche vuoto)`);
        }

        const quest = { id, goals: [] };
        if (def.title != null) quest.title = str(def.title);
        if (def.titleKey != null) quest.titleKey = str(def.titleKey);
        if (def.description != null) quest.description = str(def.description);
        if (def.descriptionKey != null) quest.descriptionKey = str(def.descriptionKey);

        quest.mode = this.#choice(def.mode, ['all', 'any'], 'all', `"${id}".mode`);
        quest.order = this.#choice(def.order, ['free', 'sequential'], 'free', `"${id}".order`);

        if (def.requires === undefined) {
            quest.requires = [];
        } else {
            if (!Array.isArray(def.requires)) throw new Error(`BeeQuest.define: "${id}".requires deve essere un array`);
            for (let i = 0; i < def.requires.length; i++) {
                if (typeof def.requires[i] !== 'string' || def.requires[i] === '') {
                    throw new Error(`BeeQuest.define: "${id}".requires contiene un id non valido`);
                }
                if (def.requires[i] === id) {
                    throw new Error(`BeeQuest.define: "${id}" non può richiedere se stessa`);
                }
            }
            quest.requires = def.requires.slice();
        }

        quest.rewards = this.#normalizeRewards(def.rewards, `"${id}"`);
        quest.data = isPlain(def.data) ? deepCopy(def.data) : {};

        const seen = new Set();
        for (let i = 0; i < def.goals.length; i++) {
            const goal = this.#normalizeGoal(id, def.goals[i], i);
            if (seen.has(goal.id)) throw new Error(`BeeQuest.define: "${id}" ha il goal duplicato "${goal.id}"`);
            seen.add(goal.id);
            quest.goals.push(goal);
        }
        return quest;
    }

    #choice(value, allowed, fallback, where) {
        if (value == null) return fallback;
        if (allowed.includes(value)) return value;
        console.warn(`BeeQuest.define: ${where} non valido (${value}), uso "${fallback}"`);
        return fallback;
    }

    #normalizeGoal(questId, raw, index) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error(`BeeQuest.define: "${questId}" goal ${index} non valido`);
        }
        if (typeof raw.id !== 'string' || raw.id === '') {
            throw new Error(`BeeQuest.define: "${questId}" goal ${index} senza id`);
        }

        // La copia profonda tiene anche i campi sconosciuti: li ritrovano le check e describe().
        const goal = deepCopy(raw);
        const where = `"${questId}"/"${goal.id}"`;
        goal.type = raw.type == null ? 'manual' : str(raw.type);
        goal.optional = raw.optional === true;
        goal.hidden = raw.hidden === true;
        if (raw.label != null) goal.label = str(raw.label);
        if (raw.labelKey != null) goal.labelKey = str(raw.labelKey);
        goal.rewards = this.#normalizeRewards(raw.rewards, where);
        if (isPlain(raw.data)) goal.data = deepCopy(raw.data);
        else delete goal.data;
        if (goal.equals === undefined) delete goal.equals;
        if (goal.min === undefined) delete goal.min;

        if (goal.type === 'flag') {
            if (typeof raw.flag !== 'string' || raw.flag === '') {
                throw new Error(`BeeQuest.define: ${where} è di tipo flag ma manca "flag"`);
            }
            if (raw.equals !== undefined && raw.min !== undefined) {
                throw new Error(`BeeQuest.define: ${where} ha equals e min insieme`);
            }
            if (raw.min !== undefined && (typeof raw.min !== 'number' || !Number.isFinite(raw.min))) {
                throw new Error(`BeeQuest.define: ${where} ha un min non numerico`);
            }
        } else if (goal.type === 'count') {
            if (!Number.isInteger(raw.target) || raw.target < 1) {
                throw new Error(`BeeQuest.define: ${where} è di tipo count ma target non è un intero >= 1`);
            }
        } else if (goal.type !== 'manual' && !this.#types.has(goal.type)) {
            console.warn(`BeeQuest.define: ${where} ha un type sconosciuto ("${goal.type}"), si comporta come manual`);
        }
        return goal;
    }

    #normalizeRewards(raw, where) {
        if (raw === undefined) return [];
        if (!Array.isArray(raw)) throw new Error(`BeeQuest.define: ${where} rewards deve essere un array`);
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const reward = raw[i];
            if (!reward || typeof reward !== 'object' || typeof reward.type !== 'string' || reward.type === '') {
                console.warn(`BeeQuest.define: ${where} ricompensa ${i} senza type, saltata`);
                continue;
            }
            out.push(deepCopy(reward));
        }
        return out;
    }

    #freshState(def) {
        const goals = new Map();
        for (let i = 0; i < def.goals.length; i++) {
            goals.set(def.goals[i].id, { done: false, progress: 0, rewarded: false });
        }
        return { status: 'inactive', rewarded: false, goals };
    }

    #restoreState(def, entry, id) {
        const st = this.#freshState(def);
        if (!entry || typeof entry !== 'object') return st;

        if (STATUSES.includes(entry.status)) {
            st.status = entry.status;
        } else {
            console.warn(`BeeQuest.fromJSON: status non valido per "${id}", uso inactive`);
        }
        st.rewarded = entry.rewarded === true;

        const saved = isPlain(entry.goals) ? entry.goals : {};
        for (let i = 0; i < def.goals.length; i++) {
            const goal = def.goals[i];
            const sg = has(saved, goal.id) ? saved[goal.id] : null;
            if (!sg || typeof sg !== 'object') continue;
            const gs = st.goals.get(goal.id);
            gs.done = sg.done === true;
            gs.rewarded = sg.rewarded === true;
            if (goal.type === 'count') {
                const value = typeof sg.progress === 'number' && Number.isFinite(sg.progress) ? sg.progress : 0;
                gs.progress = gs.done ? goal.target : Math.min(goal.target, Math.max(0, value));
            }
        }
        return st;
    }

    // ------------------------------------------------------------------- lookup

    #lookup(questId, method) {
        const def = typeof questId === 'string' ? this.#defs.get(questId) : undefined;
        if (!def) {
            console.warn(`BeeQuest.${method}: quest sconosciuta: ${questId}`);
            return null;
        }
        return { def, st: this.#state.get(questId) };
    }

    #lookupGoal(questId, goalId, method) {
        const found = this.#lookup(questId, method);
        if (!found) return null;
        const index = found.def.goals.findIndex((g) => g.id === goalId);
        if (index < 0) {
            console.warn(`BeeQuest.${method}: goal sconosciuto in "${questId}": ${goalId}`);
            return null;
        }
        const goal = found.def.goals[index];
        return { ...found, goal, index, gs: found.st.goals.get(goal.id) };
    }

    /** Con `order: 'sequential'` un goal è sbloccato quando tutti i precedenti sono fatti (opzionali compresi). */
    #unlocked(def, st, index) {
        if (def.order !== 'sequential') return true;
        for (let i = 0; i < index; i++) {
            if (!st.goals.get(def.goals[i].id).done) return false;
        }
        return true;
    }

    // ---------------------------------------------------- mutazioni e assestamento

    /** Ogni metodo che cambia stato passa di qui: a fine chiamata si rivaluta e partono gli eventi. */
    #mutate(fn) {
        this.#depth += 1;
        let result;
        try {
            result = fn();
        } finally {
            this.#depth -= 1;
        }
        if (this.#depth === 0 && (this.#dirty || this.#queue.length > 0)) this.#settle();
        return result;
    }

    #touch() {
        this.#dirty = true;
    }

    /**
     * Rivaluta finché lo stato non si stabilizza, poi emette gli eventi in ordine. Una chiamata
     * che arriva da un listener o da una check cambia lo stato e basta: la passata in corso
     * la raccoglie a fine giro, senza ricorsione.
     */
    #settle() {
        if (this.#settling) return;
        this.#settling = true;
        try {
            let steps = 0;
            for (;;) {
                if (++steps > MAX_STEPS) {
                    console.warn('BeeQuest: troppi cambi di stato di fila (una check o un listener non si stabilizza?), mi fermo');
                    this.#dirty = false;
                    this.#queue.length = 0;
                    break;
                }
                if (this.#dirty) {
                    this.#dirty = false;
                    this.#evaluateAll();
                    continue;
                }
                if (this.#queue.length === 0) break;
                this.#emit(this.#queue.shift());
            }
        } finally {
            this.#settling = false;
        }
    }

    #evaluateAll() {
        this.#evaluating = true;
        try {
            const ids = Array.from(this.#defs.keys());
            for (let q = 0; q < ids.length; q++) {
                const id = ids[q];
                const def = this.#defs.get(id);
                const st = this.#state.get(id);
                if (!def || !st || st.status !== 'active') continue;

                for (let i = 0; i < def.goals.length; i++) {
                    if (this.#state.get(id) !== st || st.status !== 'active') break;
                    const goal = def.goals[i];
                    const gs = st.goals.get(goal.id);
                    if (gs.done || !this.#unlocked(def, st, i)) continue;
                    if (this.#met(id, goal)) this.#closeGoal(id, goal, gs);
                }
                if (this.#state.get(id) === st) this.#maybeFinish(id, def, st);
            }
        } finally {
            this.#evaluating = false;
        }
    }

    #met(questId, goal) {
        const custom = this.#types.get(goal.type);
        if (custom) {
            const api = {
                flag: (key) => (this.#flags.has(key) ? this.#flags.get(key) : undefined),
                progress: (goalId) => {
                    const gs = this.#state.get(questId)?.goals.get(goalId);
                    return gs ? gs.progress : 0;
                },
                status: (id) => this.status(id)
            };
            try {
                return custom(deepCopy(goal), api) === true;
            } catch (error) {
                console.warn(`BeeQuest: la check di "${goal.type}" ha lanciato`, error);
                return false;
            }
        }
        if (goal.type === 'flag') {
            if (!this.#flags.has(goal.flag)) return false;
            const value = this.#flags.get(goal.flag);
            if (goal.min !== undefined) return typeof value === 'number' && value >= goal.min;
            return value === (has(goal, 'equals') ? goal.equals : true);
        }
        return false;
    }

    #closeGoal(questId, goal, gs) {
        gs.done = true;
        if (goal.type === 'count') gs.progress = goal.target;
        this.#queue.push({ type: 'goal', id: questId, goalId: goal.id });
        this.#deliver(goal.rewards, gs, questId, goal.id);
        this.#touch();
    }

    /** `mode: 'all'`: tutti i goal non opzionali (e almeno uno). `mode: 'any'`: basta un goal. */
    #maybeFinish(id, def, st) {
        if (st.status !== 'active') return;
        let ok;
        if (def.mode === 'any') {
            ok = def.goals.some((g) => st.goals.get(g.id).done);
        } else {
            const required = def.goals.filter((g) => !g.optional);
            ok = required.length > 0 && required.every((g) => st.goals.get(g.id).done);
        }
        if (ok) this.#finishQuest(id, def, st);
    }

    #finishQuest(id, def, st) {
        st.status = 'done';
        this.#queue.push({ type: 'done', id });
        this.#deliver(def.rewards, st, id, undefined);
        this.#touch();
    }

    // --------------------------------------------------------------- ricompense

    /** Una sola volta per quest/goal, finché non c'è un reset. */
    #deliver(rewards, holder, questId, goalId) {
        if (holder.rewarded) return;
        holder.rewarded = true;
        for (let i = 0; i < rewards.length; i++) {
            const granted = this.#grant(rewards[i]);
            const event = { type: 'reward', id: questId };
            if (goalId !== undefined) event.goalId = goalId;
            event.reward = deepCopy(rewards[i]);
            event.granted = granted;
            this.#queue.push(event);
        }
    }

    #grant(reward) {
        if (reward.type === 'item') return this.#grantItem(reward);
        if (reward.type === 'flag') {
            if (typeof reward.id !== 'string' || reward.id === '') {
                console.warn('BeeQuest: ricompensa flag senza id');
                return false;
            }
            const value = has(reward, 'value') ? reward.value : true;
            if (!isFlagValue(value)) {
                console.warn(`BeeQuest: valore non valido per la ricompensa flag "${reward.id}"`);
                return false;
            }
            return this.#writeFlag(reward.id, value) !== 'invalid';
        }
        return false; // tipo sconosciuto: solo evento, lo gestisce il gioco
    }

    /**
     * BeeInventory.add(id, qty) ritorna `{ added, left }` e non lancia: l'oggetto è consegnato
     * per intero solo con `added === qty` e `left === 0`. Una consegna a metà viene annullata
     * con `remove` (se c'è), così `granted: false` vuol dire che non è entrato niente.
     */
    #grantItem(reward) {
        const inventory = this.#activeInventory();
        if (!inventory) return false;
        const qty = reward.qty === undefined ? 1 : reward.qty;
        let result;
        try {
            result = inventory.add(reward.id, qty);
        } catch (error) {
            console.warn(`BeeQuest: add("${reward.id}") ha lanciato`, error);
            return false;
        }
        if (!result || typeof result !== 'object') {
            console.warn(`BeeQuest: add("${reward.id}") non ha ritornato { added, left }`);
            return false;
        }
        if (result.added === qty && result.left === 0) return true;
        if (result.added > 0 && typeof inventory.remove === 'function') {
            try {
                inventory.remove(reward.id, result.added);
            } catch (error) {
                console.warn(`BeeQuest: remove("${reward.id}") ha lanciato`, error);
            }
        }
        return false;
    }

    #writeFlag(key, value) {
        if (!isFlagValue(value)) return 'invalid';
        const exists = this.#flags.has(key);
        const previous = exists ? this.#flags.get(key) : undefined;
        if (exists && previous === value) return 'same';
        this.#flags.set(key, value);
        this.#queue.push({ type: 'flag', key, value, previous });
        this.#touch();
        return 'changed';
    }

    // --------------------------------------------------------------------- testi

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

    #activeInventory() {
        if (this.#inventory) return this.#inventory;
        const engine = this.engine;
        if (engine && typeof engine.plugin === 'function') {
            const found = engine.plugin('inventory');
            if (found && typeof found.add === 'function') return found;
        }
        return null;
    }

    #goalView(def, st, goal, index) {
        const gs = st.goals.get(goal.id);
        const view = {
            id: goal.id,
            type: goal.type,
            label: this.#resolve(goal.labelKey, goal.label) ?? '',
            done: gs.done,
            available: this.#unlocked(def, st, index),
            optional: goal.optional,
            hidden: goal.hidden
        };
        if (goal.type === 'count') {
            view.progress = gs.progress;
            view.target = goal.target;
        }

        // I campi sconosciuti del goal si ritrovano qui; `data` del gioco vince in caso di conflitto.
        const data = {};
        const keys = Object.keys(goal);
        for (let i = 0; i < keys.length; i++) {
            if (!GOAL_FIELDS.has(keys[i])) setOwn(data, keys[i], deepCopy(goal[keys[i]]));
        }
        if (goal.data) {
            const own = Object.keys(goal.data);
            for (let i = 0; i < own.length; i++) setOwn(data, own[i], deepCopy(goal.data[own[i]]));
        }
        view.data = data;
        return view;
    }

    #emit(event) {
        const list = Array.from(this.#listeners);
        for (let i = 0; i < list.length; i++) {
            try {
                list[i](event);
            } catch (error) {
                console.warn('BeeQuest: un listener onChange ha lanciato', error);
            }
        }
    }
}
