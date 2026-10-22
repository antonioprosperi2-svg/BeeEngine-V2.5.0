export class BeeJoystick {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.input = input;

        // Configurazione Joystick Virtuale
        this.margin = 35;
        this.radius = 45;
        this.knobRadius = 18;
        this.deadZone = 10;

        this.baseX = 0;
        this.baseY = 0;
        this.stickX = 0;
        this.stickY = 0;

        this.active = false;
        this.touchId = null;

        this.updateLayout();

        this.bindEvents();
    }

    bindEvents() {
        this.onTouchStart = (e) => this.handleTouchStart(e);
        this.onTouchMove = (e) => this.handleTouchMove(e);
        this.onTouchEnd = (e) => this.handleTouchEnd(e);
        this.onResize = () => this.updateLayout();

        this.onMouseDown = (e) => this.handleMouseDown(e);
        this.onMouseMove = (e) => this.handleMouseMove(e);
        this.onMouseUp = (e) => this.handleMouseUp(e);
        this.onMouseOut = (e) => this.handleMouseOut(e);

        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
        this.canvas.addEventListener('mousedown', this.onMouseDown);

        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('mouseout', this.onMouseOut);
        window.addEventListener('resize', this.onResize);
    }

    updateLayout() {
        const rect = this.canvas.getBoundingClientRect();

        const canvasWidth = this.canvas.width || rect.width;
        const canvasHeight = this.canvas.height || rect.height;

        // Joystick fisso in basso a sinistra
        this.baseX = this.margin + this.radius;
        this.baseY = canvasHeight - this.margin - this.radius;

        // Se non è attivo, il pomello rimane al centro della base
        if (!this.active) {
            this.stickX = this.baseX;
            this.stickY = this.baseY;
        }
    }

    getCanvasCoords(touch) {
        const rect = this.canvas.getBoundingClientRect();

        const rectWidth = rect.width || 1;
        const rectHeight = rect.height || 1;

        const canvasWidth = this.canvas.width || rectWidth;
        const canvasHeight = this.canvas.height || rectHeight;

        const scaleX = canvasWidth / rectWidth;
        const scaleY = canvasHeight / rectHeight;

        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    isInsideJoystick(x, y) {
        const dx = x - this.baseX;
        const dy = y - this.baseY;
        const distance = Math.hypot(dx, dy);

        // Leggermente più grande del raggio per facilitare il tocco su mobile
        return distance <= this.radius + 20;
    }

    handleTouchStart(e) {
        if (e.cancelable) e.preventDefault();

        this.updateLayout();

        // Se il joystick è già controllato da un dito, ignora gli altri tocchi
        if (this.active) return;

        for (const touch of e.changedTouches) {
            const { x, y } = this.getCanvasCoords(touch);

            if (this.isInsideJoystick(x, y)) {
                this.active = true;
                this.touchId = touch.identifier;

                this.updateStickPosition(x, y);
                break;
            }
        }
    }

    handleTouchMove(e) {
        if (e.cancelable) e.preventDefault();

        if (!this.active) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                const { x, y } = this.getCanvasCoords(touch);
                this.updateStickPosition(x, y);
                break;
            }
        }
    }

    handleTouchEnd(e) {
        if (e.cancelable) e.preventDefault();

        if (!this.active) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                this.resetJoystick();
                break;
            }
        }
    }

    fromTouch(e) {
        return !!(e && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
    }

    handleMouseDown(e) {
        if (this.fromTouch(e)) return;
        if (e.button != null && e.button !== 0) return;

        this.updateLayout();
        if (this.active) return;

        const { x, y } = this.getCanvasCoords(e);
        if (!this.isInsideJoystick(x, y)) return;

        this.active = true;
        this.touchId = null;
        this.updateStickPosition(x, y);
    }

    handleMouseMove(e) {
        if (this.fromTouch(e)) return;
        if (!this.active || this.touchId != null) return;

        const { x, y } = this.getCanvasCoords(e);
        this.updateStickPosition(x, y);
    }

    handleMouseUp(e) {
        if (this.fromTouch(e)) return;
        if (!this.active || this.touchId != null) return;

        const { x, y } = this.getCanvasCoords(e);
        this.updateStickPosition(x, y);
        this.resetJoystick();
    }

    handleMouseOut(e) {
        if (this.fromTouch(e)) return;
        if (e.relatedTarget || e.toElement) return;
        if (!this.active || this.touchId != null) return;
        this.resetJoystick();
    }

    updateStickPosition(x, y) {
        const dx = x - this.baseX;
        const dy = y - this.baseY;
        const distance = Math.hypot(dx, dy);

        let clampedX = dx;
        let clampedY = dy;

        // Limita il pomello dentro il raggio massimo
        if (distance > this.radius) {
            const angle = Math.atan2(dy, dx);

            clampedX = Math.cos(angle) * this.radius;
            clampedY = Math.sin(angle) * this.radius;
        }

        this.stickX = this.baseX + clampedX;
        this.stickY = this.baseY + clampedY;

        this.updateInput(clampedX, clampedY);
    }

    updateInput(dx, dy) {
        if (!this.input || !this.input.setKey) return;

        const left = dx < -this.deadZone;
        const right = dx > this.deadZone;
        const up = dy < -this.deadZone;
        const down = dy > this.deadZone;

        this.input.setKey('ArrowLeft', left);
        this.input.setKey('KeyA', left);
        this.input.setKey('ArrowRight', right);
        this.input.setKey('KeyD', right);
        this.input.setKey('ArrowUp', up);
        this.input.setKey('KeyW', up);
        this.input.setKey('ArrowDown', down);
        this.input.setKey('KeyS', down);
    }

    resetJoystick() {
        this.active = false;
        this.touchId = null;

        this.stickX = this.baseX;
        this.stickY = this.baseY;

        this.releaseKeys();
    }

    releaseKeys() {
        if (!this.input || !this.input.setKey) return;

        this.input.setKey('ArrowLeft', false);
        this.input.setKey('KeyA', false);
        this.input.setKey('ArrowRight', false);
        this.input.setKey('KeyD', false);
        this.input.setKey('ArrowUp', false);
        this.input.setKey('KeyW', false);
        this.input.setKey('ArrowDown', false);
        this.input.setKey('KeyS', false);
    }

    draw(ctx) {
        if (!ctx) return;
        this.updateLayout();

        ctx.save();

        // Base joystick, visibile sempre
        ctx.globalAlpha = this.active ? 0.35 : 0.22;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = this.active ? 0.8 : 0.45;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Pomello giallo, visibile anche a riposo
        ctx.globalAlpha = this.active ? 0.9 : 0.55;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.knobRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = this.active ? 1 : 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.stickX, this.stickY, this.knobRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    destroy() {
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);

        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mouseout', this.onMouseOut);
        window.removeEventListener('resize', this.onResize);

        this.releaseKeys();
    }
}