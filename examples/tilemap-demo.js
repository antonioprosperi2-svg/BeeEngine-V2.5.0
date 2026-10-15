import { BeeEngine, BeeEntity, BeeTilemap } from '../BeeEngine.js';

const TILE = 64;
const map = new BeeTilemap({
    x: 200,
    y: 140,
    tiles: [
        [1, 1, 1, 1],
        [0, 0, 2, 0]
    ],
    tileSize: TILE,
    solidTiles: [2]
});

const body = new BeeEntity(200 + TILE + 16, 140 + TILE + 16, TILE * 2, TILE - 32);
body.collider = {
    x: body.worldX,
    y: body.worldY,
    width: body.width,
    height: body.height
};
body.draw = function drawBody(ctx) {
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.collider.x, this.collider.y, this.collider.width, this.collider.height);
};

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const scene = {
    entities: [map, body],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        const hit = map.entityCollides(body);
        ctx.fillStyle = '#ffe08a';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(hit ? 'collisione: sì  (angoli vuoti, centro solido)' : 'collisione: no', 24, 40);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
