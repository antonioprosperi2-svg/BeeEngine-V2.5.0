import { BeeEngine, BeeEntity } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

class Box extends BeeEntity {
    constructor(x, y, color, label) {
        super(x, y, 72, 72);
        this.color = color;
        this.label = label;
        this.alpha = 1;
        this.transform.setPivot(36, 36);
    }

    draw(ctx) {
        ctx.save();
        this.applyWorldTransform(ctx);
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(this.label, 8, 24);
        ctx.restore();
    }
}

const a = new Box(80, 220, '#f0a202', 'to');
const b = new Box(80, 330, '#4a90e2', 'yoyo');
const c = new Box(80, 440, '#ef4444', 'tl');
c.alpha = 0.25;
c.scaleX = 0.4;
c.scaleY = 0.4;

let loops = 0;
let lastCall = '—';

function playCut() {
    gioco.tweens.kill(c);
    c.x = 80;
    c.y = 440;
    c.alpha = 0.25;
    c.scaleX = 0.4;
    c.scaleY = 0.4;
    c.rotation = 0;
    gioco.timeline()
        .to(c, { scaleX: 1, scaleY: 1, alpha: 1 }, { duration: 0.45, ease: 'backOut' })
        .to(c, { x: 620 }, { duration: 0.55, ease: 'quadOut' })
        .wait(0.12)
        .to(c, { rotationDegrees: 360, y: 400 }, { duration: 0.4, ease: 'sineInOut' })
        .call(() => { lastCall = 'timeline ok'; })
        .to(c, { alpha: 0.35 }, { duration: 0.25, ease: 'quadIn' })
        .start();
}

gioco.to(a, { x: 640 }, { duration: 1.4, ease: 'quadInOut', repeat: Infinity, yoyo: true });
gioco.to(b, { x: 640, rotationDegrees: 180 }, { duration: 0.9, ease: 'bounceOut', repeat: Infinity, yoyo: true });
playCut();
gioco.every(2.8, () => {
    loops += 1;
    playCut();
});

const scene = {
    entities: [a, b, c],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeTween + BeeTimeline — proprietà, non cooldown', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(
            `tweens ${gioco.tweens.size}   cut #${loops}   ${lastCall}   pausa ferma lo scalato`,
            24,
            58
        );
        ctx.fillText('Click = replay timeline sul rosso. F2 Ladybug.', 24, 80);
    }
};

gioco.scenes.add('tween', scene);
gioco.scenes.change('tween');
gioco.enableLadybug();
gioco.start();

gioco.canvas.addEventListener('pointerdown', () => {
    playCut();
});

function bindControls() {
    const pauseBtn = document.getElementById('btnPause');
    const resumeBtn = document.getElementById('btnResume');
    const slowBtn = document.getElementById('btnSlow');
    const normalBtn = document.getElementById('btnNormal');
    const fastBtn = document.getElementById('btnFast');
    const ladybugBtn = document.getElementById('btnLadybug');

    if (pauseBtn) pauseBtn.addEventListener('click', () => gioco.pause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => gioco.resume());
    if (slowBtn) slowBtn.addEventListener('click', () => gioco.debug.applySlowMo());
    if (normalBtn) normalBtn.addEventListener('click', () => gioco.debug.restoreRealtime());
    if (fastBtn) fastBtn.addEventListener('click', () => gioco.setTimeScale(2));
    if (ladybugBtn) ladybugBtn.addEventListener('click', () => gioco.debug.toggle());
}

bindControls();
