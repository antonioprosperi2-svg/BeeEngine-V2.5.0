import { BeeParticleSystem } from '../src/graphics/BeeParticleSystem.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

{
    const empty = new BeeParticleSystem({ x: 0, y: 0, initial: 0, max: 8 });
    const none = empty.getWorldAABB();
    assert(none.width === 0 && none.height === 0, 'senza particelle il box ha lato 0');

    const fx = new BeeParticleSystem({ x: 0, y: 0, initial: 0, max: 8 });
    fx.particles.push({
        x: 400,
        y: -180,
        vx: 0,
        vy: 0,
        life: 1,
        maxLife: 1,
        size: 6,
        color: 'orange'
    });
    const box = fx.getWorldAABB();
    assert(box.x <= 394 && box.x + box.width >= 406, `AABB x contiene la particella lontana, ${box.x} ${box.width}`);
    assert(box.y <= -186 && box.y + box.height >= -174, `AABB y contiene la particella lontana, ${box.y} ${box.height}`);
    assert(box.width > 32 || box.x + box.width > 32, 'non è il 32×32 dell\'entity');
}

{
    const fx = new BeeParticleSystem({ x: 0, y: 0, initial: 0, max: 4 });
    const particle = {
        x: 10,
        y: 20,
        vx: 80,
        vy: -40,
        life: 1,
        maxLife: 1,
        size: 2,
        color: 'orange'
    };
    fx.particles.push(particle);
    fx.active = false;
    fx.update(0.5);
    assert(particle.x === 10 && particle.y === 20 && particle.life === 1, 'active false non muove');
}

{
    const fx = new BeeParticleSystem({ x: 0, y: 0, initial: 4, max: 8 });
    fx.emit(3);
    assert(fx.particles.length === 3, 'emit ha riempito');
    fx.destroy();
    assert(fx.particles.length === 0, 'destroy svuota particles');
}

{
    const fx = new BeeParticleSystem({ x: 0, y: 0, initial: 0, max: 4 });
    const particle = {
        x: 5,
        y: 6,
        vx: 30,
        vy: 10,
        life: 0.8,
        maxLife: 0.8,
        size: 2,
        color: 'orange'
    };
    fx.particles.push(particle);
    fx.update(NaN);
    assert(particle.life === 0.8 && particle.x === 5 && particle.y === 6, 'dt NaN non muove e non lascia life NaN');
    assert(Number.isFinite(particle.life), 'life resta finita');
}

console.log('BeeParticleSystem tests ok');
