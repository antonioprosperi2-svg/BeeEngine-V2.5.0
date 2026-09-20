import { BeeRectCollider } from '../physics/BeeRectCollider.js';
import { BeeRigidBody } from '../physics/BeeRigidBody.js';
import { BeeTransform, BEE_TRANSFORM_DEFAULTS } from './BeeTransform.js';

/**
 * Parametri cinematici di default. Niente magic number sparsi nel solver:
 * ogni entità può sovrascriverli in costruzione o a runtime.
 */
export const BEE_ENTITY_DEFAULTS = Object.freeze({
    width: 32,
    height: 32,
    gravity: 0,
    friction: 0,
    airFriction: 0,
    landingTolerance: 10,
    velocityLookahead: 0.1,
    maxFallSpeed: Infinity,
    angularVelocity: 0
});

export { BEE_TRANSFORM_DEFAULTS };

function readWorldX(node) {
    if (!node) return 0;
    return typeof node.worldX === 'number' ? node.worldX : Number(node.x) || 0;
}

function readWorldY(node) {
    if (!node) return 0;
    return typeof node.worldY === 'number' ? node.worldY : Number(node.y) || 0;
}

/**
 * BeeEntity — nodo di scene graph.
 * La geometria vive in `this.transform` (BeeTransform). Qui restano
 * gerarchia, ciclo di vita e cinematica.
 */
export class BeeEntity {
    static worldXOf(node) {
        return readWorldX(node);
    }

    static worldYOf(node) {
        return readWorldY(node);
    }

    /**
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {number} [width]
     * @param {number} [height]
     * @param {Partial<typeof BEE_ENTITY_DEFAULTS>} [physics]
     */
    constructor(
        x = 0,
        y = 0,
        width = BEE_ENTITY_DEFAULTS.width,
        height = BEE_ENTITY_DEFAULTS.height,
        physics = null
    ) {
        const cfg = physics ? { ...BEE_ENTITY_DEFAULTS, ...physics } : BEE_ENTITY_DEFAULTS;

        this.transform = new BeeTransform({ x, y });
        this.transform.onDirty = () => this.#cascadeDirty();

        this.width = width;
        this.height = height;

        this.vx = 0;
        this.vy = 0;
        this.angularVelocity = cfg.angularVelocity;
        this.gravity = cfg.gravity;
        this.friction = cfg.friction;
        this.airFriction = cfg.airFriction;
        this.landingTolerance = cfg.landingTolerance;
        this.velocityLookahead = cfg.velocityLookahead;
        this.maxFallSpeed = cfg.maxFallSpeed;
        this.isGrounded = false;

        this.active = true;
        this.visible = true;
        this.destroyed = false;
        this.collider = null;
        this.body = null;
        this.pool = null;
        this.animator = null;
        this.alpha = 1;
        this.drawLayer = null;
        this.sortY = null;
        this.#torn = false;
    }

    #torn = false;
    #parent = null;
    #children = [];

    get x() {
        return this.transform.x;
    }

    set x(value) {
        this.transform.x = value;
    }

    get y() {
        return this.transform.y;
    }

    set y(value) {
        this.transform.y = value;
    }

    get rotation() {
        return this.transform.rotation;
    }

    set rotation(value) {
        this.transform.rotation = value;
    }

    get scaleX() {
        return this.transform.scaleX;
    }

    set scaleX(value) {
        this.transform.scaleX = value;
    }

    get scaleY() {
        return this.transform.scaleY;
    }

    set scaleY(value) {
        this.transform.scaleY = value;
    }

    get parent() {
        return this.#parent;
    }

    get children() {
        return this.#children;
    }

    get worldX() {
        return this.transform.worldX;
    }

    set worldX(value) {
        this.transform.worldX = value;
    }

    get worldY() {
        return this.transform.worldY;
    }

    set worldY(value) {
        this.transform.worldY = value;
    }

    getWorldAABB() {
        if (this.body) {
            const box = this.body.getWorldAABB();
            return { x: box.x, y: box.y, width: box.width, height: box.height };
        }
        return this.transform.getWorldAABB(this.width, this.height, {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        });
    }

    applyWorldTransform(ctx) {
        this.transform.applyWorldTo(ctx);
        return this;
    }

    #cascadeDirty() {
        const kids = this.#children;
        for (let i = 0; i < kids.length; i++) {
            kids[i].transform.markDirty();
        }
    }

    #hasAncestor(node) {
        let current = this.#parent;
        while (current) {
            if (current === node) return true;
            current = current.#parent;
        }
        return false;
    }

    addRigidBody(options = {}) {
        if (this.body) this.body.destroy();
        const world = options.world;
        this.body = new BeeRigidBody({
            ...options,
            entity: this,
            transform: this.transform,
            shape: options.shape || BeeRigidBody.box(this.width, this.height)
        });
        if (world) world.add(this.body);
        return this.body;
    }

    addRectCollider(offsetX = 0, offsetY = 0, width = null, height = null) {
        this.collider = new BeeRectCollider(
            this,
            offsetX,
            offsetY,
            width != null ? width : this.width,
            height != null ? height : this.height
        );
        return this.collider;
    }

    addChild(entity) {
        if (!entity || entity === this || entity.destroyed) return entity;
        if (this.#hasAncestor(entity)) return entity;
        if (entity.#parent === this) return entity;

        if (entity.#parent) {
            entity.#parent.removeChild(entity);
        }

        this.#children.push(entity);
        entity.#parent = this;
        entity.transform.setParent(this.transform);
        return entity;
    }

    removeChild(entity) {
        if (!entity) return;
        const index = this.#children.indexOf(entity);
        if (index < 0) return;

        this.#children.splice(index, 1);
        if (entity.#parent === this) {
            entity.#parent = null;
            entity.transform.setParent(null);
        }
    }

    detach() {
        if (this.#parent) {
            this.#parent.removeChild(this);
        }
        return this;
    }

    collidesWith(other) {
        if (!other || other === this) return false;

        const a = this.getWorldAABB();
        const b = typeof other.getWorldAABB === 'function'
            ? other.getWorldAABB()
            : {
                x: readWorldX(other),
                y: readWorldY(other),
                width: other.width,
                height: other.height
            };

        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    resolvePlatformCollision(platform) {
        if (!this.collidesWith(platform)) return false;

        const box = this.getWorldAABB();
        const plat = typeof platform.getWorldAABB === 'function'
            ? platform.getWorldAABB()
            : null;
        const px = plat ? plat.x : readWorldX(platform);
        const py = plat ? plat.y : readWorldY(platform);
        const pw = plat ? plat.width : platform.width;
        const ph = plat ? plat.height : platform.height;

        const overlapX = Math.min(box.x + box.width - px, px + pw - box.x);
        const overlapY = Math.min(box.y + box.height - py, py + ph - box.y);

        if (overlapY < overlapX) {
            const lookahead = this.vy * this.velocityLookahead;
            const landingBand = py + this.landingTolerance;
            if (this.vy >= 0 && box.y + box.height - lookahead <= landingBand) {
                this.worldY = py - this.height;
                this.vy = 0;
                this.isGrounded = true;
                return true;
            }
            if (this.vy < 0) {
                this.worldY = py + ph;
                this.vy = 0;
            }
        } else if (this.vx > 0) {
            this.worldX = px - this.width;
        } else if (this.vx < 0) {
            this.worldX = px + pw;
        }

        return false;
    }

    integrate(dt) {
        if (this.body) return;
        if (!this.active || this.destroyed || dt <= 0) return;

        if (this.gravity !== 0 && !this.isGrounded) {
            this.vy += this.gravity * dt;
            if (Number.isFinite(this.maxFallSpeed) && this.vy > this.maxFallSpeed) {
                this.vy = this.maxFallSpeed;
            }
        }

        const drag = this.isGrounded ? this.friction : this.airFriction;
        if (drag > 0) {
            this.vx *= Math.max(0, 1 - drag * dt);
        }

        if (this.vx !== 0) this.transform.x += this.vx * dt;
        if (this.vy !== 0) this.transform.y += this.vy * dt;
        if (this.angularVelocity !== 0) this.transform.rotation += this.angularVelocity * dt;

        this.isGrounded = false;
    }

    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        this.integrate(dt);

        if (this.animator && typeof this.animator.update === 'function') {
            const ctx = typeof this.animatorContext === 'function'
                ? this.animatorContext()
                : this;
            this.animator.update(dt, ctx);
        }

        const kids = this.#children;
        for (let i = 0; i < kids.length; ) {
            const child = kids[i];
            if (child.destroyed) {
                this.removeChild(child);
                continue;
            }
            if (child.active && typeof child.update === 'function') {
                child.update(dt, input, engine);
            }
            if (child.destroyed) {
                this.removeChild(child);
                continue;
            }
            i++;
        }
    }

    draw(_ctx, _engine) {
        // intenzionalmente vuoto — single responsibility
    }

    recycle() {
        // hook per i pool: reset stato volatile, non teardown
    }

    dispose() {
        this.pool = null;
        this.#teardown();
    }

    destroy() {
        if (this.pool) {
            this.pool.release(this);
            return;
        }
        this.#teardown();
    }

    #teardown() {
        if (this.#torn) return;
        this.#torn = true;
        this.destroyed = true;
        this.active = false;
        this.visible = false;

        this.detach();

        const kids = this.#children;
        this.#children = [];
        for (let i = 0; i < kids.length; i++) {
            const child = kids[i];
            child.#parent = null;
            child.transform.setParent(null);
            child.destroy();
        }

        this.transform.onDirty = null;

        if (this.body) {
            this.body.destroy();
            this.body = null;
        }

        if (this.collider && this.collider.entity === this) {
            this.collider.entity = null;
        }
    }
}
