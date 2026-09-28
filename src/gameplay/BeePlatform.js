import { BeeEntity } from '../core/BeeEntity.js';

/**
 * BeePlatform: sprite statico (rettangolo o texture) pensato per essere
 * registrato in un gruppo di collisione "solido" (es. collisions.solid('player', 'solids')).
 * La solidità (camminarci sopra, atterrarci) non è gestita qui: la fornisce
 * chi si muove, chiamando resolvePlatformCollision (su BeeEntity) contro questo gruppo.
 */
export class BeePlatform extends BeeEntity {
    constructor(x, y, width = 100, height = 20, color = '#ffd700', textureKey = null) {
        super(x, y, width, height);
        this.color = color;
        this.textureKey = textureKey;
    }

    draw(ctx, engine) {
        if (!ctx) return;
        ctx.save();

        const texture = (engine && this.textureKey && typeof engine.getAsset === 'function')
            ? engine.getAsset(this.textureKey)
            : null;
        const wx = this.worldX;
        const wy = this.worldY;
        if (texture) {
            ctx.drawImage(texture, wx, wy, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(wx, wy, this.width, this.height);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(wx, wy, this.width, 3);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx, wy, this.width, this.height);
        }

        ctx.restore();
    }
}
