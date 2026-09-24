import { BeeCollectible } from '../src/gameplay/BeeCollectible.js';
import { BeeEntity } from '../src/core/BeeEntity.js';
import { BeePool } from '../src/core/BeePool.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function nearly(a, b, eps = 1e-6) {
    return Math.abs(a - b) <= eps;
}

{
    const item = new BeeCollectible(800, 600);
    assert(item.gravity === 0 && item.vx === 0 && item.vy === 0, 'moto manuale: integrate spento');
    assert(item.worldY === -item.height, 'reset: spawn sopra lo schermo in mondo');
    assert(item.worldX >= 0 && item.worldX <= 800 - item.width, 'reset: worldX in canvas');
    assert(item.speed >= 100 && item.speed <= 250, 'reset: speed random');
}

{
    const item = new BeeCollectible(400, 300, null, 20, 20, 5);
    item.worldY = 10;
    item.speed = 100;
    item.update(0.2, null, null);
    assert(nearly(item.worldY, 30), `cade in worldY, ottenuto ${item.worldY}`);
}

{
    const hub = new BeeEntity(0, 200, 10, 10);
    const item = new BeeCollectible(800, 600);
    hub.addChild(item);
    item.reset();
    assert(nearly(item.worldY, -item.height), 'reset con parent: worldY, non locale');
    assert(item.y !== item.worldY, 'con parent locale e mondo differiscono');

    item.speed = 120;
    const y0 = item.worldY;
    item.update(0.5, null, null);
    assert(nearly(item.worldY, y0 + 60), `parent: cade in mondo, ottenuto ${item.worldY}`);
}

{
    const item = new BeeCollectible(200, 100, null, 16, 16);
    item.worldY = 40;
    item.speed = 80;
    item.active = false;
    item.update(1, null, null);
    assert(nearly(item.worldY, 40), 'inactive non cade e non resetta');

    item.active = true;
    item.destroyed = true;
    item.update(1, null, null);
    assert(nearly(item.worldY, 40), 'destroyed non cade e non resetta');
}

{
    const item = new BeeCollectible(80, 50, null, 10, 10);
    item.worldY = 49;
    item.speed = 20;
    item.update(1, null, null);
    assert(nearly(item.worldY, -item.height), 'sotto lo schermo: reset in cima');
}

{
    let seen = null;
    const item = new BeeCollectible(800, 600, null, 20, 20, 7, (it, who) => {
        seen = { it, who, value: it.value };
    });
    const player = { id: 'p1' };
    item.collect(player);
    assert(seen && seen.it === item && seen.who === player && seen.value === 7, 'collect notifica');
    assert(item.destroyed === true && item.active === false, 'collect distrugge');

    seen = null;
    item.collect(player);
    assert(seen === null, 'collect su destroyed è no-op');
}

{
    const item = new BeeCollectible(800, 600, null, 20, 20, 1, () => {
        throw new Error('onCollect non deve partire se inactive');
    });
    item.active = false;
    item.collect({});
    assert(item.destroyed === false, 'collect inactive non distrugge');
}

{
    const pool = new BeePool({
        create: () => new BeeCollectible(800, 600),
        initial: 1,
        max: 2
    });
    const item = pool.acquire();
    assert(item.active && !item.destroyed, 'acquire sveglia');
    let hits = 0;
    item.onCollect = () => { hits += 1; };
    item.collect({});
    assert(hits === 1, 'collect su pooled notifica');
    assert(pool.inUse === 0, 'collect -> destroy -> release');
}

{
    const item = new BeeCollectible(800, 600);
    item.worldY = 0;
    item.speed = 100;
    item.gravity = 0;
    item.vy = 0;
    item.update(0.1, null, null);
    assert(nearly(item.worldY, 10), 'niente doppio moto: solo speed, non integrate');
}

console.log('BeeCollectible tests ok');
