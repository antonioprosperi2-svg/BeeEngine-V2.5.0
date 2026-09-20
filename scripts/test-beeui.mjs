import {
    BeeUI,
    BeePanel,
    BeeStack,
    BeeLabel,
    BeeUIButton,
    BEE_ANCHOR,
    drawNineSlice
} from '../src/ui/BeeUI.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const ui = new BeeUI({ width: 800, height: 600 });

const left = new BeeLabel({
    text: 'SCORE',
    anchor: BEE_ANCHOR.TOP_LEFT,
    x: 16,
    y: 16,
    width: 200,
    height: 32
});
const right = new BeeLabel({
    text: 'HP',
    anchor: BEE_ANCHOR.TOP_RIGHT,
    x: 16,
    y: 16,
    width: 120,
    height: 32
});
const bar = new BeePanel({
    anchor: BEE_ANCHOR.BOTTOM,
    y: 0,
    height: 40,
    margin: 0,
    background: '#111'
});
ui.add(left);
ui.add(right);
ui.add(bar);
ui.layout({ x: 0, y: 0, w: 800, h: 600 });

assert(left.rect.x === 16 && left.rect.y === 16, 'topLeft');
assert(Math.abs(right.rect.x - (800 - 16 - 120)) < 1, 'topRight x=' + right.rect.x);
assert(bar.rect.y === 560 && bar.rect.w === 800 && bar.rect.h === 40, 'bottom stretch');

const stack = new BeeStack({
    anchor: BEE_ANCHOR.CENTER,
    padding: 8,
    gap: 8
});
const a = new BeeUIButton({ text: 'A' });
const b = new BeeUIButton({ text: 'B' });
stack.add(a);
stack.add(b);
ui.add(stack);
ui.markDirty();
ui.layout({ x: 0, y: 0, w: 800, h: 600 });

assert(b.rect.y > a.rect.y, 'stack verticale');
assert(Math.abs(a.rect.w - b.rect.w) < 1, 'stack stretch stessa larghezza');
assert(Math.abs((stack.rect.x + stack.rect.w / 2) - 400) < 2, 'stack centrato');

ui.focus = a;
ui.focusNext();
assert(ui.focus === b, 'focusNext');
ui.focusPrev();
assert(ui.focus === a, 'focusPrev wrap');

let clicks = 0;
a.onClick = () => { clicks += 1; };
const down = {
    mouse: { x: a.rect.x + 8, y: a.rect.y + 8, pressed: true, wasPressed: true },
    wasPressed: () => false,
    isPressed: () => false
};
ui.update(down);
const up = {
    mouse: { x: a.rect.x + 8, y: a.rect.y + 8, pressed: false, wasPressed: false },
    wasPressed: () => false,
    isPressed: () => false
};
ui.update(up);
assert(clicks === 1, 'click sullo spazio schermo, clicks=' + clicks);
assert(ui.focus === a, 'click prende il focus');

const calls = [];
const fakeCtx = {
    drawImage(_img, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (arguments.length === 9) calls.push({ dw, dh });
    }
};
drawNineSlice(fakeCtx, { width: 12, height: 12 }, 0, 0, 100, 60, { left: 4, top: 4, right: 4, bottom: 4 });
assert(calls.length === 9, 'nine-slice 9 tile');
assert(calls[4].dw === 92 && calls[4].dh === 52, 'centro nine-slice');

console.log('BeeUI tests ok');
