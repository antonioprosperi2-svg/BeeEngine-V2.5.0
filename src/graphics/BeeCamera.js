export class BeeCamera {
    constructor(canvasWidth, canvasHeight) {
        const w = Number(canvasWidth);
        const h = Number(canvasHeight);
        this.x = 0;
        this.y = 0;
        this.w = (Number.isFinite(w) && w > 0) ? w : 800;
        this.h = (Number.isFinite(h) && h > 0) ? h : 600;

        this.bounds = null;
        this.target = null;
        this.smooth = 0.1;
        this.#hosted = false;
    }

    #hosted;

    setSize(width, height) {
        const w = Number(width);
        const h = Number(height);
        if (Number.isFinite(w) && w > 0) this.w = w;
        if (Number.isFinite(h) && h > 0) this.h = h;
        this.#clampToBounds();
        return this;
    }

    setBounds(x, y, width, height) {
        if (x == null) {
            this.bounds = null;
            return this;
        }
        const bx = Number(x);
        const by = Number(y);
        const bw = Number(width);
        const bh = Number(height);
        if (![bx, by, bw, bh].every(Number.isFinite)) {
            this.bounds = null;
            return this;
        }
        this.bounds = { x: bx, y: by, width: bw, height: bh };
        return this;
    }

    follow(target, smooth) {
        this.target = target || null;
        if (arguments.length >= 2) {
            const s = Number(smooth);
            this.smooth = Number.isFinite(s) ? s : 0.1;
        }
        return this;
    }

    /**
     * @param {boolean} on true se questa è `gioco.camera` (il loop chiama update).
     */
    host(on) {
        this.#hosted = !!on;
        return this;
    }

    /**
     * @param {number} dt tempo di simulazione (scalato). In pausa è 0: la camera si ferma.
     * @param {boolean} [fromHost] true solo dal loop del motore. Se la camera è hosted, un update a mano è no-op.
     */
    update(dt, fromHost = false) {
        if (this.#hosted && fromHost !== true) return this;
        if (!this.target || this.target.destroyed === true) return this;
        const step = Number(dt);
        if (!(step > 0)) return this;

        const aim = this.#focus();
        const s = this.smooth;
        if (!(s > 0 && s < 1)) {
            this.x = aim.x;
            this.y = aim.y;
        } else {
            const t = 1 - Math.pow(1 - s, step * 60);
            this.x += (aim.x - this.x) * t;
            this.y += (aim.y - this.y) * t;
        }

        this.#clampToBounds();
        return this;
    }

    apply(ctx) {
        if (!ctx) return this;
        ctx.translate(-Math.round(this.x), -Math.round(this.y));
        return this;
    }

    /**
     * Rettangolo visibile in coordinate mondo (stesso arrotondamento di apply).
     */
    getViewBounds() {
        return {
            x: Math.round(this.x),
            y: Math.round(this.y),
            width: this.w,
            height: this.h
        };
    }

    /**
     * Frustum culling: true se il rettangolo mondo interseca l'area inquadrata dalla telecamera.
     */
    isRectVisible(x, y, width, height) {
        if (width <= 0 || height <= 0) return false;
        const vx = Math.round(this.x);
        const vy = Math.round(this.y);
        return (
            x < vx + this.w &&
            x + width > vx &&
            y < vy + this.h &&
            y + height > vy
        );
    }

    screenToWorld(sx, sy) {
        return {
            x: Number(sx) + Math.round(this.x),
            y: Number(sy) + Math.round(this.y)
        };
    }

    worldToScreen(wx, wy) {
        return {
            x: Number(wx) - Math.round(this.x),
            y: Number(wy) - Math.round(this.y)
        };
    }

    #focus() {
        const t = this.target;
        const ox = Number.isFinite(t.worldX)
            ? t.worldX
            : (Number.isFinite(Number(t.x)) ? Number(t.x) : 0);
        const oy = Number.isFinite(t.worldY)
            ? t.worldY
            : (Number.isFinite(Number(t.y)) ? Number(t.y) : 0);
        const tw = Number(t.width);
        const th = Number(t.height);
        const width = Number.isFinite(tw) ? tw : 0;
        const height = Number.isFinite(th) ? th : 0;
        return {
            x: ox + width / 2 - this.w / 2,
            y: oy + height / 2 - this.h / 2
        };
    }

    #clampToBounds() {
        const b = this.bounds;
        if (!b) return;

        if (b.width < this.w) {
            this.x = b.x + (b.width - this.w) / 2;
        } else {
            this.x = Math.max(b.x, Math.min(this.x, b.x + b.width - this.w));
        }

        if (b.height < this.h) {
            this.y = b.y + (b.height - this.h) / 2;
        } else {
            this.y = Math.max(b.y, Math.min(this.y, b.y + b.height - this.h));
        }
    }
}
/** 🌟 * Classe BeeCamera: Gestisce l'inquadratura visiva e lo scorrimento del gioco.
 * Segue fluidamente un oggetto bersaglio (di solito il Player) per mostrare
 * la porzione corretta del mondo di gioco quando la mappa è più grande dello schermo.
 */
