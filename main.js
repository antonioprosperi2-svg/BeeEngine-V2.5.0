import {
    BeeEngine,
    BeeEntity,
    BeeCamera,
    BeeStack,
    BeeLabel,
    BeeUIButton,
    BEE_ANCHOR,
    BEE_DRAW
} from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
gioco.camera = new BeeCamera(800, 600);
gioco.camera.setBounds(0, 0, 1600, 900);
window.gioco = gioco;

function makeSliceSkin() {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(0, 0, 24, 24);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, 4, 16, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 6, 12, 12);
    return canvas;
}

class Mover extends BeeEntity {
    constructor(x, y, color) {
        super(x, y, 36, 36);
        this.color = color;
        this.speed = 70;
        this.drawLayer = BEE_DRAW.YSORT;
        this.originX = x;
    }

    update(dt) {
        this.x += this.speed * dt;
        if (this.x > this.originX + 240) this.speed = -Math.abs(this.speed);
        if (this.x < this.originX - 20) this.speed = Math.abs(this.speed);
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
    }
}

const hero = new Mover(260, 380, '#f0a202');
let score = 0;
const hudScore = new BeeLabel({
    text: 'SCORE 000000',
    anchor: BEE_ANCHOR.TOP_LEFT,
    x: 16,
    y: 16,
    width: 220,
    height: 28,
    color: '#ffe08a',
    font: 'bold 16px monospace'
});
const hudHint = new BeeLabel({
    text: 'P menu   Tab focus',
    anchor: BEE_ANCHOR.TOP_RIGHT,
    x: 16,
    y: 16,
    width: 220,
    height: 28,
    align: 'right',
    color: '#cbd5e1',
    font: '13px monospace'
});
const dock = new BeeLabel({
    text: 'HUD in spazio schermo — la camera scorre, questo no',
    anchor: BEE_ANCHOR.BOTTOM,
    y: 8,
    height: 28,
    margin: 16,
    color: '#94a3b8',
    font: '13px monospace'
});

const menu = new BeeStack({
    name: 'pause',
    anchor: BEE_ANCHOR.CENTER,
    padding: 18,
    gap: 10,
    image: makeSliceSkin(),
    slice: { left: 8, top: 8, right: 8, bottom: 8 }
});
menu.visible = false;
menu.add(new BeeLabel({
    text: 'PAUSA',
    width: 240,
    height: 28,
    align: 'center',
    color: '#ffe08a',
    font: 'bold 20px monospace'
}));
menu.add(new BeeUIButton({
    text: 'Riprendi',
    onClick: () => {
        menu.visible = false;
        gioco.resume();
        gioco.ui.markDirty();
    }
}));
menu.add(new BeeUIButton({
    text: 'Lento 0.25x',
    onClick: () => gioco.setTimeScale(0.25)
}));
menu.add(new BeeUIButton({
    text: 'Normale 1x',
    onClick: () => gioco.setTimeScale(1)
}));

gioco.ui.add(hudScore);
gioco.ui.add(hudHint);
gioco.ui.add(dock);
gioco.ui.add(menu);

const scene = {
    entities: [
        new Mover(120, 520, '#7dd3fc'),
        hero,
        new Mover(480, 300, '#fb7185')
    ],

    update() {
        score += 1;
        hudScore.text = 'SCORE ' + String(score).padStart(6, '0');
        gioco.camera.follow(hero, 0.08);
    },

    drawWorld(ctx, engine) {
        const cam = engine.camera;
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 600, 1600, 300);
    }
};

gioco.scenes.add('ui', scene);
gioco.scenes.change('ui');
gioco.start();

window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyP') return;
    menu.visible = !menu.visible;
    gioco.ui.markDirty();
    if (menu.visible) {
        gioco.pause();
        gioco.ui.focusAt(0);
    } else {
        gioco.resume();
    }
});

function bindControls() {
    const pauseBtn = document.getElementById('btnPause');
    const resumeBtn = document.getElementById('btnResume');
    const slowBtn = document.getElementById('btnSlow');
    const normalBtn = document.getElementById('btnNormal');
    const fastBtn = document.getElementById('btnFast');
    const ladybugBtn = document.getElementById('btnLadybug');
    const audioBtn = document.getElementById('btnAudio');

    if (pauseBtn) pauseBtn.addEventListener('click', () => {
        menu.visible = true;
        gioco.ui.markDirty();
        gioco.pause();
        gioco.ui.focusAt(0);
    });
    if (resumeBtn) resumeBtn.addEventListener('click', () => {
        menu.visible = false;
        gioco.ui.markDirty();
        gioco.resume();
    });
    if (slowBtn) slowBtn.addEventListener('click', () => gioco.debug.applySlowMo());
    if (normalBtn) normalBtn.addEventListener('click', () => gioco.debug.restoreRealtime());
    if (fastBtn) fastBtn.addEventListener('click', () => gioco.setTimeScale(2));
    if (ladybugBtn) ladybugBtn.addEventListener('click', () => gioco.debug.toggle());
    if (audioBtn) audioBtn.addEventListener('click', () => gioco.audio && gioco.audio.unlock());
}

bindControls();
