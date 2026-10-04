import { BeeAnimatedSprite } from '../src/graphics/BeeAnimatedSprite.js';
import { BeeAnimator } from '../src/graphics/BeeAnimator.js';
import { BeeEntity } from '../src/core/BeeEntity.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const sheet = {
    frameWidth: 8,
    frameHeight: 8,
    drawFrame() {}
};

function makeSprite() {
    return new BeeAnimatedSprite(sheet, {
        animations: {
            idle: { frames: [0, 1, 2, 3, 4], fps: 10, loop: true },
            slash: { frames: [10, 11, 12], fps: 10, loop: false },
            empty: { frames: [], fps: 10, loop: true }
        }
    });
}

{
    const sprite = makeSprite();
    sprite.play('slash');
    for (let i = 0; i < 20; i++) sprite.update(0.1);
    assert(sprite.currentFrameIndex === 2, 'one-shot si ferma sull’ultimo frame');
    assert(sprite.finished === true, 'finished true');
    const idx = sprite.currentFrameIndex;
    sprite.update(1);
    assert(sprite.currentFrameIndex === idx && sprite.finished === true, 'one-shot finito non avanza');
}

{
    const sprite = makeSprite();
    sprite.play('idle');
    sprite.update(10);
    assert(sprite.currentFrameIndex === 1, `dt enorme: un frame per tick, ottenuto ${sprite.currentFrameIndex}`);
}

{
    const sprite = makeSprite();
    sprite.draw(null, 0, 0);
    sprite.play('empty');
    sprite.draw({
        save() { throw new Error('non deve arrivare a save se non ci sono frame'); },
        restore() {}
    }, 0, 0);
}

{
    const sprite = makeSprite();
    sprite.play('idle');
    const warns = [];
    const orig = console.warn;
    console.warn = (msg) => { warns.push(String(msg)); };
    let result;
    try {
        result = sprite.play('nope');
    } finally {
        console.warn = orig;
    }
    assert(result === false, 'play nome sbagliato ritorna false');
    assert(warns.some((m) => m.includes('nope')), 'play nome sbagliato avvisa');
    assert(sprite.clip === 'idle', 'clip invariato');
}

{
    const sprite = makeSprite();
    const actor = new BeeEntity(0, 0, 16, 16);
    actor.sprite = sprite;
    sprite.play('idle');
    actor.update(0.1, null, null);
    assert(sprite.currentFrameIndex === 1, 'senza animator BeeEntity ticka lo sprite');
}

{
    const sprite = new BeeAnimatedSprite(sheet, {
        animations: { poke: { frames: [0, 1, 2], fps: 10, loop: true } }
    });
    const animator = new BeeAnimator(sprite)
        .add('poke', { clip: 'poke', loop: false, initial: true })
        .start();
    for (let i = 0; i < 20; i++) animator.update(0.1, {});
    assert(sprite.finished === true, 'Animator passa loop:false allo sprite');
    assert(sprite.currentFrameIndex === 2, 'si ferma sull’ultimo anche se il clip sprite era loop');
}

console.log('BeeAnimatedSprite tests ok');
