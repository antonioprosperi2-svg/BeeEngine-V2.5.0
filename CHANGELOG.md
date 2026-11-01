# Changelog

<div align="center">
  <img src="https://beeenginejs.com/wp-content/uploads/2026/10/bee-engine-logo-animated.gif" alt="BeeEngine Official Logo" width="500" />
  <p><i>Logo Ufficiale BeeEngine</i></p>
</div>

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.11.3] - 2026-11-01

### Added

- `BeeTouchControls.setButtonKeys(name, keys)` changes the keys of a button. `keys` is a non-empty array of non-empty strings; the first one becomes `key` and the array is copied into `keys`. An unknown button or an invalid array does nothing. The keys the button is holding are released first, unless another pressed button still sets the same key.

### Fixed

- `BeeTouchControls.draw` returns without a canvas context instead of throwing, like `BeeTouchButton.render`.

## [2.11.2] - 2026-11-01

### Added

- `BeeInput.addTouchBlocker(test)` takes a `(x, y) => boolean` test in canvas coordinates and returns a function that removes it. A touch that starts where the test says `true` does not update `mouse`. Nothing changes until a blocker is added.

### Fixed

- A touch on a `BeeTouchControls` button no longer sets `mouse.pressed` or `mouse.wasPressed`, and no longer moves `mouse.x` / `mouse.y`, so a `BeeButton` or `BeeMenuScene` under the button does not fire. `BeeTouchControls` adds its blocker in the constructor and removes it in `destroy()`.
- A finger that began on a button stays a button finger even if it slides off. A finger that began outside is still a normal click, and a second finger outside the buttons presses as before. When only button fingers are left, `mouse.pressed` goes back to `false`.
- `BeeInput.touches` is unchanged and still lists every finger.
- `BeeJoystick` and `BeeTouchButton` do not use the blocker yet.

## [2.11.1] - 2026-11-01

### Fixed

- `BeeTouchControls`: a finger that slides from one button to another releases the first key, and a key no longer stays down after `touchend`. A key is released only when no finger is left on any button that sets it, so two fingers on the same button keep it down until both are up.
- The action button sets `Space`, which `BeePlayer` and `BeeMenuScene` read, and still sets `' '` as well. The arrows are unchanged.
- `destroy()` removes the four touch listeners as well as `resize`, releases the keys that are held, and clears `activeTouches`. Calling it twice is safe, so `enableTouchControls()` no longer leaves two live instances on the canvas.
- The constructor throws `BeeTouchControls: canvas required` or `BeeTouchControls: input required`. `getCanvasCoords` returns `null` for a canvas with no size or a scale that is not finite, and that touch is ignored instead of throwing.
- `README.md` and this file said `enableJoystick()` turns on `BeeTouchControls`. It creates `BeeJoystick`; `enableTouchControls()` creates `BeeTouchControls`.
- `index.d.ts` declares the `BeeTouchControls` class.

### Added

- `examples/touchcontrols.html` shows the direction pad and the action button, with the keys they set.

## [2.11.0] - 2026-11-01

### Added

- `BeeDialogue` plugin for dialogue trees: a speaker, text, branching choices, and straight-line advance. The engine does not import it; attach it yourself. It has no tick and no listeners of its own: call `handleInput(input)` from `scene.update` and `draw(ctx)` from `scene.draw`.
- `advance` works on a node without choices and `choose(index)` on a node with choices. The wrong one returns `false` and warns. `start` on an open dialogue restarts it cleanly.
- Texts can be a literal or a `BeeLocale` key. Without a locale the literal is shown, or the raw key, never an empty string.
- `onChange` reports `start`, `node`, `choice`, `advance`, and `end`, and `end` says why. `toJSON` and `fromJSON` save the tree and where the dialogue stands.
- A duplicate id or a malformed tree throws at `load`. A `next` that points nowhere warns at `load` and closes with `missing-node` if the player reaches it.
- `examples/dialogue.html` shows a three-node dialogue with two choices, with labels from `BeeLocale`.

## [2.10.10] - 2026-10-25

### Fixed

- `BeeTouchButton` is still a circle the game draws and reads. A pointer inside the radius presses it, including the right button. Release and cancel clear only that pointer.
- A canvas box with no size is not a hit and does not throw. `render` returns without a context. `destroy` removes the listeners.
- `examples/touchbutton.html` shows the circle. Holding it makes the square jump.

## [2.10.9] - 2026-10-22

### Fixed

- On a computer, `BeeJoystick` drags with the left mouse button and keeps following the pointer outside the base. A finger already on the stick blocks the mouse. A mouse event that comes from a touch is ignored.
- The stick sets each arrow together with its letter: `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD`, `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`. Release clears all eight. The touch path is unchanged.
- `examples/joystick.html` moves the hero with an arrow or the matching letter.

## [2.10.8] - 2026-10-22

### Fixed

- `BeeJoystick.draw` returns when there is no canvas context. The finger behavior is unchanged.
- `BeeEngine.destroy` removes the joystick listeners and sets `touchControls` to null. `enableJoystick()` takes no options.
- `examples/joystick.html` shows the on-screen stick. A touch inside the base sets one arrow.

## [2.10.7] - 2026-10-21

### Fixed

- `BeeInput` keeps keyboard keys and `setKey` apart. `isPressed` is true when either is down. `wasPressed` fires only on the frame a key goes down. `endFrame` clears those edges, not the held keys.
- Releasing a key clears the character remembered at press, so `a` does not stay down when the key comes back as `A`. Blur clears the keyboard and leaves a joystick key held.
- Mouse move and release follow the pointer on the window, in canvas pixels, including outside the canvas. A mouse event that comes from a touch is ignored. The last finger uses `changedTouches`, then the button is up.
- `getCanvasPosition` returns `0, 0` when the canvas box has no size. `destroy` removes the listeners, and `BeeEngine.destroy` calls it.

## [2.10.6] - 2026-10-18

### Fixed

- `BeeButton` reads `input.mouse` from the entity loop. It no longer installs its own listeners.
- A click fires once on release over the current rectangle. Release outside, a hidden button, or an inactive button does not fire. Changing `width` after construction is the hit area.
- `examples/button.html` shows the on-screen button. New menus stay on `BeeUIButton`.

## [2.10.5] - 2026-10-15

### Fixed

- `BeeTilemapLoader` treats a layer as solid only when its name is a collision name, or it has a `solid` property set to true. One ordinary layer is not a wall by itself.
- On a solid layer, any gid other than 0 is a wall after the flip bits are removed. It does not have to be in the tileset.
- Drawing and lookup use `gid & 0x1FFFFFFF`, so a flipped tile still finds tile 1. A missing `visible` field still draws the layer.
- Tile width and height fall back separately. `load` without a map, or without a finite size, does not throw. A missing asset or canvas context does not throw.
- `examples/tiled.html` draws a Tiled ground layer and outlines the collision mesh.

## [2.10.4] - 2026-10-15

### Fixed

- `BeeTilemap.getWorldAABB` is the whole map, so drawing is not culled on the 32×32 entity box. An empty map or a bad `tileSize` has zero size.
- `rows` and `cols` follow `tiles`. A missing cell is empty: it is not drawn and it is not solid. `0` stays empty, and the tileset still uses `tile - 1`.
- `entityCollides` checks every tile under the collider. The right and bottom edges do not count the next tile. No collider, or a side of 0, does not collide.
- `draw` does nothing without a context or when `tileSize` or `tilesetColumns` is not a positive number. A bad tileset index is not drawn, and the fill color does not stay on the canvas.
- `examples/tilemap.html` shows a grid larger than 32×32 and a wide body whose center sits on a solid tile.

## [2.10.3] - 2026-10-12

### Fixed

- `BeeText.draw` does nothing without a canvas context. A hidden label still skips drawing.
- The HUD score pad keeps a minus in front: `-3` is shown as `-00003`. A non-finite score is `0`.
- Lives that are not a whole number are floored, and a non-finite value is `0`. More than 32 lives are written as a number. The HUD text baseline is alphabetic.
- `examples/text.html` shows a label plus a HUD with a negative score and one heart.

## [2.10.2] - 2026-10-11

### Fixed

- `BeeSpriteSheet` only crops one frame index. It does not animate.
- Without `frameCount`, any index still draws. A positive `frameCount` skips indexes outside that range.
- `drawFrame` does nothing when context, image, frame size, or `framesPerRow` is missing or not a positive number. `0` and `NaN` stay as given.
- Passing only `col` or only `row` sets the other offset to 0. A missing destination size uses the frame size.

## [2.10.1] - 2026-10-10

### Fixed

- `BeeSprite` plays a sheet in frames per second (`speed` defaults to 8). `dt` is seconds.
- `frameCount` defaults to one row. A larger count walks the next rows, then wraps.
- A non-finite `dt`, or a `framesPerRow` / `frameCount` that is not a positive number, leaves the frame alone and does not draw.
- `examples/sprite.html` shows one row cycling and an eight-frame sheet entering the second row.

## [2.10.0] - 2026-10-10

### Added

- `BeeInventory` plugin for item stacks, `use`, equipment, and saving slots. The engine does not import it; attach it yourself.
- `add` returns how many items did not fit, so a full inventory does not drop them silently.
- `equip` and `unequip` either finish the move or leave the inventory as it was.
- `examples/inventory.html` shows collectibles going into the inventory, with labels from `BeeLocale`.

## [2.9.7] - 2026-10-08

### Fixed

- `BeeParticleSystem` culling uses the live particles. An empty system has a zero-size box, so drawing is not skipped.
- `update` does nothing when the system is inactive or destroyed. A non-positive or invalid `dt` does not move particles or change their life.
- `destroy` and `dispose` clear the live particle list as well as the pool.
- `emit` ignores a bad count and does not create particles after destroy.
- A particle with `maxLife` of 0 or less is drawn fully transparent.

## [2.9.6] - 2026-10-07

### Fixed

- `BeeLayer` collects the same entities no matter the list order. A child with its own `drawLayer` is no longer skipped when it is listed before its parent.
- A child that is listed under an ancestor that is also listed is drawn once.
- A destroyed ancestor hides its children, the same way an invisible ancestor does.

## [2.9.5] - 2026-10-06

### Fixed

- `BeeCamera.setBounds` clamps the camera immediately. A non-finite value or a negative side does not clear bounds that are already set.
- Rounding the camera position keeps the view inside the bounds.
- `isRectVisible` uses the same rounded rectangle as `apply`, so culling matches what is drawn.

## [2.9.4] - 2026-10-05

### Fixed

- The engine ticks `camera` once per frame, after `follow`. The view size follows the canvas.

## [2.9.3] - 2026-10-05

### Changed

- `BeeCamera.follow` stores the target and `update(dt)` moves the camera. `smooth` of 0 or 1 snaps; values in between ease with `dt`.
- Bounds smaller than the view center the camera. A paused frame (`dt` of 0) does not follow.
- The engine advances the camera on the simulation `dt`, so it stays still while paused.

## [2.9.2] - 2026-10-04

### Fixed

- While an Animator state is locked, `when()` still runs. A higher priority interrupts; a lower one waits.
- `onComplete` runs once, and a missing clip does not leave the Animator stuck.

## [2.9.1] - 2026-10-03

### Fixed

- `BeeAnimatedSprite` takes its loop from the Animator, catches up after a hitch, and keeps drawing through the Animator.
- Clips still advance when there is no state graph.

## [2.9.0] - 2026-10-03

### Added

- Plugin registry: `registerPlugin` and `unregisterPlugin`. The engine stores plugins and does not import their files.
- `BeeLocale` for language strings. Call `t(key)` when you draw; it does not run every frame by itself.

## [2.8.6] - 2026-10-01

### Fixed

- `BeePlayer` physics still runs when there is no input. Free mode no longer keeps gravity.

## [2.8.5] - 2026-09-28

### Fixed

- `BeePlatform.draw` checks that the texture exists and restores the canvas state.

## [2.8.4] - 2026-09-27

### Fixed

- `BeeEnemy` patrol uses world position, so a bounds limit stops the enemy like a wall.

## [2.8.3] - 2026-09-25

### Changed

- `BeeMenuScene` starts the scene you configure, instead of a hardcoded game scene.

## [2.8.2] - 2026-09-24

### Fixed

- `BeeEnemyShooter` bounce stays inside its bounds, the fire timer can be reused, and its bullets join the hazard group.

## [2.8.1] - 2026-09-24

### Added

- `BeeCollectible.collect()` so a falling item can be picked up.

## [2.8.0] - 2026-09-20

### Added

- `BeeAnimator` chooses clips from a state graph.
- `BeeTween` and `BeeTimeline` interpolate properties with easing.
- `BeeAudioMixer` routes sound through buses, with ducking and 2D pan.
- Draw layers, prefabs, pathfinding, and `BeeUI`.

### Fixed

- `BeeTimeline` `repeat`, `call`, and `at` keep their timing.
- Resizing the canvas keeps a single listener, and `setScene` destroys the previous entities.

## [2.7.0] - 2026-09-12

### Changed

- `BeeTimer` follows pause and unscaled time: scaled timers stop while paused, unscaled timers do not.

## [2.6.0] - 2026-09-12

### Added

- `BeePool` reuses bullets and particles instead of allocating them on every shot.

## [2.5.0] - 2026-09-06

### Added

- `BeeTransform` for scene-graph transforms.
- `BeeRigidBody` and `BeePhysicsWorld`.
- `BeeSpatialHash` for nearby queries.

### Fixed

- `BeeSave` no longer treats a broken save as a first run.
- Changing scene tears down the entities of the scene you leave.

## [2.4.0] - 2026-09-03

### Added

- `BeeLadybug` debug overlay for hitboxes and frame timing.

## [2.3.0] - 2026-09-02

### Added

- `BeeTime` splits scaled simulation time from real time. Pause sets the scaled `dt` to 0.

## [2.2.0] - 2026-08-24

### Added

- Mobile controls: `gioco.enableJoystick()` turns on the analog joystick (`BeeJoystick`) and `gioco.enableTouchControls()` turns on the on-screen direction pad and action button (`BeeTouchControls`), each with a single call, with built-in handling for every touch screen.
- `BeeVirtualDPad`: a configurable direction pad with 4 or 8 directions (`eightWay: false/true`), for precise retro or platform movement.
- `BeeTouchButton`: a round touch button with a customizable radius and label (for example "A" to jump, "B" to shoot).
- `BeeSpriteSheet` and `BeeTilemapLoader`: simpler loading and cropping from complex sprite sheets, and smooth asynchronous loading of game levels.
- `BeeCollisionSystem`: a central registry that splits entities into logical groups, with solid resolution (`solid`) and event-driven interactions (`overlap`).
- `BeeCamera` frustum culling to save CPU.
- Official NPM distribution as an ES module, and `index.d.ts` type definitions for IntelliSense and VS Code suggestions.

### Changed

- The new touch classes are exported from `index.js`.
- Documentation and Markdown layout updated.
- Touch response tested and verified in real time on mobile devices.

## Earlier versions (2.0.0 – 2.1.3)

`package.json` records 2.0.0 (2026-07-26) and 2.1.2 and 2.1.3 (2026-08-19). Those commits do not describe a library change clearly enough to list here.

See the commit history: <[Docs](https://antonioprosperi2-svg.github.io/BeeEnginejs/) >
