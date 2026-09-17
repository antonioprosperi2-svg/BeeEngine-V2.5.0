import { BeeTween, BeeEase, BeeTweenClock } from '../src/core/BeeTween.js';
import { BeeTimeline } from '../src/core/BeeTimeline.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const box = { x: 0, alpha: 1 };
const linear = new BeeTween({
    target: box,
    to: { x: 10 },
    duration: 1,
    ease: 'linear',
    autoStart: true
});
linear.update(0.5);
assert(Math.abs(box.x - 5) < 1e-9, 'linear midpoint ' + box.x);
linear.update(0.5);
assert(Math.abs(box.x - 10) < 1e-9 && linear.finished, 'linear end');

assert(BeeEase.quadOut(0) === 0 && BeeEase.quadOut(1) === 1, 'ease bounds');
assert(BeeEase.quadOut(0.5) > 0.5, 'quadOut fast start');

const delayed = { n: 0 };
const wait = new BeeTween({
    target: delayed,
    to: { n: 8 },
    duration: 0.2,
    delay: 0.5,
    ease: 'linear',
    autoStart: true
});
wait.update(0.4);
assert(delayed.n === 0, 'delay holds');
wait.update(0.2);
assert(delayed.n > 0, 'delay elapsed');

let yo = { x: 0 };
const ping = new BeeTween({
    target: yo,
    to: { x: 10 },
    duration: 1,
    ease: 'linear',
    yoyo: true,
    repeat: 1,
    autoStart: true
});
ping.update(1);
assert(Math.abs(yo.x - 10) < 1e-9 && ping.running, 'yoyo peak');
ping.update(1);
assert(Math.abs(yo.x) < 1e-9 && ping.finished, 'yoyo back');

const clock = new BeeTweenClock();
const a = { x: 0 };
const first = BeeTween.to(a, { x: 100 }, { duration: 1, ease: 'linear', clock });
BeeTween.to(a, { x: 20 }, { duration: 1, ease: 'linear', clock });
assert(first.cancelled || first.keys.length === 0, 'overwrite steals x');

const actor = { x: 0, y: 0, alpha: 0 };
let called = 0;
const tl = new BeeTimeline()
    .to(actor, { x: 10 }, { duration: 0.5, ease: 'linear' })
    .to(actor, { y: 10 }, { duration: 0.5, ease: 'linear' })
    .call(() => { called += 1; })
    .start();
tl.update(0.5);
assert(Math.abs(actor.x - 10) < 1e-6 && Math.abs(actor.y) < 1e-6, 'timeline first clip');
tl.update(0.5);
assert(Math.abs(actor.y - 10) < 1e-6 && called === 1 && tl.finished, 'timeline sequence');

const par = { a: 0, b: 0 };
new BeeTimeline()
    .to(par, { a: 4 }, { duration: 1, ease: 'linear' })
    .to(par, { b: 8 }, { duration: 1, ease: 'linear', at: 0 })
    .start()
    .update(1);
assert(Math.abs(par.a - 4) < 1e-9 && Math.abs(par.b - 8) < 1e-9, 'parallel at 0');

console.log('BeeTween tests ok');
