import { BeeEngine, BeeEntity, BeeTouchButton } from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const jump = new BeeTouchButton({
    canvas: gioco.canvas,
    x: 700,
    y: 390,
    radius: 36,
    label: 'A'
});
window.jump = jump;

const hero = new BeeEntity(180, 340, 48, 48);
let vy = 0;
hero.draw = function drawHero(ctx) {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
};
hero.update = function jumpHero(dt) {
    if (jump.isPressed && this.worldY >= 340) vy = -420;
    vy += 1400 * dt;
    this.worldY += vy * dt;
    if (this.worldY > 340) {
        this.worldY = 340;
        vy = 0;
    }
};

const scene = {
    entities: [hero],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
        ctx.fillStyle = '#2a3142';
        ctx.fillRect(0, 388, 800, 92);
    },

    draw(ctx) {
        jump.render(ctx);
        ctx.fillStyle = '#ffe08a';
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(jump.isPressed ? 'premuto' : 'rilasciato', 24, 24);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
