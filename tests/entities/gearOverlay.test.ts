import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME } from '../../src/config/theme';
import {
  BLOCK_RING_STATIC_MS,
  blockRingRadius,
  GearBlastPool,
  GearOverlay,
  glintDepth,
  overlayDepth,
  type OverlayTarget,
} from '../../src/entities/GearOverlay';
import { gearTextureKeys } from '../../src/logic/gear';

vi.mock('phaser', () => ({
  default: { Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } } },
}));

interface FakeSprite {
  key: string;
  x: number;
  y: number;
  frame: string | number;
  flipX: boolean;
  visible: boolean;
  depth: number;
  tint?: number;
  anim?: string;
  listeners: Record<string, () => void>;
  destroyed: boolean;
}

function fakeScene(textures: string[], anims: string[] = []) {
  const sprites: FakeSprite[] = [];
  const graphics: { calls: unknown[][]; visible: boolean; destroyed: boolean }[] = [];
  const created: { key: string; frameRate: number; repeat: number }[] = [];
  const animKeys = new Set(anims);
  const scene = {
    textures: { exists: (k: string) => textures.includes(k) },
    anims: {
      exists: (k: string) => animKeys.has(k),
      create: (cfg: { key: string; frameRate: number; repeat: number }) => {
        created.push(cfg);
        animKeys.add(cfg.key);
      },
      generateFrameNumbers: () => [],
    },
    add: {
      sprite: (x: number, y: number, key: string, frame: number) => {
        const s: FakeSprite = {
          key,
          x,
          y,
          frame,
          flipX: false,
          visible: true,
          depth: 0,
          listeners: {},
          destroyed: false,
        };
        const api = {
          get s() {
            return s;
          },
          setPosition(nx: number, ny: number) {
            s.x = nx;
            s.y = ny;
            return api;
          },
          setFrame(f: string | number) {
            s.frame = f;
            return api;
          },
          setFlipX(v: boolean) {
            s.flipX = v;
            return api;
          },
          setVisible(v: boolean) {
            s.visible = v;
            return api;
          },
          get visible() {
            return s.visible;
          },
          setDepth(d: number) {
            s.depth = d;
            return api;
          },
          setTintFill(t: number) {
            s.tint = t;
            return api;
          },
          clearTint() {
            s.tint = undefined;
            return api;
          },
          play(k: string) {
            s.anim = k;
            return api;
          },
          on(ev: string, fn: () => void) {
            s.listeners[ev] = fn;
            return api;
          },
          destroy() {
            s.destroyed = true;
          },
        };
        sprites.push(s);
        return api;
      },
      graphics: () => {
        const g = { calls: [] as unknown[][], visible: true, destroyed: false };
        const rec =
          (name: string) =>
          (...a: unknown[]) => {
            g.calls.push([name, ...a]);
            return api;
          };
        const api = {
          clear: () => {
            g.calls = [];
            return api;
          },
          lineStyle: rec('lineStyle'),
          strokeCircle: rec('strokeCircle'),
          setPosition: rec('setPosition'),
          setDepth: rec('setDepth'),
          setVisible: (v: boolean) => {
            g.visible = v;
            return api;
          },
          destroy: () => {
            g.destroyed = true;
          },
        };
        graphics.push(g);
        return api;
      },
    },
  };
  return { scene: scene as never, sprites, graphics, created };
}

const GEAR_TEXTURES = [
  'gear-hell-legs',
  'gear-hell-body',
  'gear-diamond-head',
  'gear-diamond-glint',
  'gear-blast',
];

function target(over: Partial<OverlayTarget> = {}): OverlayTarget {
  return {
    x: 320,
    y: 180,
    depth: 10,
    flipX: false,
    visible: true,
    frame: { name: '2' },
    isHitFlashing: false,
    ...over,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('gear overlay depth (AP-143)', () => {
  it('stacks legs, body, head and glint above the astronaut and below a weapon in front', () => {
    const d = [0, 1, 2].map((i) => overlayDepth(10, i));
    expect(d[0]).toBeGreaterThan(10);
    expect(d[1]).toBeGreaterThan(d[0]!);
    expect(d[2]).toBeGreaterThan(d[1]!);
    expect(glintDepth(10)).toBeGreaterThan(d[2]!);
    expect(glintDepth(10)).toBeLessThan(11);
    expect(overlayDepth(10, 0)).toBeGreaterThan(9);
  });
});

describe('diamond block ring (AP-143)', () => {
  it('grows from 16 to 28 px in motion.gear-block and is gone after it', () => {
    const ms = THEME.motionMs['motion.gear-block'];
    expect(blockRingRadius(0, false)).toBe(16);
    expect(blockRingRadius(ms / 2, false)).toBe(22);
    expect(blockRingRadius(ms - 1, false)).toBeLessThanOrEqual(28);
    expect(blockRingRadius(ms, false)).toBeNull();
    expect(blockRingRadius(-1, false)).toBeNull();
    expect(blockRingRadius(Number.NaN, false)).toBeNull();
  });

  it('without motion stands at 28 px for 120 ms', () => {
    expect(blockRingRadius(0, true)).toBe(28);
    expect(blockRingRadius(BLOCK_RING_STATIC_MS - 1, true)).toBe(28);
    expect(blockRingRadius(BLOCK_RING_STATIC_MS, true)).toBeNull();
  });
});

describe('GearOverlay (AP-143)', () => {
  const equipped = { head: 'gear-diamond-head', body: 'gear-hell-body', legs: 'gear-hell-legs' };

  it('creates the layers in the order legs, body, head and follows frame, flip and position', () => {
    const f = fakeScene(GEAR_TEXTURES);
    const o = new GearOverlay(f.scene, gearTextureKeys(equipped), false);
    expect(f.sprites.map((s) => s.key)).toEqual([
      'gear-hell-legs',
      'gear-hell-body',
      'gear-diamond-head',
    ]);
    o.sync(target({ flipX: true, frame: { name: '3' }, x: 100, y: 50 }), 16, false);
    for (const [i, s] of f.sprites.entries()) {
      expect(s.frame).toBe('3');
      expect(s.flipX).toBe(true);
      expect([s.x, s.y]).toEqual([100, 50]);
      expect(s.depth).toBe(overlayDepth(10, i));
    }
    expect(f.graphics).toHaveLength(0);
  });

  it('flashes along with the astronaut and clears afterwards', () => {
    const f = fakeScene(GEAR_TEXTURES);
    const o = new GearOverlay(f.scene, ['gear-hell-legs'], false);
    o.sync(target({ isHitFlashing: true }), 16, false);
    expect(f.sprites[0]!.tint).toBe(THEME.colors['game.hit-flash'].num);
    o.sync(target(), 16, false);
    expect(f.sprites[0]!.tint).toBeUndefined();
  });

  it('skips pieces without texture', () => {
    const f = fakeScene([]);
    const o = new GearOverlay(f.scene, ['gear-hell-legs'], false);
    expect(o.layerCount).toBe(0);
  });

  it('shows the diamond glint only while the block is ready, animated at the preload rate', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const f = fakeScene(GEAR_TEXTURES, ['gear-diamond-glint-anim']);
    const o = new GearOverlay(f.scene, [], true);
    const glint = f.sprites.find((s) => s.key === 'gear-diamond-glint')!;
    expect(glint.anim).toBe('gear-diamond-glint-anim');
    o.sync(target(), 16, true);
    expect(glint.visible).toBe(true);
    o.sync(target(), 16, false);
    expect(glint.visible).toBe(false);
  });

  it('keeps the glint still with reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const f = fakeScene(GEAR_TEXTURES, ['gear-diamond-glint-anim']);
    new GearOverlay(f.scene, [], true);
    const glint = f.sprites.find((s) => s.key === 'gear-diamond-glint')!;
    expect(glint.anim).toBeUndefined();
  });

  it('plays the block ring once in game.gear-block, 2 px, and hides it after 300 ms', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const f = fakeScene(GEAR_TEXTURES);
    const o = new GearOverlay(f.scene, [], true);
    const ring = f.graphics[0]!;
    o.sync(target(), 16, true);
    expect(ring.visible).toBe(false);
    o.playBlock();
    o.sync(target(), 16, false);
    expect(ring.visible).toBe(true);
    expect(ring.calls).toContainEqual(['lineStyle', 2, THEME.colors['game.gear-block'].num, 1]);
    expect(ring.calls).toContainEqual(['strokeCircle', 0, 0, 16]);
    for (let t = 0; t < 320; t += 16) o.sync(target(), 16, false);
    expect(ring.visible).toBe(false);
  });

  it('destroys all its objects', () => {
    const f = fakeScene(GEAR_TEXTURES);
    const o = new GearOverlay(f.scene, ['gear-hell-legs'], true);
    o.destroy();
    expect(f.sprites.every((s) => s.destroyed)).toBe(true);
    expect(f.graphics.every((g) => g.destroyed)).toBe(true);
  });
});

describe('GearBlastPool (AP-143)', () => {
  it('creates a 12 fps one-shot animation and reuses hidden sprites', () => {
    const f = fakeScene(GEAR_TEXTURES);
    const pool = new GearBlastPool(f.scene);
    expect(f.created).toEqual([expect.objectContaining({ frameRate: 12, repeat: 0 })]);
    pool.play(10, 20, 8);
    expect(f.sprites).toHaveLength(1);
    const s = f.sprites[0]!;
    expect([s.x, s.y, s.depth, s.visible]).toEqual([10, 20, 8, true]);
    pool.play(30, 40, 8);
    expect(f.sprites).toHaveLength(2);
    s.listeners.animationcomplete?.();
    expect(s.visible).toBe(false);
    pool.play(50, 60, 8);
    expect(f.sprites).toHaveLength(2);
    expect([s.x, s.y, s.visible]).toEqual([50, 60, true]);
    pool.destroy();
    expect(f.sprites.every((x) => x.destroyed)).toBe(true);
  });

  it('does nothing without the texture', () => {
    const f = fakeScene([]);
    new GearBlastPool(f.scene).play(1, 2, 3);
    expect(f.sprites).toHaveLength(0);
  });
});
