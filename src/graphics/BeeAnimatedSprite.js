export class BeeAnimatedSprite {
    constructor(spriteSheet, config = {}) {
        this.sheet = spriteSheet;
        this.animations = config.animations || {};
        this.currentAnimName = config.animation || Object.keys(this.animations)[0];

        this.currentFrameIndex = 0;
        this.timer = 0;
        this.flipX = false;
        this.#finished = false;
        this.#loopOverride = null;
    }

    #finished;
    #loopOverride;

    get finished() {
        return this.#finished;
    }

    get clip() {
        return this.currentAnimName;
    }

    play(name, options = {}) {
        if (!this.animations[name]) {
            console.warn(`BeeAnimatedSprite: clip "${name}" non esiste.`);
            return this;
        }
        if (this.currentAnimName === name && !options.restart) return this;
        this.currentAnimName = name;
        this.currentFrameIndex = 0;
        this.timer = 0;
        this.#finished = false;
        if (typeof options.loop === 'boolean') {
            this.#loopOverride = options.loop;
        } else {
            this.#loopOverride = null;
        }
        return this;
    }

    /**
     * @param {number} dt tempo di simulazione (scalato). In pausa è 0: il clip si ferma.
     */
    update(dt) {
        const anim = this.animations[this.currentAnimName];
        if (!anim || !anim.frames || anim.frames.length === 0) return this;

        const fps = (typeof anim.fps === 'number' && anim.fps > 0) ? anim.fps : 8;
        const frameDuration = 1 / fps;
        const maxCatchUp = frameDuration * 4;
        this.timer += Math.min(dt, maxCatchUp);

        if (this.timer >= frameDuration) {
            this.timer -= frameDuration;
            const looping = this.#loopOverride ?? anim.loop;
            if (looping) {
                this.currentFrameIndex = (this.currentFrameIndex + 1) % anim.frames.length;
                this.#finished = false;
            } else if (this.currentFrameIndex < anim.frames.length - 1) {
                this.currentFrameIndex += 1;
            } else {
                this.#finished = true;
                this.timer = 0;
            }
        }

        return this;
    }

    draw(ctx, x, y, options = {}) {
        if (!ctx) return;
        const anim = this.animations[this.currentAnimName];
        if (!anim || !anim.frames || anim.frames.length === 0) return;
        const frameToDraw = anim.frames[this.currentFrameIndex];
        if (frameToDraw === undefined) return;

        const width = options.width || this.sheet.frameWidth;
        const height = options.height || this.sheet.frameHeight;

        ctx.save();
        try {
            if (this.flipX) {
                ctx.translate(x + width, y);
                ctx.scale(-1, 1);
                this.sheet.drawFrame(ctx, frameToDraw, 0, 0, width, height);
            } else {
                this.sheet.drawFrame(ctx, frameToDraw, x, y, width, height);
            }
        } finally {
            ctx.restore();
        }
    }
}
