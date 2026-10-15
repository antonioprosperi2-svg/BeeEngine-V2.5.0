import { BeeTilemap } from '../src/graphics/BeeTilemap.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

{
    const map = new BeeTilemap({
        x: -40,
        y: 0,
        tiles: [
            [1, 1, 1, 1],
            [1, 1, 1, 1]
        ],
        tileSize: 16
    });
    const box = map.getWorldAABB();
    const viewLeft = 0;
    const viewRight = 32;
    const entityRight = map.worldX + 32;
    const entityHits = map.worldX < viewRight && entityRight > viewLeft;
    const mapHits = box.x < viewRight && box.x + box.width > viewLeft;
    const lastCell = map.worldX + 3 * map.tileSize;

    assert(entityHits === false, 'il 32×32 dell\'entity è fuori dalla view');
    assert(mapHits === true, 'il resto della mappa entra nella view');
    assert(box.x === -40 && box.y === 0, 'origine della mappa');
    assert(box.width === 64 && box.height === 32, '4×2 celle');
    assert(box.x + box.width >= lastCell + map.tileSize, 'getWorldAABB include l\'ultima cella');
}

{
    const empty = new BeeTilemap({ tiles: [] });
    const none = empty.getWorldAABB();
    assert(none.width === 0 && none.height === 0, 'mappa vuota: lati 0');

    const bad = new BeeTilemap({
        tiles: [[1, 1]],
        tileSize: 0
    });
    const zero = bad.getWorldAABB();
    assert(zero.width === 0 && zero.height === 0, 'tileSize 0: lati 0');
}

{
    const map = new BeeTilemap({
        tiles: [[0, 1, 0]],
        tileSize: 32,
        solidTiles: [1]
    });
    const wide = {
        collider: { x: 16, y: 0, width: 64, height: 16 }
    };
    assert(map.entityCollides(wide) === true, 'il centro sul solido conta, anche se gli angoli sono vuoti');
    assert(map.entityCollides({}) === false, 'senza collider è false');
    assert(map.entityCollides({ collider: { x: 0, y: 0, width: 0, height: 16 } }) === false, 'width 0 è false');
}

{
    const map = new BeeTilemap({
        tiles: [[0, 1]],
        tileSize: 32,
        solidTiles: [1]
    });
    const edge = {
        collider: { x: 0, y: 0, width: 32, height: 16 }
    };
    assert(map.entityCollides(edge) === false, 'il bordo sinistro della tile solida non conta');
}

{
    const map = new BeeTilemap({
        tiles: [[1, 2]],
        tileSize: 8
    });
    assert(map.getTile(0, 1) === null, 'prima non c\'è la seconda riga');
    map.tiles = [[1, 2], [3, 4]];
    assert(map.rows === 2 && map.cols === 2, 'rows e cols seguono tiles');
    assert(map.getTile(1, 1) === 4, 'getTile legge la riga nuova');

    map.tiles = [[1, 2, 3], [4]];
    assert(map.cols === 3, 'la colonna è la riga più lunga');
    assert(map.getTile(2, 1) === 0, 'cella mancante come 0');
    assert(map.isSolidTile(2, 1) === false, 'cella mancante non è solida');
}

{
    const map = new BeeTilemap({
        tiles: [[1]],
        tileSize: 0,
        tileset: {},
        tilesetColumns: 1
    });
    map.draw({
        drawImage() {
            throw new Error('drawImage');
        }
    });
    map.tileSize = 16;
    map.draw(null);
}

{
    const map = new BeeTilemap({
        tiles: [[1]],
        tileSize: 16,
        tileset: {},
        tilesetColumns: 4
    });
    map.tiles = [[0]];
    map.draw({
        drawImage() {
            throw new Error('drawImage');
        }
    });
    map.tiles = [[-2]];
    map.draw({
        drawImage() {
            throw new Error('drawImage');
        },
        save() {},
        restore() {},
        fillRect() {}
    });
}

{
    const map = new BeeTilemap({
        tiles: [[1]],
        tileSize: 16
    });
    const ctx = {
        fillStyle: 'red',
        _saved: null,
        save() {
            this._saved = this.fillStyle;
        },
        restore() {
            this.fillStyle = this._saved;
        },
        fillRect() {}
    };
    map.draw(ctx);
    assert(ctx.fillStyle === 'red', '#666 non resta nel contesto');
}

console.log('BeeTilemap tests ok');
