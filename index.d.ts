/**
 * BeeEngine 2D — TypeScript definitions for IDE autocompletion and NPM package consumption.
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

/** Axis-aligned bounding box (AABB) in world or screen coordinates. */
export interface BeeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Asset manifest item (images / audio / JSON). */
export interface BeeManifestItem {
  type: "image" | "audio" | "json";
  name: string;
  src: string;
}

/** Asset list grouped by type. */
export interface BeeAssetList {
  images?: Array<{ name: string; src: string }>;
  sounds?: Array<{ name: string; src: string }>;
  jsons?: Array<{ name: string; src: string }>;
}

/** Scene registered in {@link BeeSceneManager}. */
export interface BeeScene {
  entities?: BeeEntity[];
  engine?: BeeEngine;
  scene?: BeeScene;
  /** Se true, `change`/`remove` non distruggono le entity. */
  persistEntities?: boolean;
  enter?(data?: unknown): void;
  exit?(): void;
  onEnter?(data?: unknown): void;
  onExit?(): void;
  update?(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  /** Sfondo in spazio mondo, sotto la camera, prima delle entity. */
  drawWorld?(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
  /** HUD in spazio schermo, dopo `ctx.restore()` della camera. */
  draw?(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export type BeePlayerMode = "platformer" | "free";

export type BeeGameLoopCallback = (
  dt: number,
  input: BeeInput,
  time?: BeeTime
) => void;

export type BeeRenderCallback = (
  ctx: CanvasRenderingContext2D
) => void;

export type BeeEventCallback = (data?: unknown) => void;

export type BeeOverlapCallback = (
  a: BeeEntity,
  b: BeeEntity,
  engine: BeeEngine
) => void;

// ---------------------------------------------------------------------------
// BeeRectCollider
// ---------------------------------------------------------------------------

export declare class BeeRectCollider {
  entity: BeeEntity | null;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;

  constructor(
    entityOrX?: BeeEntity | number,
    offsetYOrY?: number,
    widthOrW?: number | null,
    heightOrH?: number | null,
    height?: number | null
  );

  get x(): number;
  get y(): number;

  intersects(other: BeeRect | BeeRectCollider): boolean;
  containsPoint(px: number, py: number): boolean;
}

// ---------------------------------------------------------------------------
// BeeEntity
// ---------------------------------------------------------------------------

export interface BeeEntityPhysics {
  width?: number;
  height?: number;
  gravity?: number;
  friction?: number;
  airFriction?: number;
  landingTolerance?: number;
  velocityLookahead?: number;
  maxFallSpeed?: number;
  angularVelocity?: number;
}

export declare const BEE_ENTITY_DEFAULTS: Readonly<{
  width: number;
  height: number;
  gravity: number;
  friction: number;
  airFriction: number;
  landingTolerance: number;
  velocityLookahead: number;
  maxFallSpeed: number;
  angularVelocity: number;
}>;

export interface BeeTransformOptions {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  pivotX?: number;
  pivotY?: number;
  zIndex?: number;
}

export declare const BEE_TRANSFORM_DEFAULTS: Readonly<{
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
  zIndex: number;
}>;

export interface BeeAffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export declare class BeeTransform {
  zIndex: number;
  onDirty: (() => void) | null;
  x: number;
  y: number;
  rotation: number;
  rotationDegrees: number;
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
  readonly parent: BeeTransform | null;
  readonly children: BeeTransform[];
  readonly localMatrix: BeeAffineMatrix;
  readonly worldMatrix: BeeAffineMatrix;
  worldX: number;
  worldY: number;
  readonly worldRotation: number;
  readonly worldScaleX: number;
  readonly worldScaleY: number;

  constructor(options?: BeeTransformOptions);

  setScale(x: number, y?: number): this;
  setPivot(x: number, y: number): this;
  setPivotNormalized(nx: number, ny: number, width: number, height: number): this;
  setParent(transform: BeeTransform | null): this;
  markDirty(): void;
  setWorldOrigin(worldX: number, worldY: number): this;
  transformPoint(localX: number, localY: number, out?: { x: number; y: number }): { x: number; y: number };
  inverseTransformPoint(worldX: number, worldY: number, out?: { x: number; y: number }): { x: number; y: number };
  getWorldAABB(width: number, height: number, out?: BeeRect): BeeRect;
  applyWorldTo(ctx: CanvasRenderingContext2D): this;
  lookAt(worldX: number, worldY: number): this;
}

export declare class BeeEntity {
  transform: BeeTransform;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  worldX: number;
  worldY: number;
  readonly parent: BeeEntity | null;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  gravity: number;
  friction: number;
  airFriction: number;
  landingTolerance: number;
  velocityLookahead: number;
  maxFallSpeed: number;
  isGrounded: boolean;
  active: boolean;
  visible: boolean;
  destroyed: boolean;
  collider: BeeRectCollider | null;
  body: BeeRigidBody | null;
  pool: BeePool | null;
  animator: BeeAnimator | null;
  animatorContext?: () => unknown;
  alpha: number;
  /** Pass di disegno (`background` / `world` / `ysort` / `ui`). Default: `world`. */
  drawLayer: string | null;
  /** Override y-sort (piedi). Se null usa `y + height`. */
  sortY: number | null;
  /** Nome della ricetta BeePrefab che ha creato l'entity, se c'è. */
  prefab?: string | null;
  readonly children: BeeEntity[];

  constructor(
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    physics?: BeeEntityPhysics | null
  );

  static worldXOf(node: { worldX?: number; x?: number } | null | undefined): number;
  static worldYOf(node: { worldY?: number; y?: number } | null | undefined): number;

  getWorldAABB(): BeeRect;
  applyWorldTransform(ctx: CanvasRenderingContext2D): this;

  addRectCollider(
    offsetX?: number,
    offsetY?: number,
    width?: number | null,
    height?: number | null
  ): BeeRectCollider;
  addRigidBody(options?: BeeRigidBodyOptions): BeeRigidBody;

  addChild(entity: BeeEntity): BeeEntity;
  removeChild(entity: BeeEntity): void;
  detach(): this;
  collidesWith(other: BeeEntity | BeeRect): boolean;
  resolvePlatformCollision(platform: BeeEntity | BeePlatform | BeeRect): boolean;

  integrate(dt: number): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
  recycle(): void;
  dispose(): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// BeeAssetManager
// ---------------------------------------------------------------------------

export declare class BeeAssetManager {
  images: Map<string, HTMLImageElement>;
  sounds: Map<string, HTMLAudioElement>;
  jsons: Map<string, any>;

  constructor();

  loadManifest(manifest: BeeManifestItem[]): Promise<void>;
  loadAssets(assetList: BeeAssetList): Promise<void>;
  loadImage(name: string, src: string): Promise<HTMLImageElement>;
  getImage(name: string): HTMLImageElement | undefined;
  loadSound(name: string, src: string): Promise<HTMLAudioElement>;
  getSound(name: string): HTMLAudioElement | undefined;
  loadJSON(name: string, src: string): Promise<any>;
  getJSON(name: string): any;
  getAsset(name: string): HTMLImageElement | HTMLAudioElement | any | undefined;
  playSound(name: string, volume?: number): void;
}

// ---------------------------------------------------------------------------
// BeeInput
// ---------------------------------------------------------------------------

export interface BeeMouseState {
  x: number;
  y: number;
  pressed: boolean;
  wasPressed: boolean;
}

export declare class BeeInput {
  canvas: HTMLCanvasElement;
  keys: Record<string, boolean>;
  pressed: Record<string, boolean>;
  mouse: BeeMouseState;

  constructor(canvas: HTMLCanvasElement);

  getCanvasPosition(clientX: number, clientY: number): { x: number; y: number };
  isPressed(key: string): boolean;
  wasPressed(key: string): boolean;
  setKey(key: string, value: boolean): void;
  endFrame(): void;
}

// ---------------------------------------------------------------------------
// BeeSceneManager
// ---------------------------------------------------------------------------

export declare class BeeSceneManager {
  engine: BeeEngine;
  ctx: CanvasRenderingContext2D;
  scenes: Map<string, BeeScene>;
  currentScene: BeeScene | null;
  currentSceneName: string | null;

  constructor(engine: BeeEngine);

  add(name: string, scene: BeeScene): this;
  has(name: string): boolean;
  change(name: string, data?: unknown): this;
  remove(name: string): this;
  addEntity(entity: BeeEntity): BeeEntity | undefined;
  update(dt: number, input?: BeeInput): void;
  drawWorld(ctx?: CanvasRenderingContext2D): void;
  drawUI(ctx?: CanvasRenderingContext2D): void;
  draw(ctx?: CanvasRenderingContext2D): void;
  getCurrentScene(): BeeScene | null;
  getCurrentSceneName(): string | null;
  destroy(): this;
}

// ---------------------------------------------------------------------------
// BeeCamera
// ---------------------------------------------------------------------------

export interface BeeCameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export declare class BeeCamera {
  x: number;
  y: number;
  w: number;
  h: number;
  bounds: BeeCameraBounds | null;

  constructor(canvasWidth: number, canvasHeight: number);

  setBounds(x: number, y: number, width: number, height: number): void;
  follow(target: BeeEntity | BeeRect, smooth?: number): void;
  apply(ctx: CanvasRenderingContext2D): void;
  getViewBounds(): BeeRect;
  isRectVisible(x: number, y: number, width: number, height: number): boolean;
}

// ---------------------------------------------------------------------------
// BeeCollisionSystem
// ---------------------------------------------------------------------------

export declare class BeeCollisionSystem {
  engine: BeeEngine;
  groups: Map<string, object[]>;
  hash: BeeSpatialHash;

  constructor(engine: BeeEngine);

  clear(): void;
  createGroup(name: string): this;
  setGroup(name: string, entities: object[]): this;
  add(name: string, entity: object): this;
  remove(name: string, entity: object): this;
  solid(moversGroup: string, solidsGroup: string): this;
  overlap(groupA: string, groupB: string, callback: BeeOverlapCallback): this;
  run(): void;
}

export declare const BEE_SPATIAL_HASH_DEFAULTS: Readonly<{
  cellSize: number;
}>;

export declare class BeeSpatialHash {
  cellSize: number;
  itemCount: number;
  insertCount: number;
  readonly cellCount: number;

  constructor(options?: { cellSize?: number });

  configure(options?: { cellSize?: number }): this;
  clear(): this;
  insert(item: object, box?: BeeRect | null): this;
  query(aabb: BeeRect, out?: object[]): object[];
  queryPoint(x: number, y: number, out?: object[]): object[];
  queryRadius(x: number, y: number, radius: number, out?: object[]): object[];
  forEachPair(callback: (a: object, b: object) => void): number;
}

// ---------------------------------------------------------------------------
// BeePool
// ---------------------------------------------------------------------------

export declare const BEE_POOL_DEFAULTS: Readonly<{
  initial: number;
  max: number;
  reclaim: boolean;
}>;

export interface BeePoolOptions<T = unknown> {
  create: (...args: any[]) => T;
  reset?: (item: T, ...args: any[]) => void;
  dispose?: (item: T) => void;
  initial?: number;
  max?: number;
  reclaim?: boolean;
}

export declare class BeePool<T = any> {
  create: (...args: any[]) => T;
  reset: ((item: T, ...args: any[]) => void) | null;
  dispose: ((item: T) => void) | null;
  max: number;
  reclaim: boolean;
  readonly available: number;
  readonly inUse: number;
  readonly size: number;

  constructor(options: BeePoolOptions<T>);

  prewarm(count: number): this;
  acquire(...args: any[]): T | null;
  release(item: T): this;
  releaseAll(): this;
  clear(): this;
}

export declare const BEE_PREFAB_DEFAULTS: Readonly<{
  width: number;
  height: number;
  addToScene: boolean;
}>;

export interface BeePrefabColliderSpec {
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
}

export interface BeePrefabPatrolSpec {
  minX?: number | null;
  maxX?: number | null;
  0?: number | null;
  1?: number | null;
}

export interface BeePrefabSpec {
  type?: string | (new (...args: any[]) => BeeEntity);
  class?: new (...args: any[]) => BeeEntity;
  create?: (spec: BeePrefabSpec, engine: BeeEngine | null) => BeeEntity;
  acquire?: (spec: BeePrefabSpec, engine: BeeEngine | null) => BeeEntity;
  extend?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  textureKey?: string | null;
  sprite?: string | null;
  speed?: number;
  lives?: number;
  hp?: number;
  health?: number;
  score?: number;
  drawLayer?: string;
  sortY?: number;
  alpha?: number;
  visible?: boolean;
  active?: boolean;
  color?: string;
  mode?: string;
  gravity?: number;
  vx?: number;
  vy?: number;
  tag?: string;
  name?: string;
  text?: string;
  font?: string;
  align?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  props?: Record<string, unknown>;
  collider?: boolean | BeePrefabColliderSpec;
  body?: boolean | Record<string, unknown>;
  patrol?: BeePrefabPatrolSpec | [number | null, number | null];
  setup?: (entity: BeeEntity, spec: BeePrefabSpec, engine: BeeEngine | null) => void;
  pool?: string;
  addToScene?: boolean;
  children?: Array<string | (BeePrefabSpec & { prefab?: string })>;
  prefab?: string;
}

/**
 * Fabbrica da dati. Non è `new BeeEnemy(...)` sparso nel gioco.
 */
export declare class BeePrefab {
  engine: BeeEngine | null;
  readonly size: number;

  constructor(options?: { engine?: BeeEngine | null });

  type(name: string, factory: ((spec: BeePrefabSpec, engine: BeeEngine | null) => BeeEntity) | (new (...args: any[]) => BeeEntity)): this;
  define(name: string, spec: BeePrefabSpec): this;
  has(name: string): boolean;
  get(name: string): BeePrefabSpec | null;
  list(): string[];
  remove(name: string): this;
  clear(): this;
  spawn(name: string, override?: BeePrefabSpec): BeeEntity;
  spawnMany(name: string, spots: Array<{ x?: number; y?: number } | [number, number] | BeePrefabSpec>): BeeEntity[];
  fromList(items: Array<BeePrefabSpec & { prefab?: string }>, fallbackName?: string | null): BeeEntity[];
  fromObjects(
    objects: Array<{
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      type?: string;
      name?: string;
      prefab?: string;
      visible?: boolean;
      properties?: Array<{ name: string; value?: unknown }> | Record<string, unknown>;
    }>,
    options?: { prefabKey?: string; strict?: boolean }
  ): BeeEntity[];
}

// ---------------------------------------------------------------------------
// BeeRigidBody + BeePhysicsWorld
// ---------------------------------------------------------------------------

export type BeeBodyType = "static" | "kinematic" | "dynamic";
export type BeeShapeType = "box" | "circle" | "capsule";

export interface BeeColliderShape {
  type: BeeShapeType;
  width?: number;
  height?: number;
  radius?: number;
  length?: number;
}

export interface BeeRigidBodyOptions {
  entity?: BeeEntity | null;
  transform?: BeeTransform;
  type?: BeeBodyType;
  mass?: number;
  restitution?: number;
  friction?: number;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
  layer?: number;
  mask?: number;
  isTrigger?: boolean;
  fixedRotation?: boolean;
  shape?: BeeColliderShape;
  vx?: number;
  vy?: number;
  omega?: number;
  world?: BeePhysicsWorld;
}

export interface BeePhysicsWorldOptions {
  gravityX?: number;
  gravityY?: number;
  iterations?: number;
  slop?: number;
  baumgarte?: number;
  maxVelocity?: number;
  cellSize?: number;
  hash?: BeeSpatialHash;
}

export declare const BEE_BODY_TYPE: Readonly<{
  STATIC: "static";
  KINEMATIC: "kinematic";
  DYNAMIC: "dynamic";
}>;

export declare const BEE_SHAPE: Readonly<{
  BOX: "box";
  CIRCLE: "circle";
  CAPSULE: "capsule";
}>;

export declare const BEE_LAYER: Readonly<{
  DEFAULT: number;
  PLAYER: number;
  WORLD: number;
  TRIGGER: number;
  PROJECTILE: number;
  GHOST: number;
  ALL: number;
}>;

export declare const BEE_BODY_DEFAULTS: Readonly<{
  type: BeeBodyType;
  mass: number;
  restitution: number;
  friction: number;
  gravityScale: number;
  linearDamping: number;
  angularDamping: number;
  layer: number;
  mask: number;
  isTrigger: boolean;
  fixedRotation: boolean;
}>;

export declare const BEE_PHYSICS_DEFAULTS: Readonly<{
  gravityX: number;
  gravityY: number;
  iterations: number;
  slop: number;
  baumgarte: number;
  maxVelocity: number;
  cellSize: number;
}>;

export declare class BeeRigidBody {
  id: number;
  entity: BeeEntity | null;
  transform: BeeTransform;
  shape: BeeColliderShape;
  restitution: number;
  friction: number;
  gravityScale: number;
  linearDamping: number;
  angularDamping: number;
  layer: number;
  mask: number;
  isTrigger: boolean;
  fixedRotation: boolean;
  enabled: boolean;
  isGrounded: boolean;
  vx: number;
  vy: number;
  omega: number;
  world: BeePhysicsWorld | null;
  invMass: number;
  invInertia: number;
  type: BeeBodyType;
  mass: number;
  readonly pose: { x: number; y: number; rotation: number };
  readonly aabb: BeeRect;

  constructor(options?: BeeRigidBodyOptions);

  static box(width: number, height: number): BeeColliderShape;
  static circle(radius: number): BeeColliderShape;
  static capsule(radius: number, length: number): BeeColliderShape;

  collidesWith(other: BeeRigidBody): boolean;
  applyForce(fx: number, fy: number): this;
  applyTorque(torque: number): this;
  applyImpulse(ix: number, iy: number): this;
  applyImpulseAt(ix: number, iy: number, worldX: number, worldY: number): this;
  clearForces(): void;
  readPose(): { x: number; y: number; rotation: number };
  writePose(): this;
  getWorldAABB(): BeeRect;
  drawDebug(ctx: CanvasRenderingContext2D, color?: string): this;
  destroy(): void;
}

export declare class BeePhysicsWorld {
  gravityX: number;
  gravityY: number;
  iterations: number;
  slop: number;
  baumgarte: number;
  maxVelocity: number;
  hash: BeeSpatialHash;
  onBeginOverlap: ((a: BeeRigidBody, b: BeeRigidBody) => void) | null;
  onEndOverlap: ((a: BeeRigidBody, b: BeeRigidBody) => void) | null;
  readonly bodies: BeeRigidBody[];
  readonly contactCount: number;

  constructor(options?: BeePhysicsWorldOptions);

  add(body: BeeRigidBody): BeeRigidBody | null;
  remove(body: BeeRigidBody): this;
  clear(): this;
  createBody(options?: BeeRigidBodyOptions): BeeRigidBody;
  step(dt: number): this;
  query(aabb: BeeRect, out?: BeeRigidBody[]): BeeRigidBody[];
  queryPoint(x: number, y: number, out?: BeeRigidBody[]): BeeRigidBody[];
  queryRadius(x: number, y: number, radius: number, out?: BeeRigidBody[]): BeeRigidBody[];
}

export declare class BeePlayer extends BeeEntity {
  speed: number;
  baseJumpForce: number;
  jumpForce: number;
  textureKey: string | null;
  score: number;
  lives: number;
  mode: BeePlayerMode;
  wantsAttack: boolean;

  constructor(
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  jump(): void;
  boostJump(amount: number): void;
  potenziaSalto(amount: number): void;
  boostJumpTemporary(amount: number, durationMs: number): void;
  potenziaSaltoTemporaneo(amount: number, durationMs: number): void;
  addScore(points: number): void;
  takeDamage(amount?: number): boolean;

  update(dt: number, input: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
  destroy(): void;
}

export declare class BeeEnemy extends BeeEntity {
  speed: number;
  textureKey: string | null;
  minX: number | null;
  maxX: number | null;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  setPatrolBounds(minX: number | null, maxX: number | null): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export type BeeNemico = BeeEnemy;

export declare class BeeEnemyShooter extends BeeEnemy {
  shootInterval: number;
  readonly shootTimer: number;
  bulletSpeed: number;
  fire: BeeTimer;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    textureKey?: string | null
  );

  update(dt: number, input: BeeInput, engine: BeeEngine): void;
  shoot(engine: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
  destroy(): void;
}

export declare class BeeBullet extends BeeEntity {
  textureKey: string | null;
  lifespan: number;
  age: number;

  constructor(
    x: number,
    y: number,
    vx?: number,
    vy?: number,
    width?: number,
    height?: number,
    textureKey?: string | null,
    lifespan?: number
  );

  reset(
    x?: number,
    y?: number,
    vx?: number,
    vy?: number,
    width?: number,
    height?: number,
    textureKey?: string | null,
    lifespan?: number
  ): this;
  recycle(): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeePlatform extends BeeEntity {
  color: string;
  textureKey: string | null;

  constructor(
    x: number,
    y: number,
    width?: number,
    height?: number,
    color?: string,
    textureKey?: string | null
  );

  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export declare class BeeCollectible extends BeeEntity {
  canvasWidth: number;
  canvasHeight: number;
  textureKey: string | null;
  speed: number;

  constructor(
    canvasWidth?: number,
    canvasHeight?: number,
    textureKey?: string | null,
    width?: number,
    height?: number
  );

  reset(): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

// ---------------------------------------------------------------------------
// UI & Text
// ---------------------------------------------------------------------------

export interface BeeButtonOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  font?: string;
  background?: string;
  hoverBackground?: string;
  pressedBackground?: string;
  color?: string;
  onClick?: (button: BeeButton, scene?: unknown) => void;
}

export declare class BeeButton extends BeeEntity {
  text: string;
  font: string;
  background: string;
  hoverBackground: string;
  pressedBackground: string;
  color: string;
  onClick: BeeButtonOptions["onClick"];
  hover: boolean;
  down: boolean;

  constructor(options?: BeeButtonOptions);

  update(dt: number, scene?: unknown): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface BeeHUDOptions {
  scoreLabel?: string;
  livesLabel?: string;
  livesIcon?: string;
  barHeight?: number;
  titleColor?: string;
  textColor?: string;
}

export declare class BeeText extends BeeEntity {
  text: string;
  font: string;
  color: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;

  constructor(
    text?: string,
    x?: number,
    y?: number,
    font?: string,
    color?: string,
    align?: CanvasTextAlign
  );

  draw(ctx: CanvasRenderingContext2D): void;

  static drawHUD(
    ctx: CanvasRenderingContext2D,
    score?: number,
    lives?: number,
    title?: string,
    options?: BeeHUDOptions
  ): void;
}

// ---------------------------------------------------------------------------
// Tilemap, Particles, Sprite, Grid, Camera, Save, Touch & Controls
// ---------------------------------------------------------------------------

export interface BeeTilemapOptions {
  x?: number;
  y?: number;
  tiles?: number[][];
  tileSize?: number;
  solidTiles?: number[];
  tileset?: CanvasImageSource | null;
  tilesetColumns?: number;
}

export declare class BeeTilemap extends BeeEntity {
  tiles: number[][];
  tileSize: number;
  solidTiles: number[];
  tileset: CanvasImageSource | null;
  tilesetColumns: number;
  rows: number;
  cols: number;

  constructor(options?: BeeTilemapOptions);

  getTile(col: number, row: number): number | null;
  worldToTile(px: number, py: number): { col: number; row: number };
  isSolidTile(col: number, row: number): boolean;
  isSolidAtPixel(px: number, py: number): boolean;
  entityCollides(entity: BeeEntity): boolean;
  draw(ctx: CanvasRenderingContext2D, engine?: BeeEngine): void;
}

export interface BeeParticleEmitOptions {
  speedMin?: number;
  speedMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  color?: string;
}

export interface BeeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export declare class BeeParticleSystem extends BeeEntity {
  particles: BeeParticle[];
  particlePool: BeePool;

  constructor(options?: { x?: number; y?: number; initial?: number; max?: number });

  emit(count?: number, options?: BeeParticleEmitOptions): void;
  update(dt: number, input?: BeeInput, engine?: BeeEngine): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeSprite {
  image: CanvasImageSource;
  frameWidth: number;
  frameHeight: number;
  framesPerRow: number;
  speed: number;
  frame: number;

  constructor(
    image: CanvasImageSource,
    frameWidth: number,
    frameHeight: number,
    framesPerRow: number,
    speed?: number
  );

  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
}

export declare class BeeGrid {
  cols: number;
  rows: number;
  cellSize: number;
  data: number[][];

  constructor(cols: number, rows: number, cellSize: number);

  setCell(c: number, r: number, val: number): void;
  getCell(c: number, r: number): number | null;
  draw(
    ctx: CanvasRenderingContext2D,
    drawFunction: (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      cellValue: number
    ) => void
  ): void;
}

export declare const BEE_PATH_DEFAULTS: Readonly<{
  diagonal: boolean;
  cornerCut: boolean;
  walkable: number;
  maxIterations: number;
  arrive: number;
}>;

export interface BeePathCell {
  col: number;
  row: number;
}

export interface BeePathPoint {
  x: number;
  y: number;
}

export declare class BeePath {
  cells: BeePathCell[];
  points: BeePathPoint[];
  found: boolean;
  index: number;
  goalCol: number;
  goalRow: number;
  version: number;
  length: number;
  readonly current: BeePathPoint | null;
  readonly finished: boolean;
  rewind(): this;
  clear(): this;
}

export interface BeePathfinderOptions {
  diagonal?: boolean;
  cornerCut?: boolean;
  walkable?: number | ((value: unknown, col: number, row: number) => boolean);
  maxIterations?: number;
  arrive?: number;
}

/**
 * A* + flow field su griglia/tilemap. Non è chase in linea retta.
 */
export declare class BeePathfinder {
  diagonal: boolean;
  cornerCut: boolean;
  walkable: number | ((value: unknown, col: number, row: number) => boolean);
  maxIterations: number;
  arrive: number;
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly version: number;

  constructor(options?: BeePathfinderOptions);

  configure(options?: BeePathfinderOptions): this;
  useGrid(grid: BeeGrid, originX?: number, originY?: number): this;
  useTilemap(tilemap: BeeTilemap): this;
  useCells(data: unknown[][], cols: number, rows: number, cellSize?: number, originX?: number, originY?: number): this;
  setBlocked(col: number, row: number, blocked?: boolean): this;
  clearBlocked(): this;
  isWalkable(col: number, row: number): boolean;
  worldToCell(x: number, y: number): BeePathCell;
  cellToWorld(col: number, row: number): BeePathPoint;
  find(start: object, goal: object, out?: BeePath | null): BeePath;
  findCells(startCol: number, startRow: number, goalCol: number, goalRow: number, out?: BeePath | null): BeePath;
  track(path: BeePath | null | undefined, start: object, goal: object, out?: BeePath | null): BeePath;
  follow(entity: BeeEntity, path: BeePath, dt: number, speed: number): boolean;
  chase(entity: BeeEntity, target: object, dt: number, options?: { speed?: number; key?: string }): boolean;
  flow(goal: object): this;
  sampleFlow(x: number | object, y?: number): { x: number; y: number } | null;
}

export type BeeAnchorPreset =
  | "topLeft"
  | "top"
  | "topRight"
  | "left"
  | "center"
  | "right"
  | "bottomLeft"
  | "bottom"
  | "bottomRight"
  | "full";

export declare const BEE_ANCHOR: Readonly<{
  TOP_LEFT: "topLeft";
  TOP: "top";
  TOP_RIGHT: "topRight";
  LEFT: "left";
  CENTER: "center";
  RIGHT: "right";
  BOTTOM_LEFT: "bottomLeft";
  BOTTOM: "bottom";
  BOTTOM_RIGHT: "bottomRight";
  FULL: "full";
}>;

export declare const BEE_UI_DEFAULTS: Readonly<{
  gap: number;
  padding: number;
  buttonWidth: number;
  buttonHeight: number;
}>;

export interface BeeNineSlice {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  l?: number;
  t?: number;
  r?: number;
  b?: number;
}

export interface BeeAnchorBox {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  margin?: number;
}

export interface BeeControlOptions extends BeeAnchorBox {
  visible?: boolean;
  disabled?: boolean;
  focusable?: boolean;
  name?: string;
  onClick?: (control: BeeControl) => void;
  anchor?: BeeAnchorPreset;
  minWidth?: number;
  minHeight?: number;
}

export declare function drawNineSlice(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
  slice?: BeeNineSlice
): void;

export declare class BeeControl {
  visible: boolean;
  disabled: boolean;
  focusable: boolean;
  name: string;
  onClick: ((control: BeeControl) => void) | null;
  anchorLeft: number;
  anchorTop: number;
  anchorRight: number;
  anchorBottom: number;
  offsetLeft: number;
  offsetTop: number;
  offsetRight: number;
  offsetBottom: number;
  minWidth: number;
  minHeight: number;
  prefWidth: number;
  prefHeight: number;
  rect: { x: number; y: number; w: number; h: number };
  hover: boolean;
  pressed: boolean;
  readonly parent: BeeControl | null;
  readonly children: BeeControl[];
  readonly focused: boolean;
  readonly root: BeeUI | null;

  constructor(options?: BeeControlOptions);

  setAnchors(left: number, top: number, right: number, bottom: number): this;
  setOffsets(left: number, top: number, right: number, bottom: number): this;
  anchor(preset: BeeAnchorPreset, box?: BeeAnchorBox): this;
  add(child: BeeControl): BeeControl;
  remove(child: BeeControl): this;
  contains(x: number, y: number): boolean;
  hit(x: number, y: number): BeeControl | null;
  fit(parentRect: { x: number; y: number; w: number; h: number }): this;
  layout(parentRect?: { x: number; y: number; w: number; h: number }): this;
  measure(): this;
  place(x: number, y: number, w: number, h: number): this;
  draw(ctx: CanvasRenderingContext2D): void;
  activate(): boolean;
}

export interface BeePanelOptions extends BeeControlOptions {
  background?: string | null;
  fill?: string | null;
  border?: string | null;
  image?: CanvasImageSource | null;
  slice?: BeeNineSlice | null;
  radius?: number;
}

export declare class BeePanel extends BeeControl {
  background: string | null;
  border: string | null;
  image: CanvasImageSource | null;
  slice: BeeNineSlice | null;
  radius: number;
  constructor(options?: BeePanelOptions);
}

export interface BeeStackOptions extends BeePanelOptions {
  direction?: "v" | "h";
  gap?: number;
  padding?: number;
  stretch?: boolean;
}

export declare class BeeStack extends BeePanel {
  direction: "v" | "h";
  gap: number;
  padding: number;
  stretch: boolean;
  constructor(options?: BeeStackOptions);
}

export interface BeeLabelOptions extends BeeControlOptions {
  text?: string;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

export declare class BeeLabel extends BeeControl {
  text: string;
  font: string;
  color: string;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  constructor(options?: BeeLabelOptions);
}

export interface BeeUIButtonOptions extends BeeControlOptions {
  text?: string;
  font?: string;
  color?: string;
  background?: string;
  hoverBackground?: string;
  pressedBackground?: string;
  focusBorder?: string;
  radius?: number;
}

export declare class BeeUIButton extends BeeControl {
  text: string;
  font: string;
  color: string;
  background: string;
  hoverBackground: string;
  pressedBackground: string;
  focusBorder: string;
  radius: number;
  constructor(options?: BeeUIButtonOptions);
}

export declare class BeeUI extends BeePanel {
  canvas: HTMLCanvasElement | null;
  focus: BeeControl | null;
  width: number;
  height: number;
  constructor(options?: { canvas?: HTMLCanvasElement | null; width?: number; height?: number });
  markDirty(): this;
  resize(width: number, height: number): this;
  collectFocusable(out?: BeeControl[]): BeeControl[];
  focusAt(index: number): this;
  focusNext(): this;
  focusPrev(): this;
  focusToward(dx: number, dy: number): this;
  update(input?: { mouse?: { x: number; y: number; pressed?: boolean; wasPressed?: boolean }; wasPressed?: (key: string) => boolean; isPressed?: (key: string) => boolean }): this;
  draw(ctx: CanvasRenderingContext2D): this;
  destroy(): this;
}

export type BeeTimerCallback = (timer: BeeTimer) => void;

export interface BeeTimerOptions {
  duration?: number;
  onComplete?: BeeTimerCallback | null;
  callback?: BeeTimerCallback | null;
  loop?: boolean;
  unscaled?: boolean;
  useUnscaledTime?: boolean;
  autoStart?: boolean;
  maxCatchUp?: number;
  clock?: BeeTimerClock | null;
}

export declare const BEE_TIMER_DEFAULTS: Readonly<{
  duration: number;
  loop: boolean;
  unscaled: boolean;
  autoStart: boolean;
  maxCatchUp: number;
}>;

export declare class BeeTimer {
  duration: number;
  onComplete: BeeTimerCallback | null;
  callback: BeeTimerCallback | null;
  loop: boolean;
  unscaled: boolean;
  useUnscaledTime: boolean;
  maxCatchUp: number;
  elapsed: number;
  /** @deprecated usa elapsed */
  time: number;
  running: boolean;
  finished: boolean;
  cancelled: boolean;
  clock: BeeTimerClock | null;
  readonly paused: boolean;
  readonly remaining: number;
  readonly progress: number;

  constructor(
    durationOrOptions?: number | BeeTimerOptions,
    onComplete?: BeeTimerCallback | null,
    loop?: boolean,
    options?: Omit<BeeTimerOptions, "duration" | "onComplete" | "loop">
  );

  start(): this;
  pause(): this;
  resume(): this;
  stop(): this;
  reset(): this;
  cancel(): this;
  update(dtOrTime: number | BeeTime | { dt?: number; unscaledDt?: number }): this;
}

export declare class BeeTimerClock {
  readonly size: number;

  add(timer: BeeTimer): BeeTimer;
  create(options?: BeeTimerOptions): BeeTimer;
  remove(timer: BeeTimer): this;
  tick(time: BeeTime): this;
  clear(): this;
}

export type BeeEaseName =
  | "linear"
  | "quadIn"
  | "quadOut"
  | "quadInOut"
  | "cubicIn"
  | "cubicOut"
  | "cubicInOut"
  | "quartIn"
  | "quartOut"
  | "quartInOut"
  | "sineIn"
  | "sineOut"
  | "sineInOut"
  | "expoIn"
  | "expoOut"
  | "expoInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "elasticOut"
  | "bounceOut";

export type BeeEaseFn = (t: number) => number;

export declare const BeeEase: Record<BeeEaseName, BeeEaseFn>;

export declare function resolveEase(nameOrFn?: BeeEaseName | BeeEaseFn | string): BeeEaseFn;

export declare const BEE_TWEEN_DEFAULTS: Readonly<{
  duration: number;
  delay: number;
  ease: BeeEaseName;
  unscaled: boolean;
  yoyo: boolean;
  repeat: number;
  autoStart: boolean;
  overwrite: boolean;
}>;

export interface BeeTweenOptions {
  target?: object | null;
  to?: Record<string, number>;
  from?: Record<string, number> | null;
  mode?: "to" | "from" | "fromTo";
  duration?: number;
  delay?: number;
  ease?: BeeEaseName | BeeEaseFn | string;
  unscaled?: boolean;
  useUnscaledTime?: boolean;
  yoyo?: boolean;
  repeat?: number;
  autoStart?: boolean;
  overwrite?: boolean;
  clock?: BeeTweenClock | null;
  onStart?: (tween: BeeTween) => void;
  onUpdate?: (tween: BeeTween) => void;
  onComplete?: (tween: BeeTween) => void;
}

export declare class BeeTween {
  target: object | null;
  duration: number;
  delay: number;
  ease: BeeEaseFn;
  unscaled: boolean;
  yoyo: boolean;
  repeat: number;
  overwrite: boolean;
  elapsed: number;
  running: boolean;
  finished: boolean;
  cancelled: boolean;
  loop: boolean;
  clock: BeeTweenClock | null;
  onStart: ((tween: BeeTween) => void) | null;
  onUpdate: ((tween: BeeTween) => void) | null;
  onComplete: ((tween: BeeTween) => void) | null;
  readonly paused: boolean;
  readonly progress: number;
  readonly keys: string[];

  constructor(options?: BeeTweenOptions);

  static to(target: object, props: Record<string, number>, durationOrOptions?: number | BeeTweenOptions): BeeTween;
  static from(target: object, props: Record<string, number>, durationOrOptions?: number | BeeTweenOptions): BeeTween;
  static fromTo(
    target: object,
    from: Record<string, number>,
    to: Record<string, number>,
    durationOrOptions?: number | BeeTweenOptions
  ): BeeTween;

  start(): this;
  pause(): this;
  resume(): this;
  cancel(): this;
  steal(target: object, keys: string[]): this;
  seek(seconds: number): this;
  update(dtOrTime: number | BeeTime | { dt?: number; unscaledDt?: number }): this;
}

export declare class BeeTweenClock {
  readonly size: number;
  add<T extends { update: Function }>(item: T): T;
  remove(item: object): this;
  overwrite(source: { target?: object | null; keys?: string[] }): this;
  kill(target: object): this;
  tick(time: BeeTime): this;
  clear(): this;
}

export interface BeeTimelineOptions {
  unscaled?: boolean;
  useUnscaledTime?: boolean;
  yoyo?: boolean;
  repeat?: number;
  autoStart?: boolean;
  clock?: BeeTweenClock | null;
  onComplete?: (timeline: BeeTimeline) => void;
}

export declare class BeeTimeline {
  unscaled: boolean;
  yoyo: boolean;
  repeat: number;
  elapsed: number;
  duration: number;
  running: boolean;
  finished: boolean;
  cancelled: boolean;
  loop: boolean;
  clock: BeeTweenClock | null;
  onComplete: ((timeline: BeeTimeline) => void) | null;
  readonly paused: boolean;
  readonly progress: number;

  constructor(options?: BeeTimelineOptions);

  to(target: object, props: Record<string, number>, durationOrOptions?: number | (BeeTweenOptions & { at?: number })): this;
  from(target: object, props: Record<string, number>, durationOrOptions?: number | (BeeTweenOptions & { at?: number })): this;
  fromTo(
    target: object,
    from: Record<string, number>,
    to: Record<string, number>,
    durationOrOptions?: number | (BeeTweenOptions & { at?: number })
  ): this;
  wait(seconds: number): this;
  call(fn: (timeline: BeeTimeline) => void, at?: number): this;
  set(target: object, props: Record<string, unknown>, at?: number): this;
  start(): this;
  pause(): this;
  resume(): this;
  cancel(): this;
  steal(target: object, keys: string[]): this;
  seek(seconds: number): this;
  killTarget(target: object): this;
  update(dtOrTime: number | BeeTime | { dt?: number; unscaledDt?: number }): this;
}

export interface BeeTimeOptions {
  maxDelta?: number;
  timeScale?: number;
  minTimeScale?: number;
  maxTimeScale?: number;
  fixedDelta?: number;
  maxFixedSteps?: number;
  fpsSampleWindow?: number;
}

export declare const BEE_TIME_DEFAULTS: Readonly<{
  maxDelta: number;
  timeScale: number;
  minTimeScale: number;
  maxTimeScale: number;
  fixedDelta: number;
  maxFixedSteps: number;
  fpsSampleWindow: number;
}>;

export declare class BeeTime {
  maxDelta: number;
  minTimeScale: number;
  maxTimeScale: number;
  fixedDelta: number;
  maxFixedSteps: number;
  fpsSampleWindow: number;
  rawDelta: number;
  unscaledDt: number;
  dt: number;
  elapsed: number;
  unscaledElapsed: number;
  frameCount: number;
  fps: number;
  alpha: number;
  lastTimestamp: number;
  timeScale: number;
  readonly paused: boolean;
  readonly scaledDt: number;
  readonly realDt: number;

  constructor(options?: BeeTimeOptions);

  delta(unscaled?: boolean): number;
  setScale(value: number): this;
  pause(): this;
  resume(): this;
  togglePause(): this;
  now(): number;
  begin(timestamp?: number): this;
  reset(timestamp?: number): this;
  tick(timestamp: number): this;
  consumeFixedSteps(callback: (fixedDt: number) => void): number;
}

export type BeeSaveStatus =
  | "ok"
  | "missing"
  | "corrupt"
  | "unavailable"
  | "rejected"
  | "quota";

export interface BeeSaveOptions {
  prefix?: string;
  namespace?: string;
  version?: number;
  onCorrupt?: "keep" | "remove";
  fallback?: "memory" | "none";
  resaveOnMigrate?: boolean;
  storage?: Storage | null;
  migrate?: (data: unknown, from: number, to: number, key: string) => unknown;
}

export interface BeeSaveRecord<T = unknown> {
  ok: boolean;
  status: BeeSaveStatus;
  key: string;
  storageKey: string;
  value: T | undefined;
  version: number;
  savedAt: number;
  legacy: boolean;
  message: string;
}

export declare const BEE_SAVE_DEFAULTS: Readonly<{
  prefix: string;
  namespace: string;
  version: number;
  onCorrupt: "keep" | "remove";
  fallback: "memory" | "none";
  resaveOnMigrate: boolean;
}>;

export declare const BEE_SAVE_STATUS: Readonly<{
  OK: "ok";
  MISSING: "missing";
  CORRUPT: "corrupt";
  UNAVAILABLE: "unavailable";
  REJECTED: "rejected";
  QUOTA: "quota";
}>;

export declare class BeeSaveStore {
  prefix: string;
  namespace: string;
  version: number;
  onCorrupt: "keep" | "remove";
  fallback: "memory" | "none";
  resaveOnMigrate: boolean;
  migrate: ((data: unknown, from: number, to: number, key: string) => unknown) | null;
  lastRead: BeeSaveRecord | null;
  lastWrite: BeeSaveRecord | null;
  readonly available: boolean;
  readonly persistent: boolean;

  constructor(options?: BeeSaveOptions);

  configure(options?: BeeSaveOptions): this;
  storageKey(key: string): string;
  save<T>(key: string, value: T): BeeSaveRecord<T>;
  read<T = unknown>(key: string): BeeSaveRecord<T>;
  load<T = unknown>(key: string, defaultValue?: T | null): T | null;
  remove(key: string): boolean;
  exists(key: string): boolean;
  has(key: string): boolean;
  clearAll(): number;
  slotKey(index: number): string;
  saveSlot<T>(index: number, value: T): BeeSaveRecord<T>;
  readSlot<T = unknown>(index: number): BeeSaveRecord<T>;
  loadSlot<T = unknown>(index: number, defaultValue?: T | null): T | null;
}

export declare class BeeSave {
  static prefix: string;
  static readonly store: BeeSaveStore;

  static create(options?: BeeSaveOptions): BeeSaveStore;
  static configure(options?: BeeSaveOptions): typeof BeeSave;
  static save<T>(key: string, value: T): BeeSaveRecord<T>;
  static read<T = unknown>(key: string): BeeSaveRecord<T>;
  static load<T = unknown>(key: string, defaultValue?: T | null): T | null;
  static remove(key: string): boolean;
  static exists(key: string): boolean;
  static has(key: string): boolean;
  static clearAll(): number;
  static saveSlot<T>(index: number, value: T): BeeSaveRecord<T>;
  static readSlot<T = unknown>(index: number): BeeSaveRecord<T>;
  static loadSlot<T = unknown>(index: number, defaultValue?: T | null): T | null;
}

export declare class BeeMenuScene implements BeeScene {
  engine: BeeEngine | null;

  constructor();

  enter(): void;
  exit(): void;
  update(dt: number, input: BeeInput): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeJoystick {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  radius: number;
  handleRadius: number;
  active: boolean;
  angle: number;
  distance: number;

  constructor(canvas: HTMLCanvasElement, input: BeeInput);

  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
  getDir(): { x: number; y: number };
}

export declare class BeeSpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  frameCount: number;

  constructor(
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    options?: { col?: number; row?: number; framesPerRow?: number; frameCount?: number; offsetX?: number; offsetY?: number }
  );

  drawFrame(
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    destX: number,
    destY: number,
    destW: number,
    destH: number
  ): void;
}

export declare class BeeAnimatedSprite {
  sheet: BeeSpriteSheet;
  animations: Record<string, { frames: number[]; fps?: number; loop?: boolean }>;
  currentAnimName: string;
  currentFrameIndex: number;
  timer: number;
  flipX: boolean;
  readonly finished: boolean;
  readonly clip: string;

  constructor(
    spriteSheet: BeeSpriteSheet,
    config?: {
      animation?: string;
      animations?: Record<string, { frames: number[]; fps?: number; loop?: boolean }>;
    }
  );

  play(name: string, options?: { restart?: boolean }): this;
  update(dt: number): this;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, options?: { width?: number; height?: number }): void;
}

export declare const BEE_ANIMATOR_DEFAULTS: Readonly<{
  priority: number;
  lock: boolean;
  loop: boolean;
}>;

export interface BeeAnimatorStateOptions {
  clip?: string;
  animation?: string;
  loop?: boolean;
  lock?: boolean;
  priority?: number;
  exitTo?: string | null;
  initial?: boolean;
  onEnter?: (animator: BeeAnimator, previous: { name: string } | null) => void;
  onExit?: (animator: BeeAnimator, next: { name: string }) => void;
  onComplete?: (animator: BeeAnimator, context: unknown) => void;
}

export type BeeAnimatorPredicate = (context: any, animator: BeeAnimator) => boolean;

export declare class BeeAnimator {
  sprite: { play?: Function; update?: Function; finished?: boolean } | null;
  context: (() => unknown) | null;
  readonly current: string | null;
  readonly locked: boolean;
  readonly queued: string | null;
  readonly timeInState: number;

  constructor(sprite?: BeeAnimator["sprite"], options?: { context?: () => unknown });

  add(name: string, spec?: BeeAnimatorStateOptions): this;
  when(
    from: string | string[],
    to: string,
    predicate: BeeAnimatorPredicate,
    options?: { priority?: number }
  ): this;
  from(from: string | string[]): {
    to: (to: string, predicate: BeeAnimatorPredicate, options?: { priority?: number }) => BeeAnimator;
  };
  start(name?: string): this;
  play(name: string, options?: { restart?: boolean; force?: boolean }): this;
  set(name: string, options?: { restart?: boolean; force?: boolean }): this;
  update(dt: number, context?: unknown): this;
}

export type BeeDrawPass = "background" | "world" | "ysort" | "ui" | (string & {});
export type BeeDrawSpace = "world" | "screen";
export type BeeDrawSort = "stable" | "y";

export declare const BEE_DRAW: Readonly<{
  BACKGROUND: "background";
  WORLD: "world";
  YSORT: "ysort";
  UI: "ui";
}>;

export declare const BEE_SPACE: Readonly<{
  WORLD: "world";
  SCREEN: "screen";
}>;

export declare const BEE_LAYER_DEFAULTS: Readonly<{
  space: BeeDrawSpace;
  sort: BeeDrawSort;
  visible: boolean;
}>;

export interface BeeLayerSpec {
  space?: BeeDrawSpace;
  sort?: BeeDrawSort | "ysort";
  visible?: boolean;
  order?: number;
}

export interface BeeLayerInfo {
  name: string;
  space: BeeDrawSpace;
  sort: BeeDrawSort;
  visible: boolean;
  order: number;
}

/**
 * Pipeline di disegno. Non è {@link BEE_LAYER} (bitmask fisica).
 * background / world / ysort stanno sotto la camera; ui è spazio schermo.
 */
export declare class BeeLayer {
  readonly size: number;

  constructor(options?: { defaults?: boolean });

  add(name: string, spec?: BeeLayerSpec): this;
  remove(name: string): this;
  has(name: string): boolean;
  get(name: string): BeeLayerInfo | null;
  list(): BeeLayerInfo[];
  items(name: string): BeeEntity[];
  collect(engine: Pick<BeeEngine, "entities" | "currentScene" | "scenes" | "getEntityDrawBounds"> | BeeEngine): this;
  drawWorld(ctx: CanvasRenderingContext2D, engine: BeeEngine): this;
  drawScreen(ctx: CanvasRenderingContext2D, engine: BeeEngine): this;
}

export declare class BeeTilemapLoader {
  engine: BeeEngine;
  solidColliders: BeeRectCollider[];
  isLoaded: boolean;

  constructor(engine: BeeEngine);

  preloadAssets(mapJson: any, basePath?: string): Promise<void>;
  load(mapJson: any): void;
  getColliders(): BeeRectCollider[];
  render(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeVirtualDPad {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  size: number;
  eightWay: boolean;
  state: { up: boolean; down: boolean; left: boolean; right: boolean };

  constructor(options: {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    size?: number;
    eightWay?: boolean;
  });

  resetState(): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export declare class BeeTouchButton {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  radius: number;
  label: string;
  isPressed: boolean;

  constructor(options: {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    radius?: number;
    label?: string;
  });

  render(ctx: CanvasRenderingContext2D): void;
}

// ---------------------------------------------------------------------------
// BeeEngine (Core)
// ---------------------------------------------------------------------------

export interface BeeLadybugOptions {
  toggleKey?: string;
  slowKey?: string;
  freezeKey?: string;
  slowScale?: number;
  colorActive?: string;
  colorColliding?: string;
  colorInactive?: string;
  overlayX?: number;
  overlayY?: number;
}

export declare const BEE_LADYBUG_DEFAULTS: Readonly<{
  toggleKey: string;
  slowKey: string;
  freezeKey: string;
  slowScale: number;
  colorActive: string;
  colorColliding: string;
  colorInactive: string;
  overlayX: number;
  overlayY: number;
}>;

export declare class BeeLadybug {
  engine: BeeEngine;
  enabled: boolean;
  toggleKey: string;
  slowKey: string;
  freezeKey: string;
  slowScale: number;
  colorActive: string;
  colorColliding: string;
  colorInactive: string;
  overlayX: number;
  overlayY: number;

  constructor(engine: BeeEngine, options?: BeeLadybugOptions);

  configure(options?: BeeLadybugOptions): this;
  attach(): this;
  detach(): this;
  destroy(): void;
  show(): this;
  hide(): this;
  toggle(): this;
  applySlowMo(): this;
  toggleFreeze(): this;
  restoreRealtime(): this;
  drawWorld(ctx: CanvasRenderingContext2D): void;
  drawOverlay(ctx: CanvasRenderingContext2D): void;
  poll(): void;
}

export type BeeBusName = "master" | "music" | "sfx" | "ui" | "voice" | string;

export declare const BEE_BUS: Readonly<{
  MASTER: "master";
  MUSIC: "music";
  SFX: "sfx";
  UI: "ui";
  VOICE: "voice";
}>;

export declare const BEE_AUDIO_DEFAULTS: Readonly<{
  maxDistance: number;
  panWidth: number;
  duckAmount: number;
  duckAttack: number;
  duckRelease: number;
}>;

export declare function spatialMix(
  x: number,
  y: number,
  listenerX: number,
  listenerY: number,
  options?: { maxDistance?: number; panWidth?: number }
): { volume: number; pan: number; dist: number };

export declare class BeeAudioBus {
  name: string;
  parent: string | null;
  volume: number;
  mute: boolean;
  duck: number;
  constructor(name: string, options?: { parent?: string | null; volume?: number; mute?: boolean });
}

export declare class BeeAudioVoice {
  id: number;
  bus: string;
  volume: number;
  loop: boolean;
  spatial: boolean;
  x: number;
  y: number;
  stopped: boolean;
  stop(fade?: number): this;
}

export interface BeeAudioPlayOptions {
  bus?: BeeBusName;
  volume?: number;
  loop?: boolean;
  fade?: number;
  fadeIn?: number;
  x?: number;
  y?: number;
  pan?: number;
  spatial?: boolean;
  duration?: number;
  frequency?: number;
  type?: OscillatorType;
  slot?: string;
}

export declare class BeeAudioMixer {
  engine: BeeEngine | null;
  maxDistance: number;
  panWidth: number;
  listenerX: number;
  listenerY: number;
  context: AudioContext | null;
  unlocked: boolean;
  readonly master: BeeAudioBus | undefined;
  readonly voices: number;
  readonly available: boolean;

  constructor(options?: {
    engine?: BeeEngine | null;
    maxDistance?: number;
    panWidth?: number;
    listenerX?: number;
    listenerY?: number;
  });

  bus(name: BeeBusName, options?: { parent?: string | null; volume?: number; mute?: boolean }): BeeAudioBus;
  setVolume(name: BeeBusName, volume: number): this;
  mute(name: BeeBusName, muted?: boolean): this;
  duck(options?: { bus?: BeeBusName; from?: BeeBusName; amount?: number; attack?: number; release?: number }): this;
  listen(x: number, y: number): this;
  unlock(): this;
  play(source: string | HTMLAudioElement | AudioBuffer | { kind: "tone"; frequency?: number; type?: OscillatorType; duration?: number }, options?: BeeAudioPlayOptions): BeeAudioVoice | null;
  music(source: string | HTMLAudioElement | AudioBuffer | { kind: "tone"; frequency?: number; type?: OscillatorType; duration?: number }, options?: BeeAudioPlayOptions): BeeAudioVoice | null;
  tone(options?: BeeAudioPlayOptions): BeeAudioVoice | null;
  stop(target?: BeeAudioVoice | BeeBusName | "music" | null, fade?: number): this;
  fade(name: BeeBusName, volume: number, duration?: number): this;
  outputVolume(name: BeeBusName): number;
  update(time?: BeeTime | { unscaledDt?: number; delta?: (unscaled?: boolean) => number }): this;
  destroy(): this;
}

export declare class BeeEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  assets: BeeAssetManager;
  input: BeeInput;
  scenes: BeeSceneManager;
  entities: BeeEntity[];
  collisions: BeeCollisionSystem;
  physics: BeePhysicsWorld;
  spatial: BeeSpatialHash;
  pools: Map<string, BeePool>;
  bullets: BeePool<BeeBullet> | null;
  time: BeeTime;
  timers: BeeTimerClock;
  tweens: BeeTweenClock;
  audio: BeeAudioMixer;
  layers: BeeLayer;
  prefabs: BeePrefab;
  pathfinder: BeePathfinder;
  ui: BeeUI;
  save: BeeSaveStore;
  debug: BeeLadybug;
  lastTime: number;
  camera: BeeCamera | null;
  grid: BeeGrid | null;
  currentScene: BeeScene | null;
  events: Record<string, BeeEventCallback[]>;
  isRunning: boolean;
  isPaused: boolean;
  animationFrameId: number | null;
  touchControls?: BeeTouchControls | BeeJoystick;

  update?: BeeGameLoopCallback;
  render?: BeeRenderCallback;

  constructor(canvasId: string | HTMLCanvasElement, width?: number, height?: number);

  enableAutoResize(
    baseWidth?: number,
    baseHeight?: number,
    reservedHeight?: number
  ): void;

  setGrid(grid: BeeGrid | null): this;
  setScene(name: string, data?: unknown): void;
  lockOrientation(orientation?: string): void;
  pause(): this;
  resume(): this;
  setTimeScale(scale: number): this;
  after(duration: number, onComplete?: BeeTimerCallback | null, options?: BeeTimerOptions): BeeTimer;
  every(duration: number, onComplete?: BeeTimerCallback | null, options?: BeeTimerOptions): BeeTimer;
  to(target: object, props: Record<string, number>, durationOrOptions?: number | BeeTweenOptions): BeeTween;
  from(target: object, props: Record<string, number>, durationOrOptions?: number | BeeTweenOptions): BeeTween;
  fromTo(
    target: object,
    from: Record<string, number>,
    to: Record<string, number>,
    durationOrOptions?: number | BeeTweenOptions
  ): BeeTween;
  timeline(options?: BeeTimelineOptions): BeeTimeline;
  stop(): void;
  destroy(): void;

  createPool<T = any>(name: string, options: BeePoolOptions<T> | BeePool<T>): BeePool<T>;
  pool<T = any>(name: string): BeePool<T> | null;
  spawn<T = any>(name: string, ...args: any[]): T | null;

  enableJoystick(options?: object): BeeJoystick;
  enableTouchControls(): BeeTouchControls;
  enableLadybug(options?: BeeLadybugOptions): BeeLadybug;

  createSpriteSheet(
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    config?: object
  ): BeeSpriteSheet;

  createAnimatedSprite(
    spriteSheet: BeeSpriteSheet,
    config?: object
  ): BeeAnimatedSprite;

  createAnimator(
    sprite?: BeeAnimator["sprite"],
    options?: { context?: () => unknown }
  ): BeeAnimator;

  start(
    updateCallback?: BeeGameLoopCallback,
    renderCallback?: BeeRenderCallback
  ): void;

  loop(timestamp: number): void;

  on(evento: string, callback: BeeEventCallback): void;
  emit(evento: string, dati?: unknown): void;
  off(evento: string, callback: BeeEventCallback): void;

  addEntity(entity: BeeEntity): BeeEntity | undefined;
  updateEntities(dt: number, input: BeeInput): void;
  renderEntities(ctx: CanvasRenderingContext2D): void;
  getEntityDrawBounds(entity: BeeEntity): BeeRect | null;
  isRectVisibleInView(
    x: number,
    y: number,
    width: number,
    height: number,
    space?: BeeDrawSpace
  ): boolean;
  drawEntity(
    ctx: CanvasRenderingContext2D,
    entity: BeeEntity,
    options?: { space?: BeeDrawSpace; pass?: string }
  ): void;
  checkCollision(rect1: BeeRect, rect2: BeeRect): boolean;

  loadAsset(type: string, name: string, src: string): Promise<any>;
  loadManifest(manifest: BeeManifestItem[]): Promise<void>;
  getAsset(name: string): any;
  playSound(
    source: string | HTMLAudioElement | AudioBuffer,
    options?: number | BeeAudioPlayOptions
  ): BeeAudioVoice | null;
  playMusic(
    source: string | HTMLAudioElement | AudioBuffer,
    volume?: number | BeeAudioPlayOptions
  ): BeeAudioVoice | null;
}
