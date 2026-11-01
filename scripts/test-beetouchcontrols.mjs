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
function touchEvent(touches, changed) {
    const raw = (t) => ({ identifier: t.id, clientX: t.x, clientY: t.y });
    return {
        cancelable: true,
        preventDefault() {},
        touches: touches.map(raw),
        changedTouches: (changed || touches).map(raw)
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

// 11. un tocco su un pulsante virtuale non è un clic del mouse
{
    const { canvas, input, controls } = setup();
    const left = pos(controls, 'left');
    const action = pos(controls, 'action');

    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...left }]));
    assert(input.isPressed('ArrowLeft') === true, '11: il pulsante funziona');
    assert(input.mouse.pressed === false && input.mouse.wasPressed === false, '11: mouse non preme sul pulsante');
    assert(input.mouse.x === 0 && input.mouse.y === 0, '11: mouse non si sposta sul pulsante');

    // Il dito sul pulsante scivola via: resta del pulsante, nessun clic.
    canvas.dispatch('touchmove', touchEvent([{ id: 1, x: 400, y: 100 }]));
    assert(input.mouse.pressed === false && input.mouse.x === 0, '11: scivolare fuori non crea un clic');
    canvas.dispatch('touchend', touchEvent([]));

    // Un tocco fuori dai pulsanti resta un clic normale.
    input.endFrame();
    canvas.dispatch('touchstart', touchEvent([{ id: 2, x: 400, y: 100 }]));
    assert(input.mouse.pressed === true && input.mouse.wasPressed === true, '11: tocco libero preme');
    assert(input.mouse.x === 400 && input.mouse.y === 100, '11: tocco libero sposta il mouse');

    // Con il dito libero giù, un dito su un pulsante non cambia il clic né la posizione.
    input.endFrame();
    canvas.dispatch(
        'touchstart',
        touchEvent([{ id: 2, x: 400, y: 100 }, { id: 3, ...action }], [{ id: 3, ...action }])
    );
    assert(input.isPressed('Space') === true, '11: azione mentre l\'altro dito preme');
    assert(input.mouse.wasPressed === false, '11: il pulsante non crea un secondo clic');
    assert(input.mouse.x === 400 && input.mouse.y === 100, '11: mouse resta sul dito libero');
    canvas.dispatch('touchend', touchEvent([{ id: 3, ...action }], [{ id: 2, x: 400, y: 100 }]));
    assert(input.mouse.pressed === false, '11: alzato il dito libero, resta solo il pulsante: pressed false');
    assert(input.isPressed('Space') === true, '11: il pulsante resta premuto');
    canvas.dispatch('touchend', touchEvent([]));
    assert(input.isPressed('Space') === false, '11: azione rilasciata');

    // Dopo destroy il blocco non c'è più: lo stesso punto è un clic.
    controls.destroy();
    input.endFrame();
    canvas.dispatch('touchstart', touchEvent([{ id: 4, ...left }]));
    assert(input.mouse.pressed === true && input.mouse.wasPressed === true, '11: dopo destroy il punto è un clic');
    input.destroy();
}

// 11b. un input senza addTouchBlocker funziona come prima
{
    const canvas = canvasOf(800, 480);
    const keys = {};
    const input = { setKey(k, v) { keys[k] = v; } };
    const controls = new BeeTouchControls(canvas, input);
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...pos(controls, 'left') }]));
    assert(keys.ArrowLeft === true, '11b: funziona senza addTouchBlocker');
    controls.destroy();
}

// 12. setButtonKeys
{
    const { canvas, input, controls } = setup();
    const right = pos(controls, 'right');

    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...right }]));
    assert(input.isPressed('ArrowRight') === true, '12: parte con ArrowRight');
    controls.setButtonKeys('right', ['KeyD', 'KeyL']);
    assert(input.isPressed('ArrowRight') === false, '12: i tasti vecchi vengono rilasciati');
    assert(controls.buttons.right.key === 'KeyD', '12: key è il primo elemento');
    assert(controls.buttons.right.keys.join() === 'KeyD,KeyL', '12: keys aggiornato');
    canvas.dispatch('touchmove', touchEvent([{ id: 1, x: right.x + 2, y: right.y }]));
    assert(input.isPressed('KeyD') === true && input.isPressed('KeyL') === true, '12: i tasti nuovi si accendono');
    assert(input.isPressed('ArrowRight') === false, '12: ArrowRight non torna');
    canvas.dispatch('touchend', touchEvent([]));
    assert(input.isPressed('KeyD') === false && input.isPressed('KeyL') === false, '12: touchend rilascia i nuovi');

    // L'array passato viene copiato.
    const mine = ['KeyZ'];
    controls.setButtonKeys('up', mine);
    mine.push('KeyX');
    mine[0] = 'KeyQ';
    assert(controls.buttons.up.keys.join() === 'KeyZ' && controls.buttons.up.key === 'KeyZ', '12: copia dell\'array');

    // Un solo tasto, e l'azione resta sua con Space + ' ' finché non la cambi.
    controls.setButtonKeys('action', ['Enter']);
    assert(controls.buttons.action.key === 'Enter' && controls.buttons.action.keys.join() === 'Enter', '12: un solo tasto');
    canvas.dispatch('touchstart', touchEvent([{ id: 2, ...pos(controls, 'action') }]));
    assert(input.isPressed('Enter') === true && input.isPressed('Space') === false, '12: l\'azione usa Enter');
    canvas.dispatch('touchend', touchEvent([]));
    controls.destroy();
    input.destroy();
}

// 12b. input non validi: non cambia niente
{
    const { input, controls } = setup();
    const before = JSON.stringify(controls.buttons);
    const bad = [
        ['nope', ['KeyA']],
        ['toString', ['KeyA']],
        ['__proto__', ['KeyA']],
        [undefined, ['KeyA']],
        [null, ['KeyA']],
        [42, ['KeyA']],
        ['left', []],
        ['left', 'KeyA'],
        ['left', null],
        ['left', undefined],
        ['left', [1]],
        ['left', [null]],
        ['left', ['KeyA', 2]],
        ['left', ['']],
        ['left', { 0: 'KeyA', length: 1 }]
    ];
    for (const [name, keys] of bad) {
        controls.setButtonKeys(name, keys);
        assert(JSON.stringify(controls.buttons) === before, `12b: ${String(name)} / ${JSON.stringify(keys)} non cambia nulla`);
    }
    controls.setButtonKeys();
    assert(JSON.stringify(controls.buttons) === before, '12b: senza argomenti non cambia nulla');
    controls.destroy();
    input.destroy();
}

// 12c. un pulsante fermo non chiama setKey; un tasto condiviso resta premuto
{
    const canvas = canvasOf(800, 480);
    const calls = [];
    const down = new Set();
    const input = {
        setKey(k, v) {
            calls.push([k, v]);
            if (v) down.add(k);
            else down.delete(k);
        }
    };
    const controls = new BeeTouchControls(canvas, input);

    controls.setButtonKeys('left', ['KeyQ']);
    assert(calls.length === 0, '12c: pulsante non premuto, nessun setKey');

    controls.setButtonKeys('left', ['ArrowLeft']);
    controls.setButtonKeys('right', ['KeyA']);
    controls.setButtonKeys('left', ['KeyA']);
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...pos(controls, 'left') }, { id: 2, ...pos(controls, 'right') }]));
    assert(down.has('KeyA'), '12c: KeyA premuto da due pulsanti');
    controls.setButtonKeys('left', ['KeyB']);
    assert(down.has('KeyA') === true, '12c: KeyA resta premuto, lo tiene ancora right');
    canvas.dispatch('touchend', touchEvent([]));
    assert(down.size === 0, '12c: alla fine tutto rilasciato');

    // Se il pulsante era l'unico a tenere il tasto, lo rilascia.
    canvas.dispatch('touchstart', touchEvent([{ id: 1, ...pos(controls, 'left') }]));
    assert(down.has('KeyB') === true, '12c: KeyB premuto');
    controls.setButtonKeys('left', ['KeyC']);
    assert(down.has('KeyB') === false, '12c: KeyB rilasciato dal cambio');
    controls.destroy();
}

// 13. draw senza contesto esce in silenzio
{
    const { input, controls } = setup();
    controls.draw(null);
    controls.draw(undefined);
    controls.draw();
    let calls = 0;
    const spy = new Proxy({}, { get() { calls++; return () => {}; }, set() { return true; } });
    controls.draw(spy);
    assert(calls > 0, '13: con un contesto vero disegna ancora');
    controls.destroy();
    input.destroy();
}

console.log('BeeTouchControls tests ok');
