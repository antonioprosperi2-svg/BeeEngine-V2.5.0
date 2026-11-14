import { BeeBullet } from '../src/physics/BeeBullet.js';
import { BeePool } from '../src/core/BeePool.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const MARGIN = 200;

function canvasEngine(camera = null) {
    return {
        canvas: { width: CANVAS_W, height: CANVAS_H },
        camera
    };
}

/** fermo: vx e vy a 0, così update non sposta il rettangolo. */
function still(x, y, width = 8, height = 8, lifespan = 5) {
    return new BeeBullet(x, y, 0, 0, width, height, null, lifespan);
}

function step(bullet, engine, dt = 0) {
    bullet.update(dt, null, engine);
    return bullet;
}

// ------------------------------------------------------------------ reset e default

{
    const bullet = new BeeBullet();
    assert(bullet.x === 0 && bullet.y === 0, 'default: origine');
    assert(bullet.worldX === 0 && bullet.worldY === 0, 'default: mondo');
    assert(bullet.vx === 0 && bullet.vy === 300, 'default: vy 300');
    assert(bullet.width === 8 && bullet.height === 8, 'default: size 8');
    assert(bullet.textureKey === null && bullet.lifespan === 5 && bullet.age === 0, 'default: texture, lifespan, age');

    const set = new BeeBullet(1, 2, 3, 4, 9, 10, 'shot', 2);
    assert(set.x === 1 && set.y === 2 && set.vx === 3 && set.vy === 4, 'constructor passa gli argomenti');
    assert(set.width === 9 && set.height === 10 && set.textureKey === 'shot' && set.lifespan === 2, 'constructor: size, texture, lifespan');

    set.age = 4;
    set.reset();
    assert(set.x === 0 && set.y === 0 && set.vx === 0 && set.vy === 300, 'reset() torna ai default');
    assert(set.width === 8 && set.height === 8 && set.textureKey === null && set.lifespan === 5 && set.age === 0, 'reset() azzera age');

    set.reset(5, 6);
    assert(set.x === 5 && set.y === 6 && set.vx === 0 && set.vy === 300 && set.width === 8, 'reset(x, y) tiene i default dopo');

    set.age = 3;
    set.vx = 9;
    set.vy = 8;
    set.recycle();
    assert(set.age === 0 && set.vx === 0 && set.vy === 0, 'recycle azzera age, vx e vy');
    assert(set.x === 5 && set.lifespan === 5, 'recycle non tocca posizione né lifespan');
}

// ------------------------------------------------------------------ lifespan

{
    const bullet = new BeeBullet(10, 20, 0, 300);
    bullet.update(5, null, null);
    assert(bullet.destroyed === true, 'a 5 secondi esatti destroy');
    assert(bullet.age === 5, 'age arriva a 5');
    assert(bullet.y === 20, 'scade prima di integrare, la posizione resta');
    assert(bullet.pool == null, 'senza pool destroy non ha un pool');
}

{
    const bullet = still(0, 0, 8, 8, 0);
    bullet.update(1000, null, null);
    assert(bullet.destroyed === false, 'lifespan 0 non scade');
    assert(bullet.age === 1000, 'lifespan 0 accumula age');
    bullet.age = 99999;
    bullet.update(1, null, null);
    assert(bullet.destroyed === false, 'lifespan 0 non scade nemmeno con age alto');

    const negative = still(0, 0, 8, 8, -1);
    negative.update(100, null, null);
    assert(negative.destroyed === false, 'lifespan negativo non scade');
}

// ------------------------------------------------------------------ fuori schermo, senza telecamera

{
    const engine = canvasEngine();

    const rightOut = step(still(CANVAS_W + 201, 10), engine);
    assert(rightOut.destroyed === true, 'destra: worldX = canvas.width + 201 muore');
    const rightIn = step(still(CANVAS_W + 199, 10), engine);
    assert(rightIn.destroyed === false, 'destra: worldX = canvas.width + 199 resta');
    const rightEdge = step(still(CANVAS_W + MARGIN, 40), engine);
    assert(rightEdge.destroyed === false, 'destra: esattamente a 200 pixel resta');

    // A sinistra conta il lato destro del rettangolo (worldX + width).
    const leftOut = step(still(-201 - 16, 10, 16, 8), engine);
    assert(leftOut.destroyed === true, 'sinistra: lato destro a -201 muore');
    const leftIn = step(still(-199 - 16, 10, 16, 8), engine);
    assert(leftIn.destroyed === false, 'sinistra: lato destro a -199 resta');
    const straddle = step(still(-201, 10, 16, 8), engine);
    assert(straddle.destroyed === false, 'a cavallo del margine sinistro resta');

    const aboveOut = step(still(10, -201 - 12, 8, 12), engine);
    assert(aboveOut.destroyed === true, 'sopra: lato basso a -201 muore');
    const aboveIn = step(still(10, -199 - 12, 8, 12), engine);
    assert(aboveIn.destroyed === false, 'sopra: lato basso a -199 resta');

    const belowOut = step(still(10, CANVAS_H + 201, 8, 20), engine);
    assert(belowOut.destroyed === true, 'sotto: worldY = canvas.height + 201 muore');
    const belowIn = step(still(10, CANVAS_H + 199, 8, 20), engine);
    assert(belowIn.destroyed === false, 'sotto: worldY = canvas.height + 199 resta');

    const point = step(still(100, 100, 0, 0), engine);
    assert(point.destroyed === false, 'width e height 0 in quadro non muoiono');
    const pointOut = step(still(CANVAS_W + 201, 100, 0, 0), engine);
    assert(pointOut.destroyed === true, 'width 0: conta il punto worldX');
}

// ------------------------------------------------------------------ telecamera

{
    const engine = canvasEngine({
        getViewBounds: () => ({ x: 1000, y: 0, width: 800, height: 600 })
    });
    const seen = step(still(1100, 10), engine);
    assert(seen.destroyed === false, 'inquadrato a worldX 1100 resta vivo');
    const gone = step(still(1000 + 800 + 201, 10), engine);
    assert(gone.destroyed === true, 'oltre la view di 201 pixel muore');

    // Il vecchio test (canvas.width) lo avrebbe ucciso: worldX è grande, ma è in quadro.
    const far = step(still(1500, 10), canvasEngine());
    assert(far.destroyed === true, 'senza telecamera worldX 1500 è fuori dal canvas');
    const farCam = step(still(1500, 10), engine);
    assert(farCam.destroyed === false, 'con la telecamera worldX 1500 è in quadro');
}

// ------------------------------------------------------------------ senza engine

{
    const bullet = still(99999, 99999);
    bullet.update(1, null, null);
    bullet.update(1, null, {});
    assert(bullet.destroyed === false, 'senza engine o senza canvas non muore per il bordo');
    assert(bullet.age === 2, 'senza engine l\'age cresce lo stesso');
}

// ------------------------------------------------------------------ draw

{
    const bullet = new BeeBullet(4, 6, 0, 0, 8, 8, 'shot');
    bullet.draw(null, { assets: { getImage() { throw new Error('non deve essere chiamato'); } } });
    bullet.draw(undefined);
    assert(true, 'draw senza ctx non lancia');

    const shot = { width: 12, height: 12 };
    const images = [];
    const rects = [];
    const ctx = {
        fillStyle: '',
        drawImage(img, x, y, w, h) { images.push({ img, x, y, w, h }); },
        save() {},
        restore() {},
        fillRect(x, y, w, h) { rects.push({ x, y, w, h, fill: this.fillStyle }); }
    };
    const engine = {
        assets: {
            getImage(key) {
                return key === 'shot' ? shot : { duration: 3 };
            },
            getAsset() {
                return { width: 99, height: 99 };
            }
        },
        getAsset() {
            return { width: 99, height: 99 };
        }
    };

    bullet.draw(ctx, engine);
    assert(images.length === 1 && images[0].img === shot, 'disegna la texture di assets.getImage');
    assert(images[0].x === bullet.worldX && images[0].y === bullet.worldY, 'drawImage in coordinate mondo');
    assert(images[0].w === 8 && images[0].h === 8, 'drawImage usa width e height');
    assert(rects.length === 0, 'con la texture non disegna il rettangolo');

    bullet.textureKey = 'sound';
    bullet.draw(ctx, engine);
    assert(images.length === 1, 'un valore senza width numerica non va in drawImage');
    assert(rects.length === 1 && rects[0].fill === '#FFD700', 'senza immagine: rettangolo oro');
    assert(rects[0].x === bullet.worldX && rects[0].w === 8 && rects[0].h === 8, 'rettangolo su worldX/worldY');

    bullet.textureKey = 'shot';
    bullet.draw(ctx, { assets: { getAsset: () => shot }, getAsset: () => shot });
    assert(images.length === 1, 'senza assets.getImage non usa getAsset');
    assert(rects.length === 2, 'senza getImage disegna il rettangolo');
}

// ------------------------------------------------------------------ pool

{
    const pool = new BeePool({
        create: () => new BeeBullet(),
        max: 4
    });
    const bullet = pool.acquire(3, 4, 5, 6, 10, 12, 'shot', 2);
    assert(bullet instanceof BeeBullet, 'acquire crea un BeeBullet');
    assert(bullet.x === 3 && bullet.y === 4 && bullet.vx === 5 && bullet.vy === 6, 'acquire chiama reset');
    assert(bullet.width === 10 && bullet.height === 12 && bullet.textureKey === 'shot' && bullet.lifespan === 2, 'reset dal pool');
    assert(bullet.age === 0 && bullet.destroyed === false && bullet.pool === pool, 'sveglio nel pool');

    bullet.age = 1.5;
    bullet.vx = 40;
    bullet.destroy();
    assert(bullet.destroyed === true, 'destroy nel pool lo rilascia');
    assert(pool.inUse === 0 && pool.available === 1, 'torna disponibile');
    assert(bullet.age === 0 && bullet.vx === 0 && bullet.vy === 0, 'il rilascio passa da recycle');

    const again = pool.acquire(8, 9, 1, 2);
    assert(again === bullet, 'acquire di nuovo riusa lo stesso proiettile');
    assert(again.destroyed === false && again.age === 0, 'riparte');
    assert(again.x === 8 && again.y === 9 && again.vx === 1 && again.vy === 2, 'il secondo acquire chiama reset');
    assert(again.width === 8 && again.lifespan === 5 && again.textureKey === null, 'gli argomenti omessi tornano ai default');
}

console.log('BeeBullet tests ok');
