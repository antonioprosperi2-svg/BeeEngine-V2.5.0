import { BeeEngine, BeeEntity, BeeSprite } from '../BeeEngine.js';

const FRAME = 48;
const COLS = 4;
const ROWS = 2;

function makeSheet() {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME * COLS;
    canvas.height = FRAME * ROWS;
    const ctx = canvas.getContext('2d');
    const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185', '#facc15', '#34d399'];
    for (let i = 0; i < COLS * ROWS; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        ctx.fillStyle = colors[i];
        ctx.fillRect(col * FRAME, row * FRAME, FRAME, FRAME);
        ctx.fillStyle = '#111';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), col * FRAME + FRAME / 2, row * FRAME + FRAME / 2);
    }
    return canvas;
}

class SheetActor extends BeeEntity {
    constructor(x, y, sprite) {
        super(x, y, FRAME, FRAME);
        this.sprite = sprite;
    }

    draw(ctx) {
        this.sprite.draw(ctx, this.worldX, this.worldY);
    }
}

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const sheet = makeSheet();
const rowSprite = new BeeSprite(sheet, FRAME, FRAME, COLS);
const gridSprite = new BeeSprite(sheet, FRAME, FRAME, COLS, 8, COLS * ROWS);

const scene = {
    entities: [
        new SheetActor(180, 140, rowSprite),
        new SheetActor(180, 300, gridSprite)
    ],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        ctx.fillStyle = '#ffe08a';
        ctx.font = '16px monospace';
        ctx.fillText('una riga  ·  frameCount = 4', 250, 168);
        ctx.fillText('due righe  ·  frameCount = 8', 250, 328);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
