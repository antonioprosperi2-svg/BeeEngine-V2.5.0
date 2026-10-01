import {
    BeeEngine,
    BeePlayer,
    BeePlatform,
    BeeText
} from '../BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600);
window.game = gioco;
window.gioco = gioco;

const scene = {
    entities: [],
    player: null,

    enter() {
        this.player = new BeePlayer(80, 400, 40, 40);
        this.player.setMode('platformer');

        const ground = new BeePlatform(0, 520, 800, 80);
        const a = new BeePlatform(180, 400, 180, 20);
        const b = new BeePlatform(420, 280, 180, 20);
        const c = new BeePlatform(620, 160, 140, 20);

        this.entities = [ground, a, b, c, this.player];

        gioco.collisions.clear();
        gioco.collisions.setGroup('solids', [ground, a, b, c]);
        gioco.collisions.setGroup('player', [this.player]);
        gioco.collisions.solid('player', 'solids');
    },

    update(_dt, input) {
        if (input && input.wasPressed('KeyF')) {
            this.player.setMode(this.player.mode === 'free' ? 'platformer' : 'free');
        }
        gioco.collisions.run();
    },

    lateUpdate() {
        if (this.player && this.player.consumeAttack()) {
            this.player.addScore(10);
        }
    },

    drawWorld(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },

    draw(ctx) {
        const p = this.player;
        BeeText.drawHUD(ctx, p?.score || 0, p?.lives || 3, `PLAYER  ${p?.mode || ''}  g=${p?.gravity ?? 0}`);
        ctx.fillStyle = '#ffd700';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
            'WASD/frecce  spazio=salta  F=free/platformer  X=attacco',
            20,
            ctx.canvas.height - 16
        );
    }
};

gioco.scenes.add('player', scene);
gioco.scenes.change('player');
gioco.start();
