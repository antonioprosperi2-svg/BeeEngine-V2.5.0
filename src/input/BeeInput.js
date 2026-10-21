export class BeeInput {
    constructor(canvas) {
        if (!canvas) throw new Error('BeeInput: canvas required');
        this.canvas = canvas;

        this.#keyboard = Object.create(null);
        this.#alias = Object.create(null);
        this.#virtual = Object.create(null);
        this.#listeners = [];

        this.keys = {};
        this.pressed = {};

        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
            wasPressed: false
        };

        this.touches = [];

        this.#listen(window, 'keydown', (e) => this.#onKeyDown(e));
        this.#listen(window, 'keyup', (e) => this.#onKeyUp(e));
        this.#listen(window, 'blur', () => this.#onBlur());
        this.#listen(window, 'mousemove', (e) => this.#onMouseMove(e));
        this.#listen(window, 'mouseup', (e) => this.#onMouseUp(e));
        this.#listen(canvas, 'mousedown', (e) => this.#onMouseDown(e));
        this.#listen(canvas, 'touchstart', (e) => this.#onTouchStart(e), { passive: false });
        this.#listen(canvas, 'touchmove', (e) => this.#onTouchMove(e), { passive: false });
        this.#listen(canvas, 'touchend', (e) => this.#onTouchEnd(e), { passive: false });
        this.#listen(canvas, 'touchcancel', (e) => this.#onTouchEnd(e), { passive: false });
    }

    #keyboard;
    #alias;
    #virtual;
    #listeners;

    #listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.#listeners.push({ target, type, handler, options });
    }

    #onKeyDown(e) {
        if (!e || !e.code) return;
        const code = e.code;
        const key = e.key;
        const wasCode = this.isPressed(code);
        const wasKey = key ? this.isPressed(key) : false;
        if (!this.#keyboard[code]) {
            this.#keyboard[code] = true;
            if (key) this.#alias[code] = key;
        }
        this.#sync(code);
        if (key) this.#sync(key);
        if (!wasCode && this.isPressed(code)) this.pressed[code] = true;
        if (key && key !== code && !wasKey && this.isPressed(key)) this.pressed[key] = true;
    }

    #onKeyUp(e) {
        if (!e || !e.code) return;
        const code = e.code;
        const remembered = this.#alias[code];
        delete this.#keyboard[code];
        delete this.#alias[code];
        this.#sync(code);
        if (remembered) this.#sync(remembered);
    }

    #onBlur() {
        const names = [];
        for (const code in this.#keyboard) {
            names.push(code);
            if (this.#alias[code]) names.push(this.#alias[code]);
        }
        this.#keyboard = Object.create(null);
        this.#alias = Object.create(null);
        for (let i = 0; i < names.length; i++) this.#sync(names[i]);
    }

    #fromTouch(e) {
        return !!(e && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
    }

    #placeMouse(e) {
        const pos = this.getCanvasPosition(e.clientX, e.clientY);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
    }

    #onMouseMove(e) {
        if (this.#fromTouch(e)) return;
        this.#placeMouse(e);
    }

    #onMouseDown(e) {
        if (this.#fromTouch(e)) return;
        this.#placeMouse(e);
        this.mouse.pressed = true;
        this.mouse.wasPressed = true;
    }

    #onMouseUp(e) {
        if (this.#fromTouch(e)) return;
        this.#placeMouse(e);
        this.mouse.pressed = false;
    }

    #block(e) {
        if (e && e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
    }

    #readTouches(list) {
        const out = [];
        if (!list || !list.length) return out;
        for (let i = 0; i < list.length; i++) {
            const touch = list[i];
            const pos = this.getCanvasPosition(touch.clientX, touch.clientY);
            out.push({ id: touch.identifier, x: pos.x, y: pos.y });
        }
        return out;
    }

    #onTouchStart(e) {
        this.#block(e);
        this.touches = this.#readTouches(e && e.touches);
        if (this.touches.length > 0) {
            this.mouse.x = this.touches[0].x;
            this.mouse.y = this.touches[0].y;
        }
        this.mouse.pressed = true;
        this.mouse.wasPressed = true;
    }

    #onTouchMove(e) {
        this.#block(e);
        this.touches = this.#readTouches(e && e.touches);
        if (this.touches.length > 0) {
            this.mouse.x = this.touches[0].x;
            this.mouse.y = this.touches[0].y;
        }
    }

    #onTouchEnd(e) {
        this.#block(e);
        const touches = e && e.touches;
        if (touches && touches.length > 0) {
            this.touches = this.#readTouches(touches);
            this.mouse.x = this.touches[0].x;
            this.mouse.y = this.touches[0].y;
            return;
        }
        const last = e && e.changedTouches && e.changedTouches[0];
        if (last) {
            const pos = this.getCanvasPosition(last.clientX, last.clientY);
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
        }
        this.touches = [];
        this.mouse.pressed = false;
    }

    #sync(name) {
        if (!name) return;
        this.keys[name] = this.isPressed(name);
    }

    getCanvasPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = this.canvas.width / rect.width;
        const sy = this.canvas.height / rect.height;
        if (!rect.width || !rect.height || !Number.isFinite(sx) || !Number.isFinite(sy)) {
            return { x: 0, y: 0 };
        }
        return {
            x: (clientX - rect.left) * sx,
            y: (clientY - rect.top) * sy
        };
    }

    isPressed(key) {
        if (this.#virtual[key]) return true;
        if (this.#keyboard[key]) return true;
        for (const code in this.#alias) {
            if (this.#keyboard[code] && this.#alias[code] === key) return true;
        }
        return false;
    }

    wasPressed(key) {
        return !!this.pressed[key];
    }

    setKey(key, value) {
        const was = this.isPressed(key);
        if (value) this.#virtual[key] = true;
        else delete this.#virtual[key];
        this.#sync(key);
        if (!was && this.isPressed(key)) this.pressed[key] = true;
    }

    endFrame() {
        this.pressed = {};
        this.mouse.wasPressed = false;
    }

    destroy() {
        for (let i = 0; i < this.#listeners.length; i++) {
            const item = this.#listeners[i];
            item.target.removeEventListener(item.type, item.handler, item.options);
        }
        this.#listeners.length = 0;
    }
}
