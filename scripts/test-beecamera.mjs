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

console.log('BeeCamera tests ok');
