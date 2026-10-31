// Minimal Phaser stand-in for the enemy entity tests (Phaser itself needs a browser window).
// Sprites keep position, body, velocity, alpha, frame and animation; graphics record their draw calls.

export interface StubBody {
  enable: boolean;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
  velocity: { x: number; y: number };
  reset(x: number, y: number): void;
}

/** Records every call as [method, ...args]. */
export class StubGraphics {
  calls: unknown[][] = [];
  visible = true;
  depth = 0;
  destroyed = false;
  constructor() {
    const record =
      (name: string) =>
      (...args: unknown[]): this => {
        this.calls.push([name, ...args]);
        return this;
      };
    for (const m of [
      'lineStyle',
      'lineBetween',
      'strokeCircle',
      'fillCircle',
      'strokeEllipse',
      'fillStyle',
      'fillRect',
      'generateTexture',
    ]) {
      (this as unknown as Record<string, unknown>)[m] = record(m);
    }
  }
  clear(): this {
    this.calls = [];
    return this;
  }
  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
  setDepth(d: number): this {
    this.depth = d;
    return this;
  }
  setPosition(): this {
    return this;
  }
  setStrokeStyle(): this {
    return this;
  }
  /** Names of the recorded draw calls. */
  get drawn(): string[] {
    return this.calls.map((c) => String(c[0]));
  }
  destroy(): void {
    this.destroyed = true;
  }
}

export interface StubScene {
  textureSizes: Map<string, { w: number; h: number }>;
  animKeys: Set<string>;
  graphics: StubGraphics[];
  generated: string[];
  add: {
    existing(o: unknown): unknown;
    circle(): StubGraphics;
    graphics(): StubGraphics;
  };
  make: { graphics(): StubGraphics };
  physics: { add: { existing(o: unknown): unknown } };
  anims: { exists(key: string): boolean };
  textures: { exists(key: string): boolean };
  scale: { gameSize: { width: number; height: number } };
}

/** A scene with the textures of the given keys (8 x 8 unless a size is given). */
export function makeScene(textures: Record<string, [number, number]> = {}): StubScene {
  const textureSizes = new Map<string, { w: number; h: number }>();
  for (const [k, [w, h]] of Object.entries(textures)) textureSizes.set(k, { w, h });
  const scene: StubScene = {
    textureSizes,
    animKeys: new Set(),
    graphics: [],
    generated: [],
    add: {
      existing: (o) => o,
      circle: () => new StubGraphics(),
      graphics: () => {
        const g = new StubGraphics();
        scene.graphics.push(g);
        return g;
      },
    },
    make: {
      graphics: () => {
        const g = new StubGraphics();
        const gen = g as unknown as Record<string, (...a: unknown[]) => unknown>;
        gen.generateTexture = (key: unknown, w: unknown, h: unknown) => {
          scene.generated.push(String(key));
          textureSizes.set(String(key), { w: Number(w), h: Number(h) });
          return g;
        };
        return g;
      },
    },
    physics: { add: { existing: (o) => o } },
    anims: { exists: (k) => scene.animKeys.has(k) },
    textures: { exists: (k) => textureSizes.has(k) },
    scale: { gameSize: { width: 640, height: 360 } },
  };
  return scene;
}

function makeBody(w: number, h: number, owner: Sprite): StubBody {
  return {
    enable: true,
    width: w,
    height: h,
    halfWidth: w / 2,
    halfHeight: h / 2,
    velocity: { x: 0, y: 0 },
    reset(x: number, y: number) {
      owner.x = x;
      owner.y = y;
      this.velocity = { x: 0, y: 0 };
    },
  };
}

class Sprite {
  scene: StubScene;
  x: number;
  y: number;
  width = 8;
  height = 8;
  depth = 0;
  active = true;
  visible = true;
  alpha = 1;
  flipX = false;
  rotation = 0;
  frameIndex: number | undefined;
  anim: string | undefined;
  texKey: string;
  tint: number | undefined;
  body: StubBody;

  constructor(scene: StubScene, x: number, y: number, texture: string) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.texKey = texture;
    const size = scene.textureSizes.get(texture);
    if (size) {
      this.width = size.w;
      this.height = size.h;
    }
    this.body = makeBody(this.width, this.height, this);
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setActive(v: boolean): this {
    this.active = v;
    return this;
  }
  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
  enableBody(_reset: boolean, x: number, y: number, active: boolean, visible: boolean): this {
    this.body.enable = true;
    this.body.velocity = { x: 0, y: 0 };
    this.x = x;
    this.y = y;
    this.active = active;
    this.visible = visible;
    return this;
  }
  disableBody(_disable: boolean, hide: boolean): this {
    this.body.enable = false;
    this.active = false;
    if (hide) this.visible = false;
    return this;
  }
  setVelocity(x: number, y: number): this {
    this.body.velocity = { x, y };
    return this;
  }
  setFlipX(v: boolean): this {
    this.flipX = v;
    return this;
  }
  setAlpha(a: number): this {
    this.alpha = a;
    return this;
  }
  setTintFill(t: number): this {
    this.tint = t;
    return this;
  }
  clearTint(): this {
    this.tint = undefined;
    return this;
  }
  setRotation(r: number): this {
    this.rotation = r;
    return this;
  }
  setDepth(d: number): this {
    this.depth = d;
    return this;
  }
  setFrame(f: number): this {
    this.frameIndex = f;
    return this;
  }
  play(key: string): this {
    this.anim = key;
    this.frameIndex = undefined;
    return this;
  }
  stop(): this {
    this.anim = undefined;
    return this;
  }
  setTexture(key: string): this {
    this.texKey = key;
    const size = this.scene.textureSizes.get(key);
    this.width = size?.w ?? 8;
    this.height = size?.h ?? 8;
    return this;
  }
  setBodySize(w: number, h: number): this {
    const enable = this.body.enable;
    const velocity = this.body.velocity;
    this.body = makeBody(w, h, this);
    this.body.enable = enable;
    this.body.velocity = velocity;
    return this;
  }
  destroy(): void {
    this.active = false;
  }
}

const Phaser = { Physics: { Arcade: { Sprite } } };
export default Phaser;
