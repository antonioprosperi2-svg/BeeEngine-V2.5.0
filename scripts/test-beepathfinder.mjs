import { BeeGrid } from '../src/core/BeeGrid.js';
import { BeePathfinder } from '../src/core/BeePathfinder.js';
import { BeeTilemap } from '../src/graphics/BeeTilemap.js';
import { BeeEntity } from '../src/core/BeeEntity.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

{
    const grid = new BeeGrid(7, 3, 10);
    grid.setCell(3, 0, 1);
    grid.setCell(3, 1, 1);
    const nav = new BeePathfinder({ diagonal: false });
    nav.useGrid(grid);
    const path = nav.findCells(0, 1, 6, 1);
    assert(path.found, 'corridoio intorno al muro');
    assert(path.cells.every((c) => !(c.col === 3 && c.row < 2)), 'non attraversa i solidi');
    assert(path.cells.some((c) => c.row === 2), 'passa dall apertura');
    assert(path.cells[0].col === 0 && path.cells[path.cells.length - 1].col === 6, 'start/goal');
}

{
    const grid = new BeeGrid(3, 3, 8);
    grid.setCell(1, 0, 1);
    grid.setCell(1, 1, 1);
    grid.setCell(1, 2, 1);
    const nav = new BeePathfinder({ diagonal: true });
    nav.useGrid(grid);
    const path = nav.findCells(0, 1, 2, 1);
    assert(!path.found, 'muro pieno = nessun path');
}

{
    const data = [
        [0, 1],
        [1, 0]
    ];
    const nav = new BeePathfinder({ diagonal: true, cornerCut: false });
    nav.useCells(data, 2, 2, 16);
    const blocked = nav.findCells(0, 0, 1, 1);
    assert(!blocked.found, 'diagonale tra due muri vietata');
    nav.configure({ cornerCut: true });
    const cut = nav.findCells(0, 0, 1, 1);
    assert(cut.found, 'cornerCut permette il taglio');
}

{
    const map = new BeeTilemap({
        tiles: [
            [0, 2, 0],
            [0, 2, 0],
            [0, 0, 0]
        ],
        tileSize: 32,
        solidTiles: [2]
    });
    const nav = new BeePathfinder({ diagonal: false });
    nav.useTilemap(map);
    assert(!nav.isWalkable(1, 0), 'tile solido');
    const path = nav.find({ x: 8, y: 8, width: 16, height: 16 }, { x: 72, y: 8, width: 16, height: 16 });
    assert(path.found && path.cells.some((c) => c.row === 2), 'tilemap gira sotto il solido');
}

{
    const grid = new BeeGrid(5, 1, 20);
    const nav = new BeePathfinder({ diagonal: false });
    nav.useGrid(grid);
    const first = nav.findCells(0, 0, 4, 0);
    assert(first.found, 'aperto');
    const same = nav.track(first, { col: 0, row: 0 }, { col: 4, row: 0 });
    assert(same === first, 'track riusa se goal uguale');
    nav.setBlocked(2, 0, true);
    const again = nav.track(first, { col: 0, row: 0 }, { col: 4, row: 0 });
    assert(!again.found, 'cella bloccata taglia il corridoio');
    assert(again.version === nav.version, 'track ricalcola sulla nuova version');
}

{
    const grid = new BeeGrid(5, 1, 10);
    const nav = new BeePathfinder({ diagonal: false, arrive: 0.2 });
    nav.useGrid(grid);
    const hunter = new BeeEntity(0, 0, 10, 10);
    const path = nav.find(hunter, { x: 35, y: 0, width: 10, height: 10 });
    assert(path.found, 'follow path');
    let moving = true;
    let steps = 0;
    while (moving && steps < 80) {
        moving = nav.follow(hunter, path, 0.05, 80);
        steps += 1;
    }
    assert(path.finished, 'follow arriva in fondo, steps=' + steps);
    assert(Math.abs(hunter.x - 40) < 3, 'centro sull ultimo waypoint, x=' + hunter.x);
}

{
    const grid = new BeeGrid(5, 3, 8);
    const nav = new BeePathfinder({ diagonal: false });
    nav.useGrid(grid);
    nav.flow({ col: 4, row: 1 });
    const dir = nav.sampleFlow(nav.cellToWorld(0, 1).x, nav.cellToWorld(0, 1).y);
    assert(dir && dir.x > 0.5 && Math.abs(dir.y) < 0.2, 'flow punta al goal, dir=' + JSON.stringify(dir));
}

console.log('BeePathfinder tests ok');
