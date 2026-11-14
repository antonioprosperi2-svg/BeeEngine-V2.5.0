import { BeeEngine, BeeEntity } from '../BeeEngine.js';

const WORLD_W = 2400;
const WORLD_H = 480;
const gioco = new BeeEngine('testCanvas', 800, WORLD_H);
window.gioco = gioco;

const camera = gioco.createCamera(800, WORLD_H);
camera.setBounds(0, 0, WORLD_W, WORLD_H);

class Shooter extends BeeEntity {
    constructor() {
        super(160, 220, 28, 28);
        this.facing = 1;
    }

    update(dt, input, engine) {
        const speed = 240;
        this.vx = 0;
        this.vy = 0;
        if (input) {
            if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) {
                this.vx = -speed;
                this.facing = -1;
            } else if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) {
                this.vx = speed;
                this.facing = 1;
            }
            if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) this.vy = -speed;
            else if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) this.vy = speed;
            if (input.wasPressed('Space')) this.shoot(engine);
        }
        super.update(dt, input, engine);
        if (this.worldX < 0) this.worldX = 0;
        if (this.worldY < 0) this.worldY = 0;
        if (this.worldX > WORLD_W - this.width) this.worldX = WORLD_W - this.width;
        if (this.worldY > WORLD_H - this.height) this.worldY = WORLD_H - this.height;
    }

    shoot(engine) {
        const x = this.facing > 0 ? this.worldX + this.width : this.worldX - 8;
        const y = this.worldY + this.height / 2 - 4;
        const bullet = engine.bullets.acquire(x, y, this.facing * 420, 0, 8, 8, null, 5);
        if (bullet) engine.addEntity(bullet);
    }

    draw(ctx) {
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
    }
}

const shooter = new Shooter();
camera.follow(shooter, 1);

const scene = {
    entities: [shooter],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x <= WORLD_W; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, WORLD_H);
            ctx.stroke();
        }

        // Dove il vecchio controllo (canvas.width) faceva morire i proiettili.
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(800.5, 0);
        ctx.lineTo(800.5, WORLD_H);
        ctx.stroke();
        ctx.fillStyle = '#b45309';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('canvas.width', 808, 12);
    },

    draw(ctx) {
        const view = camera.getViewBounds();
        ctx.fillStyle = '#ffe08a';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(
            `mondo ${Math.round(shooter.worldX)}, ${Math.round(shooter.worldY)}  ·  inquadratura x ${view.x}  ·  proiettili ${gioco.bullets.inUse}`,
            16,
            16
        );
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Frecce / WASD muovono · Spazio spara · oltre la linea arancio restano vivi', 16, 40);
    }
};

gioco.scenes.add('range', scene);
gioco.scenes.change('range');
gioco.start();
