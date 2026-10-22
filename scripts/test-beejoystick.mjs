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

console.log('BeeJoystick tests ok');
