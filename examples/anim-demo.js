import {
    BeeEngine,
    BeeEntity,
    BeeSpriteSheet,
    BeeAnimatedSprite,
    BeeAnimator
} from '../BeeEngine.js';

const FRAME = 48;

function makeSheet() {
    const frames = 8;
    const canvas = document.createElement('canvas');
    canvas.width = FRAME * frames;
    canvas.height = FRAME;
    const ctx = canvas.getContext('2d');
    const colors = ['#f4d35e', '#ee964b', '#f95738', '#0d9488', '#277da1', '#577590', '#90be6d', '#f94144'];
    for (let i = 0; i < frames; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(i * FRAME, 0, FRAME, FRAME);
        ctx.fillStyle = '#111';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), i * FRAME + FRAME / 2, FRAME / 2);
    }
    return new BeeSpriteSheet(canvas, FRAME, FRAME, {
        framesPerRow: frames,
        frameCount: frames
    });
}

class DemoActor extends BeeEntity {
    constructor(x, y, sprite, animator = null) {
        super(x, y, FRAME * 2, FRAME * 2);
        this.sprite = sprite;
        this.animator = animator;
        this.wantsAttack = false;
    }

    draw(ctx) {
        if (this.sprite) {
            this.sprite.draw(ctx, this.worldX, this.worldY, {
                width: this.width,
                height: this.height
            });
        }
    }
}

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableAutoResize(800, 600);
window.game = gioco;
window.gioco = gioco;

const sheet = makeSheet();
const scene = {
    entities: [],
    walker: null,
    slash: null,
    fighter: null,
    hitchNote: '',

    enter() {
        const walkSprite = new BeeAnimatedSprite(sheet, {
            animations: {
                walk: { frames: [0, 1, 2, 3], fps: 8, loop: true }
            }
        });
        walkSprite.play('walk');
        this.walker = new DemoActor(80, 220, walkSprite);

        const slashSprite = new BeeAnimatedSprite(sheet, {
            animations: {
                slash: { frames: [4, 5, 6, 7], fps: 8, loop: false }
            }
        });
        slashSprite.play('slash');
        this.slash = new DemoActor(320, 220, slashSprite);

        const fightSprite = new BeeAnimatedSprite(sheet, {
            animations: {
                idle: { frames: [0, 1], fps: 6, loop: true },
                poke: { frames: [4, 5, 6, 7], fps: 10, loop: true }
            }
        });
        const animator = new BeeAnimator(fightSprite)
            .add('idle', { clip: 'idle', initial: true })
            .add('poke', { clip: 'poke', loop: false, lock: true, priority: 10, exitTo: 'idle' })
            .when('*', 'poke', (actor) => actor.wantsAttack)
            .start();
        this.fighter = new DemoActor(560, 220, fightSprite, animator);
        this.fighter.animatorContext = () => this.fighter;

        this.entities = [this.walker, this.slash, this.fighter];
    },

    update(_dt, input) {
        if (input && input.wasPressed('Space')) {
            this.slash.sprite.play('slash', { restart: true, loop: false });
        }
        if (input && input.wasPressed('KeyX')) {
            this.fighter.wantsAttack = true;
        } else if (this.fighter) {
            this.fighter.wantsAttack = false;
        }
        if (input && input.wasPressed('KeyH')) {
            const before = this.walker.sprite.currentFrameIndex;
            this.walker.sprite.update(10);
            this.hitchNote = `hitch: frame ${before} → ${this.walker.sprite.currentFrameIndex} (max 1)`;
        }
    },

    drawWorld(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const rows = [
            ['loop (no animator)', this.walker],
            ['one-shot', this.slash],
            ['animator', this.fighter]
        ];
        ctx.fillStyle = '#ffd700';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let i = 0; i < rows.length; i++) {
            const [label, actor] = rows[i];
            if (!actor || !actor.sprite) continue;
            const s = actor.sprite;
            const x = actor.worldX;
            const y = actor.worldY + actor.height + 8;
            ctx.fillText(label, x, y);
            ctx.fillText(`${s.clip}  f=${s.currentFrameIndex}`, x, y + 16);
            ctx.fillText(`finished=${s.finished}`, x, y + 32);
        }
    },

    draw(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, 45);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.hitchNote || 'BeeAnimatedSprite', ctx.canvas.width / 2, 28);
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
            'Spazio=one-shot  X=attacco (animator loop:false vince sul clip)  H=hitch dt=10',
            20,
            ctx.canvas.height - 16
        );
    }
};

gioco.scenes.add('anim', scene);
gioco.scenes.change('anim');
gioco.start();
