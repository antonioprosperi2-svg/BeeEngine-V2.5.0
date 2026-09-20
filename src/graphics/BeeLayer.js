/**
 * BeeLayer — pipeline di disegno. Non è BEE_LAYER (bitmask della fisica).
 *
 * Pass di default: background → world → ysort (spazio mondo, sotto la camera)
 *                  ui (spazio schermo, dopo ctx.restore).
 * Ordinamento stabile: a parità di chiave vince l'indice di raccolta.
 * y-sort: piedi (y + height), oppure entity.sortY se è un numero.
 */

export const BEE_DRAW = Object.freeze({
    BACKGROUND: 'background',
    WORLD: 'world',
    YSORT: 'ysort',
    UI: 'ui'
});

export const BEE_SPACE = Object.freeze({
    WORLD: 'world',
    SCREEN: 'screen'
});

export const BEE_LAYER_DEFAULTS = Object.freeze({
    space: BEE_SPACE.WORLD,
    sort: 'stable',
    visible: true
});

function asSpace(value) {
    return value === BEE_SPACE.SCREEN ? BEE_SPACE.SCREEN : BEE_SPACE.WORLD;
}

function asSort(value) {
    return value === 'y' || value === 'ysort' ? 'y' : 'stable';
}

function feetY(entity, engine) {
    if (typeof entity.sortY === 'number' && Number.isFinite(entity.sortY)) {
        return entity.sortY;
    }
    if (engine && typeof engine.getEntityDrawBounds === 'function') {
        const box = engine.getEntityDrawBounds(entity);
        if (box) return (Number(box.y) || 0) + (Number(box.height) || 0);
    }
    const y = typeof entity.worldY === 'number' ? entity.worldY : Number(entity.y) || 0;
    return y + (Number(entity.height) || 0);
}

function compareDraw(a, b) {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return a.index - b.index;
}

function makeSlot(name, spec, addIndex) {
    const order = Number(spec.order);
    return {
        name,
        space: asSpace(spec.space),
        sort: asSort(spec.sort),
        visible: spec.visible !== false,
        order: Number.isFinite(order) ? order : 0,
        addIndex,
        bucket: [],
        count: 0
    };
}

export class BeeLayer {
    /**
     * @param {{ defaults?: boolean }} [options]
     */
    constructor(options = {}) {
        this.#slots = new Map();
        this.#order = [];
        this.#seen = new Set();
        this.#seq = 0;
        this.#adds = 0;
        this.#dirty = true;

        if (options.defaults !== false) this.#installDefaults();
    }

    #slots;
    #order;
    #seen;
    #seq;
    #adds;
    #dirty;

    get size() {
        return this.#order.length;
    }

    add(name, spec = {}) {
        const id = String(name ?? '');
        if (!id) throw new Error('BeeLayer.add: name required');
        if (this.#slots.has(id)) {
            throw new Error(`BeeLayer.add: layer già presente: ${id}`);
        }

        const slot = makeSlot(id, spec || {}, this.#adds);
        this.#adds += 1;
        this.#slots.set(id, slot);
        this.#order.push(slot);
        this.#order.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.addIndex - b.addIndex;
        });
        this.#dirty = true;
        return this;
    }

    remove(name) {
        const id = String(name ?? '');
        const slot = this.#slots.get(id);
        if (!slot) return this;
        this.#slots.delete(id);
        const index = this.#order.indexOf(slot);
        if (index >= 0) this.#order.splice(index, 1);
        this.#dirty = true;
        return this;
    }

    has(name) {
        return this.#slots.has(String(name ?? ''));
    }

    get(name) {
        const slot = this.#slots.get(String(name ?? ''));
        if (!slot) return null;
        return {
            name: slot.name,
            space: slot.space,
            sort: slot.sort,
            visible: slot.visible,
            order: slot.order
        };
    }

    list() {
        return this.#order.map((slot) => this.get(slot.name));
    }

    items(name) {
        const slot = this.#slots.get(String(name ?? ''));
        if (!slot) return [];
        const out = [];
        for (let i = 0; i < slot.count; i++) {
            out.push(slot.bucket[i].entity);
        }
        return out;
    }

    collect(engine) {
        for (let i = 0; i < this.#order.length; i++) {
            this.#order[i].count = 0;
        }
        this.#seen.clear();
        this.#seq = 0;

        const scene = engine && (engine.currentScene || (engine.scenes && engine.scenes.currentScene));
        this.#walkList(scene && scene.entities, engine, null);
        this.#walkList(engine && engine.entities, engine, null);

        for (let i = 0; i < this.#order.length; i++) {
            const slot = this.#order[i];
            slot.bucket.length = slot.count;
            if (slot.sort === 'y' && slot.count > 1) {
                slot.bucket.sort(compareDraw);
            }
        }

        this.#dirty = false;
        return this;
    }

    drawWorld(ctx, engine) {
        this.collect(engine);
        this.#flush(ctx, engine, BEE_SPACE.WORLD);
        return this;
    }

    drawScreen(ctx, engine) {
        if (this.#dirty) this.collect(engine);
        this.#flush(ctx, engine, BEE_SPACE.SCREEN);
        this.#dirty = true;
        return this;
    }

    #installDefaults() {
        this.add(BEE_DRAW.BACKGROUND, { space: BEE_SPACE.WORLD, sort: 'stable', order: 0 });
        this.add(BEE_DRAW.WORLD, { space: BEE_SPACE.WORLD, sort: 'stable', order: 10 });
        this.add(BEE_DRAW.YSORT, { space: BEE_SPACE.WORLD, sort: 'y', order: 20 });
        this.add(BEE_DRAW.UI, { space: BEE_SPACE.SCREEN, sort: 'stable', order: 100 });
    }

    #walkList(list, engine, inherited) {
        if (!list || list.length === 0) return;
        for (let i = 0; i < list.length; i++) {
            this.#visit(list[i], engine, inherited);
        }
    }

    #visit(entity, engine, inherited) {
        if (!entity || entity.destroyed || this.#seen.has(entity)) return;
        this.#seen.add(entity);
        if (entity.visible === false) return;

        const explicit = typeof entity.drawLayer === 'string' && entity.drawLayer;
        const name = explicit || inherited || BEE_DRAW.WORLD;
        const slot = this.#slots.get(name) || this.#slots.get(BEE_DRAW.WORLD);
        const isRoot = !entity.parent;
        const split = !!(explicit && inherited && explicit !== inherited);

        if ((isRoot || split) && slot && slot.visible !== false) {
            const index = this.#seq;
            this.#seq += 1;
            const key = slot.sort === 'y' ? feetY(entity, engine) : index;
            const row = slot.bucket[slot.count] || (slot.bucket[slot.count] = { entity, index, key });
            row.entity = entity;
            row.index = index;
            row.key = key;
            slot.count += 1;
        }

        const kids = entity.children;
        if (!kids || kids.length === 0) return;
        const next = explicit || inherited || BEE_DRAW.WORLD;
        for (let i = 0; i < kids.length; i++) {
            this.#visit(kids[i], engine, next);
        }
    }

    #flush(ctx, engine, space) {
        if (!ctx) return;
        for (let i = 0; i < this.#order.length; i++) {
            const slot = this.#order[i];
            if (!slot.visible || slot.space !== space) continue;
            for (let k = 0; k < slot.count; k++) {
                const entity = slot.bucket[k].entity;
                if (!entity || entity.destroyed || entity.visible === false) continue;
                if (engine && typeof engine.drawEntity === 'function') {
                    engine.drawEntity(ctx, entity, { space: slot.space, pass: slot.name });
                } else if (typeof entity.draw === 'function') {
                    entity.draw(ctx, engine);
                }
            }
        }
    }
}
