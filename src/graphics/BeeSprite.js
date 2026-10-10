/**
 * Player semplice di un foglio. Niente clip, flip o animator: quello è BeeAnimatedSprite.
 * `speed` è in frame al secondo; `dt` arriva in secondi. `update` non disegna.
 */
export class BeeSprite {
    constructor(image, frameWidth, frameHeight, framesPerRow, speed = 8, frameCount) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.framesPerRow = framesPerRow;
        this.speed = speed;
        this.frameCount = frameCount == null ? framesPerRow : frameCount;
        this.frame = 0;
    }

    /**
     * @param {number} dt secondi di simulazione (scalati). Non finito: non tocca `frame`.
     */
    update(dt) {
        if (!Number.isFinite(dt)) return;
        if (!this.#sheetOk()) return;
        this.frame += this.speed * dt;
    }

    /**
     * @param {CanvasRenderingContext2D | null} ctx
     * @param {number} x
     * @param {number} y
     */
    draw(ctx, x, y) {
        if (!ctx || !this.image) return;
        if (!this.#sheetOk()) return;

        const index = Math.floor(this.frame) % this.frameCount;
        const col = index % this.framesPerRow;
        const row = Math.floor(index / this.framesPerRow);

        ctx.drawImage(
            this.image,
            col * this.frameWidth, row * this.frameHeight,
            this.frameWidth, this.frameHeight,
            x, y,
            this.frameWidth, this.frameHeight
        );
    }

    #sheetOk() {
        return Number.isFinite(this.framesPerRow) && this.framesPerRow > 0
            && Number.isFinite(this.frameCount) && this.frameCount > 0;
    }
}
