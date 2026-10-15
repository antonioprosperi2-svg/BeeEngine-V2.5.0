import { BeeEntity } from '../core/BeeEntity.js';

export class BeeTilemap extends BeeEntity {
    constructor({
        x = 0,
        y = 0,
        tiles = [],
        tileSize = 32,
        solidTiles = [],
        tileset = null,
        tilesetColumns = 1
    } = {}) {
        super(x, y);

        this.tiles = tiles;
        this.tileSize = tileSize;
        this.solidTiles = solidTiles;

        this.tileset = tileset;
        this.tilesetColumns = tilesetColumns;
    }

    get rows() {
        return Array.isArray(this.tiles) ? this.tiles.length : 0;
    }

    get cols() {
        const tiles = this.tiles;
        if (!Array.isArray(tiles)) return 0;
        let cols = 0;
        for (let i = 0; i < tiles.length; i++) {
            const row = tiles[i];
            const len = Array.isArray(row) ? row.length : 0;
            if (len > cols) cols = len;
        }
        return cols;
    }

    /**
     * Intera mappa. Vuota, o `tileSize` non finito o `<= 0`: lati 0.
     */
    getWorldAABB() {
        const size = this.tileSize;
        if (!Number.isFinite(size) || size <= 0 || this.cols <= 0 || this.rows <= 0) {
            return { x: this.worldX, y: this.worldY, width: 0, height: 0 };
        }
        return {
            x: this.worldX,
            y: this.worldY,
            width: this.cols * size,
            height: this.rows * size
        };
    }

    getTile(col, row) {
        if (row < 0 || row >= this.rows) return null;
        if (col < 0 || col >= this.cols) return null;

        const line = this.tiles[row];
        if (!Array.isArray(line) || col >= line.length) return 0;
        const tile = line[col];
        return tile === undefined ? 0 : tile;
    }

    worldToTile(px, py) {
        const col = Math.floor((px - this.worldX) / this.tileSize);
        const row = Math.floor((py - this.worldY) / this.tileSize);

        return { col, row };
    }

    isSolidTile(col, row) {
        const tile = this.getTile(col, row);

        if (tile === null || tile === 0) return false;

        return this.solidTiles.includes(tile);
    }

    isSolidAtPixel(px, py) {
        const { col, row } = this.worldToTile(px, py);
        return this.isSolidTile(col, row);
    }

    entityCollides(entity) {
        if (!entity || !entity.collider) return false;

        const c = entity.collider;
        if (!(c.width > 0) || !(c.height > 0)) return false;
        if (!Number.isFinite(this.tileSize) || this.tileSize <= 0) return false;

        const startCol = Math.floor((c.x - this.worldX) / this.tileSize);
        const startRow = Math.floor((c.y - this.worldY) / this.tileSize);
        const endCol = this.#exclusiveEnd(c.x + c.width, this.worldX);
        const endRow = this.#exclusiveEnd(c.y + c.height, this.worldY);

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (this.isSolidTile(col, row)) return true;
            }
        }
        return false;
    }

    draw(ctx, engine) {
        if (!ctx) return;
        if (!this.visible) return;
        if (!Number.isFinite(this.tileSize) || this.tileSize <= 0) return;
        if (!Number.isFinite(this.tilesetColumns) || this.tilesetColumns <= 0) return;

        const originX = this.worldX;
        const originY = this.worldY;
        const mapW = this.cols * this.tileSize;
        const mapH = this.rows * this.tileSize;

        if (engine && !engine.isRectVisibleInView(originX, originY, mapW, mapH)) {
            return;
        }

        const { viewLeft, viewTop, viewRight, viewBottom } = this.#getViewBounds(engine);

        const startCol = Math.max(0, Math.floor((viewLeft - originX) / this.tileSize));
        const endCol = Math.min(this.cols - 1, Math.floor((viewRight - originX) / this.tileSize));
        const startRow = Math.max(0, Math.floor((viewTop - originY) / this.tileSize));
        const endRow = Math.min(this.rows - 1, Math.floor((viewBottom - originY) / this.tileSize));

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const tile = this.getTile(col, row);

                if (tile === 0 || tile === null) continue;

                const drawX = originX + col * this.tileSize;
                const drawY = originY + row * this.tileSize;

                if (engine && !engine.isRectVisibleInView(drawX, drawY, this.tileSize, this.tileSize)) {
                    continue;
                }

                this.#renderTile(ctx, tile, drawX, drawY);
            }
        }
    }

    #exclusiveEnd(edge, origin) {
        const local = edge - origin;
        const index = Math.floor(local / this.tileSize);
        if (local === index * this.tileSize) return index - 1;
        return index;
    }

    #getViewBounds(engine) {
        let viewLeft = 0;
        let viewTop = 0;
        let viewRight = engine ? engine.canvas.width : Infinity;
        let viewBottom = engine ? engine.canvas.height : Infinity;

        if (engine && engine.camera) {
            const view = engine.camera.getViewBounds();
            viewLeft = view.x;
            viewTop = view.y;
            viewRight = view.x + view.width;
            viewBottom = view.y + view.height;
        }

        return { viewLeft, viewTop, viewRight, viewBottom };
    }

    #renderTile(ctx, tile, drawX, drawY) {
        if (this.tileset) {
            const index = tile - 1;
            if (!Number.isFinite(index) || index < 0) return;

            const sx = (index % this.tilesetColumns) * this.tileSize;
            const sy = Math.floor(index / this.tilesetColumns) * this.tileSize;

            ctx.drawImage(
                this.tileset,
                sx,
                sy,
                this.tileSize,
                this.tileSize,
                drawX,
                drawY,
                this.tileSize,
                this.tileSize
            );
            return;
        }

        ctx.save();
        ctx.fillStyle = this.solidTiles.includes(tile) ? '#666' : '#999';
        ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
        ctx.restore();
    }
}
