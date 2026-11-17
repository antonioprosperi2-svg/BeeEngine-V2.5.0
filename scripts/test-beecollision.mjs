import { BeeCollisionSystem } from '../src/physics/BeeCollisionSystem.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function throws(fn) {
    try {
        fn();
    } catch (error) {
        return error;
    }
    return null;
}

function hits(a, b) {
    return a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y;
}

let seq = 0;
function ent(x, y, width = 16, height = 16) {
    const entity = {
        id: ++seq,
        x,
        y,
        width,
        height,
        active: true,
        destroyed: false,
        resolved: [],
        collidesWith(other) {
            return hits(entity, other);
        },
        resolvePlatformCollision(other) {
            entity.resolved.push(other);
        }
    };
    return entity;
}

function system() {
    return new BeeCollisionSystem({
        checkCollision(a, b) {
            return hits(a, b);
        }
    });
}

// ------------------------------------------------------------------ setGroup / nomi

{
    const collisions = system();
    const player = ent(0, 0);
    collisions.setGroup('player', [player]);

    const error = throws(() => collisions.setGroup('player', null));
    assert(error instanceof Error, 'setGroup con un non-array lancia');
    assert(/array/i.test(error.message), 'il messaggio dice che serve un array');
    assert(collisions.groups.get('player').length === 1, 'il gruppo pieno resta pieno');
    assert(collisions.groups.get('player')[0] === player, 'l\'entità resta la stessa');

    collisions.setGroup('player', []);
    assert(collisions.groups.get('player').length === 0, 'un array vuoto svuota il gruppo');
}

{
    const collisions = system();
    const player = ent(0, 0);
    const calls = [
        () => collisions.createGroup(''),
        () => collisions.setGroup('', []),
        () => collisions.add('', player),
        () => collisions.remove('', player),
        () => collisions.solid('', 'solids'),
        () => collisions.solid('player', ''),
        () => collisions.overlap('', 'b', () => {}),
        () => collisions.overlap('a', '', () => {})
    ];
    for (let i = 0; i < calls.length; i++) {
        const error = throws(calls[i]);
        assert(error instanceof Error && error.message === 'BeeCollisionSystem: name required', `name vuoto lancia (${i})`);
    }
    assert(collisions.groups.size === 0 && collisions.rules.length === 0, 'un nome vuoto non registra nulla');
}

{
    const collisions = system();
    const error = throws(() => collisions.overlap('a', 'b', null));
    assert(error instanceof Error && error.message === 'BeeCollisionSystem.overlap: callback required', 'overlap senza funzione lancia subito');
    assert(collisions.rules.length === 0, 'la regola non viene registrata');
    collisions.run();
}

// ------------------------------------------------------------------ solid senza duplicati

{
    const collisions = system();
    const player = ent(0, 0);
    const wall = ent(4, 0);
    collisions.setGroup('player', [player]);
    collisions.setGroup('solids', [wall]);
    collisions.solid('player', 'solids');
    collisions.solid('player', 'solids');
    collisions.run();
    assert(player.resolved.length === 1 && player.resolved[0] === wall, 'solid due volte: una risoluzione per contatto');
    assert(collisions.rules.length === 1, 'la seconda solid non aggiunge una regola');
}

// ------------------------------------------------------------------ overlap di due gruppi

{
    const collisions = system();
    const player = ent(0, 0);
    const coin = ent(4, 0);
    collisions.setGroup('player', [player]);
    collisions.setGroup('coins', [coin]);
    const calls = [];
    const onHit = (a, b, engine) => calls.push([a, b, engine]);
    const again = () => {};
    collisions.overlap('player', 'coins', onHit);
    collisions.overlap('player', 'coins', onHit);
    collisions.overlap('player', 'coins', again);
    collisions.overlap('player', 'coins', again);
    collisions.run();
    assert(calls.length === 1, 'la stessa funzione non si registra due volte');
    assert(calls[0][0] === player && calls[0][1] === coin && calls[0][2] === collisions.engine, 'argomenti (a, b, engine)');
    assert(collisions.rules.length === 2, 'due funzioni diverse restano due regole');
}

// ------------------------------------------------------------------ stesso gruppo

{
    const collisions = system();
    const group = [ent(0, 0), ent(8, 0), ent(4, 4)];
    collisions.setGroup('swarm', group);
    const pairs = [];
    collisions.overlap('swarm', 'swarm', (a, b) => pairs.push([a, b]));
    collisions.run();
    assert(pairs.length === 3, 'tre entità che si toccano: tre coppie');
    assert(pairs.every(([a, b]) => a !== b), 'mai un\'entità contro se stessa');
    assert(pairs.every(([a, b]) => group.indexOf(a) < group.indexOf(b)), 'gli argomenti seguono l\'ordine nel gruppo');
    const keys = pairs.map(([a, b]) => `${a.id}:${b.id}`);
    assert(new Set(keys).size === 3, 'ogni coppia una volta sola');
}

// ------------------------------------------------------------------ destroyed resta nel gruppo

{
    const collisions = system();
    const live = ent(0, 0);
    const dead = ent(0, 0);
    dead.destroyed = true;
    const group = [live, dead];
    collisions.setGroup('swarm', group);
    let calls = 0;
    collisions.overlap('swarm', 'swarm', () => { calls += 1; });
    collisions.run();
    assert(calls === 0, 'un destroyed non genera callback');
    assert(group.length === 2 && group[1] === dead, 'il destroyed resta nell\'array del gruppo');
}

// ------------------------------------------------------------------ query dentro il callback

{
    const collisions = system();
    const hero = ent(0, 0);
    const coins = [ent(0, 0), ent(2, 0), ent(4, 0)];
    collisions.setGroup('hero', [hero]);
    collisions.setGroup('coins', coins);
    const seen = [];
    collisions.overlap('hero', 'coins', (a, b) => {
        seen.push(b);
        collisions.hash.query({ x: 0, y: 0, width: 64, height: 64 });
    });
    collisions.run();
    assert(seen.length === coins.length, 'hash.query nel callback non perde i contatti rimasti');
    assert(coins.every((coin) => seen.includes(coin)), 'arrivano tutti i contatti del giro');
}

// ------------------------------------------------------------------ width 0

{
    const collisions = system();
    const hero = ent(0, 0);
    const ghost = ent(0, 0, 0, 16);
    collisions.setGroup('hero', [hero]);
    collisions.setGroup('ghosts', [ghost]);
    let calls = 0;
    collisions.overlap('hero', 'ghosts', () => { calls += 1; });
    collisions.run();
    assert(calls === 0, 'width 0: nessun contatto');
    assert(collisions.hash.itemCount === 0, 'width 0: l\'entità non viene inserita nell\'hash');
}

// ------------------------------------------------------------------ clear

{
    const collisions = system();
    collisions.setGroup('player', [ent(0, 0)]);
    collisions.solid('player', 'solids');
    assert(collisions.clear() === collisions, 'clear ritorna this');
    assert(collisions.groups.size === 0 && collisions.rules.length === 0, 'clear cancella gruppi e regole');
    assert(collisions.hash.itemCount === 0, 'clear cancella l\'hash');
}

console.log('BeeCollisionSystem tests ok');
