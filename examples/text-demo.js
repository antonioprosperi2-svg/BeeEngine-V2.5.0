import { BeeEngine, BeeText } from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const label = new BeeText('Etichetta', 24, 80, 'bold 20px Arial', '#ffe08a', 'left');

const scene = {
    entities: [label],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        BeeText.drawHUD(ctx, -3, 1.5, 'BEE TEXT');
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
