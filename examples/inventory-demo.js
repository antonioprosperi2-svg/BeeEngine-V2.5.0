import { BeeEngine, BeeCollectible, BeeEntity } from '../BeeEngine.js';
import { BeeInventory, BeeLocale } from '../src/plugins/index.js';

const gioco = new BeeEngine('testCanvas', 800, 480);
window.gioco = gioco;

const locale = new BeeLocale({
    language: 'it',
    fallback: 'en',
    strings: {
        it: { coin: 'Monete', gem: 'Gemme', full: 'Zaino pieno' },
        en: { coin: 'Coins', gem: 'Gems', full: 'Bag full' }
    },
    engine: gioco
});

const inventory = new BeeInventory({
    slots: 6,
    engine: gioco
});
inventory.defineItem('coin', { name: 'Moneta', maxStack: 20 });
inventory.defineItem('gem', { name: 'Gemma', maxStack: 5 });

let notice = '';

const COLORS = { coin: '#f0c14a', gem: '#67e8f9' };

function spawn(kind) {
    const drop = new BeeCollectible(800, 480, null, 18, 18, 1, (item) => {
        const res = inventory.add(item.kind, 1);
        notice = res.left > 0 ? locale.t('full') : '';
        spawn(item.kind);
    });
    drop.kind = kind;
    drop.draw = function drawDrop(ctx) {
        ctx.fillStyle = COLORS[this.kind] || '#fff';
        ctx.beginPath();
        ctx.arc(this.worldX + 9, this.worldY + 9, 8, 0, Math.PI * 2);
        ctx.fill();
    };
    scene.entities.push(drop);
    return drop;
}

const hero = new BeeEntity(360, 430, 72, 18);
hero.draw = function drawHero(ctx) {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
};

const scene = {
    entities: [hero],

    update(dt, input) {
        const keys = input ? input.keys : {};
        if (keys.ArrowLeft || keys.KeyA) hero.worldX -= 280 * dt;
        if (keys.ArrowRight || keys.KeyD) hero.worldX += 280 * dt;
        if (hero.worldX < 0) hero.worldX = 0;
        if (hero.worldX > 800 - hero.width) hero.worldX = 800 - hero.width;
        if (input && input.wasPressed('KeyL')) {
            locale.setLanguage(locale.language === 'it' ? 'en' : 'it');
        }

        const list = this.entities;
        for (let i = 0; i < list.length; i++) {
            const drop = list[i];
            if (!drop || drop === hero || drop.destroyed) continue;
            if (hero.collidesWith(drop)) drop.collect(hero);
        }
    },

    drawWorld(ctx) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(0, 0, 800, 480);
    },

    draw(ctx) {
        ctx.fillStyle = '#ffe08a';
        ctx.font = '16px monospace';
        ctx.fillText(`${locale.t('coin')}  ${inventory.count('coin')}`, 16, 28);
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`${locale.t('gem')}  ${inventory.count('gem')}`, 16, 52);
        if (notice) {
            ctx.fillStyle = '#fb7185';
            ctx.fillText(notice, 16, 76);
        }
    }
};

spawn('coin');
spawn('coin');
spawn('gem');
spawn('gem');

gioco.scenes.add('play', scene);
gioco.scenes.change('play');
gioco.start();
