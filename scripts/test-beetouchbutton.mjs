import { BeeTouchButton } from '../src/input/BeeTouchButton.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function createTarget() {
    const listeners = new Map();
    return {
        addEventListener(type, fn) {
            const list = listeners.get(type) || [];
            list.push(fn);
            listeners.set(type, list);
        },
        removeEventListener(type, fn) {
            const list = listeners.get(type) || [];
            listeners.set(type, list.filter((item) => item !== fn));
        },
        dispatch(type, event) {
            const list = (listeners.get(type) || []).slice();
            for (let i = 0; i < list.length; i++) list[i](event);
        },
        count(type) {
            return (listeners.get(type) || []).length;
        }
    };
}

globalThis.window = createTarget();

function canvasOf(width, height, rectWidth = width, rectHeight = height) {
    const canvas = createTarget();
    canvas.width = width;
    canvas.height = height;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: rectWidth, height: rectHeight });
    return canvas;
}

function pointer(id, x, y, button = 0) {
    return { pointerId: id, clientX: x, clientY: y, button };
}

{
    let message = '';
    try {
        new BeeTouchButton();
    } catch (err) {
        message = err.message;
    }
    assert(message === 'BeeTouchButton: canvas required', 'senza canvas lancia');
}

{
    const canvas = canvasOf(800, 480);
    const button = new BeeTouchButton({ canvas, x: 100, y: 100 });
    assert(button.radius === 30 && button.label === 'A', 'radius 30 e label A');
    canvas.dispatch('pointerdown', pointer(1, 0, 0));
    assert(button.isPressed === false, 'pointerdown fuori non preme');
    button.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const button = new BeeTouchButton({ canvas, x: 100, y: 100 });
    canvas.dispatch('pointerdown', pointer(1, 100, 100, 2));
    assert(button.isPressed === true, 'pointerdown dentro preme');
    assert(button.pointerId === 1, 'salva il pointerId');
    window.dispatch('pointerup', pointer(1, 100, 100, 2));
    assert(button.isPressed === false && button.pointerId === null, 'pointerup rilascia');
    button.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const first = new BeeTouchButton({ canvas, x: 100, y: 100 });
    const second = new BeeTouchButton({ canvas, x: 400, y: 100 });
    canvas.dispatch('pointerdown', pointer(1, 100, 100));
    assert(first.isPressed === true, 'il primo si accende');
    assert(second.isPressed === false, 'il secondo non si accende col pointer del primo');
    first.destroy();
    second.destroy();
}

{
    const canvas = canvasOf(800, 480, 0, 0);
    const button = new BeeTouchButton({ canvas, x: 100, y: 100 });
    canvas.dispatch('pointerdown', pointer(1, 100, 100));
    assert(button.isPressed === false, 'rect 0×0 non preme');
    button.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const button = new BeeTouchButton({ canvas, x: 100, y: 100 });
    button.render(null);
    button.destroy();
}

{
    const canvas = canvasOf(800, 480);
    const button = new BeeTouchButton({ canvas, x: 100, y: 100 });
    button.destroy();
    assert(canvas.count('pointerdown') === 0, 'destroy toglie pointerdown');
    canvas.dispatch('pointerdown', pointer(1, 100, 100));
    assert(button.isPressed === false, 'pointerdown dopo destroy non preme');
}

console.log('BeeTouchButton tests ok');
