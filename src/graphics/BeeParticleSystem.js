import { BeeEntity } from '../core/BeeEntity.js';
import { BeePool } from '../core/BeePool.js';

function createParticle() {
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: 'orange'
    };
}

/**
 * BeeParticleSystem — burst di particelle con pool, niente new/filter per frame.
 */
export class BeeParticleSystem extends BeeEntity {
    constructor({
        x = 0,
        y = 0,
        initial = 64,
        max = 512
    } = {}) {
        super(x, y);

        this.particles = [];
        this.#bounds = { x: 0, y: 0, width: 0, height: 0 };
        this.particlePool = new BeePool({
            create: createParticle,
            reset(particle, spec = {}) {
                particle.x = spec.x ?? 0;
                particle.y = spec.y ?? 0;
                particle.vx = spec.vx ?? 0;
                particle.vy = spec.vy ?? 0;
                particle.life = spec.life ?? 1;
                particle.maxLife = spec.maxLife ?? particle.life;
                particle.size = spec.size ?? 2;
                particle.color = spec.color ?? 'orange';
            },
            initial,
            max,
            reclaim: false
        });
    }

    #bounds;

    /**
     * Le particelle vivono in coordinate mondo, fuori dal 32×32 di BeeEntity.
     * Senza particelle il box ha lato 0: drawEntity non le scarta.
     */
    getWorldAABB() {
        const list = this.particles;
        const box = this.#bounds;
        if (!list || list.length === 0) {
            box.x = 0;
            box.y = 0;
            box.width = 0;
            box.height = 0;
            return box;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < list.length; i++) {
            const particle = list[i];
            const size = Number(particle.size);
            const radius = Number.isFinite(size) ? size : 0;
            const left = particle.x - radius;
            const right = particle.x + radius;
            const top = particle.y - radius;
            const bottom = particle.y + radius;
            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (top < minY) minY = top;
            if (bottom > maxY) maxY = bottom;
        }

        box.x = minX;
        box.y = minY;
        box.width = maxX - minX;
        box.height = maxY - minY;
        return box;
    }

    emit(count = 10, options = {}) {
        if (this.destroyed) return;
        const n = Number(count);
        if (!Number.isFinite(n) || n <= 0) return;

        const {
            speedMin = 30,
            speedMax = 120,
            lifeMin = 0.3,
            lifeMax = 1,
            sizeMin = 2,
            sizeMax = 6,
            color = 'orange'
        } = options;

        const originX = this.worldX;
        const originY = this.worldY;

        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedMin + Math.random() * (speedMax - speedMin);
            const life = lifeMin + Math.random() * (lifeMax - lifeMin);
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);
            const particle = this.particlePool.acquire({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                size,
                color
            });
            if (particle) this.particles.push(particle);
        }
    }

    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        const step = Number(dt);
        const move = Number.isFinite(step) && step > 0;
        const list = this.particles;
        let write = 0;
        for (let i = 0; i < list.length; i++) {
            const particle = list[i];
            if (move) particle.life -= step;
            if (particle.life <= 0) {
                this.particlePool.release(particle);
                continue;
            }
            if (move) {
                particle.x += particle.vx * step;
                particle.y += particle.vy * step;
            }
            list[write] = particle;
            write += 1;
        }
        list.length = write;

        super.update(dt, input, engine);
    }

    dispose() {
        this.particlePool.clear();
        this.particles.length = 0;
        super.dispose();
    }

    destroy() {
        this.particlePool.clear();
        this.particles.length = 0;
        super.destroy();
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const maxLife = particle.maxLife;
            ctx.globalAlpha = maxLife > 0 ? particle.life / maxLife : 0;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
