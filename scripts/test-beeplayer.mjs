import { BeePlayer } from '../src/gameplay/BeePlayer.js';
import { BeePrefab } from '../src/core/BeePrefab.js';
import { BeeSceneManager } from '../src/core/BeeSceneManager.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function nearly(a, b, eps = 1e-4) {
    return Math.abs(a - b) <= eps;
}

function press(held = [], tapped = []) {
    const h = new Set(held);
    const t = new Set(tapped);
    return {
        isPressed: (key) => h.has(key),
        wasPressed: (key) => t.has(key)
    };
}

function fakeCtx() {
    const calls = { save: 0, restore: 0, drawImage: 0 };
    return {
        calls,
        save() { calls.save += 1; },
        restore() { calls.restore += 1; },
        fillRect() {},
        strokeRect() {},
        drawImage() { calls.drawImage += 1; }
    };
}

{
    const p = new BeePlayer(0, 0, 40, 40);
    p.vy = 10;
    const y0 = p.worldY;
    p.update(0.2, null, null);
    assert(p.vy > 10, 'senza input la gravità continua');
    assert(p.worldY > y0, 'senza input integrate gira comunque');
}

{
    const p = new BeePlayer(0, 100, 40, 40);
    const x = p.worldX;
    const y = p.worldY;
    p.active = false;
    p.update(1, press(['ArrowRight']), null);
    assert(p.worldX === x && p.worldY === y, 'inactive non si muove');
    p.active = true;
    p.destroyed = true;
    p.update(1, press(['ArrowRight']), null);
    assert(p.worldX === x && p.worldY === y, 'destroyed non si muove');
}

{
    const p = new BeePlayer(0, 0);
    assert(p.mode === 'platformer' && p.gravity === 500, 'default platformer via setMode');
    p.setMode('free');
    assert(p.mode === 'free' && p.gravity === 0, 'free: gravità zero');
    p.setMode('platformer');
    assert(p.gravity === 500, 'platformer: gravità 500');
}

{
    const p = new BeePlayer(0, 0);
    p.wantsAttack = true;
    assert(p.consumeAttack() === true, 'consume legge');
    assert(p.wantsAttack === false, 'consume resetta');
    assert(p.consumeAttack() === false, 'secondo consume è false');
    p.update(0.016, press([], ['KeyX']), null);
    assert(p.wantsAttack === true, 'X accende wantsAttack');
    assert(p.consumeAttack() === true && p.wantsAttack === false, 'scena/animator consuma');
}

{
    const p = new BeePlayer(0, 0);
    p.boostJump(80);
    assert(nearly(p.jumpForce, p.baseJumpForce - 80), 'boost permanente');
    p.boostJumpTemporary(200, 1000);
    assert(nearly(p.jumpForce, p.baseJumpForce - 200), 'temp copre il permanente');
    p._boost.update(1);
    assert(nearly(p.jumpForce, p.baseJumpForce - 80), 'scaduto il temp, resta il permanente');
}

{
    const p = new BeePlayer(0, 0, 40, 40, 'hero');
    const ctx = fakeCtx();
    p.draw(ctx, {});
    assert(ctx.calls.save === 1 && ctx.calls.restore === 1, 'draw save/restore senza getAsset');

    const tex = fakeCtx();
    p.draw(tex, { getAsset: () => ({ width: 8, height: 8 }) });
    assert(tex.calls.drawImage === 1 && tex.calls.save === 1 && tex.calls.restore === 1, 'draw save/restore con texture');
}

{
    const catalog = new BeePrefab();
    catalog.type('player', BeePlayer);
    catalog.define('flyer', { type: 'player', mode: 'free' });
    const flyer = catalog.spawn('flyer', { x: 0, y: 0, addToScene: false });
    assert(flyer.mode === 'free' && flyer.gravity === 0, 'prefab mode passa da setMode');

    catalog.define('flyer-g', { type: 'player', gravity: 500, mode: 'free' });
    const g = catalog.spawn('flyer-g', { x: 0, y: 0, addToScene: false });
    assert(g.mode === 'free' && g.gravity === 0, 'setMode vince su gravity nella stessa ricetta');
}

{
    const order = [];
    const engine = { ctx: {}, currentScene: null, input: null };
    const scenes = new BeeSceneManager(engine);
    const actor = {
        destroyed: false,
        active: true,
        update() { order.push('entity'); }
    };
    scenes.add('s', {
        entities: [actor],
        update() { order.push('update'); },
        lateUpdate() { order.push('late'); }
    });
    scenes.change('s');
    scenes.update(0.016, {});
    assert(order.join(',') === 'update,entity,late', 'lateUpdate dopo le entity, stesso frame');
}

console.log('BeePlayer tests ok');
