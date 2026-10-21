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

const windowTarget = createTarget();
globalThis.window = windowTarget;

function canvasBox(width, height) {
    const canvas = createTarget();
    canvas.width = 800;
    canvas.height = 480;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
    return canvas;
}

const { BeeInput } = await import('../src/input/BeeInput.js');

{
    let message = '';
    try {
        new BeeInput();
    } catch (err) {
        message = err.message;
    }
    assert(message === 'BeeInput: canvas required', 'senza canvas lancia');
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    windowTarget.dispatch('keydown', { code: 'KeyA', key: 'a' });
    windowTarget.dispatch('keyup', { code: 'KeyA', key: 'A' });
    assert(input.isPressed('a') === false, 'keyup spegne a ricordata');
    assert(input.isPressed('KeyA') === false, 'keyup spegne KeyA');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    windowTarget.dispatch('keydown', { code: 'KeyA', key: 'a' });
    input.setKey('ArrowLeft', true);
    windowTarget.dispatch('blur', {});
    assert(input.isPressed('KeyA') === false, 'blur spegne KeyA');
    assert(input.isPressed('ArrowLeft') === true, 'blur lascia setKey');
    windowTarget.dispatch('keyup', { code: 'ArrowLeft', key: 'ArrowLeft' });
    assert(input.isPressed('ArrowLeft') === true, 'keyup non spegne il joystick');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    windowTarget.dispatch('keydown', { code: 'KeyA', key: 'a' });
    input.setKey('KeyA', true);
    input.setKey('KeyA', false);
    assert(input.isPressed('KeyA') === true, 'la tastiera tiene KeyA');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    windowTarget.dispatch('keydown', { code: 'KeyA', key: 'a' });
    assert(input.wasPressed('KeyA') === true, 'wasPressed nel frame della pressione');
    assert(input.wasPressed('a') === true, 'wasPressed anche sulla key');
    input.endFrame();
    assert(input.wasPressed('KeyA') === false, 'endFrame svuota wasPressed');
    assert(input.isPressed('KeyA') === true, 'endFrame lascia il tasto tenuto');
    assert(input.isPressed('a') === true, 'endFrame lascia a');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    canvas.dispatch('mousedown', { clientX: 10, clientY: 20, button: 2 });
    assert(input.mouse.pressed === true && input.mouse.wasPressed === true, 'il destro preme');
    windowTarget.dispatch('mouseup', { clientX: -20, clientY: 600, button: 2 });
    assert(input.mouse.pressed === false, 'mouseup fuori spegne pressed');
    assert(input.mouse.x === -20 && input.mouse.y === 600, 'coordinate del rilascio fuori');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    canvas.dispatch('mousedown', {
        clientX: 10,
        clientY: 20,
        sourceCapabilities: { firesTouchEvents: true }
    });
    assert(input.mouse.wasPressed === false, 'il mouse da touch non preme');
    assert(input.mouse.pressed === false, 'il mouse da touch non tiene pressed');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    const block = { cancelable: true, preventDefault() {} };
    canvas.dispatch('touchstart', {
        ...block,
        touches: [{ identifier: 1, clientX: 40, clientY: 50 }]
    });
    assert(input.mouse.pressed === true, 'touchstart preme');
    canvas.dispatch('touchend', {
        ...block,
        touches: [],
        changedTouches: [{ identifier: 1, clientX: 70, clientY: 80 }]
    });
    assert(input.mouse.pressed === false, 'ultimo dito spegne pressed');
    assert(input.mouse.x === 70 && input.mouse.y === 80, 'ultimo dito usa changedTouches');
    assert(input.touches.length === 0, 'nessun tocco rimasto');
    input.destroy();
}

{
    const canvas = canvasBox(0, 0);
    const input = new BeeInput(canvas);
    const pos = input.getCanvasPosition(30, 40);
    assert(pos.x === 0 && pos.y === 0, 'rect 0×0 ritorna 0, 0');
    input.destroy();
}

{
    const canvas = canvasBox(800, 480);
    const input = new BeeInput(canvas);
    const before = windowTarget.count('keydown');
    input.destroy();
    assert(windowTarget.count('keydown') === before - 1, 'destroy toglie keydown');
    windowTarget.dispatch('keydown', { code: 'KeyA', key: 'a' });
    assert(input.isPressed('KeyA') === false, 'keydown dopo destroy non preme');
    assert(input.isPressed('a') === false, 'keydown dopo destroy non preme a');
}

console.log('BeeInput tests ok');
