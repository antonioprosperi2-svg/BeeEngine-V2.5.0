import { BeeEntity } from '../core/BeeEntity.js';
import { BEE_DRAW } from './BeeLayer.js';

/**
 * BeeText: Renders single text elements and provides a customizable HUD layout.
 */
export class BeeText extends BeeEntity {
    constructor(text = "", x = 0, y = 0, font = "bold 20px Arial", color = "#ffffff", align = "left") {
        super(x, y, 0, 0);

        this.text = text;
        this.font = font;
        this.color = color;
        this.align = align;
        this.baseline = "top";
        this.drawLayer = BEE_DRAW.UI;
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.font = this.font;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.align;
        ctx.textBaseline = this.baseline;
        ctx.fillText(this.text, this.worldX, this.worldY);
        ctx.restore();
    }

    /**
     * Renders a customizable top HUD bar (Score + Lives + Title).
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} [score=0] 
     * @param {number} [lives=3] 
     * @param {string} [title="GAME"] 
     * @param {Object} [options={}] Custom HUD options (scoreLabel, livesLabel, icon)
     */
    static drawHUD(ctx, score = 0, lives = 3, title = 'GAME', options = {}) {
        const {
            scoreLabel = 'SCORE',
            livesLabel = 'LIVES',
            livesIcon = '❤️ ',
            barHeight = 45,
            titleColor = '#FFD700',
            textColor = '#FFFFFF'
        } = options;

        ctx.save();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, barHeight);

        if (title) {
            ctx.fillStyle = titleColor;
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, ctx.canvas.width / 2, 28);
        }

        ctx.fillStyle = textColor;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        const formattedScore = String(score).padStart(6, '0');
        ctx.fillText(`${scoreLabel}: ${formattedScore}`, 20, 28);

        ctx.fillStyle = '#FF4444';
        ctx.font = '18px Arial';
        ctx.textAlign = 'right';
        const hearts = livesIcon.repeat(Math.max(0, lives));
        ctx.fillText(`${livesLabel}: ${hearts || '0'}`, ctx.canvas.width - 20, 28);

        ctx.restore();
    }
}
