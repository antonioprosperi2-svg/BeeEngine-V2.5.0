import { BeeEngine, BeeTilemapLoader } from '../BeeEngine.js';

const TILE = 48;
const COLS = 8;
const ROWS = 5;

function makeSheet() {
    const canvas = document.createElement('canvas');
    canvas.width = TILE * 2;
    canvas.height = TILE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(TILE, 0, TILE, TILE);
    return canvas;
}

function row(fill) {
    return Array.from({ length: COLS }, (_, x) => fill(x));
}

const ground = [];
const walls = [];
for (let y = 0; y < ROWS; y++) {
    ground.push(...row(() => 1));
    walls.push(...row((x) => (x === 0 || x === COLS - 1 || y === ROWS - 1 ? 2 : 0)));
}

const map = {
    width: COLS,
    height: ROWS,
    tilewidth: TILE,
    tileheight: TILE,
    tilesets: [{
        firstgid: 1,
        image: 'tiles.png',
        tilecount: 2,
        columns: 2,
        tilewidth: TILE,
        tileheight: TILE
    }],
    layers: [
        { name: 'ground', type: 'tilelayer', data: ground },
        { name: 'collision', type: 'tilelayer', data: walls }
    ]
};

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;
gioco.assets.images.set('tiles.png', makeSheet());

const loader = new BeeTilemapLoader(gioco);
loader.load(map);

const scene = {
    entities: [],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
        ctx.save();
        ctx.translate(80, 70);
        loader.render(ctx);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        const boxes = loader.getColliders();
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            ctx.strokeRect(box.x, box.y, box.width, box.height);
        }
        ctx.restore();
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
