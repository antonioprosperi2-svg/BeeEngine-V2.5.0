/**
 * Ritaglio di un indice su un foglio. Niente animazione: quella è BeeAnimatedSprite.
 */
export class BeeSpriteSheet {
    constructor(image, frameWidth, frameHeight, options = {}) {
        const opts = options || {};
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        const hasCol = Object.prototype.hasOwnProperty.call(opts, 'col');
        const hasRow = Object.prototype.hasOwnProperty.call(opts, 'row');
        if (hasCol || hasRow) {
            const col = hasCol ? opts.col : 0;
            const row = hasRow ? opts.row : 0;
            this.offsetX = col * frameWidth;
            this.offsetY = row * frameHeight;
        } else {
            this.offsetX = Number.isFinite(opts.offsetX) ? opts.offsetX : 0;
            this.offsetY = Number.isFinite(opts.offsetY) ? opts.offsetY : 0;
        }

        this.framesPerRow = Object.prototype.hasOwnProperty.call(opts, 'framesPerRow')
            ? opts.framesPerRow
            : 1;
        this.frameCount = Object.prototype.hasOwnProperty.call(opts, 'frameCount')
            ? opts.frameCount
            : undefined;
    }

    drawFrame(ctx, frameIndex, destX, destY, destW, destH) {
        if (!ctx || !this.image) return;
        if (!Number.isFinite(this.frameWidth) || this.frameWidth <= 0) return;
        if (!Number.isFinite(this.frameHeight) || this.frameHeight <= 0) return;
        if (!Number.isFinite(this.framesPerRow) || this.framesPerRow <= 0) return;
        if (!Number.isFinite(frameIndex)) return;
        if (Number.isFinite(this.frameCount) && this.frameCount > 0) {
            if (frameIndex < 0 || frameIndex >= this.frameCount) return;
        }

        const col = frameIndex % this.framesPerRow;
        const row = Math.floor(frameIndex / this.framesPerRow);
        const width = destW == null ? this.frameWidth : destW;
        const height = destH == null ? this.frameHeight : destH;

        ctx.drawImage(
            this.image,
            this.offsetX + (col * this.frameWidth),
            this.offsetY + (row * this.frameHeight),
            this.frameWidth,
            this.frameHeight,
            destX,
            destY,
            width,
            height
        );
    }
}
