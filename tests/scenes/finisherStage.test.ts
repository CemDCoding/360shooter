// Shared stage of the choreography player (M13, AP-195, Q-97, PE-259): `stage-world:<id>` and `letterbox`.
// Runs the player in Node on a fake scene that records the Graphics and Rectangle calls.
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import type { ChoreoDef, ChoreoEvent, FinisherPlan, FinisherStartData } from '../../src/contracts';
import { STAGES } from '../../src/config/choreo/stages';
import { CINEMATIC_4, MOMENT_ROOT_MONSTER } from '../../src/config/choreo/rootMonster';
import { RIGS } from '../../src/config/rigs';
import { THEME } from '../../src/config/theme';
import { reduceChoreo, validateChoreo } from '../../src/logic/choreo';
import { ChoreoPlayer } from '../../src/scenes/finisher/choreoPlayer';
import { CHOREO_DEPTH, type ChoreoContext } from '../../src/scenes/finisher/context';
import { BOSS_FX, STAGE_FX, findStageFx } from '../../src/scenes/finisher/fx';
import { BAR_H, finisherLayout } from '../../src/scenes/finisher/layout';
import { letterboxVisible } from '../../src/scenes/finisher/timing';
import { TextureBank } from '../../src/scenes/finisher/textures';
import stageRaw from '../../src/scenes/finisher/fx/stage.ts?raw';
import overlaysRaw from '../../src/scenes/finisher/overlays.ts?raw';

/** Source texts with LF line endings, so the checks hold in CRLF checkouts too. */
const stageSrc = stageRaw.replace(/\r\n/g, '\n');
const overlaysSrc = overlaysRaw.replace(/\r\n/g, '\n');

interface Fill {
  colour: number;
  alpha: number;
  kind: 'rect' | 'tri';
  x: number;
  y: number;
  w: number;
  h: number;
}
interface FakeG {
  kind: 'graphics';
  fills: Fill[];
  visible: boolean;
  depth: number;
  x: number;
  y: number;
  world: boolean;
  destroyed: boolean;
}
interface FakeRect {
  kind: 'rectangle';
  colour: number;
  w: number;
  h: number;
  x: number;
  y: number;
  visible: boolean;
  depth: number;
  ui: boolean;
  destroyed: boolean;
}

function makeRun(opts: { reduced?: boolean; stageX?: number; width?: number } = {}) {
  const gs: FakeG[] = [];
  const rects: FakeRect[] = [];
  const layers = new Map<unknown, 'world' | 'ui'>();
  const byObj = new Map<unknown, FakeG>();
  const graphics = (): unknown => {
    const st: FakeG = {
      kind: 'graphics',
      fills: [],
      visible: true,
      depth: 0,
      x: 0,
      y: 0,
      world: false,
      destroyed: false,
    };
    let colour = 0;
    let alpha = 1;
    gs.push(st);
    const g: Record<string, unknown> = {
      setDepth: (d: number) => ((st.depth = d), g),
      setVisible: (v: boolean) => ((st.visible = v), g),
      setPosition: (x: number, y: number) => ((st.x = x), (st.y = y), g),
      fillStyle: (c: number, a = 1) => ((colour = c), (alpha = a), g),
      fillRect: (x: number, y: number, w: number, h: number) => {
        st.fills.push({ colour, alpha, kind: 'rect', x, y, w, h });
        return g;
      },
      fillTriangle: (x0: number, y0: number, _x1: number, y1: number, x2: number) => {
        st.fills.push({ colour, alpha, kind: 'tri', x: x0, y: y1, w: x2 - x0, h: y0 - y1 });
        return g;
      },
      destroy: () => {
        st.destroyed = true;
      },
    };
    byObj.set(g, st);
    return g;
  };
  const rectangle = (x: number, y: number, w: number, h: number, colour: number): unknown => {
    const st: FakeRect = {
      kind: 'rectangle',
      colour,
      w,
      h,
      x,
      y,
      visible: true,
      depth: 0,
      ui: false,
      destroyed: false,
    };
    rects.push(st);
    const r = st as unknown as Record<string, unknown>;
    r.setOrigin = () => r;
    r.setDepth = (d: number) => ((st.depth = d), r);
    r.setVisible = (v: boolean) => ((st.visible = v), r);
    r.destroy = () => {
      st.destroyed = true;
    };
    return r;
  };
  const scene = {
    add: { graphics, rectangle },
    textures: { exists: () => false },
    cache: { bitmapFont: { exists: () => false } },
  } as unknown as Phaser.Scene;
  const plan = { stage: 4, reduced: opts.reduced ?? false } as unknown as FinisherPlan;
  const data = { plan } as unknown as FinisherStartData;
  const ctx: ChoreoContext = {
    scene,
    data,
    plan,
    layout: finisherLayout(opts.width ?? 640, 360, { top: 0, right: 0, bottom: 0, left: 0 }, true),
    webgl: false,
    stageX: opts.stageX ?? 0,
    textures: new TextureBank(scene),
    fontKey: 'font',
    playSound: () => undefined,
    addWorld: (o) => {
      layers.set(o, 'world');
      const s = byObj.get(o);
      if (s) s.world = true;
    },
    addUi: (o) => {
      layers.set(o, 'ui');
    },
  };
  const camera = { setZoom: () => camera, setScroll: () => camera };
  return { ctx, gs, rects, camera, layers };
}

const fx = (atMs: number, name: string, extra: Partial<ChoreoEvent> = {}): ChoreoEvent =>
  ({ kind: 'fx', atMs, name, flash: false, ...extra }) as ChoreoEvent;

function def(events: ChoreoEvent[], durationMs = 1000): ChoreoDef {
  return {
    variantId: 'moment-forestGhost',
    actors: [{ rigId: 'forestGhost', x: 470, y: 300 }],
    durationMs,
    tracks: [],
    events,
    beats: [],
  };
}

function play(run: ReturnType<typeof makeRun>, d: ChoreoDef, untilMs: number, dt = 16) {
  const player = new ChoreoPlayer(run.ctx, d, run.camera as never, { rigs: {}, fx: BOSS_FX });
  while (player.elapsedMs < untilMs && !player.done) player.update(dt);
  return player;
}

const BG = (w: string) => THEME.colors[`finisher.bg-${w}` as keyof typeof THEME.colors].num;

describe('stage-world', () => {
  it('draws the world of a preset once, behind everything, in the world layer, from tokens only', () => {
    const run = makeRun();
    play(run, def([fx(0, 'stage-world:forestGhost-1')]), 100);
    expect(run.gs).toHaveLength(1);
    const g = run.gs[0];
    expect(g.world).toBe(true);
    expect(g.visible).toBe(true);
    expect(g.depth).toBe(CHOREO_DEPTH.stage);
    // First fill: backdrop colour of the world, then the dark layer in ink (default 0.45 unless set).
    expect(g.fills[0]).toMatchObject({ colour: BG('night'), alpha: 1 });
    expect(g.fills[1]).toMatchObject({ colour: THEME.colors['finisher.ink'].num, alpha: 0.45 });
    // Ground colours, and only token colours in the whole picture.
    const allowed = new Set<number>([
      BG('night'),
      THEME.colors['finisher.ink'].num,
      THEME.colors['finisher.title'].num,
      THEME.colors['biome.night-ground'].num,
      THEME.colors['biome.night-ground-hi'].num,
      THEME.colors['biome.night-ground-lo'].num,
    ]);
    for (const f of g.fills) expect(allowed.has(f.colour), `colour ${f.colour}`).toBe(true);
    expect(g.fills.some((f) => f.colour === THEME.colors['biome.night-ground'].num)).toBe(true);
    // Mist with the opacity of the preset.
    expect(g.fills.some((f) => f.alpha === STAGES['forestGhost-1'].mist)).toBe(true);
  });

  it('covers the stage including room for zoom and shake', () => {
    const run = makeRun();
    play(run, def([fx(0, 'stage-world:giantStone-1')]), 50);
    const bg = run.gs[0].fills[0];
    expect(bg.x).toBeLessThanOrEqual(-400);
    expect(bg.x + bg.w).toBeGreaterThanOrEqual(1040);
    expect(bg.y).toBeLessThanOrEqual(-400);
    expect(bg.y + bg.h).toBeGreaterThanOrEqual(760);
  });

  it('moves with the stage in a wider arena and still reaches the screen edges', () => {
    const run = makeRun({ stageX: 120, width: 880 });
    play(run, def([fx(0, 'stage-world:pharaoh-1')]), 50);
    const g = run.gs[0];
    expect(g.x).toBe(120);
    const bg = g.fills[0];
    expect(g.x + bg.x).toBeLessThanOrEqual(0);
    expect(g.x + bg.x + bg.w).toBeGreaterThanOrEqual(880);
  });

  it('draws moon and sun from the preset and nothing else of them', () => {
    const run = makeRun();
    play(run, def([fx(0, 'stage-world:forestGhost-1'), fx(200, 'stage-world:pharaoh-6c')]), 300);
    const moon = run.gs[0].fills.filter(
      (f) => f.colour === THEME.colors['finisher.title'].num && f.h === 1,
    );
    const widest = Math.max(...moon.map((f) => f.w));
    expect(widest).toBeGreaterThan(20 * 2 - 2); // radius 24 disc
    expect(run.gs[0].fills.some((f) => f.colour === THEME.colors['gold.400'].num)).toBe(false);
    expect(run.gs[1].fills.some((f) => f.colour === THEME.colors['gold.400'].num)).toBe(true);
    // The sun rises: the halo is see-through.
    expect(
      run.gs[1].fills.some((f) => f.colour === THEME.colors['gold.400'].num && f.alpha < 1),
    ).toBe(true);
  });

  it('draws every world of the presets (all six silhouette kinds run without error)', () => {
    for (const id of Object.keys(STAGES)) {
      const run = makeRun();
      play(run, def([fx(0, `stage-world:${id}`)]), 20);
      expect(run.gs, id).toHaveLength(1);
      expect(run.gs[0].fills.length, id).toBeGreaterThan(60);
    }
  });

  it('draws the same picture twice (fixed seed, no flicker) and does not change it while it runs', () => {
    const a = makeRun();
    const b = makeRun();
    play(a, def([fx(0, 'stage-world:forestGhost-1b')]), 500);
    play(b, def([fx(0, 'stage-world:forestGhost-1b')]), 20);
    expect(a.gs[0].fills).toEqual(b.gs[0].fills);
  });

  it('replaces the world with a hard cut: only the last world is visible', () => {
    const run = makeRun();
    const d = def([
      fx(0, 'stage-world:forestGhost-1'),
      fx(300, 'stage-world:forestGhost-1b'),
      fx(600, 'stage-world:forestGhost-1c'),
    ]);
    const player = new ChoreoPlayer(run.ctx, d, run.camera as never, { rigs: {}, fx: BOSS_FX });
    const visible = (): number => run.gs.filter((g) => g.visible).length;
    expect(run.gs).toHaveLength(3);
    player.update(16);
    expect(visible()).toBe(1);
    while (player.elapsedMs < 350) player.update(16);
    expect(visible()).toBe(1);
    expect(run.gs[0].visible).toBe(false);
    expect(run.gs[1].visible).toBe(true);
    while (player.elapsedMs < 650) player.update(16);
    expect(run.gs.map((g) => g.visible)).toEqual([false, false, true]);
    player.destroy();
    expect(run.gs.every((g) => g.destroyed)).toBe(true);
  });

  it('shows no stage and does not fail for an unknown preset id', () => {
    const run = makeRun();
    const player = play(
      run,
      def([
        fx(0, 'stage-world:doesNotExist'),
        fx(0, 'stage-world:'),
        fx(0, 'stage-world'),
        fx(0, 'stage-world:constructor'),
      ]),
      200,
    );
    expect(run.gs).toHaveLength(0);
    expect(player.runnerCount).toBe(0);
    expect(findStageFx('stage-world:doesNotExist')).toBeNull();
    // The factory itself is safe too (a call outside the player).
    const inst = STAGE_FX['stage-world'](
      { ctx: run.ctx } as never,
      fx(0, 'stage-world:nope') as never,
    );
    expect(() => {
      inst.start();
      inst.update(0, 16);
      inst.stop();
      inst.destroy();
    }).not.toThrow();
    expect(run.gs).toHaveLength(0);
  });

  it('is found after the boss module: a boss effect of the same name wins', () => {
    const run = makeRun();
    let own = 0;
    const d = def([fx(0, 'letterbox')]);
    const player = new ChoreoPlayer(run.ctx, d, run.camera as never, {
      rigs: {},
      fx: {
        forestGhost: {
          letterbox: () => {
            own += 1;
            return { start() {}, update() {}, stop() {}, destroy() {} };
          },
        },
      },
    });
    player.update(16);
    expect(own).toBe(1);
    expect(run.rects).toHaveLength(0);
  });

  it('stays the same with "reduce effects": the world is kept and static', () => {
    const run = makeRun({ reduced: true });
    const d = def([fx(0, 'stage-world:forestGhost-1'), fx(0, 'letterbox')]);
    const reduced = reduceChoreo(d);
    expect(reduced.events).toHaveLength(2);
    play(run, reduced, 400);
    expect(run.gs).toHaveLength(1);
    expect(run.gs[0].visible).toBe(true);
    // The picture was drawn once; no more fills are added while it runs.
    expect(run.gs[0].fills.length).toBeGreaterThan(60);
  });
});

describe('letterbox', () => {
  it('makes two bars of the letterbox colour and height in the screen layer', () => {
    const run = makeRun();
    play(run, def([fx(0, 'letterbox')]), 20);
    expect(run.rects).toHaveLength(2);
    for (const r of run.rects) {
      expect(r.colour).toBe(THEME.colors['finisher.letterbox'].num);
      expect(r.h).toBe(THEME.sizePx['size.finisher-letterbox']);
      expect(r.w).toBe(640);
      expect(r.depth).toBe(CHOREO_DEPTH.bars);
    }
    expect(run.layers.get(run.rects[0])).toBe('ui');
  });

  it('slides in in three steps with the M10 mechanism and then stays', () => {
    const run = makeRun();
    const player = new ChoreoPlayer(run.ctx, def([fx(0, 'letterbox')], 2000), run.camera as never, {
      rigs: {},
      fx: BOSS_FX,
    });
    const [top, bottom] = run.rects;
    const seen: number[] = [];
    while (player.elapsedMs < 600 && !player.done) {
      player.update(8);
      const v = top.y + BAR_H;
      if (seen[seen.length - 1] !== v) seen.push(v);
      expect(v).toBe(letterboxVisible(player.elapsedMs - 0, BAR_H));
      expect(bottom.y).toBe(360 - v);
    }
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(seen[seen.length - 1]).toBe(BAR_H);
    expect(top.visible && bottom.visible).toBe(true);
  });

  it('stands at full height from the first frame with "reduce effects"', () => {
    const run = makeRun({ reduced: true });
    const player = new ChoreoPlayer(run.ctx, def([fx(0, 'letterbox')]), run.camera as never, {
      rigs: {},
      fx: BOSS_FX,
    });
    player.update(1);
    const [top, bottom] = run.rects;
    expect(top.y).toBe(0);
    expect(bottom.y).toBe(360 - BAR_H);
    expect(top.visible).toBe(true);
  });

  it('ends with its duration and is destroyed with the player', () => {
    const run = makeRun();
    const player = play(run, def([fx(0, 'letterbox', { durationMs: 300 })]), 400);
    expect(run.rects.every((r) => !r.visible)).toBe(true);
    player.destroy();
    expect(run.rects.every((r) => r.destroyed)).toBe(true);
  });
});

describe('depth order', () => {
  it('puts the world under ground, afterimages, figures and ring; bars over ring, impact and flash, under text', () => {
    const d = CHOREO_DEPTH;
    expect(d.stage).toBeLessThan(d.ground);
    expect(d.stage).toBeLessThan(d.afterimage);
    expect(d.stage).toBeLessThan(d.figure - 0.5); // figures start at 20, the ring at the astronaut - 0.5
    expect(d.bars).toBeGreaterThan(d.impact);
    expect(d.bars).toBeGreaterThan(d.flash);
    expect(d.bars).toBeGreaterThan(d.figure + 8); // far over any figure index and the ring
    expect(d.bars).toBeLessThan(d.text);
  });

  it('uses the depths in the objects it makes', () => {
    const run = makeRun();
    play(run, def([fx(0, 'stage-world:giantStone-1'), fx(0, 'letterbox')]), 20);
    expect(run.gs[0].depth).toBe(CHOREO_DEPTH.stage);
    expect(run.rects[0].depth).toBe(CHOREO_DEPTH.bars);
  });
});

describe('contract and rules', () => {
  it('uses only the existing fx event (name only) and the Canvas-safe means', () => {
    expect(stageSrc).not.toMatch(
      /setTint|preFX|postFX|setPipeline|setBlendMode|add\.(particles|rope)/,
    );
    expect(stageSrc).not.toMatch(/0x[0-9a-fA-F]{6}|#[0-9a-fA-F]{6}/);
    expect(Object.keys(STAGE_FX).sort()).toEqual(['letterbox', 'stage-world']);
  });

  it('makes nothing new in the update of the effects', () => {
    // `update` of the world is empty, that of the bars only calls `set` with a number.
    expect(stageSrc).toMatch(/update\(\) \{\},\n\s+stop\(\) \{\n\s+me\.hide/);
    const bars = stageSrc.slice(
      stageSrc.indexOf('update(since)'),
      stageSrc.indexOf('stop() {', stageSrc.indexOf('update(since)')),
    );
    expect(bars).not.toMatch(/new |\.add\.|=>|\[|\{\s*\w+:/);
  });

  it('keeps overlays.ts and the M10 letterbox as they are (imported, not changed)', () => {
    expect(overlaysSrc).toContain('letterboxVisible');
    expect(stageSrc).toContain("from '../timing'");
    expect(stageSrc).not.toContain('overlays');
  });

  it('leaves the validation of the rootMonster choreographies unchanged', () => {
    for (const def of [MOMENT_ROOT_MONSTER, CINEMATIC_4]) {
      expect(validateChoreo(def, RIGS)).toEqual([]);
      expect(validateChoreo(reduceChoreo(def), RIGS)).toEqual([]);
    }
  });

  it('does not count the stage as a flash', () => {
    const d = def([fx(0, 'stage-world:forestGhost-1'), fx(0, 'letterbox')]);
    expect(d.events.every((e) => e.kind === 'fx' && !e.flash)).toBe(true);
  });
});
