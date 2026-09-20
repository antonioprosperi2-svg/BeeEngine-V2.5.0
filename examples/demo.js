import {
    BeeEngine,
    BeePlayer,
    BeeEnemy,
    BeeEnemyShooter,
    BeeCollectible,
    BeePlatform,
    BeeText,
    BeeRectCollider
} from '../BeeEngine.js';

// 1. Initialize Engine on Canvas
const game = new BeeEngine('testCanvas', 800, 600);
game.enableAutoResize(800, 600);
window.game = game;

// 2. Define Game Scene
const mainScene = {
    entities: [],
    player: null,

    enter() {
        // Player setup
        this.player = new BeePlayer(100, 300, 40, 40);
        this.player.mode = 'platformer';

        // Platforms
        const ground = new BeePlatform(0, 520, 800, 80);
        const platform1 = new BeePlatform(200, 380, 200, 20);
        const platform2 = new BeePlatform(480, 260, 200, 20);

        // Enemies
        const enemy = new BeeEnemy(220, 348, 32, 32);
        enemy.setPatrolBounds(200, 380);

        const shooter = new BeeEnemyShooter(520, 220, 32, 32);

        // Collectibles
        const collectible = new BeeCollectible(800, 600);

        this.entities = [ground, platform1, platform2, enemy, shooter, collectible, this.player];

        // Collision setup
        game.collisions.clear();
        game.collisions.setGroup('solids', [ground, platform1, platform2]);
        game.collisions.setGroup('player', [this.player]);
        game.collisions.setGroup('hazards', [enemy, shooter]);

        game.collisions.solid('player', 'solids');
        game.collisions.overlap('player', 'hazards', (p, h) => {
            const isDead = p.takeDamage(1);
            if (isDead) {
                p.x = 100;
                p.y = 300;
                p.lives = 3;
            }
        });
    },

    update(_dt, _input) {
        game.collisions.run();
    },

    drawWorld(ctx, engine) {
        const cam = engine && engine.camera;
        const x = cam ? cam.x : 0;
        const y = cam ? cam.y : 0;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, ctx.canvas.width, ctx.canvas.height);
    },

    draw(ctx) {
        BeeText.drawHUD(ctx, this.player?.score || 0, this.player?.lives || 3, 'BEE ENGINE 2D DEMO');
        ctx.fillStyle = '#ffd700';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
            `${game.time.timeScale.toFixed(2)}x  game ${game.time.elapsed.toFixed(1)}s  real ${game.time.unscaledElapsed.toFixed(1)}s`,
            20,
            ctx.canvas.height - 16
        );
    }
};

game.scenes.add('main', mainScene);
game.scenes.change('main');
game.start();
