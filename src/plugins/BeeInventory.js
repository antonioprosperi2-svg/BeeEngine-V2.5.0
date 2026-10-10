/**
 * BeeInventory — stack, uso ed equipaggiamento.
 * Nessun onTick e nessun draw: il gioco chiama i metodi.
 * Il motore non importa questo file.
 */

function copyStack(stack) {
    return stack ? { id: stack.id, qty: stack.qty } : null;
}

export class BeeInventory {
    /**
     * @param {{ slots?: number, equipSlots?: string[], engine?: object }} [options]
     */
    constructor(options = {}) {
        const rawSlots = options.slots;
        const count = rawSlots == null ? 20 : Number(rawSlots);
        if (!Number.isInteger(count) || count < 0) {
            console.warn('BeeInventory: slots non valido, uso 20');
            this.#count = 20;
        } else {
            this.#count = count;
        }

        this.#defs = new Map();
        this.#slots = new Array(this.#count).fill(null);
        this.#equipOrder = [];
        this.#allowed = new Set();
        this.#equip = {};
        const names = Array.isArray(options.equipSlots) ? options.equipSlots : [];
        for (let i = 0; i < names.length; i++) {
            const name = names[i] == null ? '' : String(names[i]);
            if (!name || this.#allowed.has(name)) continue;
            this.#allowed.add(name);
            this.#equipOrder.push(name);
            this.#equip[name] = null;
        }

        this.#listeners = new Set();
        this.engine = null;
        if (options.engine) this.attach(options.engine);
    }

    #count;
    #defs;
    #slots;
    #equipOrder;
    #allowed;
    #equip;
    #listeners;

    attach(engine) {
        this.engine = engine || null;
        if (this.engine && typeof this.engine.registerPlugin === 'function') {
            this.engine.registerPlugin('inventory', this);
        }
        return this;
    }

    detach() {
        if (this.engine && typeof this.engine.unregisterPlugin === 'function') {
            this.engine.unregisterPlugin('inventory');
        }
        this.engine = null;
        return this;
    }

    defineItem(id, def = {}) {
        const key = id == null ? '' : String(id);
        if (!key) throw new Error('BeeInventory.defineItem: id required');
        if (this.#defs.has(key)) {
            throw new Error(`BeeInventory.defineItem: item già definito: ${key}`);
        }

        const spec = def && typeof def === 'object' ? def : {};
        let maxStack = 1;
        if (spec.maxStack != null) {
            const max = Number(spec.maxStack);
            if (Number.isInteger(max) && max >= 1) maxStack = max;
            else console.warn(`BeeInventory.defineItem: maxStack non valido per ${key}`);
        }

        const equipSlot = spec.equipSlot == null || spec.equipSlot === ''
            ? null
            : String(spec.equipSlot);
        const data = spec.data && typeof spec.data === 'object' ? { ...spec.data } : {};

        this.#defs.set(key, {
            id: key,
            name: spec.name != null ? String(spec.name) : key,
            maxStack,
            consumable: spec.consumable === true,
            equipSlot,
            onUse: typeof spec.onUse === 'function' ? spec.onUse : null,
            data
        });
        return this;
    }

    add(id, qty = 1) {
        if (!this.#known(id, 'add')) return { added: 0, left: qty };
        if (!this.#qtyOk(qty, 'add')) return { added: 0, left: qty };

        const placed = this.#placeInto(this.#slots, String(id), qty);
        if (placed.added > 0) {
            this.#emit({ type: 'add', id: String(id), qty, added: placed.added, left: placed.left });
        }
        return placed;
    }

    remove(id, qty = 1) {
        if (!this.#qtyOk(qty, 'remove')) return 0;
        const key = id == null ? '' : String(id);
        if (!key || !this.#defs.has(key)) {
            console.warn(`BeeInventory.remove: item sconosciuto: ${id}`);
            return 0;
        }

        let left = qty;
        let removed = 0;
        for (let i = this.#slots.length - 1; i >= 0 && left > 0; i--) {
            const stack = this.#slots[i];
            if (!stack || stack.id !== key) continue;
            const take = Math.min(stack.qty, left);
            stack.qty -= take;
            left -= take;
            removed += take;
            if (stack.qty <= 0) this.#slots[i] = null;
        }

        if (removed > 0) this.#emit({ type: 'remove', id: key, qty, removed });
        return removed;
    }

    count(id) {
        const key = id == null ? '' : String(id);
        let total = 0;
        for (let i = 0; i < this.#slots.length; i++) {
            const stack = this.#slots[i];
            if (stack && stack.id === key) total += stack.qty;
        }
        return total;
    }

    has(id, qty = 1) {
        if (!this.#qtyOk(qty, 'has')) return false;
        return this.count(id) >= qty;
    }

    get(index) {
        if (!this.#inRange(index)) {
            console.warn(`BeeInventory.get: indice fuori range: ${index}`);
            return null;
        }
        return copyStack(this.#slots[index]);
    }

    list() {
        const out = new Array(this.#slots.length);
        for (let i = 0; i < this.#slots.length; i++) out[i] = copyStack(this.#slots[i]);
        return out;
    }

    move(from, to) {
        if (!this.#inRange(from) || !this.#inRange(to)) {
            console.warn(`BeeInventory.move: indice fuori range: ${from} → ${to}`);
            return false;
        }
        if (from === to) return true;

        const source = this.#slots[from];
        const dest = this.#slots[to];
        if (!source) {
            console.warn(`BeeInventory.move: slot ${from} vuoto`);
            return false;
        }
        if (!dest) {
            this.#slots[to] = source;
            this.#slots[from] = null;
            this.#emit({ type: 'move', from, to });
            return true;
        }
        if (source.id === dest.id) {
            const room = this.#defs.get(source.id).maxStack - dest.qty;
            if (room <= 0) return true;
            const put = Math.min(room, source.qty);
            dest.qty += put;
            source.qty -= put;
            if (source.qty <= 0) this.#slots[from] = null;
            this.#emit({ type: 'move', from, to });
            return true;
        }

        this.#slots[from] = dest;
        this.#slots[to] = source;
        this.#emit({ type: 'move', from, to });
        return true;
    }

    use(index, ctx) {
        if (!this.#inRange(index)) {
            console.warn(`BeeInventory.use: indice fuori range: ${index}`);
            return false;
        }
        const stack = this.#slots[index];
        if (!stack) {
            console.warn(`BeeInventory.use: slot ${index} vuoto`);
            return false;
        }
        const def = this.#defs.get(stack.id);
        if (!def || typeof def.onUse !== 'function') {
            console.warn(`BeeInventory.use: ${stack.id} non è usabile`);
            return false;
        }

        const snap = this.toJSON();
        let result;
        try {
            result = def.onUse(ctx, { id: stack.id, qty: 1 }, this);
        } catch (error) {
            this.fromJSON(snap);
            throw error;
        }
        if (result === false) return false;

        if (def.consumable) {
            const live = this.#slots[index];
            if (live && live.id === stack.id && live.qty > 0) {
                live.qty -= 1;
                if (live.qty <= 0) this.#slots[index] = null;
            }
        }
        this.#emit({ type: 'use', index, id: stack.id });
        return true;
    }

    equip(index) {
        if (!this.#inRange(index)) {
            console.warn(`BeeInventory.equip: indice fuori range: ${index}`);
            return false;
        }
        const stack = this.#slots[index];
        if (!stack) {
            console.warn(`BeeInventory.equip: slot ${index} vuoto`);
            return false;
        }
        const def = this.#defs.get(stack.id);
        const slotName = def && def.equipSlot;
        if (!slotName || !this.#allowed.has(slotName)) {
            console.warn(`BeeInventory.equip: ${stack.id} non ha uno slot di equipaggiamento`);
            return false;
        }

        const next = this.#cloneSlots();
        next[index].qty -= 1;
        if (next[index].qty <= 0) next[index] = null;

        const previous = this.#equip[slotName];
        if (previous) {
            const back = this.#placeInto(next, previous.id, previous.qty);
            if (back.left > 0) {
                console.warn(`BeeInventory.equip: inventario pieno, ${previous.id} non torna`);
                return false;
            }
        }

        this.#slots = next;
        this.#equip[slotName] = { id: stack.id, qty: 1 };
        this.#emit({ type: 'equip', index, id: stack.id, equipSlot: slotName });
        return true;
    }

    unequip(equipSlot) {
        const name = equipSlot == null ? '' : String(equipSlot);
        if (!name || !this.#allowed.has(name)) {
            console.warn(`BeeInventory.unequip: slot sconosciuto: ${equipSlot}`);
            return false;
        }
        const current = this.#equip[name];
        if (!current) {
            console.warn(`BeeInventory.unequip: ${name} è vuoto`);
            return false;
        }

        const next = this.#cloneSlots();
        const back = this.#placeInto(next, current.id, current.qty);
        if (back.left > 0) {
            console.warn(`BeeInventory.unequip: inventario pieno, ${current.id} non torna`);
            return false;
        }

        this.#slots = next;
        this.#equip[name] = null;
        this.#emit({ type: 'unequip', equipSlot: name, id: current.id, qty: current.qty });
        return true;
    }

    equipped(equipSlot) {
        const name = equipSlot == null ? '' : String(equipSlot);
        if (!name || !Object.prototype.hasOwnProperty.call(this.#equip, name)) return null;
        return copyStack(this.#equip[name]);
    }

    onChange(fn) {
        if (typeof fn !== 'function') return () => {};
        this.#listeners.add(fn);
        return () => {
            this.#listeners.delete(fn);
        };
    }

    toJSON() {
        const slots = new Array(this.#slots.length);
        for (let i = 0; i < this.#slots.length; i++) slots[i] = copyStack(this.#slots[i]);
        const equipment = {};
        for (let i = 0; i < this.#equipOrder.length; i++) {
            const name = this.#equipOrder[i];
            equipment[name] = copyStack(this.#equip[name]);
        }
        return { slots, equipment };
    }

    fromJSON(data) {
        const src = data && typeof data === 'object' ? data : {};
        const incoming = Array.isArray(src.slots) ? src.slots : [];
        if (incoming.length > this.#count) {
            console.warn(`BeeInventory.fromJSON: ${incoming.length - this.#count} voci in eccesso scartate`);
        }

        const next = new Array(this.#count).fill(null);
        const limit = Math.min(incoming.length, this.#count);
        for (let i = 0; i < limit; i++) {
            const stack = this.#readSaved(incoming[i]);
            if (stack) next[i] = stack;
        }

        const nextEquip = {};
        for (let i = 0; i < this.#equipOrder.length; i++) nextEquip[this.#equipOrder[i]] = null;
        const savedEquip = src.equipment && typeof src.equipment === 'object' ? src.equipment : {};
        const keys = Object.keys(savedEquip);
        for (let i = 0; i < keys.length; i++) {
            const name = keys[i];
            if (!this.#allowed.has(name)) {
                console.warn(`BeeInventory.fromJSON: slot equip sconosciuto: ${name}`);
                continue;
            }
            const stack = this.#readSaved(savedEquip[name]);
            if (stack) nextEquip[name] = stack;
        }

        this.#slots = next;
        this.#equip = nextEquip;
        return this;
    }

    clear() {
        this.#slots = new Array(this.#count).fill(null);
        for (let i = 0; i < this.#equipOrder.length; i++) this.#equip[this.#equipOrder[i]] = null;
        return this;
    }

    #known(id, method) {
        const key = id == null ? '' : String(id);
        if (key && this.#defs.has(key)) return true;
        console.warn(`BeeInventory.${method}: item sconosciuto: ${id}`);
        return false;
    }

    #qtyOk(qty, method) {
        if (Number.isInteger(qty) && qty > 0) return true;
        console.warn(`BeeInventory.${method}: qty non valida: ${qty}`);
        return false;
    }

    #inRange(index) {
        return Number.isInteger(index) && index >= 0 && index < this.#slots.length;
    }

    #cloneSlots() {
        const next = new Array(this.#slots.length);
        for (let i = 0; i < this.#slots.length; i++) next[i] = copyStack(this.#slots[i]);
        return next;
    }

    #placeInto(slots, id, qty) {
        const max = this.#defs.get(id).maxStack;
        let left = qty;
        for (let i = 0; i < slots.length && left > 0; i++) {
            const stack = slots[i];
            if (!stack || stack.id !== id || stack.qty >= max) continue;
            const put = Math.min(max - stack.qty, left);
            stack.qty += put;
            left -= put;
        }
        for (let i = 0; i < slots.length && left > 0; i++) {
            if (slots[i]) continue;
            const put = Math.min(max, left);
            slots[i] = { id, qty: put };
            left -= put;
        }
        return { added: qty - left, left };
    }

    #readSaved(entry) {
        if (entry == null) return null;
        const id = entry.id == null ? '' : String(entry.id);
        const qty = Number(entry.qty);
        if (!id || !this.#defs.has(id)) {
            console.warn(`BeeInventory.fromJSON: id sconosciuto: ${id || entry.id}`);
            return null;
        }
        if (!Number.isInteger(qty) || qty <= 0) {
            console.warn(`BeeInventory.fromJSON: qty non valida: ${entry.qty}`);
            return null;
        }
        const max = this.#defs.get(id).maxStack;
        if (qty > max) {
            console.warn(`BeeInventory.fromJSON: qty sopra maxStack per ${id}`);
            return { id, qty: max };
        }
        return { id, qty };
    }

    #emit(event) {
        const list = [];
        this.#listeners.forEach((fn) => list.push(fn));
        for (let i = 0; i < list.length; i++) list[i](event);
    }
}
