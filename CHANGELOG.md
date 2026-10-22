# Changelog

<div align="center">
  <img src="https://beeenginejs.com/wp-content/uploads/2026/10/bee-engine-logo-animated.gif" alt="BeeEngine Official Logo" width="500" />
  <p><i>Logo Ufficiale BeeEngine</i></p>
</div>

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [2.9.4] - 2026-10-05

### Fixed

- The engine ticks `camera` once per frame, after `follow`. The view size follows the canvas.

## [2.9.3] - 2026-10-05

### Changed

- `BeeCamera.follow` stores the target and `update(dt)` moves the camera. `smooth` of 0 or 1 snaps; values in between ease with `dt`.
- Bounds smaller than the view center the camera. A paused frame (`dt` of 0) does not follow.

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
- `BeeSave` no longer treats a broken save as a first run.
- `BeeRigidBody` and `BeePhysicsWorld`.
- `BeeSpatialHash` for nearby queries.

### Fixed

- Changing scene tears down the entities of the scene you leave.

## [2.4.0] - 2026-09-03

### Added

- `BeeLadybug` debug overlay for hitboxes and frame timing.

## [2.3.0] - 2026-09-02

### Added

- `BeeTime` splits scaled simulation time from real time. Pause sets the scaled `dt` to 0.

## Earlier versions (2.0.0 – 2.2.0)

`package.json` records 2.0.0 (2026-07-26), 2.1.2 and 2.1.3 (2026-08-19), and 2.2.0 (2026-08-24). Those commits do not describe a library change clearly enough to list here.

See the commit history: <[Docs](https://antonioprosperi2-svg.github.io/BeeEnginejs/) >
