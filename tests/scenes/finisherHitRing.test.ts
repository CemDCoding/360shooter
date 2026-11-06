// Shared speedline ring of the main hit (M13, AP-194, brief H-50, decision 13a). Runs the factory in Node on a
// fake scene that records the Graphics calls.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CINEMATIC_4, MOMENT_ROOT_MONSTER } from '../../src/config/choreo/rootMonster';
import { RIGS } from '../../src/config/rigs';
import { OPACITY, THEME } from '../../src/config/theme';
import { CHOREO_DEPTH } from '../../src/scenes/finisher/context';
import { dropsWhenReduced, reduceChoreo, validateChoreo } from '../../src/logic/choreo';
import {
  BOSS_FX,
  BOSS_REF_H,
  FOREST_GHOST_REF_H,
  HIT_RING_MS,
  hitRingFx,
  ringRadius,
  type FxApi,
  type FxEvent,
} from '../../src/scenes/finisher/fx';

interface Rect {
  x: number;
  y: number;
  w: number;
  alpha: number;
  colour: number;
}
interface FakeGraphics {
  rects: Rect[];
  visible: boolean;
  x: number;
  y: number;
  depth: number;
  destroyed: boolean;
}

function makeApi(bossDepth = 21, astroDepth: number | null = 20) {
  const graphics: FakeGraphics[] = [];
  let adds = 0;
  const makeGraphics = (): unknown => {
    let alpha = 1;
    let colour = 0;
    const st: FakeGraphics = { rects: [], visible: true, x: 0, y: 0, depth: 0, destroyed: false };
    graphics.push(st);
    const g: Record<string, unknown> = {
      setDepth: (d: number) => ((st.depth = d), g),
      setVisible: (v: boolean) => ((st.visible = v), g),
      setPosition: (x: number, y: number) => ((st.x = x), (st.y = y), g),
      fillStyle: (c: number, a: number) => ((colour = c), (alpha = a), g),
      fillRect: (x: number, y: number, w: number) => {
        st.rects.push({ x, y, w, alpha, colour });
        return g;
      },
      destroy: () => {
        st.destroyed = true;
      },
    };
    return g;
  };
  const api = {
    ctx: {
      scene: {
        add: {
          graphics: () => {
            adds += 1;
            return makeGraphics();
          },
        },
      },
      addWorld: () => undefined,
      stageX: 0,
      layout: { width: 640 },
    },
    atlas: 'a',
    bossScale: 3,
    figure: (id: string) =>
      id === 'astronaut' && astroDepth !== null ? { container: { depth: astroDepth } } : null,
    boss: () => ({ container: { x: 470, y: 300, depth: bossDepth }, top: () => 100 }),
  } as unknown as FxApi;
  return { api, graphics, adds: () => adds };
}

const event = (atMs = 1000): FxEvent => ({
  kind: 'fx',
  name: 'hit-ring',
  atMs,
  durationMs: HIT_RING_MS,
  flash: false,
  reduce: 'drop',
});

const SQUASH = THEME.sizeCount['size.rig-hit-ring-squash'];

describe('shared speedline ring', () => {
  it('takes its radius from the reference height and the gap', () => {
    expect(ringRadius(BOSS_REF_H, 3)).toBe(104);
    expect(ringRadius(FOREST_GHOST_REF_H, 3)).toBe(80);
    expect(HIT_RING_MS).toBe(99);
  });

  it('draws three steps in the cream colour, the last one shorter and 0.6 see-through', () => {
    const { api, graphics } = makeApi();
    hitRingFx({ refH: BOSS_REF_H })(api, event());
    expect(graphics).toHaveLength(THEME.sizeCount['size.rig-hit-ring-steps']);
    for (const g of graphics) {
      for (const r of g.rects) expect(r.colour).toBe(THEME.colors['finisher.speedline'].num);
    }
    expect(graphics[0].rects.every((r) => r.alpha === 1)).toBe(true);
    expect(graphics[1].rects.every((r) => r.alpha === 1)).toBe(true);
    expect(graphics[2].rects.every((r) => r.alpha === OPACITY['rig-hit-ring-last'])).toBe(true);
    expect(graphics[2].rects.length).toBeLessThan(graphics[0].rects.length * 0.6);
    // The wedge is 1 px wide inside and 2 px outside.
    const widths = [...new Set(graphics[0].rects.map((r) => r.w))].sort();
    expect(widths).toEqual([
      THEME.sizePx['size.rig-hit-ring-dot-in'],
      THEME.sizePx['size.rig-hit-ring-dot-out'],
    ]);
    // Inside r0 (squashed vertically) and not further out than r0 + longest ray.
    const r0 = ringRadius(BOSS_REF_H, 3);
    const max = THEME.sizePx['size.rig-hit-ring-ray-max'];
    for (const r of graphics[0].rects) {
      const d = Math.hypot(r.x, r.y / SQUASH);
      expect(d).toBeGreaterThan(r0 - 3);
      expect(d).toBeLessThan(r0 + max + 3);
    }
    const mean = (g: FakeGraphics) =>
      g.rects.reduce((s, r) => s + Math.hypot(r.x, r.y / SQUASH), 0) / g.rects.length;
    expect(mean(graphics[1])).toBeGreaterThan(mean(graphics[0]));
  });

  it('draws the same picture for the same hit time (fixed seed, no flicker)', () => {
    const a = makeApi();
    hitRingFx({ refH: BOSS_REF_H })(a.api, event());
    const b = makeApi();
    hitRingFx({ refH: BOSS_REF_H })(b.api, event());
    expect(a.graphics[0].rects).toEqual(b.graphics[0].rects);
  });

  it('shows step by step at the hit point in front of the boss and is gone after 99 ms', () => {
    const { api, graphics } = makeApi(21);
    const inst = hitRingFx({ refH: BOSS_REF_H })(api, event());
    inst.start();
    expect([graphics[0].x, graphics[0].y]).toEqual([470, 300 - 96]);
    // Under the astronaut (20) and the boss (21), over the afterimages (16).
    expect(graphics[0].depth).toBe(19.5);
    expect(graphics[0].depth).toBeGreaterThan(CHOREO_DEPTH.afterimage);
    // Without an astronaut: just in front of the boss.
    const solo = makeApi(21, null);
    const soloInst = hitRingFx({ refH: BOSS_REF_H })(solo.api, event());
    soloInst.start();
    expect(solo.graphics[0].depth).toBe(21.5);
    const at = (t: number) => {
      inst.update(t, 16);
      return graphics.map((g) => g.visible);
    };
    expect(at(0)).toEqual([true, false, false]);
    expect(at(32)).toEqual([true, false, false]);
    expect(at(33)).toEqual([false, true, false]);
    expect(at(66)).toEqual([false, false, true]);
    expect(at(98)).toEqual([false, false, true]);
    expect(at(99)).toEqual([false, false, false]);
    expect(at(5000)).toEqual([false, false, false]);
    inst.stop();
    inst.destroy();
    expect(graphics.every((g) => g.destroyed)).toBe(true);
  });

  it('takes an own hit point and creates nothing in start or update', () => {
    const { api, graphics, adds } = makeApi();
    const inst = hitRingFx({
      refH: FOREST_GHOST_REF_H,
      centre: (_a, out) => {
        out.x = 111;
        out.y = 222;
      },
    })(api, event());
    const built = adds();
    inst.start();
    for (let t = 0; t < 150; t += 16) inst.update(t, 16);
    inst.stop();
    expect(adds()).toBe(built);
    expect([graphics[0].x, graphics[0].y]).toEqual([111, 222]);
  });

  it('is in the Rosenschnitt at the main hit with the boss white, no flash, dropped when reduced', () => {
    expect(typeof BOSS_FX.rootMonster['hit-ring']).toBe('function');
    const ring = MOMENT_ROOT_MONSTER.events.filter((e) => e.kind === 'fx' && e.name === 'hit-ring');
    expect(ring).toHaveLength(1);
    const white = MOMENT_ROOT_MONSTER.events.find((e) => e.kind === 'hitWhite');
    expect(ring[0].atMs).toBe(white?.atMs);
    expect(ring[0].atMs).toBe(1000);
    expect(ring[0].flash).toBe(false);
    expect(ring[0].durationMs).toBe(HIT_RING_MS);
    expect(dropsWhenReduced(ring[0])).toBe(true);
    const reduced = reduceChoreo(MOMENT_ROOT_MONSTER);
    expect(reduced.events.some((e) => e.kind === 'fx' && e.name === 'hit-ring')).toBe(false);
    for (const def of [MOMENT_ROOT_MONSTER, reduced, CINEMATIC_4, reduceChoreo(CINEMATIC_4)]) {
      expect(validateChoreo(def, RIGS), def.variantId).toEqual([]);
    }
  });

  it('has no ring in the cinematic', () => {
    expect(CINEMATIC_4.events.some((e) => e.kind === 'fx' && e.name === 'hit-ring')).toBe(false);
  });

  it('keeps the numbers in the tokens: no literal geometry in the module', () => {
    const src = readFileSync('src/scenes/finisher/fx/hitRing.ts', 'utf8')
      .split('\n')
      .filter(
        (l) =>
          !l.trim().startsWith('//') && !l.trim().startsWith('/**') && !l.trim().startsWith('*'),
      )
      .join('\n');
    for (const lit of ['24', '33', '99', '0\\.6', '0\\.8', '104', '36', '14']) {
      expect(src, lit).not.toMatch(new RegExp(`(?<![\\w.'-])${lit}(?![\\w.])`));
    }
  });
});
