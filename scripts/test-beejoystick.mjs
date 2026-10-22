import { BeeJoystick } from '../src/input/BeeJoystick.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function createTarget() {
    const listeners = new Map();
    return {
        addEventListener(type, fn, options) {
            const list = listeners.get(type) || [];
            list.push({ fn, options });
            listeners.set(type, list);
        },
        removeEventListener(type, fn) {
            const list = listeners.get(type) || [];
            listeners.set(type, list.filter((item) => item.fn !== fn));
        },
        dispatch(type, event) {
            const list = (listeners.get(type) || []).slice();
            for (let i = 0; i < list.length; i++) list[i].fn(event);
        },
        count(type) {
            return (listeners.get(type) || []).length;
        }
    };
}

globalThis.window = createTarget();

function canvasOf(width, height) {
    const canvas = createTarget();
    canvas.width = width;
    canvas.height = height;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
    return canvas;
}

function fakeInput() {
    const keys = {};
    return {
        keys,
        setKey(key, value) {
            keys[key] = value;
        }
    };
}

function touch(id, x, y) {
    return {
        cancelable: true,
        preventDefault() {},
        changedTouches: [{ identifier: id, clientX: x, clientY: y }]
    };
}

function arrows(input) {
    return {
        left: input.keys.ArrowLeft === true,
        right: input.keys.ArrowRight === true,
        up: input.keys.ArrowUp === true,
        down: input.keys.ArrowDown === true
    };
}

function none(input) {
    const a = arrows(input);
    return !a.left && !a.right && !a.up && !a.down;
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('touchstart', touch(1, 0, 0));
    assert(joy.active === false, 'dito fuori: active false');
    assert(none(input), 'dito fuori: nessuna freccia');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('touchstart', touch(1, joy.baseX - 20, joy.baseY));
    const a = arrows(input);
    assert(a.left && !a.right && !a.up && !a.down, 'solo ArrowLeft');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('touchstart', touch(1, joy.baseX, joy.baseY - 20));
    const a = arrows(input);
    assert(a.up && !a.left && !a.right && !a.down, 'solo ArrowUp');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('touchstart', touch(1, joy.baseX - 20, joy.baseY));
    canvas.dispatch('touchstart', touch(2, joy.baseX, joy.baseY - 20));
    const a = arrows(input);
    assert(joy.touchId === 1, 'il secondo dito non prende il joystick');
    assert(a.left && !a.up && !a.right && !a.down, 'il secondo dito non cambia freccia');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('touchstart', touch(1, joy.baseX - 20, joy.baseY));
    canvas.dispatch('touchend', touch(1, joy.baseX - 20, joy.baseY));
    assert(joy.active === false, 'touchend spegne active');
    assert(none(input), 'touchend spegne le quattro frecce');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const joy = new BeeJoystick(canvas, fakeInput());
    joy.draw(null);
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    const before = canvas.count('touchstart');
    joy.destroy();
    assert(canvas.count('touchstart') === before - 1, 'destroy toglie touchstart');
    canvas.dispatch('touchstart', touch(1, joy.baseX - 20, joy.baseY));
    assert(input.keys.ArrowLeft !== true, 'touchstart dopo destroy non accende ArrowLeft');
}

function mouse(x, y, extra) {
    return { clientX: x, clientY: y, button: 0, ...extra };
}

function eightOff(input) {
    return input.keys.ArrowLeft !== true
        && input.keys.KeyA !== true
        && input.keys.ArrowRight !== true
        && input.keys.KeyD !== true
        && input.keys.ArrowUp !== true
        && input.keys.KeyW !== true
        && input.keys.ArrowDown !== true
        && input.keys.KeyS !== true;
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('mousedown', mouse(joy.baseX, joy.baseY));
    window.dispatch('mousemove', mouse(joy.baseX - 20, joy.baseY));
    assert(input.keys.ArrowLeft === true && input.keys.KeyA === true, 'mouse sinistra: ArrowLeft e KeyA');
    assert(input.keys.ArrowRight !== true && input.keys.KeyD !== true, 'mouse sinistra: niente destra');
    assert(input.keys.ArrowUp !== true && input.keys.KeyW !== true, 'mouse sinistra: niente su');
    assert(input.keys.ArrowDown !== true && input.keys.KeyS !== true, 'mouse sinistra: niente giù');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('mousedown', mouse(joy.baseX, joy.baseY));
    window.dispatch('mousemove', mouse(joy.baseX - 20, joy.baseY));
    window.dispatch('mouseup', mouse(joy.baseX - 40, joy.baseY));
    assert(joy.active === false, 'mouseup spegne active');
    assert(eightOff(input), 'mouseup spegne le otto');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('mousedown', mouse(joy.baseX, joy.baseY, {
        sourceCapabilities: { firesTouchEvents: true }
    }));
    assert(joy.active === false, 'mousedown da touch non parte');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    canvas.dispatch('touchstart', touch(1, joy.baseX - 20, joy.baseY));
    assert(input.keys.ArrowLeft === true && input.keys.KeyA === true, 'il touch accende ArrowLeft e KeyA');
    assert(input.keys.ArrowRight !== true && input.keys.KeyD !== true, 'il touch non accende destra');
    assert(input.keys.ArrowUp !== true && input.keys.KeyW !== true, 'il touch non accende su');
    assert(input.keys.ArrowDown !== true && input.keys.KeyS !== true, 'il touch non accende giù');
    joy.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const input = fakeInput();
    const joy = new BeeJoystick(canvas, input);
    joy.destroy();
    assert(canvas.count('mousedown') === 0, 'destroy toglie mousedown');
    canvas.dispatch('mousedown', mouse(joy.baseX, joy.baseY));
    assert(joy.active === false, 'mousedown dopo destroy non parte');
    assert(input.keys.ArrowLeft !== true && input.keys.KeyA !== true, 'mousedown dopo destroy non accende tasti');
}

console.log('BeeJoystick tests ok');
