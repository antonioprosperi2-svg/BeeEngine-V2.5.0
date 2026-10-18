import { BeeEntity } from '../core/BeeEntity.js';
import { BEE_DRAW } from '../graphics/BeeLayer.js';

export class BeeButton extends BeeEntity {
    constructor({
        x = 0,
        y = 0,
        width = 160,
        height = 50,
        text = "Button",
        font = "20px Arial",
        background = "#333",
        hoverBackground = "#555",
        pressedBackground = "#222",
        color = "white",
        onClick = null
    } = {}) {
        super(x, y, width, height);

        this.text = text;
        this.font = font;
        this.background = background;
        this.hoverBackground = hoverBackground;
        this.pressedBackground = pressedBackground;
        this.color = color;
        this.onClick = onClick;

        this.hover = false;
        this.down = false;
        this.drawLayer = BEE_DRAW.UI;

        this.addRectCollider();
    }

    update(dt, input, engine) {
        if (this.destroyed || this.active === false) {
            this.hover = false;
            this.down = false;
            super.update(dt, input, engine);
            return;
        }

        const mouse = input && input.mouse;
        const over = this.#contains(mouse);
        this.hover = !!this.visible && over;

        if (this.hover && mouse.wasPressed) {
            this.down = true;
        }

        const released = !mouse || mouse.pressed !== true;
        if (!this.visible) {
            this.down = false;
        } else if (this.down && released) {
            if (this.hover && typeof this.onClick === 'function') {
                this.onClick(this);
            }
            this.down = false;
        }

        super.update(dt, input, engine);
    }

    draw(ctx) {
        if (!ctx) return;
        if (!this.visible) return;

        let bg = this.background;

        if (this.down) {
            bg = this.pressedBackground;
        } else if (this.hover) {
            bg = this.hoverBackground;
        }

        ctx.save();

        ctx.fillStyle = bg;
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);

        ctx.strokeStyle = "white";
        ctx.strokeRect(this.worldX, this.worldY, this.width, this.height);

        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            this.text,
            this.worldX + this.width / 2,
            this.worldY + this.height / 2
        );

        ctx.restore();
    }

    #contains(mouse) {
        if (!mouse || !Number.isFinite(mouse.x) || !Number.isFinite(mouse.y)) return false;
        return mouse.x >= this.worldX
            && mouse.y >= this.worldY
            && mouse.x <= this.worldX + this.width
            && mouse.y <= this.worldY + this.height;
    }
}
