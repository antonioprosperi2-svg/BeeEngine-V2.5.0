import { BeeEnemyShooter } from '../src/gameplay/BeeEnemyShooter.js';
import { BeePool } from '../src/core/BeePool.js';
import { BeeCollisionSystem } from '../src/physics/BeeCollisionSystem.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function mockEngine(over = {}) {
    const collisions = over.collisions || new BeeCollisionSystem(null);
    collisions.createGroup('hazards');
    return {
        canvas: { width: 200, height: 150 },
        time: null,
        bullets: null,
        entities: [],
        addEntity(entity) {
            this.entities.push(entity);
            return entity;
        },
        collisions,
        ...over
    };
}

{
    const s = new BeeEnemyShooter(180, 40, 20, 20);
    assert(s.speed === 0, 'speed 0: niente patrol locale di BeeEnemy');
    s.vx = 80;
    s.vy = 0;
    s.worldX = 185;
    const engine = mockEngine();
    s.update(0.016, null, engine);
    assert(s.vx < 0, 'oltre il bordo: vx verso l’interno');
    assert(s.worldX + s.width <= engine.canvas.width + 1e-6, 'worldX clampato');

    const vx1 = s.vx;
    s.update(0.016, null, engine);
    assert(s.vx === vx1 && s.vx < 0, `niente jitter, vx=${s.vx}`);
}

{
    const s = new BeeEnemyShooter(10, 10, 20, 20);
    s.setBounds(10, 10, 80, 70);
    s.worldX = 4;
    s.vx = -50;
    s.update(0.016, null, mockEngine({ canvas: { width: 800, height: 600 } }));
    assert(s.worldX === 10, 'setBounds minX, non canvas');
    assert(s.vx > 0, 'rimbalzo sul bound esplicito');
}

{
    const s = new BeeEnemyShooter(50, 50, 20, 20);
    const engine = mockEngine();
    s.update(0, null, engine);
    const x = s.worldX;
    const y = s.worldY;
    const elapsed = s.fire.elapsed;
    s.active = false;
    s.update(1, null, engine);
    assert(s.worldX === x && s.worldY === y, 'inactive non si muove');
    assert(s.fire.elapsed === elapsed, 'inactive non ticka il fuoco');

    s.active = true;
    s.destroyed = true;
    s.update(1, null, engine);
    assert(s.worldX === x && s.fire.elapsed === elapsed, 'destroyed non ticka');
}

{
    const engine = mockEngine();
    const pool = new BeePool({
        create: () => new BeeEnemyShooter(20, 20, 16, 16),
        initial: 1,
        max: 2
    });
    const item = pool.acquire();
    item.engine = engine;
    item.destroy();
    assert(item.fire.cancelled === true, 'release cancella il timer');
    assert(pool.inUse === 0, 'tornato in pool');

    const again = pool.acquire();
    assert(again === item, 'stessa istanza');
    assert(again.fire.running === true && again.fire.cancelled === false, 'reset riavvia fire');
}

{
    const s = new BeeEnemyShooter(40, 40, 20, 20);
    s.vx = 0;
    s.vy = 0;
    const engine = mockEngine();
    s.shoot(engine);
    assert(engine.entities.length === 1, 'proiettile spawnato');
    const b = engine.entities[0];
    assert(b.vx === 0 && b.vy > 0, `vx===vy===0 spara in giù, vy=${b.vy}`);
    const hazards = engine.collisions.groups.get('hazards');
    assert(hazards && hazards.includes(b), 'proiettile nel gruppo bulletGroup');
}

{
    const s = new BeeEnemyShooter(40, 40, 20, 20);
    s.bulletGroup = 'custom';
    const engine = mockEngine();
    engine.collisions.createGroup('custom');
    s.shoot(engine);
    assert(engine.collisions.groups.get('custom').includes(engine.entities[0]), 'bulletGroup configurabile');
}

console.log('BeeEnemyShooter tests ok');
