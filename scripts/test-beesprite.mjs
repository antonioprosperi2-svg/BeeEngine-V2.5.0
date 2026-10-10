import { BeeSprite } from '../src/graphics/BeeSprite.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function cell(sprite) {
    const calls = [];
    sprite.draw({
        drawImage(_image, sx, sy) {
            calls.push({ sx, sy });
        }
    }, 0, 0);
    assert(calls.length === 1, 'draw chiama drawImage una volta');
    return {
        col: calls[0].sx / sprite.frameWidth,
        row: calls[0].sy / sprite.frameHeight
    };
}

{
    const sprite = new BeeSprite({}, 16, 16, 4);
    assert(sprite.speed === 8, 'speed default 8');
    assert(sprite.frameCount === 4, 'frameCount default = framesPerRow');
}

{
    const sprite = new BeeSprite({}, 16, 16, 4, 8);
    const columns = [];
    for (let step = 0; step < 16; step++) {
        sprite.update(0.125);
        const drawn = cell(sprite);
        assert(drawn.row === 0, `dopo ${sprite.frame}s resta sulla riga 0`);
        columns.push(drawn.col);
    }
    assert(sprite.frame === 16, `dopo 2s frame è 16, è ${sprite.frame}`);
    assert(columns[0] === 1 && columns[1] === 2 && columns[2] === 3 && columns[3] === 0, 'la colonna cicla 1,2,3,0');
    assert(columns.every((col) => col >= 0 && col < 4), 'la colonna resta nella riga');
    const end = cell(sprite);
    assert(end.col === 0 && end.row === 0, 'dopo 2s colonna 0 riga 0');
}

{
    const sprite = new BeeSprite({}, 16, 16, 4, 8, 8);
    sprite.update(0.5);
    const row1 = cell(sprite);
    assert(sprite.frame === 4, 'a 0.5s frame 4');
    assert(row1.col === 0 && row1.row === 1, 'frameCount 8 entra nella riga 1');
    sprite.update(0.5);
    const back = cell(sprite);
    assert(sprite.frame === 8, 'a 1s frame 8');
    assert(back.col === 0 && back.row === 0, 'poi torna alla riga 0');
}

{
    const sprite = new BeeSprite({}, 16, 16, 4, 8);
    sprite.frame = 3;
    sprite.update(NaN);
    assert(sprite.frame === 3, 'dt NaN non cambia frame');
    sprite.update(Infinity);
    assert(sprite.frame === 3, 'dt Infinity non cambia frame');
}

{
    const sprite = new BeeSprite({}, 16, 16, 0, 8);
    sprite.update(1);
    assert(sprite.frame === 0, 'framesPerRow 0 non avanza');
    sprite.draw({
        drawImage() {
            throw new Error('drawImage');
        }
    }, 0, 0);
    sprite.frameCount = NaN;
    sprite.framesPerRow = 4;
    sprite.update(1);
    assert(sprite.frame === 0, 'frameCount non finito non avanza');
}

{
    const bare = new BeeSprite(null, 16, 16, 4, 8);
    bare.draw(null, 0, 0);
    bare.draw({
        drawImage() {
            throw new Error('drawImage');
        }
    }, 0, 0);
}

console.log('BeeSprite tests ok');
