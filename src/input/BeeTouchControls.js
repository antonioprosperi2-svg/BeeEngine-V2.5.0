export class BeeTouchControls {
    #destroyed = false;
    #unblock = null;

    constructor(canvas, input) {
        if (!canvas) throw new Error('BeeTouchControls: canvas required');
        if (!input || typeof input.setKey !== 'function') throw new Error('BeeTouchControls: input required');

        this.canvas = canvas;
        this.input = input;

        this.btnSize = 50;
        this.margin = 20;

        // `key` è il nome principale; `keys` sono tutti i tasti che il pulsante accende.
        // L'azione scrive 'Space' (letto da BeePlayer e BeeMenuScene) e ' ' per compatibilità.
        this.buttons = {
            left: { key: 'ArrowLeft', keys: ['ArrowLeft'], x: 0, y: 0 },
            right: { key: 'ArrowRight', keys: ['ArrowRight'], x: 0, y: 0 },
            up: { key: 'ArrowUp', keys: ['ArrowUp'], x: 0, y: 0 },
            down: { key: 'ArrowDown', keys: ['ArrowDown'], x: 0, y: 0 },
            action: { key: 'Space', keys: ['Space', ' '], x: 0, y: 0 }
        };

        this.activeTouches = {};

        this.updatePositions();

        this.onResize = () => this.updatePositions();
        window.addEventListener('resize', this.onResize);

        this.onTouchStart = (e) => this.handleTouch(e);
        this.onTouchMove = (e) => this.handleTouch(e);
        this.onTouchEnd = (e) => this.handleTouchEnd(e);
        this.onTouchCancel = (e) => this.handleTouchEnd(e);
        canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', this.onTouchCancel, { passive: false });

        // Un tocco che nasce su un pulsante virtuale non deve diventare un clic del mouse
        // (BeeButton, BeeMenuScene). Un `input` senza addTouchBlocker si comporta come prima.
        if (typeof input.addTouchBlocker === 'function') {
            this.#unblock = input.addTouchBlocker((x, y) => this.getButtonAt(x, y) !== null);
        }
    }

    #keysOf(name) {
        const b = this.buttons[name];
        if (!b) return [];
        if (Array.isArray(b.keys) && b.keys.length > 0) return b.keys;
        return b.key ? [b.key] : [];
    }

    /**
     * Allinea i tasti virtuali ai tocchi correnti. Un tasto si rilascia solo quando
     * nessun dito è più su nessun pulsante che lo accende.
     */
    #sync(touches) {
        const next = {};
        if (touches) {
            for (let i = 0; i < touches.length; i++) {
                const touch = touches[i];
                const pos = this.getCanvasCoords(touch);
                if (!pos) continue;
                const name = this.getButtonAt(pos.x, pos.y);
                if (name) next[touch.identifier] = name;
            }
        }

        const before = new Set();
        for (const id in this.activeTouches) {
            const keys = this.#keysOf(this.activeTouches[id]);
            for (let i = 0; i < keys.length; i++) before.add(keys[i]);
        }
        const now = new Set();
        for (const id in next) {
            const keys = this.#keysOf(next[id]);
            for (let i = 0; i < keys.length; i++) now.add(keys[i]);
        }

        for (const key of before) {
            if (!now.has(key)) this.input.setKey(key, false);
        }
        for (const key of now) {
            this.input.setKey(key, true);
        }

        this.activeTouches = next;
    }

    /**
     * Cambia i tasti di un pulsante. `tasti` è un array non vuoto di stringhe non vuote;
     * il primo diventa `key`. Pulsante sconosciuto o array non valido: non fa niente.
     * Prima rilascia i tasti che il pulsante sta tenendo (se un altro pulsante attivo
     * li accende ancora, restano premuti).
     */
    setButtonKeys(name, keys) {
        if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(this.buttons, name)) return;
        if (!Array.isArray(keys) || keys.length === 0) return;
        for (let i = 0; i < keys.length; i++) {
            if (typeof keys[i] !== 'string' || keys[i] === '') return;
        }

        let held = false;
        const others = new Set();
        for (const id in this.activeTouches) {
            const active = this.activeTouches[id];
            if (active === name) {
                held = true;
                continue;
            }
            const list = this.#keysOf(active);
            for (let i = 0; i < list.length; i++) others.add(list[i]);
        }
        if (held) {
            const old = this.#keysOf(name);
            for (let i = 0; i < old.length; i++) {
                if (!others.has(old[i])) this.input.setKey(old[i], false);
            }
        }

        const button = this.buttons[name];
        button.keys = keys.slice();
        button.key = button.keys[0];
    }

    updatePositions() {
        const rect = this.canvas.getBoundingClientRect();

        const w = this.canvas.width || rect.width;
        const h = this.canvas.height || rect.height;
        const r = this.btnSize / 2;

        this.buttons.left.x = this.margin + r;
        this.buttons.left.y = h - this.margin - r - this.btnSize;

        this.buttons.right.x = this.margin + r + this.btnSize * 2;
        this.buttons.right.y = h - this.margin - r - this.btnSize;

        this.buttons.up.x = this.margin + r + this.btnSize;
        this.buttons.up.y = h - this.margin - r - this.btnSize * 2;

        this.buttons.down.x = this.margin + r + this.btnSize;
        this.buttons.down.y = h - this.margin - r;

        this.buttons.action.x = w - this.margin - r;
        this.buttons.action.y = h - this.margin - r;
    }

    /** Coordinate canvas del tocco, oppure `null` se il canvas non ha dimensione o il tocco non è valido. */
    getCanvasCoords(touch) {
        if (!touch) return null;
        const rect = this.canvas.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return null;
        const canvasWidth = this.canvas.width || rect.width;
        const canvasHeight = this.canvas.height || rect.height;
        const sx = canvasWidth / rect.width;
        const sy = canvasHeight / rect.height;
        if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;

        const x = (touch.clientX - rect.left) * sx;
        const y = (touch.clientY - rect.top) * sy;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
    }

    getButtonAt(x, y) {
        for (const name in this.buttons) {
            const b = this.buttons[name];
            const dx = x - b.x;
            const dy = y - b.y;
            if (dx * dx + dy * dy <= (this.btnSize / 2) * (this.btnSize / 2)) {
                return name;
            }
        }
        return null;
    }

    handleTouch(e) {
        if (this.#destroyed || !e) return;
        if (e.cancelable) e.preventDefault();
        this.#sync(e.touches);
    }

    handleTouchEnd(e) {
        if (this.#destroyed || !e) return;
        if (e.cancelable) e.preventDefault();
        this.#sync(e.touches);
    }

    draw(ctx) {
        if (!ctx) return;
        ctx.save();

        for (const name in this.buttons) {
            const b = this.buttons[name];
            const isActive = Object.values(this.activeTouches).includes(name);

            ctx.globalAlpha = isActive ? 0.8 : 0.5;
            ctx.fillStyle = isActive ? '#ffffff' : '#666666';
            ctx.beginPath();
            ctx.arc(b.x, b.y, this.btnSize / 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = isActive ? '#000000' : '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const symbols = { left: '◀', right: '▶', up: '▲', down: '▼', action: '●' };
            ctx.fillText(symbols[name] || '●', b.x, b.y);
        }

        ctx.restore();
    }

    destroy() {
        if (this.#destroyed) return;
        this.#destroyed = true;

        window.removeEventListener('resize', this.onResize);
        this.canvas.removeEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.removeEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvas.removeEventListener('touchend', this.onTouchEnd, { passive: false });
        this.canvas.removeEventListener('touchcancel', this.onTouchCancel, { passive: false });
        if (this.#unblock) {
            this.#unblock();
            this.#unblock = null;
        }

        for (const id in this.activeTouches) {
            const keys = this.#keysOf(this.activeTouches[id]);
            for (let i = 0; i < keys.length; i++) this.input.setKey(keys[i], false);
        }
        this.activeTouches = {};
    }
}