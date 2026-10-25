export class BeeTouchButton {
    /**
     * @param {Object} config
     * @param {HTMLCanvasElement} config.canvas - Il canvas principale
     * @param {number} config.x - Centro X del pulsante
     * @param {number} config.y - Centro Y del pulsante
     * @param {number} [config.radius=30] - Raggio del pulsante
     * @param {string} [config.label="A"] - Testo sul pulsante
     */
    constructor(config) {
        const { canvas, x, y, radius = 30, label = "A" } = config || {};
        if (!canvas) throw new Error('BeeTouchButton: canvas required');

        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.label = label;

        this.isPressed = false;
        this.pointerId = null;

        this.initEvents();
    }

    initEvents() {
        this.onPointerDown = (e) => {
            const pos = this.canvasPoint(e);
            if (!pos) return;

            const dx = pos.x - this.x;
            const dy = pos.y - this.y;

            if (Math.hypot(dx, dy) <= this.radius) {
                this.isPressed = true;
                this.pointerId = e.pointerId;
                if (this.canvas.setPointerCapture) {
                    try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { }
                }
            }
        };

        this.onPointerUp = (e) => this.release(e);

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
    }

    canvasPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        if (!rect.width || !rect.height || !Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    release(e) {
        if (e.pointerId !== this.pointerId) return;
        this.isPressed = false;
        if (this.canvas.releasePointerCapture) {
            try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { }
        }
        this.pointerId = null;
    }

    render(ctx) {
        if (!ctx) return;
        ctx.save();

        // Sfondo del pulsante (cambia colore se premuto)
        ctx.fillStyle = this.isPressed ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Testo / Etichetta
        ctx.fillStyle = this.isPressed ? '#000000' : '#ffffff';
        ctx.font = `bold ${this.radius * 0.8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x, this.y);

        ctx.restore();
    }

    destroy() {
        this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
        this.isPressed = false;
        this.pointerId = null;
    }
}
