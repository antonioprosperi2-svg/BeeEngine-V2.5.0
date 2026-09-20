/**
 * BeeSceneManager — registro di scene e una sola corrente.
 * `change` è replace, non uno stack: stesso nome = restart (exit + sweep + enter).
 * Il manager è l'unico owner del loop entity.
 * scene.drawWorld = sfondo in spazio mondo (sotto la camera).
 * scene.draw = HUD in spazio schermo (dopo la camera). Le entity le dipinge BeeLayer.
 */

export class BeeSceneManager {
    constructor(engine) {
        if (!engine) {
            throw new Error('BeeSceneManager: serve un engine');
        }
        this.engine = engine;
        this.ctx = engine.ctx;
        this.scenes = new Map();
        this.currentScene = null;
        this.currentSceneName = null;
        this.#inUpdate = false;
        this.#changedDuringUpdate = false;
    }

    #inUpdate;
    #changedDuringUpdate;

    add(name, scene) {
        const id = this.#id(name, 'add');
        if (!scene || typeof scene !== 'object') {
            throw new Error('BeeSceneManager.add: scene must be an object');
        }

        if (!Array.isArray(scene.entities)) {
            scene.entities = [];
        }
        scene.engine = this.engine;
        this.scenes.set(id, scene);
        return this;
    }

    has(name) {
        return this.scenes.has(String(name ?? ''));
    }

    /**
     * Sostituisce la scena corrente. Stesso nome = restart.
     * Se chiamato da `scene.update`, le entity della nuova scena partono al frame dopo.
     */
    change(name, data = null) {
        const id = this.#id(name, 'change');
        if (!this.scenes.has(id)) {
            throw new Error(`BeeSceneManager: scena non trovata: ${id}`);
        }

        const next = this.scenes.get(id);
        this.#leave(this.currentScene);

        this.currentScene = next;
        this.currentSceneName = id;
        this.engine.currentScene = next;
        this.#enter(next, data);

        if (this.#inUpdate) {
            this.#changedDuringUpdate = true;
        }
        return this;
    }

    remove(name) {
        const id = this.#id(name, 'remove');
        const scene = this.scenes.get(id);
        if (!scene) return this;

        if (this.currentScene === scene) {
            this.#leave(scene);
            this.currentScene = null;
            this.currentSceneName = null;
            this.engine.currentScene = null;
        } else {
            this.#sweep(scene);
        }

        this.scenes.delete(id);
        return this;
    }

    addEntity(entity) {
        if (!entity || entity.destroyed) return entity;
        if (!this.currentScene) return entity;

        if (!Array.isArray(this.currentScene.entities)) {
            this.currentScene.entities = [];
        }

        entity.engine = this.engine;
        entity.scene = this.currentScene;
        if (this.currentScene.entities.indexOf(entity) < 0) {
            this.currentScene.entities.push(entity);
        }
        return entity;
    }

    update(dt, input) {
        if (!this.currentScene) return;

        this.#inUpdate = true;
        this.#changedDuringUpdate = false;

        const scene = this.currentScene;
        if (typeof scene.update === 'function') {
            scene.update(dt, input ?? this.engine.input, this.engine);
        }

        this.#inUpdate = false;

        if (this.#changedDuringUpdate) {
            this.#changedDuringUpdate = false;
            return;
        }

        if (dt <= 0) return;
        this.#tickEntities(dt, input ?? this.engine.input);
    }

    drawWorld(ctx = this.ctx) {
        const scene = this.currentScene;
        if (!scene) return;
        if (typeof scene.drawWorld === 'function') {
            scene.drawWorld(ctx, this.engine);
        }
    }

    drawUI(ctx = this.ctx) {
        const scene = this.currentScene;
        if (!scene) return;
        if (typeof scene.draw === 'function') {
            scene.draw(ctx, this.engine);
        }
    }

    draw(ctx = this.ctx) {
        this.drawWorld(ctx);
    }

    getCurrentScene() {
        return this.currentScene;
    }

    getCurrentSceneName() {
        return this.currentSceneName;
    }

    destroy() {
        this.#leave(this.currentScene);
        for (const scene of this.scenes.values()) {
            this.#sweep(scene);
        }
        this.scenes.clear();
        this.currentScene = null;
        this.currentSceneName = null;
        if (this.engine) this.engine.currentScene = null;
        return this;
    }

    #id(name, method) {
        if (name === undefined || name === null || name === '') {
            throw new Error(`BeeSceneManager.${method}: name required`);
        }
        return String(name);
    }

    #leave(scene) {
        if (!scene) return;
        if (typeof scene.onExit === 'function') {
            scene.onExit();
        } else if (typeof scene.exit === 'function') {
            scene.exit();
        }
        this.#sweep(scene);
    }

    #enter(scene, data) {
        scene.engine = this.engine;
        if (!Array.isArray(scene.entities)) {
            scene.entities = [];
        }
        if (typeof scene.onEnter === 'function') {
            scene.onEnter(data);
        } else if (typeof scene.enter === 'function') {
            scene.enter(data);
        }
    }

    #sweep(scene) {
        if (!scene || scene.persistEntities) return;
        const list = scene.entities;
        if (!list || list.length === 0) return;
        for (let i = 0; i < list.length; i++) {
            const entity = list[i];
            if (entity && !entity.destroyed && typeof entity.destroy === 'function') {
                entity.destroy();
            }
        }
        list.length = 0;
    }

    #tickEntities(dt, input) {
        const list = this.currentScene.entities;
        if (!list || list.length === 0) return;

        const engine = this.engine;
        let write = 0;
        for (let read = 0; read < list.length; read++) {
            const entity = list[read];
            if (!entity || entity.destroyed) continue;
            if (entity.active !== false && typeof entity.update === 'function') {
                entity.update(dt, input, engine);
            }
            if (!entity.destroyed) {
                list[write] = entity;
                write += 1;
            }
        }
        list.length = write;
    }
}
