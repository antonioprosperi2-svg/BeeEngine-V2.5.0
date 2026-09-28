import { BeePlatform } from '../src/gameplay/BeePlatform.js';
import { BeeEntity } from '../src/core/BeeEntity.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function fakeCtx() {
    const calls = { save: 0, restore: 0, drawImage: 0 };
    return {
        calls,
        fillStyle: '#111',
        strokeStyle: '#111',
        lineWidth: 1,
        save() { calls.save += 1; },
        restore() { calls.restore += 1; },
        fillRect() {},
        strokeRect() {},
        drawImage() { calls.drawImage += 1; }
    };
}

{
    const p = new BeePlatform(0, 520, 80, 16, '#ffd700', 'brick');
    const ctx = fakeCtx();
    p.draw(ctx, {});
    assert(ctx.calls.save === 1 && ctx.calls.restore === 1, 'draw save/restore anche senza getAsset');
    assert(ctx.calls.drawImage === 0, 'senza getAsset non esplode e resta il rettangolo');
}

{
    const img = { width: 8, height: 8 };
    const p = new BeePlatform(0, 0, 40, 12, '#ff0', 'ok');
    const ctx = fakeCtx();
    p.draw(ctx, { getAsset: (key) => key === 'ok' ? img : null });
    assert(ctx.calls.drawImage === 1, 'texture via getAsset');
    assert(ctx.calls.save === 1 && ctx.calls.restore === 1, 'save/restore anche con texture');
}

{
    const ground = new BeePlatform(0, 100, 200, 20);
    const mover = new BeeEntity(40, 80, 24, 24);
    mover.vy = 80;
    mover.worldY = 90;
    const hit = mover.resolvePlatformCollision(ground);
    assert(hit === true && mover.isGrounded === true, 'solidità sul mover, non sulla piattaforma');
    assert(mover.worldY === 100 - 24, 'atterra sopra la piattaforma');
}

console.log('BeePlatform tests ok');
