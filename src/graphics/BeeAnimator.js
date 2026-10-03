/**
 * BeeAnimator — grafo di stati. Lo sprite riproduce il clip; l'animator decide quale e quando.
 * Transizioni, priorità, lock (attacco non interrompibile), coda, exitTo.
 */

export const BEE_ANIMATOR_DEFAULTS = Object.freeze({
    priority: 0,
    lock: false,
    loop: true
});

export class BeeAnimator {
    /**
     * @param {{ play?: Function, update?: Function, finished?: boolean }|null} [sprite]
     * @param {{ context?: () => any }} [options]
     */
    constructor(sprite = null, options = {}) {
        this.sprite = sprite || null;
        this.context = typeof options.context === 'function' ? options.context : null;

        this.#states = new Map();
        this.#edges = [];
        this.#current = null;
        this.#queued = null;
        this.#timeInState = 0;
        this.#initial = null;
    }

    #states;
    #edges;
    #current;
    #queued;
    #timeInState;
    #initial;

    get current() {
        return this.#current ? this.#current.name : null;
    }

    get locked() {
        return !!(this.#current && this.#current.lock && !this.#clipFinished());
    }

    get queued() {
        return this.#queued;
    }

    get timeInState() {
        return this.#timeInState;
    }

    /**
     * @param {string} name
     * @param {{
     *   clip?: string,
     *   animation?: string,
     *   loop?: boolean,
     *   lock?: boolean,
     *   priority?: number,
     *   exitTo?: string|null,
     *   initial?: boolean,
     *   onEnter?: Function,
     *   onExit?: Function,
     *   onComplete?: Function
     * }} [spec]
     */
    add(name, spec = {}) {
        const id = String(name ?? '');
        if (!id) throw new Error('BeeAnimator.add: name required');

        this.#states.set(id, {
            name: id,
            clip: spec.clip || spec.animation || id,
            loop: spec.loop !== false,
            lock: spec.lock === true,
            priority: Number.isFinite(Number(spec.priority)) ? Number(spec.priority) : BEE_ANIMATOR_DEFAULTS.priority,
            exitTo: spec.exitTo ? String(spec.exitTo) : null,
            onEnter: typeof spec.onEnter === 'function' ? spec.onEnter : null,
            onExit: typeof spec.onExit === 'function' ? spec.onExit : null,
            onComplete: typeof spec.onComplete === 'function' ? spec.onComplete : null
        });

        if (spec.initial === true || this.#initial === null) {
            this.#initial = id;
        }
        return this;
    }

    /**
     * @param {string|string[]} from  '*' = da qualsiasi stato
     * @param {string} to
     * @param {(ctx: any, animator: BeeAnimator) => boolean} predicate
     * @param {{ priority?: number }} [options]
     */
    when(from, to, predicate, options = {}) {
        if (typeof predicate !== 'function') {
            throw new Error('BeeAnimator.when: serve un predicato');
        }
        const dest = String(to ?? '');
        if (!dest) throw new Error('BeeAnimator.when: to required');

        const sources = from === '*'
            ? ['*']
            : (Array.isArray(from) ? from : [from]);

        const priority = Number.isFinite(Number(options.priority)) ? Number(options.priority) : 0;
        for (let i = 0; i < sources.length; i++) {
            const src = String(sources[i] ?? '');
            if (!src) continue;
            this.#edges.push({ from: src, to: dest, when: predicate, priority });
        }
        return this;
    }

    from(from) {
        const animator = this;
        return {
            to(to, predicate, options) {
                animator.when(from, to, predicate, options);
                return animator;
            }
        };
    }

    start(name) {
        const id = name || this.#initial;
        if (!id) return this;
        this.#enter(id, { force: true });
        return this;
    }

    play(name, options = {}) {
        return this.set(name, options);
    }

    set(name, options = {}) {
        const next = this.#states.get(String(name ?? ''));
        if (!next) return this;

        const cur = this.#current;
        if (cur && cur.name === next.name && !options.restart) return this;

        if (cur && cur.lock && !this.#clipFinished() && !options.force) {
            if (next.priority <= cur.priority) {
                this.#queued = next.name;
                return this;
            }
        }

        this.#enter(next.name, options);
        return this;
    }

    update(dt, context) {
        const ctx = context !== undefined
            ? context
            : (this.context ? this.context() : null);

        const step = Number(dt) || 0;
        this.#timeInState += step;

        if (this.sprite && typeof this.sprite.update === 'function') {
            this.sprite.update(step);
        }

        const cur = this.#current;
        if (!cur) return this;

        const finished = this.#clipFinished();
        if (finished && cur.onComplete) {
            cur.onComplete(this, ctx);
        }

        if (cur.lock && !finished) return this;

        if (finished && (cur.lock || (!cur.loop && cur.exitTo))) {
            const next = this.#queued || cur.exitTo;
            this.#queued = null;
            if (next && next !== cur.name) {
                this.#enter(next);
                return this;
            }
        }

        const pick = this.#pick(ctx);
        if (pick) this.#enter(pick);
        return this;
    }

    #clipFinished() {
        const sprite = this.sprite;
        if (!sprite) return false;
        return sprite.finished === true;
    }

    #pick(ctx) {
        const cur = this.#current;
        if (!cur) return null;

        let best = null;
        let bestPri = -Infinity;

        for (let i = 0; i < this.#edges.length; i++) {
            const edge = this.#edges[i];
            if (edge.from !== '*' && edge.from !== cur.name) continue;
            if (edge.to === cur.name) continue;
            if (!this.#states.has(edge.to)) continue;

            let ok = false;
            try {
                ok = !!edge.when(ctx, this);
            } catch {
                ok = false;
            }
            if (!ok) continue;

            const dest = this.#states.get(edge.to);
            const pri = edge.priority + dest.priority;
            if (pri > bestPri) {
                bestPri = pri;
                best = dest;
            }
        }

        if (!best) return null;

        if (cur.lock && !this.#clipFinished() && best.priority <= cur.priority) {
            this.#queued = best.name;
            return null;
        }

        return best.name;
    }

    #enter(name, options = {}) {
        const next = this.#states.get(String(name));
        if (!next) return;

        const prev = this.#current;
        if (prev && prev.name === next.name && !options.restart && !options.force) return;

        if (prev && prev.onExit) prev.onExit(this, next);
        this.#current = next;
        this.#timeInState = 0;
        if (!options.keepQueue) this.#queued = null;

        if (this.sprite && typeof this.sprite.play === 'function') {
            this.sprite.play(next.clip, { restart: true, loop: next.loop });
        }
        if (next.onEnter) next.onEnter(this, prev);
    }
}
