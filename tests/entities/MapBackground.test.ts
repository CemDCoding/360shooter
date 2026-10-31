import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAPS, MAX_MAP_PARTICLES } from '../../src/config/maps';
import { createRng } from '../../src/logic/rng';

vi.mock('phaser', () => ({ default: {} }));

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('../../src/platform/motion', () => ({ prefersReducedMotion: () => motion.reduced }));

const { MapBackground, particleMotion } = await import('../../src/entities/MapBackground');

interface Img {
  key: string;
  x: number;
  y: number;
  alpha: number;
}

function makeScene(width = 900, height = 360) {
  const images: Img[] = [];
  const tweens: { x: number; y: number; target: { x: number; y: number } }[] = [];
  const textures = new Set<string>();
  const obj = () => {
    const o: Record<string, unknown> = {};
    for (const m of [
      'setOrigin',
      'setDepth',
      'setTint',
      'beginDraw',
      'endDraw',
      'batchDrawFrame',
    ]) {
      o[m] = () => o;
    }
    o.destroy = () => undefined;
    return o;
  };
  const scene = {
    scale: { width, height },
    textures: {
      exists: (k: string) => textures.has(k),
      get: () => ({ frameTotal: 4 }),
      createCanvas: (k: string) => {
        textures.add(k);
        return { getContext: () => null };
      },
    },
    make: {
      graphics: () => ({
        fillStyle: () => ({ fillRect: () => undefined, fillCircle: () => undefined }),
        generateTexture: (k: string) => textures.add(k),
        destroy: () => undefined,
      }),
    },
    add: {
      rectangle: obj,
      renderTexture: obj,
      image: (x: number, y: number, key: string) => {
        const img: Img = { key, x, y, alpha: 1 };
        images.push(img);
        const o = obj();
        o.x = x;
        o.y = y;
        o.setAlpha = (a: number) => {
          img.alpha = a;
          return o;
        };
        return o;
      },
    },
    tweens: {
      add: (cfg: { targets: { x: number; y: number }; x: number; y: number }) => {
        tweens.push({ x: cfg.x, y: cfg.y, target: cfg.targets });
      },
    },
  };
  return { scene, images, tweens };
}

afterEach(() => {
  motion.reduced = false;
});

describe('particleMotion', () => {
  it('drifts sand sideways (no falling) and lifts embers upward', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const s = particleMotion('sand', rng);
      expect(s.dx).toBeGreaterThanOrEqual(40);
      expect(Math.abs(s.dy)).toBeLessThanOrEqual(3);
      const e = particleMotion('embers', rng);
      expect(e.dy).toBeLessThan(-30);
    }
  });
});

describe('MapBackground effects', () => {
  it.each(['desert', 'pyramids', 'oasis'] as const)(
    'creates the capped particle set for %s',
    (b) => {
      const { scene, images, tweens } = makeScene();
      new MapBackground(scene as never, b, 3);
      const dots = images.filter((i) => i.key === 'map-dot' || i.key === 'map-streak');
      expect(dots.length).toBe(Math.min(MAPS[b].effectCount, MAX_MAP_PARTICLES));
      expect(dots.length).toBeLessThanOrEqual(40);
      expect(tweens.length).toBe(dots.length);
      for (const d of dots) {
        expect(d.x).toBeLessThanOrEqual(900);
        expect(d.x).toBeGreaterThanOrEqual(0);
      }
      expect(dots.every((d) => d.key === (b === 'desert' ? 'map-streak' : 'map-dot'))).toBe(true);
    },
  );

  it('moves sand streaks sideways', () => {
    const { scene, tweens } = makeScene();
    new MapBackground(scene as never, 'desert', 3);
    for (const t of tweens) {
      expect(t.x - t.target.x).toBeGreaterThanOrEqual(40);
      expect(Math.abs(t.y - t.target.y)).toBeLessThanOrEqual(3);
    }
  });

  it('keeps particles still with reduced motion', () => {
    motion.reduced = true;
    const { scene, images, tweens } = makeScene();
    new MapBackground(scene as never, 'pyramids', 3);
    expect(images.length).toBeGreaterThan(0);
    expect(tweens.length).toBe(0);
  });

  it('adds no particles on the forest map', () => {
    const { scene, images } = makeScene();
    new MapBackground(scene as never, 'forest', 3);
    expect(images.filter((i) => i.key === 'map-dot').length).toBe(0);
  });
});
