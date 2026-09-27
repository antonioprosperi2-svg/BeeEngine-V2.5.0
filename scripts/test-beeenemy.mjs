import { BeeEnemy } from '../src/gameplay/BeeEnemy.js';
import { BeeEntity } from '../src/core/BeeEntity.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

{
    const e = new BeeEnemy(250, 100, 40, 32);
    e.setPatrolBounds(200, 380);
    e.speed = 500;
    e.update(1, null, null);
    assert(e.worldX + e.width <= 380 + 1e-6, `non sfora maxX-width: ${e.worldX} + ${e.width}`);
    assert(e.worldX === 380 - e.width, 'clamp destro sul muro');
    assert(e.speed < 0, 'inverte verso sinistra');

    e.speed = -500;
    e.update(1, null, null);
    assert(e.worldX >= 200 - 1e-6, `non scende sotto minX: ${e.worldX}`);
    assert(e.worldX === 200, 'clamp sinistro sul muro');
    assert(e.speed > 0, 'inverte verso destra');
}

{
    const e = new BeeEnemy(220, 100, 40, 32);
    e.setPatrolBounds(200, 380);
    e.speed = 90;
    for (let i = 0; i < 80; i++) {
        e.update(0.05, null, null);
        assert(e.worldX >= 200 - 1e-6, `frame ${i}: sotto minX ${e.worldX}`);
        assert(e.worldX + e.width <= 380 + 1e-6, `frame ${i}: oltre maxX ${e.worldX + e.width}`);
    }
}

{
    const e = new BeeEnemy(250, 100, 32, 32);
    e.setPatrolBounds(200, 380);
    e.speed = 80;
    const x = e.worldX;
    const dir = e.speed;
    e.active = false;
    e.update(1, null, null);
    assert(e.worldX === x && e.speed === dir, 'inactive non si muove');

    e.active = true;
    e.destroyed = true;
    e.update(1, null, null);
    assert(e.worldX === x && e.speed === dir, 'destroyed non si muove');
}

{
    const hub = new BeeEntity(100, 0, 10, 10);
    const e = new BeeEnemy(0, 50, 32, 32);
    hub.addChild(e);
    e.setPatrolBounds(100, 180);
    e.speed = 40;
    const y0 = e.worldY;
    e.update(0.5, null, null);
    assert(e.worldX > 100, 'cade/pattuglia in worldX, non y locale');
    assert(e.y !== e.worldX, 'con parent locale e mondo differiscono');
    assert(e.worldY === y0, 'patrol non tocca Y');
}

console.log('BeeEnemy tests ok');
