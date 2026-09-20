/**
 * BeePrefab — fabbrica da dati, non `new BeeEnemy(...)` sparso nel gioco.
 * Una ricetta (tipo, posa, sprite, vita, collider) si definisce una volta.
 * Spawn, wave e oggetti tilemap la istanziamo con override (x/y).
 */

import { BeeEntity, BEE_ENTITY_DEFAULTS } from './BeeEntity.js';

export const BEE_PREFAB_DEFAULTS = Object.freeze({
    width: BEE_ENTITY_DEFAULTS.width,
    height: BEE_ENTITY_DEFAULTS.height,
    addToScene: true
});

const RESERVED = new Set([
    'type',
    'class',
    'create',
    'extend',
    'props',
    'collider',
    'body',
    'patrol',
    'setup',
    'pool',
    'acquire',
    'addToScene',
    'children',
    'prefab',
    'x',
    'y',
    'width',
    'height',
    'textureKey',
    'sprite'
]);

function isEntityClass(fn) {
    return typeof fn === 'function' && (fn === BeeEntity || fn.prototype instanceof BeeEntity);
}

function cloneSpec(spec) {
    if (!spec || typeof spec !== 'object') return {};
    const out = { ...spec };
    if (spec.props && typeof spec.props === 'object') out.props = { ...spec.props };
    if (spec.collider && typeof spec.collider === 'object') out.collider = { ...spec.collider };
    if (spec.patrol && typeof spec.patrol === 'object') out.patrol = { ...spec.patrol };
    if (spec.body && typeof spec.body === 'object') out.body = { ...spec.body };
    if (Array.isArray(spec.children)) out.children = spec.children.slice();
    return out;
}

function mergeSpec(base, over) {
    const a = cloneSpec(base);
    const b = cloneSpec(over);
    const props = { ...(a.props || {}), ...(b.props || {}) };
    const out = { ...a, ...b };
    if (Object.keys(props).length) out.props = props;
    else delete out.props;
    return out;
}

function asNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function tiledProps(obj) {
    const out = {};
    const raw = obj && obj.properties;
    if (Array.isArray(raw)) {
        for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (item && item.name != null) out[item.name] = item.value;
        }
        return out;
    }
    if (raw && typeof raw === 'object') Object.assign(out, raw);
    return out;
}

function applyFields(entity, spec, engine) {
    const sprite = spec.textureKey ?? spec.sprite;
    if (sprite != null) entity.textureKey = sprite;

    if (typeof spec.speed === 'number') entity.speed = spec.speed;
    if (typeof spec.lives === 'number') entity.lives = spec.lives;
    if (typeof spec.hp === 'number') entity.hp = spec.hp;
    if (typeof spec.health === 'number') {
        entity.health = spec.health;
        if (entity.hp == null) entity.hp = spec.health;
    }
    if (typeof spec.score === 'number') entity.score = spec.score;
    if (typeof spec.drawLayer === 'string') entity.drawLayer = spec.drawLayer;
    if (typeof spec.sortY === 'number') entity.sortY = spec.sortY;
    if (typeof spec.alpha === 'number') entity.alpha = spec.alpha;
    if (typeof spec.visible === 'boolean') entity.visible = spec.visible;
    if (typeof spec.active === 'boolean') entity.active = spec.active;
    if (spec.color != null) entity.color = spec.color;
    if (spec.mode != null) entity.mode = spec.mode;
    if (typeof spec.gravity === 'number') entity.gravity = spec.gravity;
    if (typeof spec.vx === 'number') entity.vx = spec.vx;
    if (typeof spec.vy === 'number') entity.vy = spec.vy;
    if (spec.tag != null) entity.tag = spec.tag;
    if (spec.name != null && spec.name !== spec.prefab) entity.name = spec.name;

    if (spec.props && typeof spec.props === 'object') {
        const keys = Object.keys(spec.props);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (RESERVED.has(key)) continue;
            entity[key] = spec.props[key];
        }
    }

    if (spec.collider && typeof entity.addRectCollider === 'function') {
        const box = spec.collider === true ? {} : spec.collider;
        entity.addRectCollider(
            asNumber(box.offsetX, 0),
            asNumber(box.offsetY, 0),
            box.width == null ? null : asNumber(box.width, null),
            box.height == null ? null : asNumber(box.height, null)
        );
    }

    if (spec.body && typeof entity.addRigidBody === 'function') {
        const body = spec.body === true ? {} : spec.body;
        entity.addRigidBody({
            ...body,
            world: body.world || (engine && engine.physics) || null
        });
    }

    if (spec.patrol && typeof entity.setPatrolBounds === 'function') {
        const minX = spec.patrol.minX ?? spec.patrol[0];
        const maxX = spec.patrol.maxX ?? spec.patrol[1];
        entity.setPatrolBounds(minX, maxX);
    }

    if (typeof spec.setup === 'function') spec.setup(entity, spec, engine);
}

export class BeePrefab {
    /**
     * @param {{ engine?: object|null }} [options]
     */
    constructor(options = {}) {
        this.engine = options.engine || null;
        this.#types = new Map();
        this.#recipes = new Map();
    }

    #types;
    #recipes;

    get size() {
        return this.#recipes.size;
    }

    type(name, factory) {
        const id = String(name ?? '');
        if (!id) throw new Error('BeePrefab.type: name required');
        if (typeof factory !== 'function') throw new Error(`BeePrefab.type: factory required for ${id}`);
        this.#types.set(id, factory);
        return this;
    }

    define(name, spec) {
        const id = String(name ?? '');
        if (!id) throw new Error('BeePrefab.define: name required');
        if (!spec || typeof spec !== 'object') {
            throw new Error(`BeePrefab.define: spec required for ${id}`);
        }
        this.#recipes.set(id, cloneSpec(spec));
        return this;
    }

    has(name) {
        return this.#recipes.has(String(name ?? ''));
    }

    get(name) {
        const spec = this.#recipes.get(String(name ?? ''));
        return spec ? cloneSpec(spec) : null;
    }

    list() {
        return [...this.#recipes.keys()];
    }

    remove(name) {
        this.#recipes.delete(String(name ?? ''));
        return this;
    }

    clear() {
        this.#recipes.clear();
        return this;
    }

    spawn(name, override = {}) {
        const id = String(name ?? '');
        const spec = mergeSpec(this.#resolve(id), override || {});
        spec.prefab = id;
        const entity = this.#instantiate(spec);
        this.#finish(entity, spec);
        return entity;
    }

    spawnMany(name, spots) {
        if (!Array.isArray(spots)) throw new Error('BeePrefab.spawnMany: serve un array di posizioni');
        const out = [];
        for (let i = 0; i < spots.length; i++) {
            const spot = spots[i];
            if (Array.isArray(spot)) {
                out.push(this.spawn(name, { x: spot[0], y: spot[1] }));
            } else {
                out.push(this.spawn(name, spot || {}));
            }
        }
        return out;
    }

    fromList(items, fallbackName = null) {
        if (!Array.isArray(items)) throw new Error('BeePrefab.fromList: serve un array');
        const out = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item || typeof item !== 'object') continue;
            const id = item.prefab || fallbackName;
            if (!id) throw new Error('BeePrefab.fromList: manca prefab');
            const override = cloneSpec(item);
            delete override.prefab;
            out.push(this.spawn(id, override));
        }
        return out;
    }

    /**
     * Oggetti stile Tiled (`type` / `name` / `properties`) → spawn.
     * I tipi senza ricetta si saltano (decorazioni), salvo `strict: true`.
     */
    fromObjects(objects, options = {}) {
        if (!Array.isArray(objects)) throw new Error('BeePrefab.fromObjects: serve un array');
        const key = options.prefabKey || 'prefab';
        const out = [];
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || obj.visible === false) continue;
            const props = tiledProps(obj);
            const id = obj[key] || props.prefab || obj.type || obj.name;
            if (!id || !this.has(id)) {
                if (options.strict) throw new Error(`BeePrefab.fromObjects: ricetta sconosciuta: ${id}`);
                continue;
            }
            out.push(this.spawn(id, {
                ...props,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                props
            }));
        }
        return out;
    }

    #resolve(name, seen = new Set()) {
        const id = String(name ?? '');
        if (!this.#recipes.has(id)) {
            throw new Error(`BeePrefab: ricetta sconosciuta: ${id}`);
        }
        if (seen.has(id)) throw new Error(`BeePrefab: ciclo in extend: ${id}`);
        seen.add(id);
        const recipe = this.#recipes.get(id);
        if (!recipe.extend) return cloneSpec(recipe);
        return mergeSpec(this.#resolve(recipe.extend, seen), recipe);
    }

    #instantiate(spec) {
        if (typeof spec.acquire === 'function') {
            return spec.acquire(spec, this.engine);
        }

        if (spec.pool) {
            const engine = this.engine;
            const pool = engine && typeof engine.pool === 'function' ? engine.pool(spec.pool) : null;
            if (!pool) throw new Error(`BeePrefab.spawn: pool mancante: ${spec.pool}`);
            return pool.acquire(spec);
        }

        const factory = spec.create || spec.class || this.#lookupType(spec.type);
        if (!factory) {
            throw new Error('BeePrefab.spawn: manca type/class/create');
        }

        const x = asNumber(spec.x, 0);
        const y = asNumber(spec.y, 0);
        const width = asNumber(spec.width, BEE_PREFAB_DEFAULTS.width);
        const height = asNumber(spec.height, BEE_PREFAB_DEFAULTS.height);

        if (isEntityClass(factory)) {
            return new factory(x, y, width, height);
        }
        if (typeof factory === 'function') {
            const made = factory(spec, this.engine);
            if (!made) throw new Error('BeePrefab.spawn: factory ha restituito vuoto');
            return made;
        }
        throw new Error('BeePrefab.spawn: type non è una factory');
    }

    #lookupType(type) {
        if (typeof type === 'function') return type;
        if (typeof type === 'string' && type) {
            const found = this.#types.get(type);
            if (!found) throw new Error(`BeePrefab.spawn: type sconosciuto: ${type}`);
            return found;
        }
        return this.#types.get('entity') || BeeEntity;
    }

    #finish(entity, spec) {
        if (!entity) return entity;
        entity.prefab = spec.prefab || entity.prefab || null;

        if (Number.isFinite(Number(spec.x))) entity.x = spec.x;
        if (Number.isFinite(Number(spec.y))) entity.y = spec.y;
        if (Number.isFinite(Number(spec.width))) entity.width = spec.width;
        if (Number.isFinite(Number(spec.height))) entity.height = spec.height;

        applyFields(entity, spec, this.engine);

        if (Array.isArray(spec.children)) {
            for (let i = 0; i < spec.children.length; i++) {
                const child = spec.children[i];
                if (!child) continue;
                const kid = typeof child === 'string'
                    ? this.spawn(child, { addToScene: false })
                    : this.#makeChild(child);
                if (kid && typeof entity.addChild === 'function') entity.addChild(kid);
            }
        }

        const add = spec.addToScene !== false;
        if (add && this.engine && typeof this.engine.addEntity === 'function') {
            this.engine.addEntity(entity);
        }
        return entity;
    }

    #makeChild(spec) {
        if (spec.prefab && this.has(spec.prefab)) {
            const override = cloneSpec(spec);
            delete override.prefab;
            override.addToScene = false;
            return this.spawn(spec.prefab, override);
        }
        const childSpec = cloneSpec(spec);
        childSpec.addToScene = false;
        const entity = this.#instantiate(childSpec);
        return this.#finish(entity, childSpec);
    }
}
