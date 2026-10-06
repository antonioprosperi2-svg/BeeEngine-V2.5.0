import { BeeCamera } from '../src/graphics/BeeCamera.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function almost(a, b, eps = 1e-6) {
    return Math.abs(a - b) <= eps;
}

{
    const cam = new BeeCamera();
    assert(cam.w === 800 && cam.h === 600, 'default 800×600');
    const nan = new BeeCamera(NaN, 'x');
    assert(nan.w === 800 && nan.h === 600, 'NaN cade sul default');
}

{
    const cam = new BeeCamera(800, 600);
    cam.follow({ x: 100, y: 50, width: 40, height: 20 }, 0);
    cam.update(1 / 60);
    assert(cam.x === 100 + 20 - 400, `snap x, ottenuto ${cam.x}`);
    assert(cam.y === 50 + 10 - 300, `snap y, ottenuto ${cam.y}`);
}

{
    const a = new BeeCamera(800, 600);
    a.follow({ x: 800, y: 0 }, 0.1);
    a.update(1 / 60);
    const one60 = a.x;

    const b = new BeeCamera(800, 600);
    b.follow({ x: 800, y: 0 }, 0.1);
    b.update(1 / 30);
    assert(b.x > one60, 'dt più grande recupera di più');

    const frozen = new BeeCamera(800, 600);
    frozen.follow({ x: 800, y: 0 }, 0.1);
    const before = frozen.x;
    frozen.update(0);
    assert(frozen.x === before, 'dt 0 non muove');

    const feel60 = new BeeCamera(800, 600);
    feel60.follow({ x: 800, y: 0 }, 0.1);
    feel60.update(1 / 60);
    feel60.update(1 / 60);
    const feel30 = new BeeCamera(800, 600);
    feel30.follow({ x: 800, y: 0 }, 0.1);
    feel30.update(1 / 30);
    assert(almost(feel60.x, feel30.x, 1e-9), 'stesso feeling a 30 e 60 fps');
}

{
    const cam = new BeeCamera(800, 600);
    cam.follow({ x: 10, y: 20 }, 0);
    cam.update(1);
    assert(Number.isFinite(cam.x) && Number.isFinite(cam.y), 'senza width non è NaN');
    assert(cam.x === 10 - 400 && cam.y === 20 - 300, 'width/height default 0');
}

{
    const cam = new BeeCamera(800, 600);
    cam.setBounds(0, 0, 100, 80);
    cam.follow({ x: 0, y: 0, width: 10, height: 10 }, 0);
    cam.update(1);
    assert(cam.x === 0 + (100 - 800) / 2, `bounds stretti x centra, ottenuto ${cam.x}`);
    assert(cam.y === 0 + (80 - 600) / 2, `bounds stretti y centra, ottenuto ${cam.y}`);
    cam.setBounds(null);
    assert(cam.bounds === null, 'setBounds(null) toglie i limiti');
}

{
    const cam = new BeeCamera(800, 600);
    cam.x = 10.6;
    cam.y = 3.4;
    cam.apply(null);
    cam.apply();
    const view = cam.getViewBounds();
    assert(view.x === Math.round(10.6) && view.y === Math.round(3.4), 'view allineata ad apply');
    assert(cam.isRectVisible(11, 3, 2, 2) === true, 'isRectVisible usa lo stesso round');
    assert(cam.setSize(640, 360).w === 640 && cam.h === 360, 'setSize');
}

{
    const cam = new BeeCamera(800, 600);
    cam.x = 40.4;
    cam.y = 10.6;
    const world = cam.screenToWorld(8, 4);
    assert(world.x === 8 + Math.round(40.4) && world.y === 4 + Math.round(10.6), 'screenToWorld = apply');
    const screen = cam.worldToScreen(world.x, world.y);
    assert(screen.x === 8 && screen.y === 4, 'worldToScreen inverso');
}

{
    const cam = new BeeCamera(800, 600);
    cam.follow({ x: 800, y: 0 }, 0.1);
    cam.host(true);
    cam.update(1 / 60);
    assert(cam.x === 0, 'hosted: update a mano è no-op');
    cam.update(1 / 60, true);
    assert(cam.x !== 0, 'hosted: il loop (fromHost) muove');
}

{
    const cam = new BeeCamera(800, 600);
    cam.follow({ x: 100, y: 0 }, 0);
    cam.update(1);
    cam.follow(null);
    const x = cam.x;
    cam.update(1);
    assert(cam.x === x, 'follow(null) ferma');
    cam.follow({ x: 999, y: 0, destroyed: true }, 0);
    cam.update(1);
    assert(cam.x === x, 'target destroyed non muove');
}

{
    const cam = new BeeCamera(200, 100);
    cam.setBounds(0, 0, 1000, 1000);
    cam.x = 800;
    cam.y = 0;
    cam.setSize(400, 100);
    assert(cam.x === 600, `setSize re-clamp x, ottenuto ${cam.x}`);
}

{
    const cam = new BeeCamera(800, 600);
    cam.setBounds(100, 50, 2000, 2000);
    assert(cam.x === 100 && cam.y === 50, `setBounds tira dentro subito, ottenuto ${cam.x},${cam.y}`);
    const kept = cam.bounds;
    cam.setBounds(NaN, 0, 10, 10);
    assert(cam.bounds === kept, 'valore non finito non cancella i bounds');
    cam.setBounds(0, 0, -10, 100);
    assert(cam.bounds === kept, 'lato negativo non cancella i bounds');
}

{
    const narrow = new BeeCamera(800, 600);
    narrow.setBounds(0, 0, 100, 80);
    assert(narrow.x === (100 - 800) / 2, `bounds stretti centrati senza update, ottenuto ${narrow.x}`);
    assert(narrow.y === (80 - 600) / 2, `bounds stretti y senza update, ottenuto ${narrow.y}`);
}

{
    const cam = new BeeCamera(80, 60);
    cam.x = 0.4;
    cam.y = 20.6;
    cam.setBounds(0.4, 0.4, 100.2, 80.2);
    const maxX = 0.4 + 100.2 - 80;
    const maxY = 0.4 + 80.2 - 60;
    assert(Math.round(cam.x) >= 0.4 && Math.round(cam.x) <= maxX, `view x dentro i bounds, ottenuto ${cam.x}`);
    assert(Math.round(cam.y) >= 0.4 && Math.round(cam.y) <= maxY, `view y dentro i bounds, ottenuto ${cam.y}`);
    assert(cam.x === 1, `bordo sinistro frazionario, ottenuto ${cam.x}`);
    assert(cam.y === 20, `bordo basso frazionario, ottenuto ${cam.y}`);
}

{
    const cam = new BeeCamera(100, 100);
    cam.setBounds(0, 0, 1000, 1000);
    cam.x = 5000;
    cam.y = 5000;
    cam.update(0);
    assert(cam.x === 900 && cam.y === 900, `dt 0 resta nei bounds, ottenuto ${cam.x},${cam.y}`);
    cam.x = 5000;
    cam.follow({ x: 0, y: 0, destroyed: true }, 0);
    cam.update(1);
    assert(cam.x === 900, `destroyed non segue ma resta nei bounds, ottenuto ${cam.x}`);
}

console.log('BeeCamera tests ok');
