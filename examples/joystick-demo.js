import { BeeEngine, BeeEntity } from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;
const joy = gioco.enableJoystick();
window.joy = joy;

const hero = new BeeEntity(376, 200, 48, 48);
hero.draw = function drawHero(ctx) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
};
hero.update = function moveHero(dt, input) {
    if (!input) return;
    if (input.isPressed('ArrowLeft')) this.worldX -= 180 * dt;
    if (input.isPressed('ArrowRight')) this.worldX += 180 * dt;
    if (input.isPressed('ArrowUp')) this.worldY -= 180 * dt;
    if (input.isPressed('ArrowDown')) this.worldY += 180 * dt;
};

const scene = {
    entities: [hero],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        const names = [];
        if (gioco.input.isPressed('ArrowLeft')) names.push('sinistra');
        if (gioco.input.isPressed('ArrowRight')) names.push('destra');
        if (gioco.input.isPressed('ArrowUp')) names.push('su');
        if (gioco.input.isPressed('ArrowDown')) names.push('giù');
        ctx.fillStyle = '#ffe08a';
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(names.length ? names.join(' ') : 'nessuna freccia', 24, 24);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
