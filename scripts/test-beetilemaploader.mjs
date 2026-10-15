import { BeeTilemapLoader } from '../src/graphics/BeeTilemapLoader.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function mapOf(layers, extra = {}) {
    return {
        width: 2,
        height: 1,
        tilewidth: 16,
        tileheight: 16,
        layers,
        ...extra
    };
}

function paintCtx() {
    const calls = [];
    return {
        calls,
        drawImage() {
            calls.push(arguments);
        }
    };
}

{
    const loader = new BeeTilemapLoader({});
    loader.load(mapOf([
        { name: 'ground', type: 'tilelayer', data: [1, 1] }
    ]));
    assert(loader.isLoaded === true, 'ground si carica');
    assert(loader.getColliders().length === 0, 'un solo layer ground non crea collider');
}

{
    const loader = new BeeTilemapLoader({});
    loader.load(mapOf([
        { name: 'collision', type: 'tilelayer', data: [1, 0] }
    ]));
    const walls = loader.getColliders();
    assert(walls.length === 1, 'layer collision con gid 1 crea un collider');
    assert(walls[0].width === 16 && walls[0].height === 16, 'il collider copre la cella');
}

{
    const loader = new BeeTilemapLoader({
        assets: { getImage() { return {}; } }
    });
    loader.load(mapOf([
        { name: 'ground', type: 'tilelayer', data: [1 | 0x80000000] }
    ], {
        tilesets: [{
            firstgid: 1,
            image: 'sheet.png',
            tilecount: 1,
            columns: 1,
            tilewidth: 16,
            tileheight: 16
        }]
    }));
    assert(loader.tileLookup.has(1), 'il tileset registra il gid 1');
    const ctx = paintCtx();
    loader.render(ctx);
    assert(ctx.calls.length === 1, 'gid 1 | 0x80000000 trova il tile 1');
}

{
    const loader = new BeeTilemapLoader({
        assets: { getImage() { return {}; } }
    });
    loader.load(mapOf([
        {
            name: 'ground',
            type: 'tilelayer',
            data: [1]
        }
    ], {
        width: 1,
        tilesets: [{
            firstgid: 1,
            image: 'sheet.png',
            tilecount: 1,
            tilewidth: 16,
            tileheight: 16
        }]
    }));
    const ctx = paintCtx();
    loader.render(ctx);
    assert(ctx.calls.length === 1, 'senza visible il layer viene disegnato');
}

{
    const loader = new BeeTilemapLoader({});
    loader.load({
        width: 1,
        height: 1,
        tilewidth: 32,
        tileheight: 40,
        layers: [],
        tilesets: [{
            firstgid: 1,
            image: 'a.png',
            tilecount: 1,
            tileheight: 20
        }]
    });
    const tile = loader.tileLookup.get(1);
    assert(tile.width === 32, 'manca tilewidth: usa la larghezza della mappa');
    assert(tile.height === 20, 'tileheight del tileset resta l\'altezza');
}

{
    const loader = new BeeTilemapLoader({});
    loader.load(null);
    assert(loader.isLoaded === false, 'load(null) lascia isLoaded false');
    loader.render(null);
    loader.load(mapOf([
        { name: 'collision', type: 'tilelayer', data: null }
    ]));
    assert(loader.getColliders().length === 0, 'data non array non crea collider');
    loader.engine = {};
    loader.render(paintCtx());
}

{
    const loader = new BeeTilemapLoader({
        assets: { getImage() { return {}; } },
        camera: {
            x: 0,
            y: 0,
            w: 32,
            h: 32,
            getViewBounds() {
                return { x: 1000, y: 1000, width: 16, height: 16 };
            }
        }
    });
    loader.load(mapOf([
        { name: 'ground', type: 'tilelayer', data: [1, 0] }
    ], {
        tilesets: [{
            firstgid: 1,
            image: 'sheet.png',
            tilecount: 1,
            tilewidth: 16,
            tileheight: 16
        }]
    }));
    const ctx = paintCtx();
    loader.render(ctx);
    assert(ctx.calls.length === 0, 'getViewBounds sposta la view, non x/y della camera');
}

console.log('BeeTilemapLoader tests ok');
