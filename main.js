import { BeeEngine, BEE_BUS } from './BeeEngine.js';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600, 100);
window.gioco = gioco;

let musicOn = false;
let lastPan = 0;
let lastVol = 1;
let ducks = 0;

function startMusic() {
    gioco.audio.unlock();
    if (musicOn && gioco.audio.voices > 0) return;
    musicOn = true;
    gioco.audio.tone({
        frequency: 196,
        duration: 8,
        type: 'sine',
        bus: BEE_BUS.MUSIC,
        volume: 0.18,
        loop: false
    });
    gioco.audio.tone({
        frequency: 247,
        duration: 8,
        type: 'sine',
        bus: BEE_BUS.MUSIC,
        volume: 0.12
    });
    gioco.every(7.5, () => {
        if (!musicOn) return;
        gioco.audio.tone({ frequency: 196, duration: 8, type: 'sine', bus: BEE_BUS.MUSIC, volume: 0.18 });
        gioco.audio.tone({ frequency: 247, duration: 8, type: 'sine', bus: BEE_BUS.MUSIC, volume: 0.12 });
    }, { unscaled: true });
}

function blip(x, y) {
    gioco.audio.unlock();
    const mix = gioco.audio;
    mix.listen(400, 300);
    const voice = mix.tone({
        frequency: 520 + (x / 800) * 280,
        duration: 0.16,
        type: 'square',
        bus: BEE_BUS.SFX,
        volume: 0.22,
        x,
        y
    });
    const spatial = {
        volume: Math.max(0, 1 - Math.hypot(x - 400, y - 300) / mix.maxDistance),
        pan: Math.max(-1, Math.min(1, (x - 400) / mix.panWidth))
    };
    lastPan = spatial.pan;
    lastVol = spatial.volume;
    return voice;
}

function talk() {
    gioco.audio.unlock();
    ducks += 1;
    gioco.audio.tone({
        frequency: 170,
        duration: 1.15,
        type: 'triangle',
        bus: BEE_BUS.VOICE,
        volume: 0.35
    });
}

const scene = {
    entities: [],

    draw(ctx) {
        ctx.fillStyle = '#0d1020';
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = '#1a1f33';
        ctx.beginPath();
        ctx.arc(400, 300, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe08a';
        ctx.font = '12px monospace';
        ctx.fillText('listener', 372, 268);

        const buses = ['master', 'music', 'sfx', 'voice'];
        for (let i = 0; i < buses.length; i++) {
            const name = buses[i];
            const v = gioco.audio.outputVolume(name);
            const y = 430 + i * 32;
            ctx.fillStyle = '#1a1f33';
            ctx.fillRect(80, y, 640, 18);
            ctx.fillStyle = name === 'voice' ? '#ef4444' : name === 'music' ? '#4a90e2' : '#f0a202';
            ctx.fillRect(80, y, 640 * v, 18);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '13px monospace';
            ctx.fillText(`${name}  ${v.toFixed(2)}`, 80, y - 4);
        }

        ctx.fillStyle = '#ffe08a';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('BeeAudioMixer — bus, duck, pan 2D', 24, 36);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#c8c8c8';
        ctx.fillText(
            `voices ${gioco.audio.voices}   pan ${lastPan.toFixed(2)}   dist vol ${lastVol.toFixed(2)}   dialoghi ${ducks}`,
            24,
            58
        );
        ctx.fillText('Click = SFX spaziale. V = voce (duck musica). 🔊 o M = drone. F2 Ladybug.', 24, 80);
    }
};

gioco.scenes.add('audio', scene);
gioco.scenes.change('audio');
gioco.enableLadybug();
gioco.start();

gioco.canvas.addEventListener('pointerdown', (event) => {
    const pos = gioco.input.getCanvasPosition(event.clientX, event.clientY);
    startMusic();
    blip(pos.x, pos.y);
});

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyV') talk();
    if (event.code === 'KeyM') startMusic();
});

function bindControls() {
    const pauseBtn = document.getElementById('btnPause');
    const resumeBtn = document.getElementById('btnResume');
    const slowBtn = document.getElementById('btnSlow');
    const normalBtn = document.getElementById('btnNormal');
    const fastBtn = document.getElementById('btnFast');
    const ladybugBtn = document.getElementById('btnLadybug');
    const audioBtn = document.getElementById('btnAudio');

    if (pauseBtn) pauseBtn.addEventListener('click', () => gioco.pause());
    if (resumeBtn) resumeBtn.addEventListener('click', () => gioco.resume());
    if (slowBtn) slowBtn.addEventListener('click', () => gioco.debug.applySlowMo());
    if (normalBtn) normalBtn.addEventListener('click', () => gioco.debug.restoreRealtime());
    if (fastBtn) fastBtn.addEventListener('click', () => gioco.setTimeScale(2));
    if (ladybugBtn) ladybugBtn.addEventListener('click', () => gioco.debug.toggle());
    if (audioBtn) audioBtn.addEventListener('click', () => startMusic());
}

bindControls();
