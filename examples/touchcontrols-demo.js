import { BeeEngine, BeeEntity } from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

// enableTouchControls() crea BeeTouchControls (croce + azione).
// enableJoystick() crea invece BeeJoystick: sono due controlli diversi.
const controls = gioco.enableTouchControls();
window.controls = controls;

const GROUND = 300;
const hero = new BeeEntity(376, GROUND, 48, 48);
let vy = 0;
let jumps = 0;

hero.draw = function drawHero(ctx) {
    ctx.fillStyle = vy !== 0 || this.worldY < GROUND ? '#7dd3fc' : '#ffcc00';
    ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
};
hero.update = function moveHero(dt, input) {
    if (!input) return;
    if (input.isPressed('ArrowLeft')) this.worldX -= 200 * dt;
    if (input.isPressed('ArrowRight')) this.worldX += 200 * dt;
    if (input.isPressed('ArrowUp')) this.worldY -= 200 * dt;
    if (input.isPressed('ArrowDown')) this.worldY += 200 * dt;

    // 'Space' è la stessa chiave che leggono BeePlayer e BeeMenuScene.
    if (input.wasPressed('Space') && this.worldY >= GROUND) {
        vy = -420;
        jumps += 1;
    }
    if (vy !== 0 || this.worldY < GROUND) {
        vy += 1200 * dt;
        this.worldY += vy * dt;
        if (this.worldY >= GROUND) {
            this.worldY = GROUND;
            vy = 0;
        }
    }
    this.worldX = Math.max(0, Math.min(800 - this.width, this.worldX));
};

const scene = {
    entities: [hero],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, GROUND + 48, 800, 4);
    },

    draw(ctx) {
        const input = gioco.input;
        const held = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].filter((k) => input.isPressed(k));
        ctx.fillStyle = '#ffe08a';
        ctx.font = '18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(held.length ? `tasti: ${held.join(' ')}` : 'tasti: nessuno', 24, 24);
        ctx.fillText(`dita sui pulsanti: ${Object.keys(controls.activeTouches).length} · salti: ${jumps}`, 24, 50);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
