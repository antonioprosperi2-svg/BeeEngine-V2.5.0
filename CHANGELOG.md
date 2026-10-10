# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

See the commit history: < https://github.com/antonioprosperi2-svg/BeeEngine-V2.5.0/commits/main>
