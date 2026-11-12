export class BeeVirtualDPad {
  #destroyed = false;

  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas - Il canvas principale del gioco
   * @param {number} config.x - Centro X del D-Pad
   * @param {number} config.y - Centro Y del D-Pad
   * @param {number} [config.size=120] - Dimensione totale del D-Pad (il raggio è size / 2)
   * @param {boolean} [config.eightWay=false] - Se true abilita 8 direzioni, altrimenti 4
   */
  constructor(config) {
    const { canvas, x, y, size = 120, eightWay = false } = config || {};
    if (!canvas) throw new Error('BeeVirtualDPad: canvas required');
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error('BeeVirtualDPad: x must be a finite number');
    if (typeof y !== 'number' || !Number.isFinite(y)) throw new Error('BeeVirtualDPad: y must be a finite number');
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
      throw new Error('BeeVirtualDPad: size must be a finite number greater than 0');
    }

    this.canvas = canvas;
    this.x = x;
    this.y = y;
    this.size = size;
    this.eightWay = eightWay;

    this.state = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.isPressed = false;
    this.pointerId = null;

    this.initEvents();
  }

  /** Raggio dell'area toccabile: segue sempre `size`. */
  get radius() {
    return this.size / 2;
  }

  /** Impostare il raggio cambia `size` (size = radius * 2). Un valore non valido non fa niente. */
  set radius(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) this.size = value * 2;
  }

  initEvents() {
    this.onPointerDown = (e) => {
      if (this.#destroyed) return;
      // Il primo dito resta proprietario: un altro pointer non lo ruba.
      if (this.pointerId !== null && e.pointerId !== this.pointerId) return;

      const pos = this.canvasPoint(e);
      if (!pos) return;

      if (this.pointerId === null) {
        if (Math.hypot(pos.x - this.x, pos.y - this.y) > this.radius) return;
        this.isPressed = true;
        this.pointerId = e.pointerId;
        if (this.canvas.setPointerCapture) {
          try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { }
        }
      }
      this.#applyPosition(pos);
    };

    this.onPointerMove = (e) => {
      if (this.#destroyed) return;
      if (this.pointerId === null || e.pointerId !== this.pointerId) return;
      const pos = this.canvasPoint(e);
      if (!pos) return;
      this.#applyPosition(pos);
    };

    this.onPointerUp = (e) => {
      if (this.pointerId === null || e.pointerId !== this.pointerId) return;
      this.resetState();
    };

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  /**
   * Punto del pointer in coordinate canvas, oppure `null` se il canvas non ha dimensione
   * o la scala non è finita.
   */
  canvasPoint(e) {
    if (!e) return null;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    if (!rect.width || !rect.height || !Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  /**
   * Calcola le direzioni dal vettore centro → dito. Non c'è un limite esterno:
   * fuori dal cerchio la direzione segue ancora il dito. Nella zona morta
   * tutte le direzioni sono false ma il pointer resta del pad.
   */
  #applyPosition(pos) {
    const dx = pos.x - this.x;
    const dy = pos.y - this.y;
    const distance = Math.hypot(dx, dy);
    const deadzone = this.radius * 0.2;

    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;

    if (!(distance > deadzone)) return;

    if (this.eightWay) {
      const threshold = Math.sin(Math.PI / 8); // ~0.38 per dividere a 45 gradi
      const normX = dx / distance;
      const normY = dy / distance;

      if (normY < -threshold) this.state.up = true;
      if (normY > threshold) this.state.down = true;
      if (normX < -threshold) this.state.left = true;
      if (normX > threshold) this.state.right = true;
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) this.state.right = true;
        else this.state.left = true;
      } else {
        if (dy > 0) this.state.down = true;
        else this.state.up = true;
      }
    }
  }

  resetState() {
    if (this.pointerId !== null && this.canvas.releasePointerCapture) {
      try { this.canvas.releasePointerCapture(this.pointerId); } catch (err) { }
    }
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
    this.isPressed = false;
    this.pointerId = null;
  }

  render(ctx) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    const padSize = this.radius;
    const armWidth = padSize * 0.35;
    const a = armWidth / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Un solo percorso a "+" (12 vertici): nessuna linea incrociata nel centro.
    ctx.beginPath();
    ctx.moveTo(-a, -padSize);
    ctx.lineTo(a, -padSize);
    ctx.lineTo(a, -a);
    ctx.lineTo(padSize, -a);
    ctx.lineTo(padSize, a);
    ctx.lineTo(a, a);
    ctx.lineTo(a, padSize);
    ctx.lineTo(-a, padSize);
    ctx.lineTo(-a, a);
    ctx.lineTo(-padSize, a);
    ctx.lineTo(-padSize, -a);
    ctx.lineTo(-a, -a);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    if (this.state.up) {
      ctx.fillRect(-armWidth / 2, -padSize, armWidth, padSize - armWidth / 2);
    }
    if (this.state.down) {
      ctx.fillRect(-armWidth / 2, armWidth / 2, armWidth, padSize - armWidth / 2);
    }
    if (this.state.left) {
      ctx.fillRect(-padSize, -armWidth / 2, padSize - armWidth / 2, armWidth);
    }
    if (this.state.right) {
      ctx.fillRect(armWidth / 2, -armWidth / 2, padSize - armWidth / 2, armWidth);
    }

    ctx.restore();
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;

    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.resetState();
  }
}
