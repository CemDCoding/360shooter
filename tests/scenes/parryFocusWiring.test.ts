import { describe, expect, it, vi } from 'vitest';
import type { ParryGroup, ParryOutcome } from '../../src/entities/bosses/hazards';
import overlaySrc from '../../src/entities/ParryOverlay.ts?raw';
import gameSrc from '../../src/scenes/GameScene.ts?raw';
import parryLogicSrc from '../../src/logic/parry.ts?raw';

// AP-173: the quicktime focus as a query of the overlay (Q-77 (a)), its wiring in the round and the rank 4
// opacity hooks. ParryOverlay.ts imports Phaser for drawing only; the display state is pure.
vi.mock('phaser', () => ({ default: {} }));

const { ParryViewState } = await import('../../src/entities/ParryOverlay');
const { PARRY_RULES, PARRY_FOCUS } = await import('../../src/config/parry');
const { THEME } = await import('../../src/config/theme');
const { createFocusView } = await import('../../src/logic/effectRank');
const { PetCompanion } = await import('../../src/entities/pets/PetCompanion');
const { getPet } = await import('../../src/config/pets');

const FEEDBACK = THEME.motionMs['motion.parry-feedback'];
const norm = (s: string): string => s.replace(/\r\n/g, '\n');

function group(id: number, results: (null | 'perfect' | 'good' | 'miss')[]): ParryGroup {
  return {
    id,
    attackId: 'roll',
    elapsedMs: 0,
    circles: results.map((result, index) => ({
      index,
      angleDeg: index * 120,
      hitAtMs: 500 + index * 300,
      result,
    })),
  };
}

function outcome(g: ParryGroup): ParryOutcome {
  return { group: g, blocked: true, damageFactor: 0, perfectCount: 0 };
}

/** One overlay frame as ParryOverlay.update runs it (advance, sync, focus). */
function frame(s: InstanceType<typeof ParryViewState>, dt: number, groups: ParryGroup[]): boolean {
  s.advance(dt);
  s.sync(groups);
  s.tickFocus(dt);
  return s.focused;
}

describe('quicktime focus of the overlay (query, Q-77 (a))', () => {
  it('on from the announcement, off focus-hold after the feedback of the last circle', () => {
    const s = new ParryViewState();
    expect(frame(s, 16, [])).toBe(false);
    const g = group(1, [null]);
    expect(frame(s, 16, [g])).toBe(true);
    for (let t = 0; t < 1200; t += 16) frame(s, 16, [g]);
    s.finish(outcome(g));
    // Feedback runs FEEDBACK ms: still on.
    let t = 0;
    while (!s.isEmpty || t < FEEDBACK) {
      expect(frame(s, 16, [])).toBe(true);
      t += 16;
      if (t > 5000) break;
    }
    // Then the hold, then off.
    let off = 0;
    while (frame(s, 16, [])) off += 16;
    expect(off).toBeLessThanOrEqual(PARRY_FOCUS.holdMs + 16);
  });

  it('stays on between circles that follow within focus-hold', () => {
    const s = new ParryViewState();
    const a = group(1, [null]);
    for (let t = 0; t < 1200; t += 16) frame(s, 16, [a]);
    s.finish(outcome(a));
    for (let t = 0; t < FEEDBACK + 300; t += 16) expect(frame(s, 16, [])).toBe(true);
    const b = group(2, [null]);
    for (let t = 0; t < 500; t += 16) expect(frame(s, 16, [b])).toBe(true);
  });

  it('clear() (boss death, round end) ends the focus at once', () => {
    const s = new ParryViewState();
    frame(s, 16, [group(1, [null])]);
    expect(s.focused).toBe(true);
    s.clear();
    expect(s.focused).toBe(false);
    expect(frame(s, 16, [])).toBe(false);
  });

  it('stands still without play time (pause)', () => {
    const s = new ParryViewState();
    const g = group(1, [null]);
    for (let t = 0; t < 1200; t += 16) frame(s, 16, [g]);
    s.finish(outcome(g));
    for (let i = 0; i < 100; i++) expect(frame(s, 0, [])).toBe(true);
  });
});

describe('focus wiring in the round (AP-173)', () => {
  const g = norm(gameSrc);
  const body = (from: string, to: string) => g.slice(g.indexOf(from), g.indexOf(to));

  it('the scene asks the overlay every frame; no event', () => {
    expect(g).toContain('this.parryOverlay?.focused');
    expect(g).toMatch(/this\.updateFocus\(dt\);/);
    expect(norm(overlaySrc)).toContain('get focused(): boolean');
    expect(norm(overlaySrc)).not.toMatch(/emit\([^)]*focus/i);
  });

  it('creates exactly one ink layer with the token colour over the floor, once in create()', () => {
    expect(g.match(/FOCUS_DIM_DEPTH/g)?.length).toBe(2);
    expect(g).toContain('themeColor(PARRY_FOCUS.dimColor)');
    const create = body('  create(): void {', 'private readonly sendHudStartState');
    expect(create).toContain('this.focusDim = this.add');
    expect(create.indexOf('new MapBackground')).toBeLessThan(create.indexOf('this.focusDim'));
  });

  it('only sets opacity per frame: no new objects in updateFocus', () => {
    const update = body('private updateFocus(', 'private endFocus(');
    expect(update.length).toBeGreaterThan(100);
    expect(update).not.toMatch(/this\.add\.|new [A-Z]|\.play\(/);
    expect(update).toContain('dimAlpha(level)');
    for (const hook of [
      'this.armourRing?.setEffectAlpha',
      'this.gearOverlay?.setEffectAlpha',
      'this.pet?.setEffectAlpha',
      'this.lasers.setEffectAlpha',
      'coin.setEffectAlpha',
    ])
      expect(update).toContain(hook);
  });

  it('uses reduced motion and "EFFEKTE REDUZIEREN" (read again after the pause)', () => {
    expect(g).toContain(
      'this.focusFade.step(this.parryOverlay?.focused === true, dt, this.reducedMotion)',
    );
    expect(g).toContain('this.focusView.reduce = save.reduceEffects === true');
    expect(g).toContain('Phaser.Scenes.Events.RESUME, this.onResume');
    expect(body('private onResume(', 'private updateParry(')).toContain('loadSave().reduceEffects');
  });

  it('ends the focus at the round end and on boss death', () => {
    const end = body('private endRound(', 'private startFinisher(');
    expect(end).toContain('this.parryOverlay?.clear()');
    expect(end).toContain('this.endFocus()');
    expect(body('private onBossDefeated(', 'private updateBoss(')).toContain(
      'this.parryOverlay?.clear()',
    );
  });

  it('no new particles near the astronaut in focus (lava boots blast)', () => {
    expect(body('private updateBlasts(', 'private applyBurnDamage(')).toContain(
      'allowsNewParticle(this.focusView, x, y)',
    );
  });
});

describe('keylines on all five circle parts (brief H-41 3a)', () => {
  const o = norm(overlaySrc);
  const method = (name: string) => {
    const at = o.indexOf(`  private ${name}(`);
    return o.slice(at, o.indexOf('\n  }\n', at));
  };

  it('circle, approach ring and hold ring draw ink on both sides', () => {
    expect(method('disc')).toContain('this.ringKeylines(cx, cy, RADIUS)');
    expect(method('drawOpen')).toContain('this.ringKeylines(cx, cy, outerR)');
    expect(method('holdRing')).toContain(
      "this.ringKeylines(cx, cy, THEME.sizePx['size.parry-hold-r'])",
    );
    const rk = method('ringKeylines');
    expect(rk).toContain('themeColor(KEYLINE_COLOR)');
    expect(rk).toContain('k.outer');
    expect(rk).toContain('k.inner');
  });

  it('the decoy edge and the target brackets get ink as well', () => {
    expect(method('decoyEdge')).toContain('KEYLINE_OFFSETS');
    expect(method('decoyEdge')).toContain('fill: true');
    expect(method('drawTarget')).toContain('keylineRect(r)');
    expect(o.match(/this\.decoyEdge\(/g)?.length).toBe(3);
    expect(o).not.toMatch(
      /this\.image\(`\$\{key\}:edge`, used, DECOY_EDGE_SHEET, DECOY_(EDGE|BROKEN)_FRAME, cx, cy, \{\n/,
    );
    expect(o).toContain("const KEYLINE_COLOR: ColorName = 'game.parry-keyline'");
  });
});

describe('times and grading of the circles stay unchanged (PE-158)', () => {
  it('PARRY_RULES keep their values', () => {
    expect(PARRY_RULES).toEqual({
      perfectWindowMs: 80,
      goodWindowMs: 160,
      circleRadiusPx: 20,
      ringStartScale: 2.5,
      distanceFromPlayerPx: 56,
      approachMs: 800,
      touchSlackPx: 4,
      minGapMs: 300,
      holdMinMs: 300,
      holdMaxMs: 600,
      beatMs: 400,
      previewStepMs: 300,
      dragTargetRadiusPx: 24,
      dragTargetDistancePx: 56,
      twoTapMaxGapMs: 700,
      seqTelegraphMinMs: 1800,
    });
  });

  it('the grading logic does not know the focus', () => {
    expect(norm(parryLogicSrc)).not.toMatch(/focus|effectRank/i);
  });
});

describe('pet opacity hook (rank 4)', () => {
  interface Obj {
    key: string;
    x: number;
    y: number;
    alpha: number;
    type: string;
    scene: unknown;
    [k: string]: unknown;
  }
  function fakeScene() {
    const objects: Obj[] = [];
    const make = (type: string, key: string, x: number, y: number): Obj => {
      const o: Obj = { key, x, y, alpha: 1, type, scene: {} };
      const proxy: Obj = new Proxy(o, {
        get(t, p: string) {
          if (p in t) return t[p];
          if (p === 'setAlpha')
            return (a: number) => ((t.alpha = Math.min(1, Math.max(0, a))), proxy);
          if (p === 'destroy') return () => ((t.scene = undefined), undefined);
          if (p === 'setPosition')
            return (nx: number, ny: number) => ((t.x = nx), (t.y = ny), proxy);
          if (p === 'texture') return { key: t.key };
          if (p === 'frame') return { name: 0 };
          return () => proxy;
        },
      });
      objects.push(proxy);
      return proxy;
    };
    const scene = {
      textures: { exists: () => true },
      anims: { exists: () => false, create: () => undefined, generateFrameNumbers: () => [] },
      add: {
        sprite: (x: number, y: number, key: string) => make('Sprite', key, x, y),
        graphics: () => make('Graphics', 'g', 0, 0),
      },
    };
    return { scene: scene as never, objects };
  }

  it('fades every object egg and pet create, and restores their own opacity', () => {
    const { scene, objects } = fakeScene();
    const player = { x: 320, y: 180, flipX: false, depth: 10 };
    const c = new PetCompanion(scene, getPet('penguin'), null, player);
    const egg = objects.find((x) => x.key === 'egg-penguin');
    expect(egg).toBeDefined();
    const view = createFocusView();
    view.x = egg?.x ?? 0;
    view.y = egg?.y ?? 0;
    view.level = 1;
    c.setEffectAlpha(view);
    expect(egg?.alpha).toBeCloseTo(PARRY_FOCUS.lowNear);
    // Unchanged frame: no compounding.
    c.setEffectAlpha(view);
    expect(egg?.alpha).toBeCloseTo(PARRY_FOCUS.lowNear);
    view.level = 0;
    c.setEffectAlpha(view);
    expect(egg?.alpha).toBe(1);
    view.reduce = true;
    c.setEffectAlpha(view);
    expect(egg?.alpha).toBeCloseTo(PARRY_FOCUS.lowReduced);
    c.destroy();
  });
});
