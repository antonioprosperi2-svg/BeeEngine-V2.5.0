import { BeeEnemy } from './BeeEnemy.js';
import { BeeBullet } from '../physics/BeeBullet.js';
import { BeeTimer } from '../core/BeeTimer.js';

/**
 * BeeEnemyShooter: Advanced enemy capable of multi-directional movement and shooting projectiles.
 * Bounces within explicit world bounds (setBounds); falls back to canvas size if unset.
 */
export class BeeEnemyShooter extends BeeEnemy {
    constructor(x = 0, y = 0, width = 40, height = 40, textureKey = null) {
        super(x, y, width, height, textureKey);
        this.speed = 0; // patrol motion (BeeEnemy) unused here; vx/vy drive movement instead
        this.vx = 80;
        this.vy = 60;
        this.shootInterval = 1.5;
        this.bulletSpeed = 250;
        this.bulletGroup = 'hazards'; // collision group new bullets join, if the engine has one
        this.engine = null;
        this.boundsMinX = 0;
        this.boundsMinY = 0;
        this.boundsMaxX = null; // null = fall back to engine.canvas width/height
        this.boundsMaxY = null;
        this.fire = new BeeTimer({
            duration: this.shootInterval,
            loop: true,
            onComplete: () => {
                if (this.active && !this.destroyed && this.engine) {
                    this.shoot(this.engine);
                }
            }
        });
        this.fire.start();
    }

    get shootTimer() {
        return this.fire ? this.fire.remaining : 0;
    }

    /** Explicit patrol/bounce bounds in world space. Unset axes fall back to canvas size. */
    setBounds(minX, minY, maxX, maxY) {
        this.boundsMinX = minX;
        this.boundsMinY = minY;
        this.boundsMaxX = maxX;
        this.boundsMaxY = maxY;
    }

    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        this.engine = engine || this.engine;
        this.fire.duration = this.shootInterval;
        if (engine && engine.time) {
            this.fire.update(engine.time);
        } else {
            this.fire.update(dt);
        }

        super.update(dt, input, engine);

        const maxX = this.boundsMaxX ?? (engine && engine.canvas ? engine.canvas.width : null);
        const maxY = this.boundsMaxY ?? (engine && engine.canvas ? engine.canvas.height : null);
        if (maxX == null || maxY == null) return;

        if (this.worldX <= this.boundsMinX) {
            this.vx = Math.abs(this.vx);
            this.worldX = this.boundsMinX;
        } else if (this.worldX + this.width >= maxX) {
            this.vx = -Math.abs(this.vx);
            this.worldX = maxX - this.width;
        }

        if (this.worldY <= this.boundsMinY) {
            this.vy = Math.abs(this.vy);
            this.worldY = this.boundsMinY;
        } else if (this.worldY + this.height >= maxY) {
            this.vy = -Math.abs(this.vy);
            this.worldY = maxY - this.height;
        }
    }

    /** Pool hook: called on acquire — start() resets elapsed/cancelled/running in one call. */
    reset() {
        this.fire.start();
    }

    /** Pool hook: called on release — stop firing while dormant. */
    recycle() {
        if (this.fire) this.fire.cancel();
    }

    destroy() {
        if (this.fire) this.fire.cancel();
        super.destroy();
    }

    shoot(engine) {
        let bulletVx = 0;
        let bulletVy = this.bulletSpeed; // default: straight down

        if (Math.abs(this.vx) > Math.abs(this.vy)) {
            bulletVx = this.vx > 0 ? this.bulletSpeed : -this.bulletSpeed;
            bulletVy = 0;
        } else if (this.vy !== 0 || this.vx !== 0) {
            bulletVy = this.vy > 0 ? this.bulletSpeed : -this.bulletSpeed;
            bulletVx = 0;
        }
        // vx === vy === 0: keeps the default above (down), not the old accidental "up".

        const bulletX = this.worldX + this.width / 2 - 4;
        const bulletY = this.worldY + this.height / 2 - 4;

        const bullet = engine && engine.bullets
            ? engine.bullets.acquire(bulletX, bulletY, bulletVx, bulletVy, 10, 10)
            : new BeeBullet(bulletX, bulletY, bulletVx, bulletVy, 10, 10);

        if (bullet && engine && typeof engine.addEntity === 'function') {
            engine.addEntity(bullet);
            if (this.bulletGroup && engine.collisions && typeof engine.collisions.add === 'function') {
                engine.collisions.add(this.bulletGroup, bullet);
            }
        }
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey && typeof engine.getAsset === 'function')
            ? engine.getAsset(this.textureKey)
            : null;

        const wx = this.worldX;
        const wy = this.worldY;
        if (texture) {
            ctx.drawImage(texture, wx, wy, this.width, this.height);
            return;
        }

        ctx.save();
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(wx, wy, this.width, this.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, this.width, this.height);

        ctx.fillStyle = '#ffff00';
        if (Math.abs(this.vx) > Math.abs(this.vy)) {
            const cannonX = this.vx > 0 ? wx + this.width : wx - 6;
            ctx.fillRect(cannonX, wy + this.height / 2 - 3, 6, 6);
        } else {
            const cannonY = this.vy > 0 ? wy + this.height : wy - 6;
            ctx.fillRect(wx + this.width / 2 - 3, cannonY, 6, 6);
        }
        ctx.restore();
    }
}
