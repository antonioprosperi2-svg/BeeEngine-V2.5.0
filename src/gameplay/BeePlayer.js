import { BeeEntity } from '../core/BeeEntity.js';
import { BeeTimer } from '../core/BeeTimer.js';

/**
 * BeePlayer: personaggio giocabile (platformer o volo libero).
 * wantsAttack è un impulso: X/J lo accende, consumeAttack() lo legge e lo spegne
 * (animator / scena). Nessuna invulnerabilità in takeDamage.
 */
export class BeePlayer extends BeeEntity {
    /**
     * @param {number} [x=100]
     * @param {number} [y=100]
     * @param {number} [width=40]
     * @param {number} [height=40]
     * @param {string|null} [textureKey=null]
     */
    constructor(x = 100, y = 100, width = 40, height = 40, textureKey = null) {
        super(x, y, width, height);
        this.speed = 220;

        this.baseJumpForce = -420;
        this.jumpForce = this.baseJumpForce;
        this._permanentBoostAmount = 0;
        this.textureKey = textureKey;

        this.score = 0;
        this.lives = 3;
        this.wantsAttack = false;
        this._boost = new BeeTimer({
            duration: 0,
            onComplete: () => {
                this.jumpForce = this.baseJumpForce - (this._permanentBoostAmount || 0);
            }
        });
        this.setMode('platformer');
    }

    /**
     * `'platformer'` (gravità 500) o `'free'` (gravità 0, volo 360).
     * Non assegnare `this.mode` a mano: la gravità segue questo metodo.
     */
    setMode(mode) {
        this.mode = mode;
        this.gravity = (mode === 'free') ? 0 : 500;
        return this;
    }

    jump() {
        if (this.isGrounded || this.mode === 'free') {
            this.vy = this.jumpForce;
            this.isGrounded = false;
        }
    }

    /**
     * Increases jump power permanently.
     * @param {number} amount
     */
    boostJump(amount) {
        this._permanentBoostAmount = amount;
        this.jumpForce = this.baseJumpForce - amount;
    }

    /**
     * Legacy alias for boostJump
     */
    potenziaSalto(amount) {
        this.boostJump(amount);
    }

    /**
     * Temporarily boosts jump power for a duration in milliseconds (simulation time).
     * Allo scadere torna al boost permanente, non a baseJumpForce secco.
     * @param {number} amount
     * @param {number} durationMs
     */
    boostJumpTemporary(amount, durationMs) {
        this.jumpForce = this.baseJumpForce - amount;
        this._boost.duration = Math.max(0, durationMs) / 1000;
        this._boost.start();
    }

    /**
     * Legacy alias for boostJumpTemporary
     */
    potenziaSaltoTemporaneo(amount, durationMs) {
        this.boostJumpTemporary(amount, durationMs);
    }

    consumeAttack() {
        const wanted = this.wantsAttack;
        this.wantsAttack = false;
        return wanted;
    }

    addScore(points) {
        this.score += points;
    }

    takeDamage(amount = 1) {
        this.lives = Math.max(0, this.lives - amount);
        return this.lives <= 0;
    }

    update(dt, input, engine) {
        if (this.destroyed || !this.active) return;

        if (engine && engine.time) {
            this._boost.update(engine.time);
        } else {
            this._boost.update(dt);
        }

        if (input) {
            this.vx = 0;
            if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) this.vx = this.speed;
            if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) this.vx = -this.speed;

            if (input.wasPressed('KeyX') || input.wasPressed('KeyJ')) {
                this.wantsAttack = true;
            }

            if (this.mode === 'platformer') {
                if (input.wasPressed('Space') || input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) {
                    this.jump();
                }
            } else {
                if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) this.vy = this.speed;
                else if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) this.vy = -this.speed;
                else this.vy = 0;
            }
        }

        super.update(dt, input, engine);
    }

    draw(ctx, engine) {
        if (!ctx) return;
        ctx.save();

        if (this.sprite) {
            if (this.vx < 0) this.sprite.flipX = true;
            if (this.vx > 0) this.sprite.flipX = false;
            this.sprite.draw(ctx, this.worldX, this.worldY, { width: this.width, height: this.height });
            ctx.restore();
            return;
        }

        const texture = (engine && this.textureKey && typeof engine.getAsset === 'function')
            ? engine.getAsset(this.textureKey)
            : null;
        if (texture) {
            ctx.drawImage(texture, this.worldX, this.worldY, this.width, this.height);
            ctx.restore();
            return;
        }

        ctx.fillStyle = '#4A90E2';
        ctx.fillRect(this.worldX, this.worldY, this.width, this.height);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.worldX, this.worldY, this.width, this.height);
        ctx.restore();
    }

    destroy() {
        if (this._boost) this._boost.cancel();
        super.destroy();
    }
}
