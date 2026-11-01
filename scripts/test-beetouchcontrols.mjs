import { BeeInput } from '../src/input/BeeInput.js';
import { BeeTouchControls } from '../src/input/BeeTouchControls.js';

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

function canvasOf(width, height, rect) {
    const canvas = createTarget();
    canvas.width = width;
    canvas.height = height;
    canvas.getBoundingClientRect = () => rect || { left: 0, top: 0, width, height };
    return canvas;
}

function setup() {
    const canvas = canvasOf(800, 480);
    const input = new BeeInput(canvas);
    const controls = new BeeTouchControls(canvas, input);
    return { canvas, input, controls };
}

// Una "dita" attiva: { id, x, y }. `touches` è l'elenco dopo l'evento.
function touchEvent(touches) {
    return {
        cancelable: true,
        preventDefault() {},
        touches: touches.map((t) => ({ identifier: t.id, clientX: t.x, clientY: t.y })),
        changedTouches: touches.map((t) => ({ identifier: t.id, clientX: t.x, clientY: t.y }))
    };
}

function pos(controls, name) {
    return { x: controls.buttons[name].x, y: controls.buttons[name].y };
}

// 1. touchstart su left
{
    const { canvas, input, controls } = setup();
    const p = pos(controls, 'left');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...p }]));
    assert(input.isPressed('ArrowLeft') === true, '1: ArrowLeft premuto');
    assert(input.wasPressed('ArrowLeft') === true, '1: ArrowLeft wasPressed');
    canvas.dispatch('touchend', touchEvent([]));
    assert(input.isPressed('ArrowLeft') === false, '1: ArrowLeft rilasciato');
    controls.destroy();
    input.destroy();
}

// 2. azione: 'Space' e ' ' insieme
{
    const { canvas, input, controls } = setup();
    assert(controls.buttons.action.key === 'Space', '2: key principale Space');
    const p = pos(controls, 'action');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...p }]));
    assert(input.isPressed('Space') === true, '2: Space premuto');
    assert(input.wasPressed('Space') === true, '2: Space wasPressed');
    assert(input.isPressed(' ') === true, '2: anche " " per compatibilità');
    canvas.dispatch('touchend', touchEvent([]));
    assert(input.isPressed('Space') === false && input.isPressed(' ') === false, '2: Space rilasciato');
    controls.destroy();
    input.destroy();
}

// 3. due dita sullo stesso pulsante
{
    const { canvas, input, controls } = setup();
    const p = pos(controls, 'right');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...p }]));
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...p }, { id: 2, x: p.x + 3, y: p.y + 3 }]));
    assert(input.isPressed('ArrowRight') === true, '3: due dita, premuto');
    canvas.dispatch('touchend', touchEvent([{ id: 2, x: p.x + 3, y: p.y + 3 }]));
    assert(input.isPressed('ArrowRight') === true, '3: alzo un dito, resta premuto');
    canvas.dispatch('touchend', touchEvent([]));
    assert(input.isPressed('ArrowRight') === false, '3: alzo l\'altro, rilasciato');
    controls.destroy();
    input.destroy();
}

// 4. scivolo da left a up
{
    const { canvas, input, controls } = setup();
    const left = pos(controls, 'left');
    const up = pos(controls, 'up');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...left }]));
    assert(input.isPressed('ArrowLeft') === true, '4: left premuto');
    canvas.dispatch('touchmove', touchEvent([{ id: 1, ...up }]));
    assert(input.isPressed('ArrowLeft') === false, '4: left rilasciato dopo lo scivolo');
    assert(input.isPressed('ArrowUp') === true, '4: up premuto');
    canvas.dispatch('touchend', touchEvent([]));
    assert(input.isPressed('ArrowLeft') === false && input.isPressed('ArrowUp') === false, '4: dopo touchend tutto rilasciato');
    controls.destroy();
    input.destroy();
}

// 4b. touchcancel come touchend, e scivolo con un secondo dito fermo sullo stesso pulsante
{
    const { canvas, input, controls } = setup();
    const left = pos(controls, 'left');
    const up = pos(controls, 'up');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...left }]));
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...left }, { id: 2, ...left }]));
    canvas.dispatch('touchmove', touchEvent([{ id: 1, ...up }, { id: 2, ...left }]));
    assert(input.isPressed('ArrowLeft') === true, '4b: l\'altro dito tiene left');
    assert(input.isPressed('ArrowUp') === true, '4b: up premuto');
    canvas.dispatch('touchcancel', touchEvent([]));
    assert(input.isPressed('ArrowLeft') === false && input.isPressed('ArrowUp') === false, '4b: touchcancel rilascia');
    controls.destroy();
    input.destroy();
}

// 5. dito su right poi fuori dai pulsanti
{
    const { canvas, input, controls } = setup();
    const right = pos(controls, 'right');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...right }]));
    assert(input.isPressed('ArrowRight') === true, '5: right premuto');
    canvas.dispatch('touchmove', touchEvent([{ id: 1, x: 400, y: 100 }]));
    assert(input.isPressed('ArrowRight') === false, '5: fuori dai pulsanti, rilasciato');
    assert(Object.keys(controls.activeTouches).length === 0, '5: activeTouches vuoto');
    controls.destroy();
    input.destroy();
}

// 6. destroy
{
    const { canvas, input, controls } = setup();
    const left = pos(controls, 'left');
    const action = pos(controls, 'action');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...left }, { id: 2, ...action }]));
    assert(input.isPressed('ArrowLeft') === true && input.isPressed('Space') === true, '6: premuti prima di destroy');
    assert(window.count('resize') === 1, '6: resize registrato');

    controls.destroy();
    assert(input.isPressed('ArrowLeft') === false, '6: ArrowLeft rilasciato da destroy');
    assert(input.isPressed('Space') === false && input.isPressed(' ') === false, '6: Space rilasciato da destroy');
    assert(Object.keys(controls.activeTouches).length === 0, '6: activeTouches svuotato');
    assert(window.count('resize') === 0, '6: resize rimosso');
    // BeeInput tiene ancora un listener per tipo; BeeTouchControls nessuno.
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
        assert(canvas.count(type) === 1, `6: ${type} solo di BeeInput (${canvas.count(type)})`);
    }

    // Dopo destroy un evento non fa più nulla.
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...left }]));
    assert(input.isPressed('ArrowLeft') === false, '6: dopo destroy non reagisce');

    // Idempotente.
    controls.destroy();
    controls.destroy();
    assert(canvas.count('touchstart') === 1, '6: destroy ripetuto non rompe nulla');
    input.destroy();
}

// 6b. due istanze: la prima distrutta non lascia listener
{
    const canvas = canvasOf(800, 480);
    const input = new BeeInput(canvas);
    const first = new BeeTouchControls(canvas, input);
    first.destroy();
    const second = new BeeTouchControls(canvas, input);
    assert(canvas.count('touchstart') === 2, '6b: BeeInput + una sola istanza attiva');
    second.destroy();
    input.destroy();
}

// 7. validazione del costruttore
{
    const canvas = canvasOf(800, 480);
    const input = new BeeInput(canvas);
    let message = '';
    try {
        new BeeTouchControls(null, input);
    } catch (err) {
        message = err.message;
    }
    assert(message === 'BeeTouchControls: canvas required', '7: canvas required');

    for (const bad of [null, undefined, {}, { setKey: 1 }]) {
        message = '';
        try {
            new BeeTouchControls(canvas, bad);
        } catch (err) {
            message = err.message;
        }
        assert(message === 'BeeTouchControls: input required', '7: input required');
    }
    assert(canvas.count('touchstart') === 1, '7: un costruttore fallito non lascia listener');
    input.destroy();
}

// 8. canvas senza dimensione: null, nessun lancio, tocco ignorato
{
    const canvas = canvasOf(800, 480, { left: 0, top: 0, width: 0, height: 0 });
    const input = new BeeInput(canvas);
    const controls = new BeeTouchControls(canvas, input);
    assert(controls.getCanvasCoords({ clientX: 10, clientY: 10 }) === null, '8: rect vuoto -> null');
    assert(controls.getCanvasCoords(null) === null, '8: tocco nullo -> null');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, x: 45, y: 385 }]));
    assert(input.isPressed('ArrowLeft') === false, '8: tocco ignorato');
    assert(Object.keys(controls.activeTouches).length === 0, '8: nessun tocco attivo');

    const huge = canvasOf(Infinity, Infinity, { left: 0, top: 0, width: 800, height: 480 });
    const other = new BeeTouchControls(huge, { setKey() {} });
    assert(other.getCanvasCoords({ clientX: 1, clientY: 1 }) === null, '8: scala non finita -> null');
    other.destroy();
    controls.destroy();
    input.destroy();
}

// 9. canvas scalato in CSS: le coordinate seguono la scala
{
    const canvas = canvasOf(800, 480, { left: 100, top: 50, width: 400, height: 240 });
    const input = new BeeInput(canvas);
    const controls = new BeeTouchControls(canvas, input);
    const c = controls.getCanvasCoords({ clientX: 100 + 22.5, clientY: 50 + 192.5 });
    assert(Math.abs(c.x - 45) < 1e-9 && Math.abs(c.y - 385) < 1e-9, '9: scala CSS');
    canvas.dispatch('touchstart', touchEvent([{ id: 1, x: 122.5, y: 242.5 }]));
    assert(input.isPressed('ArrowLeft') === true, '9: tocco scalato su left');
    controls.destroy();
    input.destroy();
}

// 10. draw non rompe e usa save/restore bilanciati
{
    const { input, controls, canvas } = setup();
    let depth = 0;
    const ctx = new Proxy({}, {
        get(_, prop) {
            if (prop === 'save') return () => { depth++; };
            if (prop === 'restore') return () => { depth--; };
            return () => {};
        },
        set() {
            return true;
        }
    });
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...pos(controls, 'up') }]));
    controls.draw(ctx);
    assert(depth === 0, '10: save/restore bilanciati');
    controls.destroy();
    input.destroy();
}

console.log('BeeTouchControls tests ok');
