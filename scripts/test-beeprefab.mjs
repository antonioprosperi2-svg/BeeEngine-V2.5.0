import { BeeEntity } from '../src/core/BeeEntity.js';
import { BeePrefab } from '../src/core/BeePrefab.js';
import { BeeEnemy } from '../src/gameplay/BeeEnemy.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const catalog = new BeePrefab();
catalog.type('enemy', BeeEnemy);
catalog.define('slime', {
    type: 'enemy',
    width: 32,
    height: 32,
    speed: 45,
    hp: 3,
    collider: true,
    drawLayer: 'ysort',
    props: { flavor: 'green' }
});

const recipe = catalog.get('slime');
const a = catalog.spawn('slime', { x: 10, y: 20 });
recipe.hp = 99;
recipe.props.flavor = 'mutated';
assert(a.x === 10 && a.y === 20, 'override x/y');
assert(a.hp === 3 && a.speed === 45, 'default hp/speed');
assert(a.flavor === 'green', 'props copiati');
assert(a.prefab === 'slime', 'marca prefab');
assert(a.collider && a.collider.width === 32, 'collider creato');
assert(a instanceof BeeEnemy, 'type class');
assert(catalog.get('slime').hp === 3, 'spawn non muta la ricetta');

const b = catalog.spawn('slime', { x: 80, y: 20, hp: 1 });
assert(a !== b, 'istanze diverse');
assert(b.hp === 1 && a.hp === 3, 'override per istanza');

catalog.define('slime-fast', { extend: 'slime', speed: 90, hp: 2 });
const fast = catalog.spawn('slime-fast', { x: 0, y: 0 });
assert(fast.speed === 90 && fast.hp === 2 && fast.flavor === 'green', 'extend merge');
assert(fast.prefab === 'slime-fast', 'nome ricetta figlia');

const wave = catalog.spawnMany('slime', [[0, 1], { x: 4, y: 5, hp: 8 }]);
assert(wave.length === 2 && wave[0].y === 1 && wave[1].hp === 8, 'spawnMany');

const listed = catalog.fromList([
    { prefab: 'slime', x: 1, y: 2 },
    { prefab: 'slime-fast', x: 3, y: 4 }
]);
assert(listed[0].prefab === 'slime' && listed[1].speed === 90, 'fromList');

const fromMap = catalog.fromObjects([
    { type: 'slime', x: 50, y: 60, width: 16, height: 16, properties: [{ name: 'hp', value: 7 }] },
    { type: 'decor', x: 0, y: 0 },
    { name: 'slime-fast', x: 9, y: 8, visible: false }
]);
assert(fromMap.length === 1 && fromMap[0].hp === 7 && fromMap[0].width === 16, 'fromObjects salta unknown/hidden');

let threw = false;
try {
    catalog.spawn('nope');
} catch {
    threw = true;
}
assert(threw, 'spawn sconosciuto lancia');

catalog.define('loop-a', { extend: 'loop-b', type: 'enemy' });
catalog.define('loop-b', { extend: 'loop-a', type: 'enemy' });
threw = false;
try {
    catalog.spawn('loop-a');
} catch (err) {
    threw = String(err.message).includes('ciclo');
}
assert(threw, 'extend ciclico lancia');

catalog.define('hat', { type: BeeEntity, width: 8, height: 8, y: -6 });
catalog.define('hero', {
    type: BeeEntity,
    width: 20,
    height: 24,
    children: ['hat']
});
const hero = catalog.spawn('hero', { addToScene: false });
assert(hero.children.length === 1 && hero.children[0].width === 8, 'children annidati');

const added = [];
const engine = {
    addEntity(entity) {
        added.push(entity);
        return entity;
    }
};
const withEngine = new BeePrefab({ engine });
withEngine.type('enemy', BeeEnemy);
withEngine.define('goon', { type: 'enemy' });
withEngine.spawn('goon', { x: 1, y: 1 });
withEngine.spawn('goon', { x: 2, y: 2, addToScene: false });
assert(added.length === 1, 'addToScene default true, false non aggiunge');

console.log('BeePrefab tests ok');
