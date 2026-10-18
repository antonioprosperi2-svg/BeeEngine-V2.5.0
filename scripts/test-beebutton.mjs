import { BeeButton } from '../src/input/BeeButton.js';
import { BEE_DRAW } from '../src/graphics/BeeLayer.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function mouseAt(x, y, pressed, wasPressed) {
    return { mouse: { x, y, pressed, wasPressed } };
}

{
    const button = new BeeButton({ x: 100, y: 100, width: 160, height: 50 });
    assert(button.drawLayer === BEE_DRAW.UI, 'drawLayer è ui');
    button.update(0, mouseAt(0, 0, false, false));
    assert(button.hover === false, 'mouse a (0, 0) non è hover');
}

{
    let clicks = 0;
    const button = new BeeButton({
        x: 100,
        y: 100,
        width: 160,
        height: 50,
        onClick() { clicks += 1; }
    });
    button.update(0, mouseAt(120, 120, true, true));
    assert(button.down === true && button.hover === true, 'wasPressed dentro: down e hover');
    assert(clicks === 0, 'onClick non parte alla pressione');
    button.update(0, mouseAt(120, 120, false, false));
    assert(clicks === 1, 'rilascio dentro chiama onClick una volta');
    assert(button.down === false, 'down torna false');
    button.update(0, mouseAt(120, 120, false, false));
    assert(clicks === 1, 'il frame dopo non richiama onClick');
}

{
    let clicks = 0;
    const button = new BeeButton({
        x: 100,
        y: 100,
        width: 160,
        height: 50,
        onClick() { clicks += 1; }
    });
    button.update(0, mouseAt(120, 120, true, true));
    button.update(0, mouseAt(0, 0, false, false));
    assert(clicks === 0, 'rilascio fuori non chiama onClick');
    assert(button.down === false, 'rilascio fuori azzera down');
}

{
    let clicks = 0;
    const button = new BeeButton({
        x: 100,
        y: 100,
        width: 160,
        height: 50,
        onClick() { clicks += 1; }
    });
    button.width = 300;
    button.update(0, mouseAt(300, 120, true, true));
    button.update(0, mouseAt(300, 120, false, false));
    assert(clicks === 1, 'la width nuova riceve il click');
}

{
    let clicks = 0;
    const onClick = () => { clicks += 1; };
    const quiet = new BeeButton({ x: 100, y: 100, width: 160, height: 50, onClick });
    quiet.active = false;
    quiet.update(0, mouseAt(120, 120, true, true));
    quiet.update(0, mouseAt(120, 120, false, false));
    assert(clicks === 0 && quiet.hover === false, 'active false non clicca');

    const dead = new BeeButton({ x: 100, y: 100, width: 160, height: 50, onClick });
    dead.destroyed = true;
    dead.update(0, mouseAt(120, 120, true, true));
    dead.update(0, mouseAt(120, 120, false, false));
    assert(clicks === 0, 'destroyed non clicca');

    const hidden = new BeeButton({ x: 100, y: 100, width: 160, height: 50, onClick });
    hidden.update(0, mouseAt(120, 120, true, true));
    hidden.visible = false;
    hidden.update(0, mouseAt(120, 120, false, false));
    assert(clicks === 0 && hidden.down === false, 'visible false non clicca');
}

{
    const button = new BeeButton({ x: 100, y: 100 });
    button.update(0);
    button.update(0, {});
    button.update(0, { mouse: { x: NaN, y: 10, pressed: false, wasPressed: false } });
    button.draw(null);
    assert(button.hover === false, 'mouse non valido non è hover');
}

console.log('BeeButton tests ok');
