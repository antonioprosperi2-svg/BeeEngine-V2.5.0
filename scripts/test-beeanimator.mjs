import { BeeAnimatedSprite } from '../src/graphics/BeeAnimatedSprite.js';
import { BeeAnimator } from '../src/graphics/BeeAnimator.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const sheet = {
    frameWidth: 8,
    frameHeight: 8,
    drawFrame() {}
};

const sprite = new BeeAnimatedSprite(sheet, {
    animations: {
        idle: { frames: [0, 1], fps: 10, loop: true },
        run: { frames: [2, 3], fps: 10, loop: true },
        attack: { frames: [4, 5], fps: 10, loop: false }
    }
});

const ctx = { moving: false, attack: false };
const animator = new BeeAnimator(sprite)
    .add('idle', { clip: 'idle', initial: true })
    .add('run', { clip: 'run', priority: 1 })
    .add('attack', {
        clip: 'attack',
        loop: false,
        lock: true,
        priority: 10,
        exitTo: 'idle',
        onEnter: () => { ctx.attack = false; }
    })
    .when('idle', 'run', (c) => c.moving)
    .when('run', 'idle', (c) => !c.moving)
    .when('*', 'attack', (c) => c.attack)
    .start();

assert(animator.current === 'idle', 'start idle');
assert(sprite.clip === 'idle', 'sprite idle');

ctx.moving = true;
animator.update(0.05, ctx);
assert(animator.current === 'run', 'idle → run');

ctx.attack = true;
animator.update(0.05, ctx);
assert(animator.current === 'attack', 'run → attack');
assert(animator.locked === true, 'attack locked');
assert(ctx.attack === false, 'onEnter consumed attack');

ctx.moving = true;
animator.update(0.05, ctx);
assert(animator.current === 'attack', 'lock holds run');

for (let i = 0; i < 12; i++) {
    animator.update(0.1, ctx);
}
assert(animator.current === 'idle' || animator.current === 'run', 'exit after clip ' + animator.current);
assert(animator.locked === false, 'unlocked');

ctx.moving = true;
animator.update(0.05, ctx);
assert(animator.current === 'run', 'back to run');

animator.set('attack');
assert(animator.current === 'attack', 'manual set');
animator.set('run');
assert(animator.current === 'attack' && animator.queued === 'run', 'low priority queued');
animator.set('run', { force: true });
assert(animator.current === 'run', 'force breaks lock');

{
    const hurtSprite = new BeeAnimatedSprite(sheet, {
        animations: {
            attack: { frames: [4, 5, 6, 7], fps: 10, loop: false },
            hurt: { frames: [0, 1], fps: 10, loop: false }
        }
    });
    const hurtCtx = { stun: false };
    const hurtAnim = new BeeAnimator(hurtSprite)
        .add('attack', { clip: 'attack', loop: false, lock: true, initial: true })
        .add('hurt', { clip: 'hurt', lock: true, priority: 10 })
        .when('*', 'hurt', (c) => c.stun, { priority: 10 })
        .start();
    assert(hurtAnim.current === 'attack' && hurtAnim.locked === true, 'lock attivo');
    hurtCtx.stun = true;
    hurtAnim.update(0.05, hurtCtx);
    assert(hurtAnim.current === 'hurt', 'when priority 10 interrompe il lock');
}

{
    let completeCalls = 0;
    const doneSprite = {
        finished: true,
        play() { return true; },
        update() {}
    };
    const once = new BeeAnimator(doneSprite)
        .add('slash', { clip: 'slash', loop: false, onComplete: () => { completeCalls += 1; } })
        .start();
    for (let i = 0; i < 5; i++) once.update(0.1, {});
    assert(completeCalls === 1, `onComplete one-shot, ottenuto ${completeCalls}`);
}

{
    const warns = [];
    const orig = console.warn;
    console.warn = (msg) => { warns.push(String(msg)); };
    try {
        const orphan = new BeeAnimator(null)
            .add('stuck', { lock: true, initial: true })
            .start();
        orphan.update(0.1, {});
        orphan.update(0.1, {});
    } finally {
        console.warn = orig;
    }
    assert(
        warns.some((m) => m.includes('lock:true') && m.includes('sprite')),
        'lock senza sprite avvisa'
    );
    assert(warns.length === 1, 'warning una volta sola');
}

console.log('BeeAnimator tests ok');
