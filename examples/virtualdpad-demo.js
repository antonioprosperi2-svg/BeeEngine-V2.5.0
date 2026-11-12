import { BeeEngine, BeeEntity, BeeVirtualDPad } from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const pad = new BeeVirtualDPad({
    canvas: gioco.canvas,
    x: 150,
    y: 340,
    size: 160,
    eightWay: false
});
window.pad = pad;

const hero = new BeeEntity(376, 200, 48, 48);
hero.draw = function drawHero(ctx) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
};
hero.update = function moveHero(dt) {
    // Il pad si legge ogni frame: nessun evento da ascoltare.
    const s = pad.state;
    if (s.left) this.worldX -= 220 * dt;
    if (s.right) this.worldX += 220 * dt;
    if (s.up) this.worldY -= 220 * dt;
    if (s.down) this.worldY += 220 * dt;
    this.worldX = Math.max(0, Math.min(800 - this.width, this.worldX));
    this.worldY = Math.max(0, Math.min(480 - this.height, this.worldY));
};

const scene = {
    entities: [hero],

    update(_dt, input) {
        if (input && input.wasPressed('KeyT')) pad.eightWay = !pad.eightWay;
    },

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        pad.render(ctx);

        const s = pad.state;
        const names = ['up', 'down', 'left', 'right'].filter((k) => s[k]);
        ctx.fillStyle = '#ffe08a';
        ctx.font = '18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`modo: ${pad.eightWay ? '8 direzioni' : '4 direzioni'} (T cambia)`, 24, 24);
        ctx.fillText(`dito sul pad: ${pad.isPressed ? 'sì' : 'no'} · direzioni: ${names.length ? names.join(' + ') : 'nessuna'}`, 24, 50);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
