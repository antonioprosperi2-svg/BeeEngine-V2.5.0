import { BeeLocale } from '../src/plugins/BeeLocale.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const strings = {
    it: { play: 'Gioca', empty: '' },
    en: { play: 'Play', missing_it: 'Only EN' }
};

{
    const loc = new BeeLocale({ strings, language: 'it', fallback: 'en' });
    assert(loc.t('play') === 'Gioca', 'lingua corrente');
    assert(loc.get('missing_it') === 'Only EN', 'cade sul fallback');
    assert(loc.t('ghost') === 'ghost', 'chiave visibile se manca ovunque');
    assert(loc.t('empty') === 'empty', 'stringa vuota nel dizionario cade sulla chiave');
}

{
    const loc = new BeeLocale({ strings, language: 'it', fallback: 'en' });
    loc.setLanguage('en');
    assert(loc.t('play') === 'Play', 'setLanguage a runtime');
}

{
    const plugins = new Map();
    const engine = {
        registerPlugin(name, plugin) { plugins.set(name, plugin); },
        unregisterPlugin(name) { plugins.delete(name); },
        plugin(name) { return plugins.get(name) || null; }
    };
    const loc = new BeeLocale({ strings, language: 'en', engine });
    assert(engine.plugin('locale') === loc, 'attach registra locale');
    loc.detach();
    assert(engine.plugin('locale') === null, 'detach smonta');
}

console.log('BeeLocale tests ok');
