import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeeCollectible: Generic falling item / bonus entity.
 * Falls at a fixed speed; respawns at the top when it passes the bottom
 * of the screen, or is collected via collect().
 */
export class BeeCollectible extends BeeEntity {
    /**
     * @param {number} [canvasWidth=800]
     * @param {number} [canvasHeight=600]
     * @param {string|null} [textureKey=null]
     * @param {number} [width=20]
     * @param {number} [height=20]
     * @param {number} [value=1] Score/reward value awarded on collect().
     * @param {(item: BeeCollectible, collector: any) => void} [onCollect=null]
     */
    constructor(canvasWidth = 800, canvasHeight = 600, textureKey = null, width = 20, height = 20, value = 1, onCollect = null) {
        super(0, 0, width, height);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.textureKey = textureKey;
        this.value = value;
        this.onCollect = onCollect;
        // Motion is manual (speed-driven fall) — never let physics integrate() move this too.
        this.gravity = 0;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0; // set for real in reset()
        this.reset();
    }

    reset() {
        this.worldX = Math.random() * Math.max(1, this.canvasWidth - this.width);
        this.worldY = -this.height;
        this.speed = 100 + Math.random() * 150;
    }

    /**
     * Call from the scene when a collision with the player/collector is detected:
     *   if (player.collidesWith(item)) item.collect(player);
     */
    collect(collector) {
        if (this.destroyed || !this.active) return;
        if (typeof this.onCollect === 'function') {
            this.onCollect(this, collector);
        }
        this.destroy(); // already branches pool.release() vs full teardown
    }

    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        this.worldY += this.speed * dt;
        if (this.worldY > this.canvasHeight) {
            this.reset();
        }

        super.update(dt, input, engine);
    }

    /** Pool hook: called on release, when the item goes back to sleep. */
    recycle() {
        // Nessuno stato volatile da ripulire oggi: reset() già rigenera
        // posizione/velocità a ogni riacquisto dal pool.
    }

    draw(ctx, engine) {
        const texture = (engine && this.textureKey && typeof engine.getAsset === 'function')
            ? engine.getAsset(this.textureKey)
            : null;

        const wx = this.worldX;
        const wy = this.worldY;
        if (texture) {
            ctx.drawImage(texture, wx, wy, this.width, this.height);
        } else {
            ctx.save();
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(wx + this.width / 2, wy + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }
}
