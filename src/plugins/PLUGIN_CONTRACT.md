# Contratto plugin BeeEngine

Il motore è cieco. Non importa e non conosce il contenuto dei plugin — come il core di BeeLadybug non sa cosa sono Ant/Spider. Un plugin si registra da solo.

## Registrazione

```js
plugin.attach(engine);           // il plugin chiama engine.registerPlugin(name, this)
plugin.detach();                 // il plugin chiama engine.unregisterPlugin(name)
```

`registerPlugin` / `unregisterPlugin` sono solo un registro (`Map`). Non chiamano `attach`/`detach` — altrimenti ricorsione. Stesso schema di un adapter: chi si agganci si sganci.

Obbligatorio su ogni plugin: **`attach(engine)`** e **`detach()`**. Nient’altro.

## Cosa può leggere

`engine.time`, `engine.ui`, `engine.prefabs` (e il resto dell’API pubblica). Non è un secondo motore.

## Cosa non può fare

- chiamare `engine.loop()`
- sovrascrivere `engine.update` / `engine.render`
- inserirsi nel ciclo principale (niente monkey-patch di `loop`)

Se serve un richiamo ogni frame: `engine.onTick(fn)` (restituisce `off`). Il motore chiama gli hook; il plugin non tocca il loop. `offTick(fn)` toglie l’hook. In `detach()` va sempre spento.

## Locale e compagni

Un plugin di sola lettura (`BeeLocale.t(key)`) non usa `onTick`. Chi disegna il testo lo chiama. Non il contrario.
