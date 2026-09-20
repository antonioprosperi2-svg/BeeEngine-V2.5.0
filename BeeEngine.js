// ==========================================
// 1. CORE & BASE SYSTEMS (src/core/)
// ==========================================
import { BeeAssetManager } from './src/core/BeeAssetManager.js';
import { BeeEntity, BEE_ENTITY_DEFAULTS } from './src/core/BeeEntity.js';
import { BeeTransform, BEE_TRANSFORM_DEFAULTS } from './src/core/BeeTransform.js';
import { BeeTime, BEE_TIME_DEFAULTS } from './src/core/BeeTime.js';
import { BeeSceneManager } from './src/core/BeeSceneManager.js';
import { BeeSave, BeeSaveStore, BEE_SAVE_DEFAULTS, BEE_SAVE_STATUS } from './src/core/BeeSave.js';
import { BeeTimer, BeeTimerClock, BEE_TIMER_DEFAULTS } from './src/core/BeeTimer.js';
import { BeeTween, BeeTweenClock, BeeEase, BEE_TWEEN_DEFAULTS } from './src/core/BeeTween.js';
import { BeeTimeline } from './src/core/BeeTimeline.js';
import { BeeGrid } from './src/core/BeeGrid.js';
import { BeePool, BEE_POOL_DEFAULTS } from './src/core/BeePool.js';
import { BeePrefab, BEE_PREFAB_DEFAULTS } from './src/core/BeePrefab.js';
import { BeePathfinder, BeePath, BEE_PATH_DEFAULTS } from './src/core/BeePathfinder.js';
import {
    BeeUI,
    BeeControl,
    BeePanel,
    BeeStack,
    BeeLabel,
    BeeUIButton,
    BEE_ANCHOR,
    BEE_UI_DEFAULTS,
    drawNineSlice
} from './src/ui/BeeUI.js';
import { BeeLadybug, BEE_LADYBUG_DEFAULTS } from './src/debug/BeeLadybug.js';
import { BeeAudioMixer, BeeAudioBus, BeeAudioVoice, BEE_AUDIO_DEFAULTS, BEE_BUS, spatialMix } from './src/audio/BeeAudioMixer.js';

// ==========================================
// 2. INPUT & TOUCH CONTROLS (src/input/)
// ==========================================
import { BeeInput } from './src/input/BeeInput.js';
import { BeeTouchControls } from './src/input/BeeTouchControls.js';
import { BeeTouchButton } from './src/input/BeeTouchButton.js';
import { BeeVirtualDPad } from './src/input/BeeVirtualDPad.js';
import { BeeJoystick } from './src/input/BeeJoystick.js';
import { BeeButton } from './src/input/BeeButton.js';

// ==========================================
// 3. GRAPHICS & RENDERING (src/graphics/)
// ==========================================
import { BeeSprite } from './src/graphics/BeeSprite.js';
import { BeeSpriteSheet } from './src/graphics/BeeSpriteSheet.js';
import { BeeAnimatedSprite } from './src/graphics/BeeAnimatedSprite.js';
import { BeeAnimator, BEE_ANIMATOR_DEFAULTS } from './src/graphics/BeeAnimator.js';
import { BeeLayer, BEE_DRAW, BEE_SPACE, BEE_LAYER_DEFAULTS } from './src/graphics/BeeLayer.js';
import { BeeCamera } from './src/graphics/BeeCamera.js';
import { BeeParticleSystem } from './src/graphics/BeeParticleSystem.js';
import { BeeTilemap } from './src/graphics/BeeTilemap.js';
import { BeeTilemapLoader } from './src/graphics/BeeTilemapLoader.js';
import { BeeText } from './src/graphics/BeeText.js';

// ==========================================
// 4. PHYSICS & COLLISIONS (src/physics/)
// ==========================================
import { BeeCollisionSystem } from './src/physics/BeeCollisionSystem.js';
import { BeeRectCollider } from './src/physics/BeeRectCollider.js';
import { BeeBullet } from './src/physics/BeeBullet.js';
import {
    BeeRigidBody,
    BEE_BODY_DEFAULTS,
    BEE_BODY_TYPE,
    BEE_SHAPE,
    BEE_LAYER
} from './src/physics/BeeRigidBody.js';
import { BeePhysicsWorld, BEE_PHYSICS_DEFAULTS } from './src/physics/BeePhysicsWorld.js';
import { BeeSpatialHash, BEE_SPATIAL_HASH_DEFAULTS } from './src/physics/BeeSpatialHash.js';

// ==========================================
// 5. GAMEPLAY & ENTITIES (src/gameplay/)
// ==========================================
import { BeePlayer } from './src/gameplay/BeePlayer.js';
import { BeeEnemy } from './src/gameplay/BeeEnemy.js';
import { BeeEnemyShooter } from './src/gameplay/BeeEnemyShooter.js';
import { BeeCollectible } from './src/gameplay/BeeCollectible.js';
import { BeePlatform } from './src/gameplay/BeePlatform.js';
import { BeeMenuScene } from './src/gameplay/BeeMenuScene.js';

// Backward compatibility alias
const BeeNemico = BeeEnemy;

export class BeeEngine {
    constructor(canvasId, width = 800, height = 600) {
        this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
        if (!this.canvas) {
            throw new Error(`BeeEngine: Canvas element not found: ${canvasId}`);
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;

        this.assets = new BeeAssetManager();
        this.input = new BeeInput(this.canvas);
        this.scenes = new BeeSceneManager(this);

        this.entities = [];
        this.collisions = new BeeCollisionSystem(this);
        this.physics = new BeePhysicsWorld();
        this.spatial = this.physics.hash;
        this.pools = new Map();
        this.bullets = this.createPool('bullet', {
            create: () => new BeeBullet(),
            reset: (bullet, x, y, vx, vy, width, height, textureKey, lifespan) => {
                bullet.reset(x, y, vx, vy, width, height, textureKey, lifespan);
            },
            initial: 32,
            max: 256
        });
        this.time = new BeeTime();
        this.timers = new BeeTimerClock();
        this.tweens = new BeeTweenClock();
        this.audio = new BeeAudioMixer({ engine: this });
        this.layers = new BeeLayer();
        this.prefabs = new BeePrefab({ engine: this });
        this.#installPrefabTypes();
        this.pathfinder = new BeePathfinder();
        this.ui = new BeeUI({ canvas: this.canvas, width, height });
        this.save = new BeeSaveStore();
        this.debug = new BeeLadybug(this);
        this.debug.attach();
        this.camera = null;
        this.grid = null;
        this.currentScene = null;
        this.events = {};

        this.isRunning = false;
        this.animationFrameId = null;

        this._startAudioHandler = null;
        this._resizeHandler = null;
        this._audioUnlock = null;
        this.touchControls = null;
        this.#bindAudioUnlock();
    }

    #installPrefabTypes() {
        this.prefabs
            .type('entity', BeeEntity)
            .type('enemy', BeeEnemy)
            .type('player', BeePlayer)
            .type('shooter', BeeEnemyShooter)
            .type('platform', BeePlatform)
            .type('collectible', (spec) => new BeeCollectible(
                spec.canvasWidth ?? this.canvas.width,
                spec.canvasHeight ?? this.canvas.height,
                spec.textureKey ?? spec.sprite ?? null,
                spec.width ?? 20,
                spec.height ?? 20
            ))
            .type('text', (spec) => new BeeText(
                spec.text ?? '',
                spec.x ?? 0,
                spec.y ?? 0,
                spec.font,
                spec.color,
                spec.align
            ));
    }

    #bindAudioUnlock() {
        const unlock = () => this.audio && this.audio.unlock();
        this._audioUnlock = unlock;
        this.canvas.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    enableTouchControls() {
        if (this.touchControls && typeof this.touchControls.destroy === 'function') {
            this.touchControls.destroy();
        }
        this.touchControls = new BeeTouchControls(this.canvas, this.input);
        return this.touchControls;
    }

    enableJoystick(options = {}) {
        if (this.touchControls && typeof this.touchControls.destroy === 'function') {
            this.touchControls.destroy();
        }
        this.touchControls = new BeeJoystick(this.canvas, this.input);
        return this.touchControls;
    }

    createSpriteSheet(image, frameWidth, frameHeight, config = {}) {
        return new BeeSpriteSheet(image, frameWidth, frameHeight, config);
    }

    createAnimatedSprite(spriteSheet, config = {}) {
        return new BeeAnimatedSprite(spriteSheet, config);
    }

    createAnimator(sprite, options = {}) {
        return new BeeAnimator(sprite, options);
    }

    enableAutoResize(baseWidth = this.canvas.width, baseHeight = this.canvas.height, reservedHeight = 0) {
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';

        this._resizeHandler = () => {
            const windowWidth = window.innerWidth;
            const availableHeight = Math.max(100, window.innerHeight - reservedHeight);

            const targetRatio = baseWidth / baseHeight;
            const windowRatio = windowWidth / availableHeight;

            let newWidth = windowWidth;
            let newHeight = availableHeight;

            if (windowRatio > targetRatio) {
                newWidth = availableHeight * targetRatio;
            } else {
                newHeight = windowWidth / targetRatio;
            }

            this.canvas.style.width = `${newWidth}px`;
            this.canvas.style.height = `${newHeight}px`;
        };

        window.addEventListener('resize', this._resizeHandler);
        this._resizeHandler();
    }

    setGrid(grid) {
        this.grid = grid || null;
        if (grid) this.pathfinder.useGrid(grid);
        return this;
    }

    setScene(name, data = null) {
        this.entities.length = 0;
        if (this.scenes) {
            this.scenes.change(name, data);
        }
    }

    lockOrientation(orientation = 'landscape') {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock(orientation).catch(() => {});
        }
    }

    get isPaused() {
        return this.time.paused;
    }

    set isPaused(value) {
        if (value) this.time.pause();
        else this.time.resume();
    }

    get lastTime() {
        return this.time.lastTimestamp;
    }

    set lastTime(value) {
        this.time.lastTimestamp = value;
    }

    pause() {
        this.time.pause();
        return this;
    }

    resume() {
        this.time.resume();

        if (!this.isRunning && (this.update || this.render || this.scenes)) {
            this.isRunning = true;
            this.time.begin(performance.now());
            this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
        }

        return this;
    }

    setTimeScale(scale) {
        this.time.setScale(scale);
        return this;
    }

    after(duration, onComplete, options = {}) {
        return this.timers.create({
            ...options,
            duration,
            onComplete,
            autoStart: true
        });
    }

    every(duration, onComplete, options = {}) {
        return this.timers.create({
            ...options,
            duration,
            onComplete,
            loop: true,
            autoStart: true
        });
    }

    to(target, props, durationOrOptions) {
        return BeeTween.to(target, props, this.#tweenOpts(durationOrOptions));
    }

    from(target, props, durationOrOptions) {
        return BeeTween.from(target, props, this.#tweenOpts(durationOrOptions));
    }

    fromTo(target, from, to, durationOrOptions) {
        return BeeTween.fromTo(target, from, to, this.#tweenOpts(durationOrOptions));
    }

    timeline(options = {}) {
        return new BeeTimeline({ ...options, clock: this.tweens });
    }

    #tweenOpts(durationOrOptions) {
        if (typeof durationOrOptions === 'number') {
            return { duration: durationOrOptions, clock: this.tweens };
        }
        return { ...(durationOrOptions || {}), clock: this.tweens };
    }

    enableLadybug(options = {}) {
        this.debug.configure(options).attach().show();
        return this.debug;
    }

    stop() {
        this.isRunning = false;
        this.time.pause();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    destroy() {
        this.stop();
        if (this.scenes && typeof this.scenes.destroy === 'function') {
            this.scenes.destroy();
        }
        this.entities.length = 0;
        this.events = {};

        if (this._startAudioHandler) {
            window.removeEventListener('click', this._startAudioHandler);
            window.removeEventListener('keydown', this._startAudioHandler);
        }

        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }

        if (this._audioUnlock) {
            this.canvas.removeEventListener('pointerdown', this._audioUnlock);
            window.removeEventListener('keydown', this._audioUnlock);
            this._audioUnlock = null;
        }

        if (this.debug && typeof this.debug.destroy === 'function') {
            this.debug.destroy();
        }
        if (this.audio) this.audio.destroy();
        if (this.ui) this.ui.destroy();
        if (this.timers) this.timers.clear();
        if (this.tweens) this.tweens.clear();
        if (this.physics) this.physics.clear();
        if (this.pools) {
            for (const pool of this.pools.values()) {
                pool.clear();
            }
            this.pools.clear();
        }
        this.bullets = null;
    }

    createPool(name, options) {
        const id = String(name ?? '');
        if (!id) throw new Error('BeeEngine.createPool: name required');
        const pool = options instanceof BeePool ? options : new BeePool(options);
        this.pools.set(id, pool);
        return pool;
    }

    pool(name) {
        return this.pools.get(String(name ?? '')) || null;
    }

    spawn(name, ...args) {
        const pool = this.pool(name);
        if (!pool) return null;
        const item = pool.acquire(...args);
        if (item && typeof item.update === 'function') {
            this.addEntity(item);
        }
        return item;
    }

    start(updateCallback, renderCallback) {
        if (this.isRunning) return;

        if (typeof updateCallback === 'function') this._savedUpdate = updateCallback;
        if (typeof renderCallback === 'function') this._savedRender = renderCallback;

        this.update = typeof updateCallback === 'function' ? updateCallback : this._savedUpdate;
        this.render = typeof renderCallback === 'function' ? renderCallback : this._savedRender;

        if (!this.update && !this.render && !this.scenes) {
            console.warn('BeeEngine: No update/render callback or SceneManager provided.');
            return;
        }

        this.isRunning = true;
        this.time.resume();
        this.time.begin(performance.now());
        this.animationFrameId = requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        this.time.tick(timestamp);
        this.timers.tick(this.time);
        this.tweens.tick(this.time);
        this.audio.update(this.time);
        const dt = this.time.dt;

        if (!this.time.paused) {
            if (this.scenes) {
                this.scenes.update(dt, this.input);
            }

            this.updateEntities(dt, this.input);
            this.time.consumeFixedSteps((fixedDt) => this.physics.step(fixedDt));
        }

        if (this.update) {
            this.update(dt, this.input, this.time);
        }

        this.ui.update(this.input);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        if (this.camera) {
            this.camera.apply(this.ctx);
        }

        if (this.scenes && typeof this.scenes.drawWorld === 'function') {
            this.scenes.drawWorld(this.ctx);
        }

        this.layers.drawWorld(this.ctx, this);

        if (this.render) {
            this.render(this.ctx);
        }

        if (this.debug && this.debug.enabled) {
            this.debug.drawWorld(this.ctx);
        }

        this.ctx.restore();

        this.layers.drawScreen(this.ctx, this);

        if (this.scenes && typeof this.scenes.drawUI === 'function') {
            this.scenes.drawUI(this.ctx);
        }

        this.ui.draw(this.ctx);

        if (this.touchControls) {
            this.touchControls.draw(this.ctx);
        }

        if (this.debug) {
            this.debug.drawOverlay(this.ctx);
            this.debug.poll();
        }

        this.input.endFrame();
        this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
    }

    on(evento, callback) {
        if (!this.events[evento]) this.events[evento] = [];
        this.events[evento].push(callback);
    }

    emit(evento, dati) {
        if (this.events[evento]) {
            this.events[evento].forEach(callback => callback(dati));
        }
    }

    off(evento, callback) {
        if (!this.events[evento]) return;
        this.events[evento] = this.events[evento].filter(cb => cb !== callback);
    }

    addEntity(entity) {
        if (!entity || entity.destroyed) return entity;
        if (this.scenes && this.scenes.currentScene) {
            return this.scenes.addEntity(entity);
        }
        if (this.entities.indexOf(entity) < 0) {
            this.entities.push(entity);
        }
        return entity;
    }

    updateEntities(dt, input) {
        let hasDestroyed = false;
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (e.update) e.update(dt, input, this);
            if (e.destroyed) hasDestroyed = true;
        }

        if (hasDestroyed) {
            this.entities = this.entities.filter(e => !e.destroyed);
        }
    }

    renderEntities(ctx) {
        this.layers.drawWorld(ctx, this);
    }

    getEntityDrawBounds(entity) {
        if (!entity) return null;
        if (typeof entity.getWorldAABB === 'function') {
            return entity.getWorldAABB();
        }
        if (entity.collider) {
            return {
                x: entity.collider.x,
                y: entity.collider.y,
                width: entity.collider.width,
                height: entity.collider.height
            };
        }
        return {
            x: typeof entity.worldX === 'number' ? entity.worldX : entity.x,
            y: typeof entity.worldY === 'number' ? entity.worldY : entity.y,
            width: entity.width ?? 0,
            height: entity.height ?? 0
        };
    }

    isRectVisibleInView(x, y, width, height, space = BEE_SPACE.WORLD) {
        if (width <= 0 || height <= 0) return false;

        if (space === BEE_SPACE.SCREEN) {
            return (
                x < this.canvas.width &&
                x + width > 0 &&
                y < this.canvas.height &&
                y + height > 0
            );
        }

        if (this.camera && typeof this.camera.isRectVisible === 'function') {
            return this.camera.isRectVisible(x, y, width, height);
        }

        const cameraX = this.cameraX || 0;
        const cameraY = this.cameraY || 0;

        return (
            x < cameraX + this.canvas.width &&
            x + width > cameraX &&
            y < cameraY + this.canvas.height &&
            y + height > cameraY
        );
    }

    drawEntity(ctx, entity, options = null) {
        if (!entity || entity.visible === false || entity.destroyed) return;

        const space = options && options.space === BEE_SPACE.SCREEN ? BEE_SPACE.SCREEN : BEE_SPACE.WORLD;
        const pass = (options && options.pass) || entity.drawLayer || BEE_DRAW.WORLD;

        const alpha = typeof entity.alpha === 'number' ? entity.alpha : 1;
        const fade = alpha < 1;
        if (fade) {
            ctx.save();
            ctx.globalAlpha *= Math.max(0, alpha);
        }

        if (typeof entity.draw === 'function') {
            const bounds = this.getEntityDrawBounds(entity);
            const hasSize = bounds && bounds.width > 0 && bounds.height > 0;
            if (!hasSize || this.isRectVisibleInView(bounds.x, bounds.y, bounds.width, bounds.height, space)) {
                entity.draw(ctx, this);
            }
        }

        const children = entity.children;
        if (children && children.length > 0) {
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child && child.drawLayer && child.drawLayer !== pass) continue;
                this.drawEntity(ctx, child, { space, pass });
            }
        }

        if (fade) ctx.restore();
    }

    checkCollision(rect1, rect2) {
        return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
    }

    async loadAsset(type, name, src) {
        if (type === 'image') return this.assets.loadImage(name, src);
        if (type === 'audio') return this.assets.loadSound(name, src);
        if (type === 'json' && typeof this.assets.loadJSON === 'function') {
            return this.assets.loadJSON(name, src);
        }
        return Promise.reject(new Error(`Unsupported asset type: ${type}`));
    }

    async loadManifest(manifest) {
        if (typeof this.assets.loadManifest === 'function') {
            return this.assets.loadManifest(manifest);
        }
        const promises = manifest.map(a => this.loadAsset(a.type, a.name, a.src));
        return Promise.all(promises);
    }

    getAsset(name) {
        if (typeof this.assets.getAsset === 'function') {
            return this.assets.getAsset(name);
        }
        return this.assets.getImage(name) || this.assets.getSound(name);
    }

    playSound(source, options) {
        const opts = typeof options === 'number' ? { volume: options } : (options || {});
        return this.audio.play(source, { bus: BEE_BUS.SFX, ...opts });
    }

    playMusic(source, volume = 0.5) {
        const opts = typeof volume === 'number' ? { volume } : (volume || {});
        return this.audio.music(source, opts);
    }
}

export {
    BEE_ENTITY_DEFAULTS,
    BEE_TRANSFORM_DEFAULTS,
    BEE_TIME_DEFAULTS,
    BEE_TIMER_DEFAULTS,
    BEE_TWEEN_DEFAULTS,
    BEE_SAVE_DEFAULTS,
    BEE_SAVE_STATUS,
    BEE_LADYBUG_DEFAULTS,
    BEE_PHYSICS_DEFAULTS,
    BEE_BODY_DEFAULTS,
    BEE_BODY_TYPE,
    BEE_SHAPE,
    BEE_LAYER,
    BEE_SPATIAL_HASH_DEFAULTS,
    BEE_POOL_DEFAULTS,
    BEE_PREFAB_DEFAULTS,
    BEE_PATH_DEFAULTS,
    BEE_ANCHOR,
    BEE_UI_DEFAULTS,
    BEE_ANIMATOR_DEFAULTS,
    BEE_LAYER_DEFAULTS,
    BEE_DRAW,
    BEE_SPACE,
    BEE_AUDIO_DEFAULTS,
    BEE_BUS,
    BeeTime,
    BeeTransform,
    BeeLadybug,
    BeeSceneManager,
    BeeSave,
    BeeSaveStore,
    BeeParticleSystem,
    BeeTilemap,
    BeeButton,
    BeeText,
    BeeTimer,
    BeeTimerClock,
    BeeEase,
    BeeTween,
    BeeTweenClock,
    BeeTimeline,
    BeeRectCollider,
    BeeAssetManager,
    BeeMenuScene,
    BeeBullet,
    BeePlayer,
    BeeEntity,
    BeeGrid,
    BeeCamera,
    BeeSprite,
    BeeTouchControls,
    BeeInput,
    BeeEnemy,
    BeeNemico,
    BeeEnemyShooter,
    BeePlatform,
    BeeCollectible,
    BeeCollisionSystem,
    BeeRigidBody,
    BeePhysicsWorld,
    BeeSpatialHash,
    BeePool,
    BeePrefab,
    BeePathfinder,
    BeePath,
    BeeUI,
    BeeControl,
    BeePanel,
    BeeStack,
    BeeLabel,
    BeeUIButton,
    drawNineSlice,
    BeeSpriteSheet,
    BeeAnimatedSprite,
    BeeAnimator,
    BeeLayer,
    BeeAudioMixer,
    BeeAudioBus,
    BeeAudioVoice,
    spatialMix,
    BeeTilemapLoader,
    BeeJoystick,
    BeeTouchButton,
    BeeVirtualDPad,
};
