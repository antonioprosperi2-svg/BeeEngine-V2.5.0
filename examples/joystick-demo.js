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
    if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) this.worldX -= 180 * dt;
    if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) this.worldX += 180 * dt;
    if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) this.worldY -= 180 * dt;
    if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) this.worldY += 180 * dt;
};

const scene = {
    entities: [hero],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        const names = [];
        if (gioco.input.isPressed('ArrowLeft') || gioco.input.isPressed('KeyA')) names.push('sinistra');
        if (gioco.input.isPressed('ArrowRight') || gioco.input.isPressed('KeyD')) names.push('destra');
        if (gioco.input.isPressed('ArrowUp') || gioco.input.isPressed('KeyW')) names.push('su');
        if (gioco.input.isPressed('ArrowDown') || gioco.input.isPressed('KeyS')) names.push('giù');
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
