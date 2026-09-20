/**
 * BeePathfinder — A* e flow field su griglia / tilemap.
 * Camminabile vs solido, ricalcolo se cambiano muri o goal, follow per l'inseguimento.
 * Senza questo l'AI 2D resta pattuglia o chase in linea retta.
 */

export const BEE_PATH_DEFAULTS = Object.freeze({
    diagonal: true,
    cornerCut: false,
    walkable: 0,
    maxIterations: 8000,
    arrive: 0.35
});

const ORTHO = Object.freeze([
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
]);

const DIAG = Object.freeze([
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
]);

function keyOf(col, row) {
    return (row << 16) ^ (col & 0xffff);
}

export class BeePath {
    constructor() {
        this.cells = [];
        this.points = [];
        this.found = false;
        this.index = 0;
        this.goalCol = -1;
        this.goalRow = -1;
        this.version = 0;
        this.length = 0;
    }

    get current() {
        return this.index < this.points.length ? this.points[this.index] : null;
    }

    get finished() {
        return !this.found || this.index >= this.points.length;
    }

    rewind() {
        this.index = 0;
        return this;
    }

    clear() {
        this.cells.length = 0;
        this.points.length = 0;
        this.found = false;
        this.index = 0;
        this.goalCol = -1;
        this.goalRow = -1;
        this.length = 0;
        return this;
    }
}

export class BeePathfinder {
    /**
     * @param {Partial<typeof BEE_PATH_DEFAULTS>} [options]
     */
    constructor(options = {}) {
        const cfg = { ...BEE_PATH_DEFAULTS, ...options };
        this.diagonal = cfg.diagonal !== false;
        this.cornerCut = cfg.cornerCut === true;
        this.walkable = cfg.walkable;
        this.maxIterations = Math.max(1, Number(cfg.maxIterations) || BEE_PATH_DEFAULTS.maxIterations);
        this.arrive = Number.isFinite(Number(cfg.arrive)) ? Number(cfg.arrive) : BEE_PATH_DEFAULTS.arrive;

        this.#grid = null;
        this.#tilemap = null;
        this.#cells = null;
        this.#cols = 0;
        this.#rows = 0;
        this.#cell = 32;
        this.#ox = 0;
        this.#oy = 0;
        this.#blocked = new Set();
        this.#version = 1;
        this.#stamp = 1;
        this.#seen = null;
        this.#closed = null;
        this.#g = null;
        this.#parent = null;
        this.#heap = [];
        this.#nbuf = [];
        this.#flowCost = null;
        this.#flowDx = null;
        this.#flowDy = null;
        this.#flowGoal = -1;
        this.#flowVersion = 0;
    }

    #grid;
    #tilemap;
    #cells;
    #cols;
    #rows;
    #cell;
    #ox;
    #oy;
    #blocked;
    #version;
    #stamp;
    #seen;
    #closed;
    #g;
    #parent;
    #heap;
    #nbuf;
    #flowCost;
    #flowDx;
    #flowDy;
    #flowGoal;
    #flowVersion;

    get cols() {
        return this.#cols;
    }

    get rows() {
        return this.#rows;
    }

    get cellSize() {
        return this.#cell;
    }

    get version() {
        return this.#version;
    }

    configure(options = {}) {
        if (options.diagonal != null) this.diagonal = options.diagonal !== false;
        if (options.cornerCut != null) this.cornerCut = options.cornerCut === true;
        if (options.walkable !== undefined) this.walkable = options.walkable;
        if (options.maxIterations != null) this.maxIterations = Math.max(1, Number(options.maxIterations) || this.maxIterations);
        if (options.arrive != null) this.arrive = Number(options.arrive);
        return this;
    }

    useGrid(grid, originX = 0, originY = 0) {
        if (!grid) throw new Error('BeePathfinder.useGrid: serve una BeeGrid');
        this.#grid = grid;
        this.#tilemap = null;
        this.#cells = grid.data || null;
        this.#cols = grid.cols | 0;
        this.#rows = grid.rows | 0;
        this.#cell = Number(grid.cellSize) || 32;
        this.#ox = originX;
        this.#oy = originY;
        this.#blocked.clear();
        this.#bump();
        this.#alloc();
        return this;
    }

    useTilemap(tilemap) {
        if (!tilemap) throw new Error('BeePathfinder.useTilemap: serve una BeeTilemap');
        this.#tilemap = tilemap;
        this.#grid = null;
        this.#cells = tilemap.tiles || null;
        this.#cols = tilemap.cols | 0;
        this.#rows = tilemap.rows | 0;
        this.#cell = Number(tilemap.tileSize) || 32;
        this.#ox = 0;
        this.#oy = 0;
        this.#blocked.clear();
        this.#bump();
        this.#alloc();
        return this;
    }

    useCells(data, cols, rows, cellSize = 32, originX = 0, originY = 0) {
        if (!Array.isArray(data)) throw new Error('BeePathfinder.useCells: serve data[][]');
        this.#grid = null;
        this.#tilemap = null;
        this.#cells = data;
        this.#cols = cols | 0;
        this.#rows = rows | 0;
        this.#cell = Number(cellSize) || 32;
        this.#ox = originX;
        this.#oy = originY;
        this.#blocked.clear();
        this.#bump();
        this.#alloc();
        return this;
    }

    setBlocked(col, row, blocked = true) {
        const id = keyOf(col | 0, row | 0);
        if (blocked) this.#blocked.add(id);
        else this.#blocked.delete(id);
        this.#bump();
        return this;
    }

    clearBlocked() {
        if (this.#blocked.size === 0) return this;
        this.#blocked.clear();
        this.#bump();
        return this;
    }

    isWalkable(col, row) {
        return this.#walkable(col | 0, row | 0);
    }

    worldToCell(x, y) {
        const origin = this.#origin();
        const size = this.#cell || 1;
        return {
            col: Math.floor((Number(x) - origin.x) / size),
            row: Math.floor((Number(y) - origin.y) / size)
        };
    }

    cellToWorld(col, row) {
        const origin = this.#origin();
        const size = this.#cell;
        return {
            x: origin.x + (col + 0.5) * size,
            y: origin.y + (row + 0.5) * size
        };
    }

    find(start, goal, out = null) {
        const a = this.#asCell(start);
        const b = this.#asCell(goal);
        return this.findCells(a.col, a.row, b.col, b.row, out);
    }

    findCells(startCol, startRow, goalCol, goalRow, out = null) {
        const path = out instanceof BeePath ? out : new BeePath();
        path.clear();
        path.version = this.#version;
        path.goalCol = goalCol | 0;
        path.goalRow = goalRow | 0;

        if (!this.#ready()) return path;

        const sc = startCol | 0;
        const sr = startRow | 0;
        const gc = goalCol | 0;
        const gr = goalRow | 0;
        if (!this.#inBounds(sc, sr) || !this.#inBounds(gc, gr)) return path;
        if (!this.#walkable(gc, gr)) return path;

        if (sc === gc && sr === gr) {
            path.found = true;
            this.#pushCell(path, sc, sr);
            return path;
        }

        const cols = this.#cols;
        const rows = this.#rows;
        const n = cols * rows;
        this.#ensureStamp();
        const stamp = this.#stamp;
        const seen = this.#seen;
        const gScore = this.#g;
        const parent = this.#parent;
        const heap = this.#heap;
        heap.length = 0;

        const start = sr * cols + sc;
        const goal = gr * cols + gc;
        gScore[start] = 0;
        seen[start] = stamp;
        parent[start] = -1;
        this.#heapPush(heap, start, this.#heuristic(sc, sr, gc, gr));

        let found = -1;
        let steps = 0;
        const max = this.maxIterations;

        while (heap.length > 0 && steps < max) {
            steps += 1;
            const current = this.#heapPop(heap);
            if (this.#closed[current] === stamp) continue;
            this.#closed[current] = stamp;
            if (current === goal) {
                found = current;
                break;
            }
            const ccol = current % cols;
            const crow = (current / cols) | 0;
            const baseG = gScore[current];

            const neighbors = this.#neighbors(ccol, crow);
            for (let i = 0; i < neighbors.length; i++) {
                const nc = neighbors[i][0];
                const nr = neighbors[i][1];
                const cost = neighbors[i][2];
                const idx = nr * cols + nc;
                const tentative = baseG + cost;
                if (seen[idx] === stamp && tentative >= gScore[idx]) continue;
                seen[idx] = stamp;
                gScore[idx] = tentative;
                parent[idx] = current;
                this.#heapPush(heap, idx, tentative + this.#heuristic(nc, nr, gc, gr));
            }
        }

        if (found < 0) return path;

        const cells = [];
        let cursor = found;
        let guard = 0;
        while (cursor >= 0 && guard < n) {
            cells.push(cursor);
            cursor = parent[cursor];
            guard += 1;
        }
        cells.reverse();
        path.found = true;
        for (let i = 0; i < cells.length; i++) {
            const idx = cells[i];
            this.#pushCell(path, idx % cols, (idx / cols) | 0);
        }
        return path;
    }

    track(path, start, goal, out = path) {
        const b = this.#asCell(goal);
        if (
            path &&
            path.found &&
            path.goalCol === b.col &&
            path.goalRow === b.row &&
            path.version === this.#version
        ) {
            return path;
        }
        return this.find(start, goal, out || path || new BeePath());
    }

    follow(entity, path, dt, speed) {
        if (!entity || !path || !path.found) return false;
        const step = (Number(speed) || 0) * (Number(dt) || 0);
        if (step < 0) return false;

        const hw = (Number(entity.width) || 0) / 2;
        const hh = (Number(entity.height) || 0) / 2;
        let cx = (typeof entity.worldX === 'number' ? entity.worldX : Number(entity.x) || 0) + hw;
        let cy = (typeof entity.worldY === 'number' ? entity.worldY : Number(entity.y) || 0) + hh;
        const radius = Math.max(1, this.#cell * this.arrive);
        const radius2 = radius * radius;

        while (path.index < path.points.length) {
            const point = path.points[path.index];
            const dx = point.x - cx;
            const dy = point.y - cy;
            const len2 = dx * dx + dy * dy;
            if (len2 <= radius2) {
                path.index += 1;
                continue;
            }
            const len = Math.sqrt(len2);
            if (len <= step || len < 1e-8) {
                cx = point.x;
                cy = point.y;
                path.index += 1;
            } else {
                cx += (dx / len) * step;
                cy += (dy / len) * step;
            }
            this.#writeCenter(entity, cx, cy, hw, hh);
            return true;
        }

        this.#writeCenter(entity, cx, cy, hw, hh);
        return false;
    }

    chase(entity, target, dt, options = {}) {
        if (!entity || !target) return false;
        const key = typeof options.key === 'string' ? options.key : 'path';
        const path = this.track(entity[key], entity, target);
        entity[key] = path;
        const speed = Number.isFinite(Number(options.speed)) ? Number(options.speed) : (Number(entity.speed) || 80);
        return this.follow(entity, path, dt, speed);
    }

    flow(goal) {
        if (!this.#ready()) return this;
        const cell = this.#asCell(goal);
        if (!this.#inBounds(cell.col, cell.row) || !this.#walkable(cell.col, cell.row)) {
            this.#flowGoal = -1;
            return this;
        }
        const cols = this.#cols;
        const rows = this.#rows;
        const n = cols * rows;
        if (!this.#flowCost || this.#flowCost.length !== n) {
            this.#flowCost = new Float64Array(n);
            this.#flowDx = new Float32Array(n);
            this.#flowDy = new Float32Array(n);
        }
        const cost = this.#flowCost;
        const dx = this.#flowDx;
        const dy = this.#flowDy;
        cost.fill(Infinity);
        dx.fill(0);
        dy.fill(0);

        const heap = this.#heap;
        heap.length = 0;
        const goalIndex = cell.row * cols + cell.col;
        cost[goalIndex] = 0;
        this.#heapPush(heap, goalIndex, 0);

        let steps = 0;
        const max = this.maxIterations * 4;
        while (heap.length > 0 && steps < max) {
            steps += 1;
            const current = this.#heapPop(heap);
            const base = cost[current];
            const ccol = current % cols;
            const crow = (current / cols) | 0;
            const neighbors = this.#neighbors(ccol, crow);
            for (let i = 0; i < neighbors.length; i++) {
                const nc = neighbors[i][0];
                const nr = neighbors[i][1];
                const idx = nr * cols + nc;
                const next = base + neighbors[i][2];
                if (next >= cost[idx]) continue;
                cost[idx] = next;
                this.#heapPush(heap, idx, next);
            }
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const idx = row * cols + col;
                if (!Number.isFinite(cost[idx]) || idx === goalIndex) continue;
                let best = cost[idx];
                let bx = 0;
                let by = 0;
                const neighbors = this.#neighbors(col, row);
                for (let i = 0; i < neighbors.length; i++) {
                    const nc = neighbors[i][0];
                    const nr = neighbors[i][1];
                    const other = cost[nr * cols + nc];
                    if (other < best) {
                        best = other;
                        bx = nc - col;
                        by = nr - row;
                    }
                }
                const len = Math.hypot(bx, by);
                if (len > 0) {
                    dx[idx] = bx / len;
                    dy[idx] = by / len;
                }
            }
        }

        this.#flowGoal = goalIndex;
        this.#flowVersion = this.#version;
        return this;
    }

    sampleFlow(x, y) {
        if (this.#flowGoal < 0 || this.#flowVersion !== this.#version || !this.#flowDx) return null;
        const cell = typeof x === 'object' ? this.#asCell(x) : this.worldToCell(x, y);
        if (!this.#inBounds(cell.col, cell.row)) return null;
        const idx = cell.row * this.#cols + cell.col;
        if (!Number.isFinite(this.#flowCost[idx])) return null;
        return { x: this.#flowDx[idx], y: this.#flowDy[idx] };
    }

    #ready() {
        return this.#cols > 0 && this.#rows > 0 && this.#cell > 0;
    }

    #origin() {
        if (this.#tilemap) {
            return {
                x: typeof this.#tilemap.worldX === 'number' ? this.#tilemap.worldX : 0,
                y: typeof this.#tilemap.worldY === 'number' ? this.#tilemap.worldY : 0
            };
        }
        return { x: this.#ox, y: this.#oy };
    }

    #alloc() {
        const n = this.#cols * this.#rows;
        this.#seen = new Uint32Array(n);
        this.#closed = new Uint32Array(n);
        this.#g = new Float64Array(n);
        this.#parent = new Int32Array(n);
        this.#stamp = 1;
        this.#flowCost = null;
        this.#flowDx = null;
        this.#flowDy = null;
        this.#flowGoal = -1;
    }

    #bump() {
        this.#version += 1;
        this.#flowGoal = -1;
    }

    #ensureStamp() {
        this.#stamp += 1;
        if (this.#stamp === 0xffffffff) {
            this.#seen.fill(0);
            this.#stamp = 1;
        }
    }

    #inBounds(col, row) {
        return col >= 0 && row >= 0 && col < this.#cols && row < this.#rows;
    }

    #walkable(col, row) {
        if (!this.#inBounds(col, row)) return false;
        if (this.#blocked.has(keyOf(col, row))) return false;
        if (this.#tilemap && typeof this.#tilemap.isSolidTile === 'function') {
            return this.#tilemap.isSolidTile(col, row) !== true;
        }
        const grid = this.#grid;
        const value = grid && typeof grid.getCell === 'function'
            ? grid.getCell(col, row)
            : (this.#cells && this.#cells[row] ? this.#cells[row][col] : null);
        if (value == null) return false;
        if (typeof this.walkable === 'function') return this.walkable(value, col, row) === true;
        return value === this.walkable;
    }

    #neighbors(col, row) {
        const out = this.#nbuf;
        out.length = 0;
        for (let i = 0; i < ORTHO.length; i++) {
            const nc = col + ORTHO[i][0];
            const nr = row + ORTHO[i][1];
            if (this.#walkable(nc, nr)) out.push([nc, nr, 1]);
        }
        if (!this.diagonal) return out;
        for (let i = 0; i < DIAG.length; i++) {
            const dc = DIAG[i][0];
            const dr = DIAG[i][1];
            const nc = col + dc;
            const nr = row + dr;
            if (!this.#walkable(nc, nr)) continue;
            if (!this.cornerCut && (!this.#walkable(col + dc, row) || !this.#walkable(col, row + dr))) continue;
            out.push([nc, nr, Math.SQRT2]);
        }
        return out;
    }

    #heuristic(col, row, goalCol, goalRow) {
        const dx = Math.abs(col - goalCol);
        const dy = Math.abs(row - goalRow);
        if (!this.diagonal) return dx + dy;
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    }

    #asCell(input) {
        if (input && typeof input === 'object') {
            if (Number.isFinite(Number(input.col)) && Number.isFinite(Number(input.row))) {
                return { col: input.col | 0, row: input.row | 0 };
            }
            const w = Number(input.width) || 0;
            const h = Number(input.height) || 0;
            const x = (typeof input.worldX === 'number' ? input.worldX : Number(input.x) || 0) + w / 2;
            const y = (typeof input.worldY === 'number' ? input.worldY : Number(input.y) || 0) + h / 2;
            return this.worldToCell(x, y);
        }
        return { col: -1, row: -1 };
    }

    #pushCell(path, col, row) {
        path.cells.push({ col, row });
        const point = this.cellToWorld(col, row);
        path.points.push(point);
        if (path.points.length > 1) {
            const prev = path.points[path.points.length - 2];
            path.length += Math.hypot(point.x - prev.x, point.y - prev.y);
        }
    }

    #writeCenter(entity, cx, cy, hw, hh) {
        if (typeof entity.worldX === 'number') {
            entity.worldX = cx - hw;
            entity.worldY = cy - hh;
            return;
        }
        entity.x = cx - hw;
        entity.y = cy - hh;
    }

    #heapPush(heap, index, score) {
        heap.push(index, score);
        let i = heap.length - 2;
        while (i > 0) {
            const p = ((((i >> 1) - 1) >> 1) * 2);
            if (p < 0 || heap[p + 1] <= score) break;
            heap[i] = heap[p];
            heap[i + 1] = heap[p + 1];
            heap[p] = index;
            heap[p + 1] = score;
            i = p;
        }
    }

    #heapPop(heap) {
        const index = heap[0];
        const lastI = heap.length - 2;
        const lastIndex = heap[lastI];
        const lastScore = heap[lastI + 1];
        heap.length = lastI;
        if (heap.length === 0) return index;
        heap[0] = lastIndex;
        heap[1] = lastScore;
        let i = 0;
        while (true) {
            const l = i * 2 + 2;
            const r = l + 2;
            if (l >= heap.length) break;
            let best = l;
            if (r < heap.length && heap[r + 1] < heap[l + 1]) best = r;
            if (heap[best + 1] >= heap[i + 1]) break;
            const bi = heap[best];
            const bs = heap[best + 1];
            heap[best] = heap[i];
            heap[best + 1] = heap[i + 1];
            heap[i] = bi;
            heap[i + 1] = bs;
            i = best;
        }
        return index;
    }
}
