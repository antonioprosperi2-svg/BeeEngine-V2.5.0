![BeeEngine](https://raw.githubusercontent.com/antonioprosperi2-svg/BeeEngine-V2.0/main/Gemini_Generated_Image_pz9goopz9goopz9g.jpg)
# 🐝 Motore di gioco 2D BeeEngine (v2.7.0 Professional)

BeeEngine è un motore di gioco 2D leggero, modulare e altamente ottimizzato scritto in puro JavaScript moderno (ES Modules) per HTML5 Canvas.
La versione 2.7 rifà **BeeTimer**: `start` / `pause` / `resume` / `cancel`, `gioco.timers` ticka ogni frame. Dalla 2.6: Pool. Dalla 2.5: Transform, Save, fisica, SceneManager, SpatialHash.

## 📁 Struttura del Progetto Aggiornata

```text
BeeEngine-V2.7/
├── index.html                  # Punto di ingresso HTML e configurazione Canvas
├── index.js                    # Barrel ESM (re-export di BeeEngine.js)
├── main.js                     # Demo visiva (BeeAudioMixer: bus, duck, pan 2D)
├── BeeEngine.js                # Il CUORE del motore (Core Loop & System Coordinator)
├── README.md                   # Documentazione ufficiale e specifiche tecniche
├── package.json                # Manifest di configurazione per la pubblicazione NPM
├── tsconfig.json               # Configurazione TypeScript per i controlli dell'IDE
├── index.d.ts                  # Definizioni di tipo globali per IntelliSense e TypeScript
├── assets/                     # Gestione centralizzata e ordinata delle risorse
│   ├── audio/                  # Effetti sonori (.mp3) e musiche di sottofondo
│   └── images/                 # Texture dei personaggi (.png), sprite e sfondi
└── src/
    ├── audio/                  # BeeAudioMixer: bus, fade, duck, pan 2D
    ├── core/                   # BeeTween, BeeTimeline, BeePool, BeeTransform, BeeTime, BeeEntity, BeeTimer, scene, asset, save, grid
    ├── gameplay/               # Player, enemy, platform, collectible, menu
    ├── graphics/               # BeeAnimator, camera, sprite, tilemap, text, particles
    ├── input/                  # Tastiera, mouse, joystick, touch, button
    ├── physics/                # BeeSpatialHash, BeePhysicsWorld, BeeRigidBody, AABB groups
    └── debug/                  # BeeLadybug: overlay e hitbox
```

## ⏱ BeeTime (v2.3.0) — orologio di motore

`BeeTime` è l'orologio unico del core loop. Ogni frame fa **un** `tick(timestamp)`; da lì nascono due delta:

| Asse | Campo | Si ferma in pausa? | Segue `timeScale`? | Uso |
| --- | --- | --- | --- | --- |
| Simulazione | `dt` / `elapsed` | sì (`dt = 0`) | sì | fisica, AI, sprite di gameplay, `BeeTimer` di default |
| Reale | `unscaledDt` / `unscaledElapsed` | no | no | HUD, UI, mixer audio, timer di interfaccia |

### Integrazione

Il loop di `BeeEngine` chiama sempre `time.tick`, **renderizza sempre** (anche in pausa) e avanza scene/entità solo se il mondo non è in pausa.

```javascript
import { BeeEngine, BeeTimer } from 'beeengine';

const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.start();

gioco.pause();              // mondo fermo, HUD vivo
gioco.resume();
gioco.setTimeScale(0.25);   // slow-motion
gioco.time.togglePause();

const hudTick = gioco.every(1, () => {}, { unscaled: true });
```

### API essenziale

* `gioco.time.dt` — delta di simulazione (`unscaledDt * timeScale`; 0 in pausa). `maxDelta` (default 50 ms) clamp-a il tempo **reale**, prima della scala.
* `gioco.time.unscaledDt` — delta reale dello stesso frame (vive in pausa).
* `gioco.time.timeScale` — 0.25 / 1 / 2… (clamp 0–16 via `setScale`; il costruttore non clamp-a).
* `gioco.time.begin()` — allinea il timestamp senza azzerare elapsed (start / ripartenza dopo `stop`).
* `gioco.time.fps` — stima su finestra 0.5 s di tempo reale.
* `gioco.time.consumeFixedSteps(fn)` — il loop lo chiama verso `physics.step` (passo 1/60, max 5). Le entity senza `body` restano a dt variabile.
* `gioco.after` / `gioco.every` — timer sul clock del motore (vedi BeeTimer).

Demo visiva: apri `index.html` (via `main.js`). **F2** apre BeeLadybug.

## ⏱ BeeTimer (v2.7.0) — cooldown, non un number a mano

`BeeTime` è l'orologio. `BeeTimer` è l'evento: spawn, cooldown, durata bonus, tick HUD.

`gioco.timers` viene tickato **ogni frame**, anche in pausa. Un timer scalato prende `dt` (si ferma). Uno `unscaled` prende `unscaledDt` (vive). Non passare `dt` e sperare che il flag faccia magie: un numero è uno step esplicito.

```javascript
const ricarica = gioco.after(1.5, () => arma.ready = true);
const hud = gioco.every(1, () => blink = !blink, { unscaled: true });

ricarica.pause();
ricarica.resume();
hud.cancel();
```

| Metodo | Contratto |
| --- | --- |
| `start()` | azzera e parte |
| `pause()` / `stop()` | ferma, tiene `elapsed` |
| `resume()` | riparte senza azzerare |
| `reset()` | azzera il clock, non cambia running |
| `cancel()` | spegne e toglie dal clock |

One-shot: lo stato `finished` si imposta **prima** della callback. Loop: catch-up (max 8 fire a hitch), `duration <= 0` è errore. `BeeEnemyShooter.fire` e il boost temporaneo del player usano questa classe.

## 🎬 BeeAnimator — il grafo, non il clip

`BeeAnimatedSprite` riproduce un clip. `BeeAnimator` decide **quale** e **quando**: idle → run → jump, priorità, lock del colpo. Lo sprite resta il renderer. `entity.animator` viene tickato nel loop entity (dt di simulazione: in pausa il clip si ferma).

```javascript
const sprite = gioco.createAnimatedSprite(sheet, {
    animations: {
        idle: { frames: [0, 1], fps: 4, loop: true },
        run: { frames: [2, 3, 4, 5], fps: 10, loop: true },
        attack: { frames: [6, 7, 8], fps: 12, loop: false }
    }
});

const animator = gioco.createAnimator(sprite);
animator
    .add('idle', { clip: 'idle', initial: true })
    .add('run', { clip: 'run', priority: 1 })
    .add('attack', { clip: 'attack', loop: false, lock: true, priority: 10, exitTo: 'idle' })
    .when('idle', 'run', (actor) => Math.abs(actor.vx) > 1)
    .when('run', 'idle', (actor) => Math.abs(actor.vx) <= 1)
    .when('*', 'attack', (actor) => actor.wantsAttack)
    .start();

actor.sprite = sprite;
actor.animator = animator;
```

| Contratto | Significato |
| --- | --- |
| `lock` | finché il clip non è `finished`, gli stati con priorità ≤ non interrompono (vanno in coda) |
| `exitTo` | dove andare a clip finito (one-shot / lock) |
| `when('*', to, pred)` | da qualsiasi stato |
| `play(name, { force })` | richiesta manuale; `force` rompe il lock |

`BeeAnimatedSprite.play(name, { restart: true })` e `sprite.finished` esistono perché l'animator deve sapere quando l'attacco è chiuso. Versione pacchetto resta **2.7.0**: Animator, Tween, Timeline e Mixer escono insieme nel 2.8.

## 🔊 BeeAudioMixer — bus, non cloneNode

`playSound` / `playMusic` erano one-shot e un loop. `gioco.audio` è il grafo: **master / music / sfx / ui / voice**, volume e mute per canale, fade, ducking della musica quando parla `voice`, pan 2D rispetto al listener (centro camera o canvas). Il mixer ticka ogni frame sul tempo reale.

```javascript
gioco.audio.unlock();                    // gesto utente
gioco.audio.music(track, { fade: 0.6, volume: 0.5 });
gioco.audio.play('hit', { bus: 'sfx', x: 120, y: 300 });
gioco.audio.tone({ frequency: 180, duration: 1.1, bus: 'voice' }); // duck
gioco.audio.setVolume('sfx', 0.8);
gioco.audio.fade('music', 0.2, 0.4);
```

| Contratto | Significato |
| --- | --- |
| `bus` | catena verso master; mute sul padre zittisce i figli |
| `duck` | default: `voice` abbassa `music` (amount 0.35) |
| `x, y` | attenuazione + pan vs listener |
| `tone()` | beep procedurale (demo senza mp3) |

`playSound` / `playMusic` restano, ma passano dal mixer.

## 🎞 BeeTween + BeeTimeline — interpolare proprietà, non un cooldown

`BeeTimer` conta i secondi. `BeeTween` **scrive** `x`, `alpha`, `scaleX`, `volume` ogni frame, con easing. `BeeTimeline` mette tween, attese e callback in sequenza (o in parallelo con `at`).

`gioco.tweens` ticka ogni frame come i timer: scalato in pausa si ferma, `unscaled: true` no. `entity.alpha` (default 1) è applicato in `drawEntity`.

```javascript
gioco.to(box, { x: 640, alpha: 1 }, { duration: 0.6, ease: 'backOut' });

const cut = gioco.timeline()
    .to(logo, { scaleX: 1, scaleY: 1 }, { duration: 0.4, ease: 'backOut' })
    .wait(0.15)
    .to(logo, { y: 80 }, { duration: 0.35, ease: 'quadOut' })
    .to(panel, { alpha: 1 }, { duration: 0.3, at: 0.2 })
    .call(() => ready = true)
    .start();
```

`.to(a, { duration: 1 }).to(b, { duration: 1, at: 5 }).to(c, { duration: 1 })` — `c` parte a **t = 2** (coda fluent di `a`+`b`), non a t = 6. `at` piazza solo quell'item.

| API | Contratto |
| --- | --- |
| `gioco.to` / `from` / `fromTo` | un tween, overwrite sulle stesse chiavi |
| `ease` | nome (`quadOut`, `backOut`, `bounceOut`…) o funzione `t => t` |
| `yoyo` + `repeat` | andata/ritorno; ogni ciclo senza yoyo riparte dallo snapshot iniziale (non dalla posa finale). `repeat: Infinity` = loop |
| `timeline().to(..., { at })` | `at` è tempo assoluto di quell'item; il cursore di coda per il prossimo `.to()` senza `at` resta in serie |
| `timeline().call(fn, at)` / `set(target, props, at)` | marker a durata 0: allungano `duration` almeno fino ad `at` (anche su timeline vuota) |
| `gioco.tweens.kill(target)` | spegne i tween su quell'oggetto |

Limiti accettati (non sono bug): `onComplete` del tween figlio **non** scatta durante `seek()` — usa `call()` o `timeline.onComplete`. Il residuo di `dt` oltre la fine del ciclo non viene recuperato (nessun catch-up).


## 🎬 BeeSceneManager — replace, non stack

`change` sostituisce la scena. Stesso nome = restart (`onExit`/`exit` → sweep entity → `onEnter`/`enter`). Non è uno stack: niente push/pop/fade.

Il manager è l’unico owner del loop entity. `scene.update` / `scene.draw` sono logica di scena e HUD, non un secondo `for` sulle entity (quello era un doppio tick).

| API | Contratto |
| --- | --- |
| `add(name, scene)` | registra; `add(null)` lancia |
| `change(name, data)` | replace + restart; `change` dentro `update` slitta le entity al frame dopo |
| `remove(name)` | sweep + toglie dalla Map |
| `persistEntities: true` | uscire non distrugge le entity |
| `gioco.addEntity` | se c’è una scena corrente, va lì, non in `engine.entities` |

`engine.destroy()` chiama `scenes.destroy()` (exit della corrente, sweep di tutte, Map vuota).

## 🧭 BeeTransform (v2.5.0) — scena grafo affine

`BeeTransform` è la geometria. `BeeEntity` ne possiede una (`entity.transform`) e non ricalcola più il mondo come somma di offset.

Matrice locale: `T(pos) · R · S · T(-pivot)`.  
Matrice mondo: `parent.world · local`. Cache dirty-flag, zero allocazioni nel tick.

| Locale | Mondo |
| --- | --- |
| `x`, `y`, `rotation`, `scaleX/Y`, `pivotX/Y` | `worldX/Y`, `worldRotation`, `worldScaleX/Y` |
| `setPivot` / `setPivotNormalized` | `setWorldOrigin` (inverte la catena, non sottrae) |
| `applyWorldTo(ctx)` | disegna in spazio locale |

```javascript
hub.transform.setPivot(36, 36);
hub.angularVelocity = 0.8;
hub.addChild(satellite);          // satellite.x/y restano locali
ctx.save();
entity.applyWorldTransform(ctx);
ctx.fillRect(0, 0, entity.width, entity.height);
ctx.restore();
```

`getWorldAABB()` è l'AABB dell'OBB ruotato: Ladybug disegna i quattro spigoli, il culling usa i bounds giusti.

## ⚖ BeeRigidBody + BeePhysicsWorld — corpo e mondo, non AABB a gruppi

`BeeEntity` resta dati. `BeeTransform` resta geometria. La fisica vive in `gioco.physics` (`BeePhysicsWorld`): gravità di scena, massa, impulsi, layer/mask, forme box/cerchio/capsula. `BeeCollisionSystem` **non** è questo: è ancora il risolutore AABB a gruppi per il platformer.

Il loop chiama `time.consumeFixedSteps` → `physics.step`. Se l'entità ha un `body`, `integrate()` non si muove da sola.

| Layer | Uso tipico |
| --- | --- |
| `BEE_LAYER.WORLD` | pavimento, muri |
| `BEE_LAYER.PLAYER` | corpi dinamici di gameplay |
| `BEE_LAYER.TRIGGER` | sensor: `isTrigger`, niente bounce |
| `BEE_LAYER.GHOST` | il player lo ignora se non è nel `mask` |

```javascript
const body = entity.addRigidBody({
    world: gioco.physics,
    type: 'dynamic',
    mass: 2,
    shape: BeeRigidBody.circle(18),
    layer: BEE_LAYER.PLAYER,
    mask: BEE_LAYER.WORLD | BEE_LAYER.PLAYER | BEE_LAYER.TRIGGER
});
body.applyImpulse(0, -420);

gioco.physics.gravityY = 980;
gioco.physics.onBeginOverlap = (a, b) => { /* trigger o sensor */ };
```

Click in demo: impulso verso il puntatore. F2 Ladybug disegna la forma del body, non solo il rettangolo.

## 🗺 BeeSpatialHash — chi è vicino a questo AABB?

Le coppie n² esplodono con decine di proiettili. `BeeSpatialHash` è un indice a celle (non un quadtree: i body di gameplay hanno taglia simile, l'hash è più stabile). `gioco.physics.hash` si ricostruisce ogni `step`. `gioco.spatial` è lo stesso indice, per i query di gioco.

```javascript
const hits = gioco.physics.queryRadius(x, y, 80);
for (let i = 0; i < hits.length; i++) {
    hits[i].applyImpulse(0, -300);   // esplosione
}
```

`BeeCollisionSystem` e Ladybug usano lo stesso broadphase. Cella default 64px (`cellSize`).

## ♻️ BeePool (v2.6.0) — spawn/release, non create/destroy

Create/destroy di bullet e particelle è il hitch GC più comune in Canvas. `BeePool` prealloca, `acquire`/`release`, resetta lo stato. Se il pool è pieno, riutilizza il più vecchio ancora in uso (`reclaim`). `entity.destroy()` su un oggetto pooled lo rimette in pila: non smonta transform/body.

`gioco.bullets` è il pool di default (32 prewarm, max 256). `BeeEnemyShooter` lo usa. `BeeParticleSystem` ha un pool interno (`particlePool`) e compatta l'array live senza `filter`.

```javascript
const colpo = gioco.bullets.acquire(x, y, 0, 280, 10, 10);
gioco.addEntity(colpo);
colpo.destroy();   // release, non teardown

const fx = new BeeParticleSystem({ x, y, initial: 64, max: 256 });
fx.emit(24, { color: '#ffcc66' });

gioco.createPool('spark', {
    create: () => ({ life: 0 }),
    reset: (item, life) => { item.life = life; },
    initial: 16,
    max: 64,
    reclaim: false
});
```

| Campo | Significato |
| --- | --- |
| `available` | oggetti dormienti in pila |
| `inUse` | oggetti vivi |
| `size` | available + inUse (non cresce oltre `max`) |

`gioco.spawn('bullet', x, y, vx, vy)` = acquire + `addEntity`.

## 💾 BeeSave — persistenza DTO, non `setItem` nudo

`BeeSave` non è più una facade cieca su `localStorage`. Ogni record è un envelope `{ __bee, v, t, d }`. `read()` distingue **missing / ok / corrupt / unavailable / rejected / quota**. Un JSON rotto non è un primo avvio.

| Metodo | Significato |
| --- | --- |
| `read(key)` | record onesto: usa questo per i progressi |
| `load(key, fallback)` | valore se `ok` (anche `null` salvato); missing → fallback |
| `exists(key)` | record **valido**; un blob corrotto è `false` |
| `has(key)` | chiave presente sul disco, anche se rotta |
| `configure({ namespace, version, migrate })` | una volta all'avvio: isola i denti sullo stesso dominio |

```javascript
gioco.save.configure({ namespace: 'orbit', version: 2, migrate(data, from) {
    if (from < 2) return { score: data.score ?? 0, lives: 3 };
    return data;
}});

const slot = gioco.save.readSlot(0);
if (slot.status === 'missing') { /* primo avvio */ }
if (slot.status === 'corrupt') { /* ripara o wipe, non trattarlo come new game */ }
if (slot.ok) { apply(slot.value); }

gioco.save.save('settings', { muted: true });   // DTO piatto
// BeeSave.save('p', player) → rejected: niente entità vive
```

Safari privato / storage assente: fallback in memoria di sessione (`fallback: 'memory'`). `save` non lancia. I record pre-envelope restano leggibili come `legacy`.

## 🐞 BeeLadybug (v2.4.0) — debug visivo e monitoraggio

`BeeLadybug` è l'occhio del motore: non è una classe di gameplay. Vive in `src/debug/` e disegna **dopo** il mondo (hitbox in spazio camera, overlay in spazio schermo).

### Perché F2

* **F12** è DevTools del browser: non lo tocchiamo.
* La **tilde** sui layout italiani non è un tasto unico.
* **F2** è libero, ed è lo standard dei pannelli debug nei motori.

### Cosa mostra

* Hitbox AABB di ogni entità (scene + `engine.entities` + figli + gruppi di collisione). Se l'entità ha un `BeeTransform`, Ladybug traccia anche l'OBB (i quattro spigoli ruotati).
* **Verde** = attiva, **rosso** = in overlap con un'altra AABB, **grigio** = inattiva.
* Overlay: FPS (`BeeTime.fps`), entità attive / in memoria, durata ciclo (`unscaledDt` in ms), `timeScale`, stato RUN/FREEZE.

### Controlli

| Tasto | Azione |
| --- | --- |
| F2 | mostra / nasconde la coccinella |
| F3 | alterna slow-motion `0.25x` e `1x` |
| F4 | freeze / unfreeze della simulazione (`BeeTime.pause`) |

I tre pulsanti sull'overlay fanno la stessa cosa. Il freeze ferma `dt` ma il loop continua a disegnare: puoi ispezionare le hitbox da fermo.

```javascript
const gioco = new BeeEngine('testCanvas', 800, 600);
gioco.enableLadybug();          // visibile; F2 la nasconde
// oppure: gioco.debug.toggle();
gioco.start();
```

## 🚀 Novità e ottimizzazioni professionali nella v2.2.0

### 1. Controlli Mobile e Joystick Virtuale (`BeeJoystick` & `BeeTouchControls`)
* **Supporto nativo:** Gestione integrata per tutti gli schermi touch.
* **Attivazione rapida:** Attiva il joystick analogico e i pulsanti programmabili con un solo comando.
* **Codice:** `gioco.enableJoystick()`.

### 📱 NUOVO: Componenti Interfaccia Touch Avanzati
Nella v2.2.0 sono state introdotte due nuove classi specifiche esportate per una gestione granulare dell'input mobile:
* **`BeeVirtualDPad`**: Una pulsantiera direzionale configurabile a 4 o 8 direzioni (`eightWay: false/true`), ideale per movimenti precisi stile retro-game o platform.
* **`BeeTouchButton`**: Un pulsante tattile rotondo completamente personalizzabile nel raggio e nel testo dell'etichetta (es. "A" per saltare, "B" per sparare).

### 2. Gestione Sprite e Mappe Avanzata (`BeeSpriteSheet` & `BeeTilemapLoader`)
* **Ritaglio tessere:** Semplificato il caricamento e il ritaglio da fogli di sprite complessi.
* **Asincronia:** Gestione fluida e asincrona dei livelli di gioco durante i caricamenti.

### 3. Sistema di Collisioni Centralizzato (`BeeCollisionSystem`)
* **Gruppi logici:** Registro centralizzato per dividere le entità in gruppi.
* **Fisica ottimizzata:** Risoluzioni fisiche solide (`solid`) e interazioni ad eventi (`overlap`) ad alta efficienza.

### 4. Risparmio CPU tramite Frustum Culling (`BeeCamera`)
* **Sfoltimento grafico:** Algoritmo per saltare il rendering delle entità fuori dallo schermo.
* **Performance:** Mantiene i 60 FPS stabili anche con centinaia di oggetti in gioco.

### 5. Distribuzione NPM & Type Definitions (`index.d.ts`)
* **Modulo ES6:** Distribuzione ufficiale sul registro NPM ottimizzata per i moduli moderni.
* **Autocompletamento:** Definizioni di tipo aggiornate per l'IntelliSense e i suggerimenti in VS Code.

### 🛠️ Miglioramenti e correzioni
* Esportate nuove classi touch in `index.js` per una perfetta integrazione con il pacchetto.

* Aggiornata la documentazione e il layout Markdown.

* Testata e verificata la reattività al tocco in tempo reale su dispositivi mobili.

## 🛠️ Esempio d'Uso Rapido (v2.2.0)

```javascript
import { BeeEngine, BeeVirtualDPad, BeeTouchButton } from 'beeengine';

// 1. Inizializzazione Motore
const gioco = new BeeEngine("testCanvas", 800, 600);
gioco.enableAutoResize(800, 600, 100);

// 2. Attivazione controlli mobile nativi (v2.2)
gioco.enableJoystick();

// Configurazione opzionale D-Pad e Pulsanti Touch personalizzati
const dPad = new BeeVirtualDPad({
    canvas: gioco.canvas,
    x: 100,
    y: 500,
    size: 120,
    eightWay: false
});

const pulsanteSalto = new BeeTouchButton({
    canvas: gioco.canvas,
    x: 700,
    y: 500,
    radius: 35,
    label: "SALTA"
});

// 3. Regole Collisioni
gioco.collisions.setGroup('solidi', piattaforme);
gioco.collisions.setGroup('giocatore', [giocatore]);
gioco.collisions.solid('giocatore', 'solidi');

// 4. Avvio Ciclo di Gioco
gioco.start();
```

---

![BeeEngine](https://raw.githubusercontent.com/antonioprosperi2-svg/BeeEngine-V2.0/main/download.png)
