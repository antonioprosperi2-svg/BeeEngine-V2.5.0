/**
 * BeeCollisionSystem: gruppi di entità e regole.
 * Broadphase: BeeSpatialHash. Narrowphase resta AABB / collidesWith.
 */

import { BeeSpatialHash, spatialAabbOf } from './BeeSpatialHash.js';

export class BeeCollisionSystem {
    constructor(engine) {
        this.engine = engine;
        /** @type {Map<string, object[]>} */
        this.groups = new Map();
        /** @type {{ type: string }[]} */
        this.rules = [];
        this.hash = new BeeSpatialHash();
        this.#activeA = [];
        this.#activeB = [];
    }

    #activeA;
    #activeB;

    clear() {
        this.groups.clear();
        this.rules = [];
        this.hash.clear();
        return this;
    }

    #requireName(name) {
        if (typeof name !== 'string' || name === '') {
            throw new Error('BeeCollisionSystem: name required');
        }
    }

    createGroup(name) {
        this.#requireName(name);
        if (!this.groups.has(name)) {
            this.groups.set(name, []);
        }
        return this;
    }

    setGroup(name, entities) {
        this.#requireName(name);
        if (!Array.isArray(entities)) {
            throw new Error('BeeCollisionSystem.setGroup: entities must be an array');
        }
        this.groups.set(name, entities.slice());
        return this;
    }

    add(name, entity) {
        this.#requireName(name);
        this.createGroup(name);
        const list = this.groups.get(name);
        if (entity && !list.includes(entity)) {
            list.push(entity);
        }
        return this;
    }

    remove(name, entity) {
        this.#requireName(name);
        const list = this.groups.get(name);
        if (!list) return this;
        const index = list.indexOf(entity);
        if (index >= 0) list.splice(index, 1);
        return this;
    }

    #fillActive(name, out) {
        out.length = 0;
        const list = this.groups.get(name);
        if (!list || list.length === 0) return out;
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (e && e.active !== false && !e.destroyed) {
                out.push(e);
            }
        }
        return out;
    }

    solid(moversGroup, solidsGroup) {
        this.#requireName(moversGroup);
        this.#requireName(solidsGroup);
        const exists = this.rules.some((rule) =>
            rule.type === 'solid' && rule.movers === moversGroup && rule.solids === solidsGroup
        );
        if (!exists) {
            this.rules.push({ type: 'solid', movers: moversGroup, solids: solidsGroup });
        }
        return this;
    }

    overlap(groupA, groupB, callback) {
        this.#requireName(groupA);
        this.#requireName(groupB);
        if (typeof callback !== 'function') {
            throw new Error('BeeCollisionSystem.overlap: callback required');
        }
        const exists = this.rules.some((rule) =>
            rule.type === 'overlap' && rule.a === groupA && rule.b === groupB && rule.callback === callback
        );
        if (!exists) {
            this.rules.push({ type: 'overlap', a: groupA, b: groupB, callback });
        }
        return this;
    }

    run() {
        for (let r = 0; r < this.rules.length; r++) {
            const rule = this.rules[r];
            if (rule.type === 'solid') {
                this.#resolveSolid(rule.movers, rule.solids);
            } else if (rule.type === 'overlap') {
                this.#resolveOverlap(rule.a, rule.b, rule.callback);
            }
        }
    }

    #resolveSolid(moversGroup, solidsGroup) {
        const movers = this.#fillActive(moversGroup, this.#activeA).slice();
        const solids = this.#fillActive(solidsGroup, this.#activeB).slice();
        if (movers.length === 0 || solids.length === 0) return;

        const hash = this.hash;
        hash.clear();
        for (let i = 0; i < solids.length; i++) {
            hash.insert(solids[i], spatialAabbOf(solids[i]));
        }

        for (let i = 0; i < movers.length; i++) {
            const mover = movers[i];
            if (typeof mover.resolvePlatformCollision !== 'function') continue;
            const box = spatialAabbOf(mover);
            const nearby = hash.query(box).slice();
            for (let j = 0; j < nearby.length; j++) {
                mover.resolvePlatformCollision(nearby[j]);
            }
        }
    }

    #resolveOverlap(groupA, groupB, callback) {
        const listA = this.#fillActive(groupA, this.#activeA).slice();
        const listB = this.#fillActive(groupB, this.#activeB).slice();
        if (listA.length === 0 || listB.length === 0) return;

        const same = groupA === groupB;
        const hash = this.hash;
        hash.clear();
        const indexed = same ? listA : listB;
        for (let i = 0; i < indexed.length; i++) {
            hash.insert(indexed[i], spatialAabbOf(indexed[i]));
        }

        const order = same ? new Map() : null;
        if (order) {
            for (let i = 0; i < listA.length; i++) order.set(listA[i], i);
        }

        const engine = this.engine;
        for (let i = 0; i < listA.length; i++) {
            const a = listA[i];
            const nearby = hash.query(spatialAabbOf(a)).slice();
            for (let j = 0; j < nearby.length; j++) {
                const b = nearby[j];
                if (a === b) continue;
                // Stesso gruppo: una coppia non ordinata, nell'ordine del gruppo.
                if (order && !(order.get(b) > i)) continue;
                const hit = a.collidesWith
                    ? a.collidesWith(b)
                    : engine.checkCollision(a, b);
                if (hit) callback(a, b, engine);
            }
        }
    }
}
