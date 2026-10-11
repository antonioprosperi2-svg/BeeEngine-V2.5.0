import { BeeSpriteSheet } from '../src/graphics/BeeSpriteSheet.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function callsOf(sheet, index, destW, destH) {
    const calls = [];
    sheet.drawFrame({
        drawImage(...args) {
            calls.push(args);
        }
    }, index, 10, 20, destW, destH);
    return calls;
}

{
    const sheet = new BeeSpriteSheet({}, 16, 16, { framesPerRow: 4 });
    assert(sheet.framesPerRow === 4, 'framesPerRow resta 4');
    assert(sheet.frameCount === undefined, 'senza frameCount non c’è un limite');
    const drawn = callsOf(sheet, 5);
    assert(drawn.length === 1, 'indice 5 disegna');
    assert(drawn[0][1] === 16 && drawn[0][2] === 16, 'indice 5 è colonna 1, riga 1');
    const far = callsOf(sheet, 3);
    assert(far.length === 1, 'senza frameCount l’indice 3 disegna');
}

{
    const sheet = new BeeSpriteSheet({}, 16, 16, { framesPerRow: 4, frameCount: 4 });
    const drawn = callsOf(sheet, 4);
    assert(drawn.length === 0, 'frameCount 4, indice 4 non chiama drawImage');
    const ok = callsOf(sheet, 3);
    assert(ok.length === 1, 'indice 3 è ancora nel foglio');
}

{
    const sheet = new BeeSpriteSheet({}, 16, 24, { col: 2 });
    assert(sheet.offsetX === 32, 'solo col 2 → offsetX = 2 * frameWidth');
    assert(sheet.offsetY === 0, 'row assente vale 0');
}

{
    const sheet = new BeeSpriteSheet({}, 16, 16, { framesPerRow: 0 });
    assert(sheet.framesPerRow === 0, 'framesPerRow 0 non diventa 1');
    sheet.drawFrame({
        drawImage() {
            throw new Error('drawImage');
        }
    }, 1, 0, 0);
    sheet.drawFrame(null, 0, 0, 0);
}

{
    const sheet = new BeeSpriteSheet({}, 16, 16, { framesPerRow: 4 });
    const drawn = callsOf(sheet, 0);
    assert(drawn[0][7] === 16 && drawn[0][8] === 16, 'dest assente usa frameWidth e frameHeight');
    sheet.drawFrame(null, 1, 0, 0);
}

console.log('BeeSpriteSheet tests ok');
