import { BeeText } from '../src/graphics/BeeText.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function mockCtx(baseline = 'top') {
    const texts = [];
    const ctx = {
        canvas: { width: 400, height: 200 },
        textBaseline: baseline,
        save() {
            this._baseline = this.textBaseline;
        },
        restore() {
            this.textBaseline = this._baseline;
        },
        fillRect() {},
        fillText(text) {
            texts.push({ text, baseline: this.textBaseline });
        }
    };
    return { ctx, texts };
}

{
    const { ctx, texts } = mockCtx();
    BeeText.drawHUD(ctx, -3, 1.5, 'GAME');
    const lives = texts.find((item) => item.text.startsWith('LIVES'));
    assert(lives, 'lives 1.5 disegna');
    assert(lives.text === 'LIVES: ❤️ ', 'lives 1.5 disegna un cuore');
    assert(texts.every((item) => item.baseline === 'alphabetic'), 'textBaseline è alphabetic anche se prima era top');
}

{
    const { ctx, texts } = mockCtx();
    BeeText.drawHUD(ctx, 0, NaN, 'GAME');
    const lives = texts.find((item) => item.text.startsWith('LIVES'));
    assert(lives && lives.text === 'LIVES: 0', 'lives NaN non lancia e vale 0');
}

{
    const { ctx, texts } = mockCtx();
    BeeText.drawHUD(ctx, -3, 0, 'GAME');
    const score = texts.find((item) => item.text.startsWith('SCORE'));
    assert(score && score.text.includes('-00003'), 'score -3 contiene -00003');
    assert(!score.text.includes('0000-3'), 'il segno non finisce in mezzo agli zeri');
}

{
    const label = new BeeText('ciao', 8, 8);
    label.draw(null);
    BeeText.drawHUD(null, -3, 1.5, 'GAME');
    BeeText.drawHUD({ canvas: null }, 1, 1, 'GAME');
}

console.log('BeeText tests ok');
