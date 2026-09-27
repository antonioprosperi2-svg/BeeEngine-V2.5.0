import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeeEnemy: Generic base class for hostile entities in 2D games.
 * Supports direction/patrol logic, custom sprites/textures, and vector fallback rendering.
 */
export class BeeEnemy extends BeeEntity {
    /**
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} [width=32] - Width
     * @param {number} [height=32] - Height
     * @param {string|null} [textureKey=null] - Asset manager key for texture
     */
    constructor(x = 0, y = 0, width = 32, height = 32, textureKey = null) {
        super(x, y, width, height);
        // Moto manuale via `speed` su worldX. Non settare vx/gravity insieme a questo
        // senza togliere prima la logica di speed — altrimenti integrate() raddoppia il moto.
        this.speed = 50;
        this.textureKey = textureKey;
        this.minX = null;
        this.maxX = null;
    }

    /**
     * Sets optional patrol bounds along the X axis.
     * @param {number|null} minX 
     * @param {number|null} maxX 
     */
    setPatrolBounds(minX, maxX) {
        this.minX = minX;
        this.maxX = maxX;
    }

    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        this.worldX += this.speed * dt;

        if (this.maxX !== null && this.worldX + this.width > this.maxX) {
            this.worldX = this.maxX - this.width;
            this.speed = -Math.abs(this.speed);
        }
        if (this.minX !== null && this.worldX < this.minX) {
            this.worldX = this.minX;
            this.speed = Math.abs(this.speed);
        }

        super.update(dt, input, engine);
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
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(wx, wy, this.width, this.height);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx, wy, this.width, this.height);
            ctx.restore();
        }
    }
}
