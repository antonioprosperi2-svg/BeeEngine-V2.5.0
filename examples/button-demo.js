import { BeeEngine, BeeButton } from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

let clicks = 0;
const button = new BeeButton({
    x: 300,
    y: 200,
    width: 200,
    height: 56,
    text: 'Clicca',
    onClick(btn) {
        clicks += 1;
        btn.text = `Clic ${clicks}`;
    }
});

const scene = {
    entities: [button],

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    }
};

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
