import { BeeVirtualDPad } from '../src/input/BeeVirtualDPad.js';

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
    canvas.rect = { left: 0, top: 0, width: rectWidth, height: rectHeight };
    canvas.getBoundingClientRect = () => canvas.rect;
    canvas.captured = [];
    canvas.released = [];
    canvas.setPointerCapture = (id) => canvas.captured.push(id);
    canvas.releasePointerCapture = (id) => canvas.released.push(id);
    return canvas;
}

function pointer(id, x, y) {
    return { pointerId: id, clientX: x, clientY: y };
}

function dirs(pad) {
    const s = pad.state;
    return [s.up && 'up', s.down && 'down', s.left && 'left', s.right && 'right'].filter(Boolean).join('+');
}

// Pad al centro (200, 200), size 120: radius 60, zona morta 12.
function setup(options = {}) {
    const canvas = canvasOf(800, 480);
    const pad = new BeeVirtualDPad({ canvas, x: 200, y: 200, ...options });
    return { canvas, pad };
}

function press(canvas, id, x, y) {
    canvas.dispatch('pointerdown', pointer(id, x, y));
}

function move(id, x, y) {
    window.dispatch('pointermove', pointer(id, x, y));
}

// --- costruttore ---
{
    const canvas = canvasOf(800, 480);
    const fail = (config) => {
        try {
            new BeeVirtualDPad(config);
        } catch (err) {
            return err.message;
        }
        return '';
    };
    assert(fail() === 'BeeVirtualDPad: canvas required', 'senza config lancia canvas required');
    assert(fail({ x: 1, y: 1 }) === 'BeeVirtualDPad: canvas required', 'senza canvas lancia');
    assert(fail({ canvas, x: NaN, y: 1 }) === 'BeeVirtualDPad: x must be a finite number', 'x NaN');
    assert(fail({ canvas, x: Infinity, y: 1 }) === 'BeeVirtualDPad: x must be a finite number', 'x Infinity');
    assert(fail({ canvas, x: '10', y: 1 }) === 'BeeVirtualDPad: x must be a finite number', 'x stringa');
    assert(fail({ canvas, y: 1 }) === 'BeeVirtualDPad: x must be a finite number', 'x mancante');
    assert(fail({ canvas, x: 1, y: NaN }) === 'BeeVirtualDPad: y must be a finite number', 'y NaN');
    assert(fail({ canvas, x: 1 }) === 'BeeVirtualDPad: y must be a finite number', 'y mancante');
    const sizeMessage = 'BeeVirtualDPad: size must be a finite number greater than 0';
    assert(fail({ canvas, x: 1, y: 1, size: 0 }) === sizeMessage, 'size 0');
    assert(fail({ canvas, x: 1, y: 1, size: -5 }) === sizeMessage, 'size negativa');
    assert(fail({ canvas, x: 1, y: 1, size: NaN }) === sizeMessage, 'size NaN');
    assert(fail({ canvas, x: 1, y: 1, size: null }) === sizeMessage, 'size null');
    assert(canvas.count('pointerdown') === 0, 'un costruttore fallito non lascia listener');

    const pad = new BeeVirtualDPad({ canvas, x: 0, y: 0 });
    assert(pad.size === 120 && pad.radius === 60 && pad.eightWay === false, 'default: size 120, radius 60, quattro direzioni');
    assert(pad.isPressed === false && pad.pointerId === null, 'parte rilasciato');
    assert(dirs(pad) === '', 'parte senza direzioni');
    pad.destroy();
}

// --- 4 direzioni ---
{
    const { canvas, pad } = setup();
    const cases = [
        ['su', 200, 160, 'up'],
        ['giù', 200, 240, 'down'],
        ['sinistra', 160, 200, 'left'],
        ['destra', 240, 200, 'right'],
        ['quasi destra', 240, 220, 'right'],
        ['diagonale esatta in basso a destra: vince il verticale', 230, 230, 'down'],
        ['diagonale esatta in alto a sinistra: vince il verticale', 170, 170, 'up']
    ];
    for (const [name, x, y, expected] of cases) {
        press(canvas, 1, x, y);
        assert(dirs(pad) === expected, `4 direzioni, ${name}: ${dirs(pad)}`);
        window.dispatch('pointerup', pointer(1, x, y));
        assert(dirs(pad) === '' && pad.isPressed === false, `4 direzioni, ${name}: rilascio`);
    }
    pad.destroy();
}

// --- 8 direzioni ---
{
    const { canvas, pad } = setup({ eightWay: true });
    const r = 40;
    const at = (deg) => [200 + r * Math.cos((deg * Math.PI) / 180), 200 + r * Math.sin((deg * Math.PI) / 180)];
    // L'asse y va verso il basso: 90° è giù, 270° è su.
    const cases = [
        [0, 'right'],
        [10, 'right'],
        [45, 'down+right'],
        [90, 'down'],
        [135, 'down+left'],
        [180, 'left'],
        [225, 'up+left'],
        [270, 'up'],
        [315, 'up+right']
    ];
    for (const [deg, expected] of cases) {
        const [x, y] = at(deg);
        press(canvas, 1, x, y);
        const got = dirs(pad).split('+').sort().join('+');
        assert(got === expected.split('+').sort().join('+'), `8 direzioni a ${deg}°: ${got}`);
        window.dispatch('pointerup', pointer(1, x, y));
    }

    // Soglia a sin(PI/8): appena sotto resta una direzione, appena sopra ne arrivano due.
    const [bx, by] = [200 + 40 * Math.cos(Math.PI / 8 - 0.01), 200 + 40 * Math.sin(Math.PI / 8 - 0.01)];
    press(canvas, 1, bx, by);
    assert(dirs(pad) === 'right', `sotto la soglia: ${dirs(pad)}`);
    move(1, 200 + 40 * Math.cos(Math.PI / 8 + 0.01), 200 + 40 * Math.sin(Math.PI / 8 + 0.01));
    assert(dirs(pad) === 'down+right', `sopra la soglia: ${dirs(pad)}`);
    window.dispatch('pointerup', pointer(1, 0, 0));
    pad.destroy();
}

// --- zona morta ---
{
    const { canvas, pad } = setup();
    press(canvas, 7, 230, 200);
    assert(dirs(pad) === 'right', 'fuori dalla zona morta: destra');
    move(7, 203, 201);
    assert(dirs(pad) === '', 'nella zona morta: nessuna direzione');
    assert(pad.isPressed === true && pad.pointerId === 7, 'nella zona morta il pad resta tenuto');
    move(7, 200, 200);
    assert(dirs(pad) === '' && pad.isPressed === true, 'al centro esatto: nessuna direzione, ancora tenuto');
    move(7, 200, 170);
    assert(dirs(pad) === 'up', 'dalla zona morta il pad risponde ancora');
    move(7, 212, 200);
    assert(dirs(pad) === '', 'il bordo della zona morta (distanza = radius * 0.2) è dentro');
    move(7, 213, 200);
    assert(dirs(pad) === 'right', 'appena fuori dalla zona morta');

    // Pointerdown dentro la zona morta: il pad è già del dito, senza direzioni.
    window.dispatch('pointerup', pointer(7, 0, 0));
    press(canvas, 8, 201, 201);
    assert(pad.isPressed === true && pad.pointerId === 8 && dirs(pad) === '', 'pointerdown nella zona morta prende il pad');
    move(8, 260, 200);
    assert(dirs(pad) === 'right', 'poi si muove');
    window.dispatch('pointerup', pointer(8, 0, 0));
    pad.destroy();
}

// --- uscita dal cerchio ---
{
    const { canvas, pad } = setup();
    press(canvas, 1, 230, 200);
    move(1, 700, 200);
    assert(pad.isPressed === true && pad.pointerId === 1, 'fuori dal cerchio il pad resta tenuto');
    assert(dirs(pad) === 'right', 'fuori dal cerchio segue ancora il dito: destra');
    move(1, 200, 0);
    assert(dirs(pad) === 'up', 'molto sopra: su');
    move(1, 200, 480);
    assert(dirs(pad) === 'down', 'molto sotto: giù');
    move(1, -300, 210);
    assert(dirs(pad) === 'left', 'molto a sinistra: sinistra');
    window.dispatch('pointerup', pointer(1, -300, 210));
    assert(pad.isPressed === false && dirs(pad) === '', 'il rilascio fuori dal cerchio chiude');

    // Con otto direzioni anche fuori dal cerchio.
    const wide = setup({ eightWay: true });
    press(wide.canvas, 1, 240, 240);
    move(1, 700, 470);
    assert(dirs(wide.pad).split('+').sort().join('+') === 'down+right', '8 direzioni fuori dal cerchio: diagonale');
    window.dispatch('pointerup', pointer(1, 0, 0));
    wide.pad.destroy();

    // Un pointerdown fuori dal raggio non prende il pad.
    press(canvas, 2, 300, 200);
    assert(pad.isPressed === false && pad.pointerId === null, 'pointerdown fuori dal raggio non prende il pad');
    move(2, 230, 200);
    assert(pad.isPressed === false && dirs(pad) === '', 'un pointermove di un pointer estraneo è ignorato');
    pad.destroy();
}

// --- dito che attraversa il centro ---
{
    const { canvas, pad } = setup();
    press(canvas, 1, 150, 200);
    assert(dirs(pad) === 'left', 'attraversamento: parte a sinistra');
    move(1, 180, 200);
    assert(dirs(pad) === 'left', 'attraversamento: ancora sinistra');
    move(1, 204, 200);
    assert(dirs(pad) === '' && pad.isPressed === true, 'attraversamento: zona morta, ancora tenuto');
    move(1, 230, 200);
    assert(dirs(pad) === 'right', 'attraversamento: destra senza perdere il controllo');
    assert(pad.pointerId === 1, 'attraversamento: stesso pointer');
    window.dispatch('pointerup', pointer(1, 230, 200));
    assert(pad.isPressed === false, 'attraversamento: rilascio');
    pad.destroy();
}

// --- pointerup e pointercancel ---
{
    const { canvas, pad } = setup();
    press(canvas, 3, 230, 200);
    assert(canvas.captured.join() === '3', 'pointerdown cattura il pointer');
    window.dispatch('pointerup', pointer(99, 0, 0));
    assert(pad.isPressed === true && dirs(pad) === 'right', 'pointerup di un altro pointer è ignorato');
    window.dispatch('pointerup', pointer(3, 230, 200));
    assert(pad.isPressed === false && pad.pointerId === null && dirs(pad) === '', 'pointerup azzera tutto');
    assert(canvas.released.join() === '3', 'pointerup rilascia il capture');

    press(canvas, 4, 160, 200);
    assert(dirs(pad) === 'left', 'si può riprendere dopo il rilascio');
    window.dispatch('pointercancel', pointer(4, 160, 200));
    assert(pad.isPressed === false && pad.pointerId === null && dirs(pad) === '', 'pointercancel azzera tutto');
    assert(canvas.released.join() === '3,4', 'pointercancel rilascia il capture');

    // Un rilascio senza pad tenuto non fa niente (nemmeno un release del capture).
    window.dispatch('pointerup', pointer(4, 0, 0));
    assert(canvas.released.length === 2, 'rilascio a pad libero: nessun release');

    // Un capture che lancia non rompe niente.
    canvas.releasePointerCapture = () => { throw new Error('boom'); };
    canvas.setPointerCapture = () => { throw new Error('boom'); };
    press(canvas, 5, 230, 200);
    assert(pad.isPressed === true, 'setPointerCapture che lancia: il pad si accende lo stesso');
    window.dispatch('pointerup', pointer(5, 0, 0));
    assert(pad.isPressed === false, 'releasePointerCapture che lancia: il pad si rilascia lo stesso');
    pad.destroy();
}

// --- pointerId 0 è un pointer valido ---
{
    const { canvas, pad } = setup();
    press(canvas, 0, 230, 200);
    assert(pad.isPressed === true && pad.pointerId === 0, 'pointerId 0 prende il pad');
    press(canvas, 1, 160, 200);
    assert(pad.pointerId === 0 && dirs(pad) === 'right', 'con pointerId 0 il secondo dito è ignorato');
    window.dispatch('pointerup', pointer(0, 0, 0));
    assert(pad.isPressed === false && pad.pointerId === null, 'pointerId 0 si rilascia');
    pad.destroy();
}

// --- secondo dito ignorato ---
{
    const { canvas, pad } = setup();
    press(canvas, 1, 230, 200);
    press(canvas, 2, 160, 200);
    assert(pad.pointerId === 1 && dirs(pad) === 'right', 'il secondo pointerdown dentro il raggio è ignorato');
    assert(canvas.captured.join() === '1', 'il secondo dito non cattura nulla');
    move(2, 200, 160);
    assert(dirs(pad) === 'right', 'il pointermove del secondo dito è ignorato');
    window.dispatch('pointerup', pointer(2, 160, 200));
    assert(pad.isPressed === true && pad.pointerId === 1, 'il pointerup del secondo dito è ignorato');
    move(1, 200, 160);
    assert(dirs(pad) === 'up', 'il primo dito continua a comandare');
    window.dispatch('pointerup', pointer(1, 200, 160));
    assert(pad.isPressed === false, 'il primo dito rilascia');

    // Appena libero, il secondo dito può prendere il pad.
    press(canvas, 2, 160, 200);
    assert(pad.pointerId === 2 && dirs(pad) === 'left', 'a pad libero il secondo dito lo prende');
    window.dispatch('pointerup', pointer(2, 160, 200));
    pad.destroy();
}

// --- destroy ---
{
    const base = {
        move: window.count('pointermove'),
        up: window.count('pointerup'),
        cancel: window.count('pointercancel')
    };
    const { canvas, pad } = setup({ eightWay: true });
    assert(canvas.count('pointerdown') === 1, 'destroy: un pointerdown registrato');
    assert(window.count('pointermove') === base.move + 1, 'destroy: pointermove registrato');
    assert(typeof pad.onPointerDown === 'function' && typeof pad.onPointerMove === 'function' && typeof pad.onPointerUp === 'function', 'i listener sono salvati nei campi');

    press(canvas, 1, 230, 200);
    assert(pad.isPressed === true, 'destroy: il pad è tenuto prima');
    pad.destroy();
    assert(canvas.count('pointerdown') === 0, 'destroy toglie pointerdown');
    assert(window.count('pointermove') === base.move, 'destroy toglie pointermove');
    assert(window.count('pointerup') === base.up, 'destroy toglie pointerup');
    assert(window.count('pointercancel') === base.cancel, 'destroy toglie pointercancel');
    assert(dirs(pad) === '' && pad.isPressed === false && pad.pointerId === null, 'destroy azzera stato, isPressed e pointerId');
    assert(canvas.released.join() === '1', 'destroy rilascia il capture');

    press(canvas, 2, 230, 200);
    assert(pad.isPressed === false && dirs(pad) === '', 'dopo destroy un pointerdown non riaccende il pad');
    // Anche chiamando a mano il listener dopo destroy.
    pad.onPointerDown(pointer(3, 230, 200));
    pad.onPointerMove(pointer(3, 230, 200));
    assert(pad.isPressed === false && pad.pointerId === null, 'dopo destroy nemmeno a mano');

    pad.destroy();
    pad.destroy();
    assert(canvas.count('pointerdown') === 0 && window.count('pointermove') === base.move, 'due destroy di fila non rompono nulla');

    // Due pad sullo stesso canvas: distruggere uno non tocca l'altro.
    const c2 = canvasOf(800, 480);
    const a = new BeeVirtualDPad({ canvas: c2, x: 100, y: 100 });
    const b = new BeeVirtualDPad({ canvas: c2, x: 100, y: 100 });
    a.destroy();
    c2.dispatch('pointerdown', pointer(1, 130, 100));
    assert(a.isPressed === false && b.isPressed === true, 'distruggere un pad non spegne l\'altro');
    window.dispatch('pointerup', pointer(1, 0, 0));
    b.destroy();
}

// --- render ---
{
    const { pad } = setup();
    pad.render(null);
    pad.render(undefined);
    pad.render();

    const calls = [];
    const ctx = new Proxy({}, {
        get(_, prop) {
            return (...args) => calls.push([prop, ...args]);
        },
        set(_, prop, value) {
            calls.push(['set:' + prop, value]);
            return true;
        }
    });
    pad.render(ctx);
    const count = (name) => calls.filter((c) => c[0] === name).length;
    assert(count('beginPath') === 1, 'render: un solo beginPath');
    assert(count('moveTo') === 1 && count('lineTo') === 11, 'render: 12 vertici (1 moveTo + 11 lineTo)');
    assert(count('closePath') === 1, 'render: il percorso si chiude');
    assert(count('rect') === 0, 'render: niente rect sovrapposti');
    assert(count('fill') === 1 && count('stroke') === 1, 'render: un fill e uno stroke');
    assert(count('save') === 1 && count('restore') === 1, 'render: save/restore bilanciati');
    assert(count('fillRect') === 0, 'render: nessuna zona premuta a riposo');

    // I vertici della croce sono quelli attesi (radius 60, braccio 0.35 * 60 = 21).
    const pts = calls.filter((c) => c[0] === 'moveTo' || c[0] === 'lineTo').map((c) => [c[1], c[2]]);
    const a = 21 / 2;
    const expected = [[-a, -60], [a, -60], [a, -a], [60, -a], [60, a], [a, a], [a, 60], [-a, 60], [-a, a], [-60, a], [-60, -a], [-a, -a]];
    assert(JSON.stringify(pts) === JSON.stringify(expected), 'render: vertici della croce');

    // Le zone premute restano.
    calls.length = 0;
    pad.state.up = true;
    pad.state.right = true;
    pad.render(ctx);
    assert(count('fillRect') === 2, 'render: una zona per direzione premuta');
    const colors = calls.filter((c) => c[0] === 'set:fillStyle').map((c) => c[1]);
    assert(colors[0] === 'rgba(0, 0, 0, 0.4)' && colors[1] === 'rgba(255, 255, 255, 0.7)', 'render: colori invariati');
    pad.destroy();
}

// --- canvas con rect a zero ---
{
    const canvas = canvasOf(800, 480, 0, 0);
    const pad = new BeeVirtualDPad({ canvas, x: 200, y: 200 });
    assert(pad.canvasPoint(pointer(1, 200, 200)) === null, 'canvasPoint: rect 0×0 → null');
    press(canvas, 1, 230, 200);
    assert(pad.isPressed === false && pad.pointerId === null, 'rect 0×0: il pointerdown è ignorato');

    canvas.rect = { left: 0, top: 0, width: 0, height: 480 };
    assert(pad.canvasPoint(pointer(1, 1, 1)) === null, 'canvasPoint: larghezza 0 → null');
    canvas.rect = { left: 0, top: 0, width: 800, height: 0 };
    assert(pad.canvasPoint(pointer(1, 1, 1)) === null, 'canvasPoint: altezza 0 → null');
    canvas.rect = { left: 0, top: 0, width: 800, height: 480 };
    canvas.width = Infinity;
    assert(pad.canvasPoint(pointer(1, 1, 1)) === null, 'canvasPoint: scala non finita → null');
    canvas.width = 800;
    assert(pad.canvasPoint(null) === null, 'canvasPoint: evento nullo → null');

    // Se il rect sparisce mentre il dito è giù, il movimento è ignorato e il pad non si perde.
    press(canvas, 1, 230, 200);
    assert(dirs(pad) === 'right', 'rect tornato valido: il pad risponde');
    canvas.rect = { left: 0, top: 0, width: 0, height: 0 };
    move(1, 160, 200);
    assert(pad.isPressed === true && dirs(pad) === 'right', 'rect 0×0 a metà: il movimento è ignorato, stato invariato');
    canvas.rect = { left: 0, top: 0, width: 800, height: 480 };
    move(1, 160, 200);
    assert(dirs(pad) === 'left', 'poi riprende');
    window.dispatch('pointerup', pointer(1, 0, 0));
    pad.destroy();
}

// --- canvas scalato in CSS ---
{
    const canvas = canvasOf(800, 480, 400, 240);
    canvas.rect = { left: 100, top: 50, width: 400, height: 240 };
    const pad = new BeeVirtualDPad({ canvas, x: 200, y: 200 });
    const p = pad.canvasPoint(pointer(1, 100 + 115, 50 + 100));
    assert(Math.abs(p.x - 230) < 1e-9 && Math.abs(p.y - 200) < 1e-9, 'canvasPoint segue la scala CSS');
    press(canvas, 1, 100 + 115, 50 + 100);
    assert(dirs(pad) === 'right', 'il pad risponde sul canvas scalato');
    window.dispatch('pointerup', pointer(1, 0, 0));
    pad.destroy();
}

// --- size e radius ---
{
    const { canvas, pad } = setup();
    press(canvas, 1, 200 + 80, 200);
    assert(pad.isPressed === false, 'size 120: 80 px dal centro è fuori');

    pad.size = 200;
    assert(pad.radius === 100, 'size 200 → radius 100');
    press(canvas, 1, 200 + 80, 200);
    assert(pad.isPressed === true && dirs(pad) === 'right', 'size 200: l\'area toccabile è cresciuta');
    window.dispatch('pointerup', pointer(1, 0, 0));

    // La zona morta segue il raggio: 20% di 100 = 20.
    press(canvas, 1, 200 + 19, 200);
    assert(dirs(pad) === '', 'zona morta al 20% del nuovo raggio');
    move(1, 200 + 21, 200);
    assert(dirs(pad) === 'right', 'appena oltre la zona morta del nuovo raggio');
    window.dispatch('pointerup', pointer(1, 0, 0));

    pad.radius = 30;
    assert(pad.size === 60 && pad.radius === 30, 'radius 30 → size 60');
    pad.radius = -4;
    pad.radius = NaN;
    pad.radius = 'x';
    assert(pad.size === 60, 'un radius non valido non cambia niente');
    pad.destroy();
}

console.log('BeeVirtualDPad tests ok');
