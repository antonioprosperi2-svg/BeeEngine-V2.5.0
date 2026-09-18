import { BeeAudioMixer, spatialMix, BEE_BUS } from '../src/audio/BeeAudioMixer.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const near = spatialMix(400, 300, 400, 300, { maxDistance: 600, panWidth: 400 });
assert(near.volume === 1 && near.pan === 0, 'listener center');

const right = spatialMix(800, 300, 400, 300, { maxDistance: 600, panWidth: 400 });
assert(right.pan === 1 && right.volume > 0 && right.volume < 1, 'pan right ' + right.volume);

const far = spatialMix(4000, 300, 400, 300, { maxDistance: 600 });
assert(far.volume === 0, 'out of range');

const mix = new BeeAudioMixer();
assert(mix.outputVolume(BEE_BUS.SFX) === 1, 'sfx default');
mix.setVolume('master', 0.5);
mix.setVolume('sfx', 0.5);
assert(Math.abs(mix.outputVolume('sfx') - 0.25) < 1e-9, 'bus multiply');
mix.mute('master', true);
assert(mix.outputVolume('sfx') === 0, 'master mute');
mix.mute('master', false);

mix.duck({ amount: 0.4, attack: 0.1, release: 0.2 });
const music = mix.bus('music');
assert(music.duck === 1, 'no duck yet');

mix.update({ unscaledDt: 1, delta: () => 1 });
assert(music.duck === 1, 'still no voice');

console.log('BeeAudioMixer tests ok');
