/**
 * BeeUI — nodi Control in spazio schermo.
 * Non è un BeeButton su canvas: ancoraggi, stack, nine-slice, focus tastiera/gamepad.
 * Vive dopo la camera; i menu restano vivi in pausa.
 */

export const BEE_ANCHOR = Object.freeze({
    TOP_LEFT: 'topLeft',
    TOP: 'top',
    TOP_RIGHT: 'topRight',
    LEFT: 'left',
    CENTER: 'center',
    RIGHT: 'right',
    BOTTOM_LEFT: 'bottomLeft',
    BOTTOM: 'bottom',
    BOTTOM_RIGHT: 'bottomRight',
    FULL: 'full'
});

export const BEE_UI_DEFAULTS = Object.freeze({
    gap: 8,
    padding: 12,
    buttonWidth: 220,
    buttonHeight: 44
});

export function drawNineSlice(ctx, image, x, y, w, h, slice = {}) {
    if (!ctx || !image) return;
    const iw = image.width || 0;
    const ih = image.height || 0;
    if (iw <= 0 || ih <= 0 || w <= 0 || h <= 0) return;

    const sl = Math.max(0, Number(slice.left ?? slice.l) || 0);
    const st = Math.max(0, Number(slice.top ?? slice.t) || 0);
    const sr = Math.max(0, Number(slice.right ?? slice.r) || 0);
    const sb = Math.max(0, Number(slice.bottom ?? slice.b) || 0);
    const midW = Math.max(1, iw - sl - sr);
    const midH = Math.max(1, ih - st - sb);
    const destMidW = Math.max(0, w - sl - sr);
    const destMidH = Math.max(0, h - st - sb);

    const tiles = [
        [0, 0, sl, st, x, y, sl, st],
        [sl, 0, midW, st, x + sl, y, destMidW, st],
        [iw - sr, 0, sr, st, x + w - sr, y, sr, st],
        [0, st, sl, midH, x, y + st, sl, destMidH],
        [sl, st, midW, midH, x + sl, y + st, destMidW, destMidH],
        [iw - sr, st, sr, midH, x + w - sr, y + st, sr, destMidH],
        [0, ih - sb, sl, sb, x, y + h - sb, sl, sb],
        [sl, ih - sb, midW, sb, x + sl, y + h - sb, destMidW, sb],
        [iw - sr, ih - sb, sr, sb, x + w - sr, y + h - sb, sr, sb]
    ];

    for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        if (t[2] <= 0 || t[3] <= 0 || t[6] <= 0 || t[7] <= 0) continue;
        ctx.drawImage(image, t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7]);
    }
}

function applyPreset(node, preset, box = {}) {
    const width = Number(box.width);
    const height = Number(box.height);
    const w = Number.isFinite(width) ? width : (node.prefWidth || 0);
    const h = Number.isFinite(height) ? height : (node.prefHeight || 0);
    const x = Number(box.x) || 0;
    const y = Number(box.y) || 0;
    const m = Number(box.margin) || 0;

    switch (preset) {
        case BEE_ANCHOR.TOP_LEFT:
            node.setAnchors(0, 0, 0, 0);
            node.setOffsets(x, y, x + w, y + h);
            break;
        case BEE_ANCHOR.TOP_RIGHT:
            node.setAnchors(1, 0, 1, 0);
            node.setOffsets(-(x + w), y, -x, y + h);
            break;
        case BEE_ANCHOR.BOTTOM_LEFT:
            node.setAnchors(0, 1, 0, 1);
            node.setOffsets(x, -(y + h), x + w, -y);
            break;
        case BEE_ANCHOR.BOTTOM_RIGHT:
            node.setAnchors(1, 1, 1, 1);
            node.setOffsets(-(x + w), -(y + h), -x, -y);
            break;
        case BEE_ANCHOR.CENTER:
            node.setAnchors(0.5, 0.5, 0.5, 0.5);
            node.setOffsets(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
            break;
        case BEE_ANCHOR.TOP:
            node.setAnchors(0, 0, 1, 0);
            node.setOffsets(m, y, -m, y + h);
            break;
        case BEE_ANCHOR.BOTTOM:
            node.setAnchors(0, 1, 1, 1);
            node.setOffsets(m, -(y + h), -m, -y);
            break;
        case BEE_ANCHOR.LEFT:
            node.setAnchors(0, 0, 0, 1);
            node.setOffsets(x, m, x + w, -m);
            break;
        case BEE_ANCHOR.RIGHT:
            node.setAnchors(1, 0, 1, 1);
            node.setOffsets(-(x + w), m, -x, -m);
            break;
        case BEE_ANCHOR.FULL:
            node.setAnchors(0, 0, 1, 1);
            node.setOffsets(m, m, -m, -m);
            break;
        default:
            node.setAnchors(0, 0, 0, 0);
            node.setOffsets(x, y, x + w, y + h);
    }
}

export class BeeControl {
    constructor(options = {}) {
        this.visible = options.visible !== false;
        this.disabled = options.disabled === true;
        this.focusable = options.focusable === true;
        this.name = options.name || '';
        this.onClick = typeof options.onClick === 'function' ? options.onClick : null;

        this.anchorLeft = 0;
        this.anchorTop = 0;
        this.anchorRight = 0;
        this.anchorBottom = 0;
        this.offsetLeft = 0;
        this.offsetTop = 0;
        this.offsetRight = 0;
        this.offsetBottom = 0;
        this.minWidth = Math.max(0, Number(options.minWidth) || 0);
        this.minHeight = Math.max(0, Number(options.minHeight) || 0);
        this.prefWidth = Number.isFinite(Number(options.width)) ? Number(options.width) : 0;
        this.prefHeight = Number.isFinite(Number(options.height)) ? Number(options.height) : 0;

        this.rect = { x: 0, y: 0, w: 0, h: 0 };
        this.hover = false;
        this.pressed = false;
        this.#parent = null;
        this.#children = [];

        if (options.anchor) this.anchor(options.anchor, options);
        else if (options.x != null || options.y != null) {
            this.anchor(BEE_ANCHOR.TOP_LEFT, options);
        }
    }

    #parent;
    #children;

    get parent() {
        return this.#parent;
    }

    get children() {
        return this.#children;
    }

    get focused() {
        return !!(this.#parent && this.root && this.root.focus === this);
    }

    get root() {
        let node = this;
        while (node.#parent) node = node.#parent;
        return node.ui || (node instanceof BeeUI ? node : null);
    }

    setAnchors(left, top, right, bottom) {
        this.anchorLeft = Number(left) || 0;
        this.anchorTop = Number(top) || 0;
        this.anchorRight = Number(right) || 0;
        this.anchorBottom = Number(bottom) || 0;
        return this;
    }

    setOffsets(left, top, right, bottom) {
        this.offsetLeft = Number(left) || 0;
        this.offsetTop = Number(top) || 0;
        this.offsetRight = Number(right) || 0;
        this.offsetBottom = Number(bottom) || 0;
        return this;
    }

    anchor(preset, box = {}) {
        applyPreset(this, preset, box);
        if (Number.isFinite(Number(box.width))) this.prefWidth = Number(box.width);
        if (Number.isFinite(Number(box.height))) this.prefHeight = Number(box.height);
        return this;
    }

    add(child) {
        if (!child || child === this) return child;
        if (child.#parent) child.#parent.remove(child);
        this.#children.push(child);
        child.#parent = this;
        const tree = this.root;
        if (tree && typeof tree.markDirty === 'function') tree.markDirty();
        return child;
    }

    remove(child) {
        const index = this.#children.indexOf(child);
        if (index < 0) return this;
        this.#children.splice(index, 1);
        if (child.#parent === this) child.#parent = null;
        const tree = this.root;
        if (tree && typeof tree.markDirty === 'function') tree.markDirty();
        return this;
    }

    contains(x, y) {
        const r = this.rect;
        return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    }

    hit(x, y) {
        if (!this.visible) return null;
        for (let i = this.#children.length - 1; i >= 0; i--) {
            const found = this.#children[i].hit(x, y);
            if (found) return found;
        }
        if (this.contains(x, y)) return this;
        return null;
    }

    fit(parentRect) {
        if (parentRect) this.#fit(parentRect);
        return this;
    }

    layout(parentRect) {
        this.fit(parentRect);
        this.measure();
        this.#layoutChildren();
        return this;
    }

    measure() {
        return this;
    }

    draw(_ctx) {}

    activate() {
        if (this.disabled || !this.visible) return false;
        if (this.onClick) {
            this.onClick(this);
            return true;
        }
        return false;
    }

    #fit(parentRect) {
        const x = parentRect.x + parentRect.w * this.anchorLeft + this.offsetLeft;
        const y = parentRect.y + parentRect.h * this.anchorTop + this.offsetTop;
        const w = parentRect.w * (this.anchorRight - this.anchorLeft) + (this.offsetRight - this.offsetLeft);
        const h = parentRect.h * (this.anchorBottom - this.anchorTop) + (this.offsetBottom - this.offsetTop);
        this.rect.x = x;
        this.rect.y = y;
        this.rect.w = Math.max(this.minWidth, w);
        this.rect.h = Math.max(this.minHeight, h);
    }

    #layoutChildren() {
        for (let i = 0; i < this.#children.length; i++) {
            this.#children[i].layout(this.rect);
        }
    }

    place(x, y, w, h) {
        this.rect.x = x;
        this.rect.y = y;
        this.rect.w = Math.max(this.minWidth, w);
        this.rect.h = Math.max(this.minHeight, h);
        this.measure();
        this.#layoutChildren();
        return this;
    }
}

export class BeePanel extends BeeControl {
    constructor(options = {}) {
        super(options);
        this.background = options.background || options.fill || null;
        this.border = options.border || null;
        this.image = options.image || null;
        this.slice = options.slice || null;
        this.radius = Math.max(0, Number(options.radius) || 0);
    }

    draw(ctx) {
        if (!this.visible || !ctx) return;
        const { x, y, w, h } = this.rect;
        if (this.image && this.slice) {
            drawNineSlice(ctx, this.image, x, y, w, h, this.slice);
        } else if (this.image) {
            ctx.drawImage(this.image, x, y, w, h);
        } else if (this.background) {
            ctx.fillStyle = this.background;
            if (this.radius > 0 && typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, this.radius);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, w, h);
            }
        }
        if (this.border) {
            ctx.strokeStyle = this.border;
            ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
        }
        const kids = this.children;
        for (let i = 0; i < kids.length; i++) {
            if (kids[i].visible) kids[i].draw(ctx);
        }
    }
}

export class BeeStack extends BeePanel {
    constructor(options = {}) {
        super(options);
        this.direction = options.direction === 'h' ? 'h' : 'v';
        this.gap = Number.isFinite(Number(options.gap)) ? Number(options.gap) : BEE_UI_DEFAULTS.gap;
        this.padding = Number.isFinite(Number(options.padding)) ? Number(options.padding) : BEE_UI_DEFAULTS.padding;
        this.stretch = options.stretch !== false;
    }

    measure() {
        const kids = this.children.filter((c) => c.visible);
        const pad = this.padding * 2;
        const gaps = Math.max(0, kids.length - 1) * this.gap;
        if (this.direction === 'h') {
            let w = pad + gaps;
            let h = 0;
            for (let i = 0; i < kids.length; i++) {
                kids[i].measure();
                w += kids[i].prefWidth || kids[i].minWidth || 0;
                h = Math.max(h, kids[i].prefHeight || kids[i].minHeight || 0);
            }
            if (!this.prefWidth) this.prefWidth = w;
            if (!this.prefHeight) this.prefHeight = h + pad;
        } else {
            let h = pad + gaps;
            let w = 0;
            for (let i = 0; i < kids.length; i++) {
                kids[i].measure();
                h += kids[i].prefHeight || kids[i].minHeight || 0;
                w = Math.max(w, kids[i].prefWidth || kids[i].minWidth || 0);
            }
            if (!this.prefWidth) this.prefWidth = w + pad;
            if (!this.prefHeight) this.prefHeight = h;
        }
        return this;
    }

    layout(parentRect) {
        if (parentRect) {
            this.measure();
            const stretchX = this.anchorRight !== this.anchorLeft;
            const stretchY = this.anchorBottom !== this.anchorTop;
            if (!stretchX && this.prefWidth) {
                if (this.anchorLeft === 0.5 && this.anchorRight === 0.5) {
                    this.offsetLeft = -this.prefWidth / 2;
                    this.offsetRight = this.prefWidth / 2;
                } else {
                    this.offsetRight = this.offsetLeft + this.prefWidth;
                }
            }
            if (!stretchY && this.prefHeight) {
                if (this.anchorTop === 0.5 && this.anchorBottom === 0.5) {
                    this.offsetTop = -this.prefHeight / 2;
                    this.offsetBottom = this.prefHeight / 2;
                } else {
                    this.offsetBottom = this.offsetTop + this.prefHeight;
                }
            }
            this.fit(parentRect);
        }

        const kids = this.children.filter((c) => c.visible);
        const pad = this.padding;
        let x = this.rect.x + pad;
        let y = this.rect.y + pad;
        const innerW = Math.max(0, this.rect.w - pad * 2);
        const innerH = Math.max(0, this.rect.h - pad * 2);

        for (let i = 0; i < kids.length; i++) {
            const child = kids[i];
            child.measure();
            if (this.direction === 'h') {
                const w = child.prefWidth || child.minWidth || 0;
                const h = this.stretch ? innerH : (child.prefHeight || child.minHeight || innerH);
                child.place(x, y, w, h);
                x += w + this.gap;
            } else {
                const h = child.prefHeight || child.minHeight || 0;
                const w = this.stretch ? innerW : (child.prefWidth || child.minWidth || innerW);
                child.place(x, y, w, h);
                y += h + this.gap;
            }
        }
        return this;
    }
}

export class BeeLabel extends BeeControl {
    constructor(options = {}) {
        super(options);
        this.text = options.text != null ? String(options.text) : '';
        this.font = options.font || '16px monospace';
        this.color = options.color || '#e2e8f0';
        this.align = options.align || 'left';
        this.baseline = options.baseline || 'middle';
        if (!this.prefHeight) this.prefHeight = 24;
        if (!this.prefWidth) this.prefWidth = 160;
    }

    draw(ctx) {
        if (!this.visible || !ctx) return;
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.align;
        ctx.textBaseline = this.baseline;
        const x = this.align === 'center'
            ? this.rect.x + this.rect.w / 2
            : this.align === 'right'
                ? this.rect.x + this.rect.w - 8
                : this.rect.x + 8;
        ctx.fillText(this.text, x, this.rect.y + this.rect.h / 2);
        const kids = this.children;
        for (let i = 0; i < kids.length; i++) {
            if (kids[i].visible) kids[i].draw(ctx);
        }
    }
}

export class BeeUIButton extends BeeControl {
    constructor(options = {}) {
        super({
            focusable: options.focusable !== false,
            width: options.width ?? BEE_UI_DEFAULTS.buttonWidth,
            height: options.height ?? BEE_UI_DEFAULTS.buttonHeight,
            ...options
        });
        this.text = options.text != null ? String(options.text) : 'OK';
        this.font = options.font || 'bold 16px monospace';
        this.color = options.color || '#0f172a';
        this.background = options.background || '#f8fafc';
        this.hoverBackground = options.hoverBackground || '#ffe08a';
        this.pressedBackground = options.pressedBackground || '#f0a202';
        this.focusBorder = options.focusBorder || '#38bdf8';
        this.radius = Math.max(0, Number(options.radius) || 6);
        if (!this.prefWidth) this.prefWidth = BEE_UI_DEFAULTS.buttonWidth;
        if (!this.prefHeight) this.prefHeight = BEE_UI_DEFAULTS.buttonHeight;
    }

    draw(ctx) {
        if (!this.visible || !ctx) return;
        const { x, y, w, h } = this.rect;
        let fill = this.background;
        if (this.disabled) fill = '#64748b';
        else if (this.pressed) fill = this.pressedBackground;
        else if (this.hover || this.focused) fill = this.hoverBackground;

        ctx.fillStyle = fill;
        if (this.radius > 0 && typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, this.radius);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, w, h);
        }

        if (this.focused && !this.disabled) {
            ctx.strokeStyle = this.focusBorder;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
            ctx.lineWidth = 1;
        }

        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, x + w / 2, y + h / 2);
    }
}

export class BeeUI extends BeePanel {
    /**
     * @param {{ canvas?: HTMLCanvasElement, width?: number, height?: number }} [options]
     */
    constructor(options = {}) {
        super({ anchor: BEE_ANCHOR.FULL, background: null });
        this.ui = this;
        this.canvas = options.canvas || null;
        this.focus = null;
        this.width = Number(options.width) || (this.canvas && this.canvas.width) || 800;
        this.height = Number(options.height) || (this.canvas && this.canvas.height) || 600;
        this.#dirty = true;
        this.#down = false;
        this.#pressed = null;
        this.#pad = new Set();
        this.#onKeyDown = (event) => this.#trapTab(event);
        if (this.canvas && typeof this.canvas.addEventListener === 'function') {
            if (this.canvas.tabIndex < 0) this.canvas.tabIndex = 0;
            this.canvas.addEventListener('keydown', this.#onKeyDown);
        }
    }

    #dirty;
    #down;
    #pressed;
    #pad;
    #onKeyDown;

    markDirty() {
        this.#dirty = true;
        return this;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.#dirty = true;
        return this;
    }

    collectFocusable(out = []) {
        const walk = (node) => {
            if (!node || !node.visible || node.disabled) return;
            if (node.focusable) out.push(node);
            const kids = node.children;
            for (let i = 0; i < kids.length; i++) walk(kids[i]);
        };
        walk(this);
        return out;
    }

    focusAt(index) {
        const list = this.collectFocusable();
        if (list.length === 0) {
            this.focus = null;
            return this;
        }
        const i = ((index % list.length) + list.length) % list.length;
        this.focus = list[i];
        return this;
    }

    focusNext() {
        const list = this.collectFocusable();
        if (list.length === 0) return this;
        const i = list.indexOf(this.focus);
        this.focus = list[(i + 1) % list.length];
        return this;
    }

    focusPrev() {
        const list = this.collectFocusable();
        if (list.length === 0) return this;
        const i = list.indexOf(this.focus);
        this.focus = list[(i - 1 + list.length) % list.length];
        return this;
    }

    focusToward(dx, dy) {
        const list = this.collectFocusable();
        if (list.length === 0) return this;
        const from = this.focus && list.includes(this.focus) ? this.focus : list[0];
        const fx = from.rect.x + from.rect.w / 2;
        const fy = from.rect.y + from.rect.h / 2;
        let best = null;
        let bestScore = Infinity;
        for (let i = 0; i < list.length; i++) {
            const node = list[i];
            if (node === from) continue;
            const nx = node.rect.x + node.rect.w / 2 - fx;
            const ny = node.rect.y + node.rect.h / 2 - fy;
            const along = nx * dx + ny * dy;
            if (along <= 4) continue;
            const side = Math.abs(nx * dy - ny * dx);
            const score = along + side * 2;
            if (score < bestScore) {
                bestScore = score;
                best = node;
            }
        }
        if (best) this.focus = best;
        else if (dx > 0 || dy > 0) this.focusNext();
        else this.focusPrev();
        return this;
    }

    update(input) {
        const canvas = this.canvas;
        if (canvas && (canvas.width !== this.width || canvas.height !== this.height)) {
            this.resize(canvas.width, canvas.height);
        }
        if (this.#dirty) {
            this.layout({ x: 0, y: 0, w: this.width, h: this.height });
            this.#dirty = false;
        }

        const mouse = input && input.mouse ? input.mouse : { x: -1, y: -1, pressed: false, wasPressed: false };
        const hit = this.hit(mouse.x, mouse.y);
        this.#clearHover(this);
        if (hit) hit.hover = true;

        if (mouse.wasPressed && hit && !hit.disabled) {
            this.#pressed = hit;
            hit.pressed = true;
            if (hit.focusable) this.focus = hit;
        }

        const released = this.#down && !mouse.pressed;
        if (released && this.#pressed) {
            if (hit === this.#pressed) this.#pressed.activate();
            this.#pressed.pressed = false;
            this.#pressed = null;
        }
        this.#down = !!mouse.pressed;

        if (input) this.#handleKeys(input);
        this.#handlePad();
        return this;
    }

    draw(ctx) {
        if (!ctx || !this.visible) return;
        if (this.#dirty) {
            this.layout({ x: 0, y: 0, w: this.width, h: this.height });
            this.#dirty = false;
        }
        const kids = this.children;
        for (let i = 0; i < kids.length; i++) {
            if (kids[i].visible) kids[i].draw(ctx);
        }
        return this;
    }

    destroy() {
        if (this.canvas && this.#onKeyDown) {
            this.canvas.removeEventListener('keydown', this.#onKeyDown);
        }
        return this;
    }

    #clearHover(node) {
        node.hover = false;
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) this.#clearHover(kids[i]);
    }

    #handleKeys(input) {
        if (input.wasPressed('Tab')) {
            if (input.isPressed('ShiftLeft') || input.isPressed('ShiftRight') || input.isPressed('Shift')) {
                this.focusPrev();
            } else {
                this.focusNext();
            }
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) this.focusToward(0, 1);
        if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) this.focusToward(0, -1);
        if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) this.focusToward(1, 0);
        if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) this.focusToward(-1, 0);
        if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter') || input.wasPressed('Space')) {
            if (this.focus) this.focus.activate();
        }
    }

    #handlePad() {
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
        const pads = navigator.getGamepads();
        const pad = pads && pads[0];
        if (!pad) return;
        const now = new Set();
        const map = { 0: 'ok', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
        const keys = Object.keys(map);
        for (let i = 0; i < keys.length; i++) {
            const id = Number(keys[i]);
            const btn = pad.buttons[id];
            if (btn && btn.pressed) now.add(map[id]);
        }
        const edge = (name) => now.has(name) && !this.#pad.has(name);
        if (edge('down')) this.focusToward(0, 1);
        if (edge('up')) this.focusToward(0, -1);
        if (edge('right')) this.focusToward(1, 0);
        if (edge('left')) this.focusToward(-1, 0);
        if (edge('ok') && this.focus) this.focus.activate();
        this.#pad = now;
    }

    #trapTab(event) {
        if (event.code !== 'Tab') return;
        if (this.collectFocusable().length === 0) return;
        event.preventDefault();
    }
}
