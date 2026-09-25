/**
 * BeeMenuScene — scena di menu configurabile.
 * Splash (nessuna voce): Invio / Spazio / click verso `next` o `onStart`.
 * Con `items`: frecce / WASD, conferma, ciascuna voce con `next` o `onSelect`.
 * Il loop del motore non ticka le scene in pausa: non promettere input vivo a dt=0.
 */

export class BeeMenuScene {
    /**
     * @param {{
     *   title?: string,
     *   subtitle?: string,
     *   hint?: string,
     *   footer?: string,
     *   items?: Array<{ label: string, next?: string|null, onSelect?: Function }>,
     *   next?: string|null,
     *   onStart?: ((engine: object, scene: BeeMenuScene) => void)|null
     * }} [options]
     */
    constructor(options = {}) {
        this.engine = null;
        this.entities = [];
        this.title = options.title != null ? String(options.title) : '🐝 BEE ENGINE 2D';
        this.subtitle = options.subtitle != null ? String(options.subtitle) : '';
        this.hint = options.hint != null ? String(options.hint) : 'PREMI INVIO, SPAZIO O TOCCA PER GIOCARE';
        this.footer = options.footer != null ? String(options.footer) : 'Powered by BeeEngine';
        this.items = Array.isArray(options.items) ? options.items.slice() : [];
        this.next = options.next != null ? options.next : null;
        this.onStart = typeof options.onStart === 'function' ? options.onStart : null;
        this.selected = 0;
    }

    enter(data) {
        if (!data || typeof data !== 'object') return;
        if (data.title != null) this.title = String(data.title);
        if (data.subtitle != null) this.subtitle = String(data.subtitle);
        if (data.next !== undefined) this.next = data.next;
        if (typeof data.onStart === 'function') this.onStart = data.onStart;
        if (Array.isArray(data.items)) this.items = data.items.slice();
        if (Number.isFinite(Number(data.selected))) {
            this.selected = Math.max(0, Math.floor(Number(data.selected)));
        }
        this.#clampSelected();
    }

    exit() {
        // niente log fisso: uscire non significa "avvio della partita"
    }

    update(dt, input, engine) {
        if (!input) return;
        if (engine) this.engine = engine;
        this.#clampSelected();

        if (this.items.length > 0) {
            if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) {
                this.selected = (this.selected + 1) % this.items.length;
            }
            if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) {
                this.selected = (this.selected - 1 + this.items.length) % this.items.length;
            }

            const size = this.#canvasSize(engine);
            if (input.mouse && input.mouse.wasPressed) {
                const hit = this.#hitIndex(input.mouse.x, input.mouse.y, size.width, size.height);
                if (hit >= 0) {
                    this.selected = hit;
                    this.#activate(this.items[hit]);
                    return;
                }
            }

            if (input.wasPressed('Enter') || input.wasPressed('Space')) {
                this.#activate(this.items[this.selected]);
            }
            return;
        }

        if (input.wasPressed('Enter') || input.wasPressed('Space') || (input.mouse && input.mouse.wasPressed)) {
            this.#activate(null);
        }
    }

    itemBounds(index, width, height) {
        const rowH = 36;
        const startY = height * 0.52;
        return {
            x: width / 2 - 160,
            y: startY + index * rowH - 16,
            w: 320,
            h: 32
        };
    }

    #canvasSize(engine) {
        const canvas = (engine && engine.canvas) || (this.engine && this.engine.canvas);
        return {
            width: canvas && canvas.width ? canvas.width : 800,
            height: canvas && canvas.height ? canvas.height : 600
        };
    }

    #hitIndex(x, y, width, height) {
        for (let i = 0; i < this.items.length; i++) {
            const box = this.itemBounds(i, width, height);
            if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
                return i;
            }
        }
        return -1;
    }

    #clampSelected() {
        if (this.items.length === 0) {
            this.selected = 0;
            return;
        }
        if (this.selected < 0 || this.selected >= this.items.length) {
            this.selected = 0;
        }
    }

    #activate(item) {
        const engine = this.engine;
        if (!engine) {
            console.warn('BeeMenuScene: engine assente — registra la scena con scenes.add() prima di change()');
            return;
        }

        if (item && typeof item.onSelect === 'function') {
            item.onSelect(engine, this);
            return;
        }
        if (item && item.next) {
            if (engine.scenes && typeof engine.scenes.change === 'function') {
                engine.scenes.change(item.next);
            }
            return;
        }
        if (typeof this.onStart === 'function') {
            this.onStart(engine, this);
            return;
        }
        if (this.next) {
            if (engine.scenes && typeof engine.scenes.change === 'function') {
                engine.scenes.change(this.next);
            }
            return;
        }
        console.warn('BeeMenuScene: niente next né onStart — configura il target nel costruttore');
    }

    draw(ctx, engine) {
        if (!ctx) return;
        ctx.save();

        const width = ctx.canvas ? ctx.canvas.width : 800;
        const height = ctx.canvas ? ctx.canvas.height : 600;
        const clock = (engine && engine.time) || (this.engine && this.engine.time) || null;
        const elapsed = clock && typeof clock.elapsed === 'number' ? clock.elapsed : 0;
        const blinkOn = Math.sin(elapsed * 4) > 0;

        ctx.fillStyle = '#0d0f1a';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillText(this.title, width / 2, height / 3);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (this.subtitle) {
            ctx.fillStyle = '#4DEEEA';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(this.subtitle, width / 2, height / 3 + 50);
        }

        if (this.items.length > 0) {
            ctx.font = 'bold 22px Arial';
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                const focused = i === this.selected;
                ctx.fillStyle = focused && blinkOn ? '#FFD700' : focused ? '#FFFFFF' : '#888888';
                ctx.fillText(item && item.label != null ? String(item.label) : '', width / 2, height * 0.52 + i * 36);
            }
        } else {
            ctx.fillStyle = blinkOn ? '#FFFFFF' : '#FFD700';
            ctx.font = 'bold 22px Arial';
            ctx.fillText(this.hint, width / 2, height / 1.6);
        }

        if (this.footer) {
            ctx.fillStyle = '#555555';
            ctx.font = '12px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(this.footer, width - 20, height - 20);
        }

        ctx.restore();
    }
}
