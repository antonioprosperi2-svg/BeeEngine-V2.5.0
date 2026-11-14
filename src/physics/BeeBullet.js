import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeeBullet: Represents a moving 2D projectile with velocity, lifespan, and optional texture key.
 */
export class BeeBullet extends BeeEntity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} [vx=0] 
     * @param {number} [vy=300] 
     * @param {number} [width=8] 
     * @param {number} [height=8] 
     * @param {string|null} [textureKey=null] 
     * @param {number} [lifespan=5] Lifespan in seconds before auto-destroy
     */
    constructor(x = 0, y = 0, vx = 0, vy = 300, width = 8, height = 8, textureKey = null, lifespan = 5) {
        super(x, y, width, height);
        this.reset(x, y, vx, vy, width, height, textureKey, lifespan);
    }

    reset(x = 0, y = 0, vx = 0, vy = 300, width = 8, height = 8, textureKey = null, lifespan = 5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = vx;
        this.vy = vy;
        this.textureKey = textureKey;
        this.lifespan = lifespan;
        this.age = 0;
        return this;
    }

    recycle() {
        this.age = 0;
        this.vx = 0;
        this.vy = 0;
    }

    update(dt, input, engine) {
        this.age += dt;

        if (this.lifespan > 0 && this.age >= this.lifespan) {
            this.destroy();
            return;
        }

        super.update(dt, input, engine);
        if (this.destroyed || !engine || !engine.canvas) return;

        // Inquadratura, non l'angolo del canvas: con la telecamera un proiettile
        // inquadrato può avere worldX molto più grande di canvas.width.
        // isRectVisibleInView con width o height 0 ritorna false: il punto morirebbe subito.
        const margin = 200;
        let viewX = 0;
        let viewY = 0;
        let viewW = engine.canvas.width;
        let viewH = engine.canvas.height;
        const camera = engine.camera;
        if (camera && typeof camera.getViewBounds === 'function') {
            const view = camera.getViewBounds();
            if (view) {
                viewX = view.x;
                viewY = view.y;
                viewW = view.width;
                viewH = view.height;
            }
        }

        const w = this.width || 0;
        const h = this.height || 0;
        const outside = this.worldX + w < viewX - margin
            || this.worldX > viewX + viewW + margin
            || this.worldY + h < viewY - margin
            || this.worldY > viewY + viewH + margin;
        if (outside) this.destroy();
    }

    draw(ctx, engine) {
        if (!ctx) return;

        const assets = engine && engine.assets;
        const texture = (this.textureKey && assets && typeof assets.getImage === 'function')
            ? assets.getImage(this.textureKey)
            : null;
        if (texture && typeof texture.width === 'number') {
            ctx.drawImage(texture, this.worldX, this.worldY, this.width, this.height);
            return;
        }

        ctx.save();
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
        ctx.restore();
    }
}
