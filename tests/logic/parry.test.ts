import { describe, expect, it } from 'vitest';
import { BOSSES } from '../../src/config/bosses';
import { PARRY_RULES } from '../../src/config/parry';
import type { ParryPatternDef } from '../../src/contracts';
import { createRng } from '../../src/logic/rng';
import {
  dropCircle,
  expireCircles,
  gradeTap,
  hitCircle,
  hitTarget,
  isRealCircle,
  planCircles,
  pressCircle,
  releaseCircle,
  ringState,
  resolveParry,
  tapCircle,
  tapTarget,
  targetPosition,
  type ParryCircleState,
} from '../../src/logic/parry';

const c = { index: 0, angleDeg: 0, hitAtMs: 1000 };

describe('planCircles', () => {
  it('is deterministic for a fixed seed', () => {
    expect(planCircles(3, 1200, createRng(7))).toEqual(planCircles(3, 1200, createRng(7)));
  });
  it('returns no circles for count 0', () => {
    expect(planCircles(0, 1200, createRng(1))).toEqual([]);
  });
  it('keeps order, gap, last window and spread angles', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [1, 2, 3]) {
        const cs = planCircles(n, 1200, createRng(seed));
        expect(cs).toHaveLength(n);
        for (let i = 1; i < n; i++) {
          expect(cs[i].hitAtMs - cs[i - 1].hitAtMs).toBeGreaterThanOrEqual(PARRY_RULES.minGapMs);
          const da = Math.abs(cs[i].angleDeg - cs[i - 1].angleDeg) % 360;
          expect(Math.min(da, 360 - da)).toBeGreaterThan(40);
        }
        expect(cs[n - 1].hitAtMs).toBeLessThanOrEqual(1200 - PARRY_RULES.goodWindowMs);
        expect(cs[0].hitAtMs).toBeGreaterThan(0);
        expect(cs.every((x) => x.result === null)).toBe(true);
      }
    }
  });
});

describe('gradeTap', () => {
  it.each([
    [80, 'perfect'],
    [81, 'good'],
    [160, 'good'],
    [161, 'miss'],
  ])('offset %i ms -> %s', (d, grade) => {
    expect(gradeTap(c, c.hitAtMs + d)).toBe(grade);
    expect(gradeTap(c, c.hitAtMs - d)).toBe(grade);
  });
});

describe('hitCircle', () => {
  const center = { x: 100, y: 100 };
  const circles = [{ ...c, result: null }];
  const d = PARRY_RULES.distanceFromPlayerPx;
  it('hits inside radius plus tolerance', () => {
    expect(hitCircle(circles, { x: 100 + d + 24, y: 100 }, center)).not.toBeNull();
  });
  it('misses just outside (25 px)', () => {
    expect(hitCircle(circles, { x: 100 + d + 25, y: 100 }, center)).toBeNull();
  });
  it('misses outside', () => {
    expect(hitCircle(circles, { x: 100 + d + 40, y: 100 }, center)).toBeNull();
  });
  it('ignores resolved circles', () => {
    expect(hitCircle([{ ...c, result: 'miss' }], { x: 100 + d, y: 100 }, center)).toBeNull();
  });
});

describe('ringState', () => {
  const r = PARRY_RULES;
  const k = { index: 0, angleDeg: 0, hitAtMs: 1500 };
  it('is hidden before appearing', () => {
    expect(ringState(k, 1500 - r.approachMs - 1).visible).toBe(false);
  });
  it('starts at ringStartScale', () => {
    expect(ringState(k, 1500 - r.approachMs)).toEqual({ visible: true, scale: r.ringStartScale });
  });
  it('shrinks linearly to the middle', () => {
    const s = ringState(k, 1500 - r.approachMs / 2);
    expect(s.visible).toBe(true);
    expect(s.scale).toBeCloseTo((r.ringStartScale + 1) / 2);
  });
  it('is 1 exactly at hitAtMs and hidden afterwards', () => {
    expect(ringState(k, 1500)).toEqual({ visible: true, scale: 1 });
    expect(ringState(k, 1501).visible).toBe(false);
  });
  it('starts at 0 for early circles (shorter approach, faster ring)', () => {
    const e = { index: 0, angleDeg: 0, hitAtMs: 400 };
    expect(ringState(e, -1).visible).toBe(false);
    expect(ringState(e, 0)).toEqual({ visible: true, scale: r.ringStartScale });
    expect(ringState(e, 200).scale).toBeCloseTo((r.ringStartScale + 1) / 2);
  });
});

describe('tap and expire', () => {
  const open = [{ ...c, result: null }];
  it('grades only once', () => {
    const a = tapCircle(open, 0, 1000);
    expect(a[0].result).toBe('perfect');
    expect(tapCircle(a, 0, 1150)[0].result).toBe('perfect');
  });
  it('expires after hitAtMs + goodWindowMs', () => {
    expect(expireCircles(open, 1160)[0].result).toBeNull();
    expect(expireCircles(open, 1161)[0].result).toBe('miss');
  });
  it('does not overwrite graded circles', () => {
    expect(expireCircles(tapCircle(open, 0, 1000), 5000)[0].result).toBe('perfect');
  });
});

describe('resolveParry', () => {
  it('all hit', () => {
    expect(resolveParry(['perfect', 'good', 'perfect'])).toEqual({
      blocked: true,
      damageFactor: 0,
      perfectCount: 2,
    });
  });
  it('none hit', () => {
    expect(resolveParry(['miss', null, 'miss'])).toEqual({
      blocked: false,
      damageFactor: 1,
      perfectCount: 0,
    });
  });
  it('thirds', () => {
    expect(resolveParry(['good', 'miss', 'perfect']).damageFactor).toBeCloseTo(1 / 3);
    expect(resolveParry(['good', null, 'miss']).damageFactor).toBeCloseTo(2 / 3);
  });
});

// ---------------------------------------------------------------------------------------------
// M9 building blocks (AP-149, RS-03.1, RS-03.2, PE-188, PE-189)
// ---------------------------------------------------------------------------------------------

const R = PARRY_RULES;
const allAttacks = Object.values(BOSSES).flatMap((b) => b.attacks);
const patterned = allAttacks.filter((a) => a.damage > 0 && a.parryCircles > 0);
const attack = (id: string) => {
  const a = allAttacks.find((x) => x.id === id);
  if (!a) throw new Error(`missing attack ${id}`);
  return a;
};

const open = (over: Partial<ParryCircleState>): ParryCircleState => ({
  index: 0,
  angleDeg: 0,
  hitAtMs: 1000,
  result: null,
  ...over,
});

const angleGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

describe('planCircles with patterns', () => {
  const minDeg =
    (2 * Math.asin((R.circleRadiusPx + R.touchSlackPx) / R.distanceFromPlayerPx) * 180) / Math.PI;

  it('accepts the attack and plans parryCircles x tap without pattern', () => {
    const cs = planCircles({ parryCircles: 3 }, 1200, createRng(4));
    expect(cs).toHaveLength(3);
    expect(cs.every((x) => x.kind === 'tap')).toBe(true);
  });

  it('gives the same circles for a fixed seed', () => {
    for (const a of patterned) {
      expect(planCircles(a, a.telegraphMs, createRng(11))).toEqual(
        planCircles(a, a.telegraphMs, createRng(11)),
      );
    }
  });

  it('keeps the real circle count, also in easy mode', () => {
    for (const a of patterned) {
      for (const easy of [false, true]) {
        const cs = planCircles(a, a.telegraphMs, createRng(3), R, easy);
        expect(cs.filter(isRealCircle)).toHaveLength(a.parryCircles);
      }
    }
  });

  it('every task fits into the announcement, angles never overlap (all attacks, many seeds)', () => {
    for (const a of patterned) {
      for (const easy of [false, true]) {
        for (let seed = 1; seed <= 60; seed++) {
          const cs = planCircles(a, a.telegraphMs, createRng(seed), R, easy);
          for (const x of cs) {
            expect(x.hitAtMs).toBeGreaterThanOrEqual(R.goodWindowMs);
            expect((x.releaseAtMs ?? x.hitAtMs) + R.goodWindowMs).toBeLessThanOrEqual(
              a.telegraphMs,
            );
            expect(x.angleDeg).toBeGreaterThanOrEqual(0);
            expect(x.angleDeg).toBeLessThan(360);
          }
          for (let i = 0; i < cs.length; i++)
            for (let j = i + 1; j < cs.length; j++)
              expect(angleGap(cs[i].angleDeg, cs[j].angleDeg)).toBeGreaterThanOrEqual(
                minDeg - 1e-9,
              );
          // Separate slots keep at least minGapMs between their hit times.
          const times = [...new Set(cs.map((x) => x.hitAtMs))].sort((p, q) => p - q);
          for (let i = 1; i < times.length; i++)
            expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(R.minGapMs - 1e-9);
        }
      }
    }
  });

  it('hold: releaseAtMs = hitAtMs + holdMs within holdMinMs..holdMaxMs', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const id of ['rootThrust', 'roll']) {
        const hold = planCircles(attack(id), attack(id).telegraphMs, createRng(seed)).find(
          (x) => x.kind === 'hold',
        );
        expect(hold).toBeDefined();
        const d = (hold?.releaseAtMs ?? 0) - (hold?.hitAtMs ?? 0);
        expect(d).toBeGreaterThanOrEqual(R.holdMinMs);
        expect(d).toBeLessThanOrEqual(R.holdMaxMs);
      }
    }
    const p: ParryPatternDef = { steps: [{ kind: 'hold', holdMs: 5000 }] };
    const [h] = planCircles({ parryCircles: 1, parryPattern: p }, 3000, createRng(1));
    expect((h.releaseAtMs ?? 0) - h.hitAtMs).toBe(R.holdMaxMs);
  });

  it('sequence: order from 1, preview steps from the start, hit times minGapMs apart', () => {
    const cs = planCircles(attack('orbFan'), attack('orbFan').telegraphMs, createRng(5));
    expect(cs.map((x) => x.order)).toEqual([1, 2]);
    expect(cs.map((x) => x.previewAtMs)).toEqual([0, R.previewStepMs]);
    expect(cs[1].hitAtMs - cs[0].hitAtMs).toBeCloseTo(R.minGapMs);
  });

  it('beat: hit times exactly beatMs apart', () => {
    const cs = planCircles(attack('guardBark'), attack('guardBark').telegraphMs, createRng(5));
    expect(cs).toHaveLength(3);
    expect(cs[1].hitAtMs - cs[0].hitAtMs).toBeCloseTo(R.beatMs);
    expect(cs[2].hitAtMs - cs[1].hitAtMs).toBeCloseTo(R.beatMs);
  });

  it('drag: target outwards at dragTargetDistancePx from the circle', () => {
    const center = { x: 0, y: 0 };
    for (const x of planCircles(attack('coil'), attack('coil').telegraphMs, createRng(8))) {
      expect(x.kind).toBe('drag');
      const t = targetPosition(x, center);
      const rad = (x.angleDeg * Math.PI) / 180;
      const px = Math.cos(rad) * R.distanceFromPlayerPx;
      const py = Math.sin(rad) * R.distanceFromPlayerPx;
      expect(Math.hypot((t?.x ?? 0) - px, (t?.y ?? 0) - py)).toBeCloseTo(R.dragTargetDistancePx);
    }
  });

  it('choice: one round shares hitAtMs, one right circle per round, symbol order varies', () => {
    const hs = planCircles(attack('heartScale'), attack('heartScale').telegraphMs, createRng(2));
    expect(hs).toHaveLength(4);
    for (const g of [1, 2]) {
      const round = hs.filter((x) => x.group === g);
      expect(round).toHaveLength(2);
      expect(round[0].hitAtMs).toBe(round[1].hitAtMs);
      expect(round.filter((x) => x.correct)).toHaveLength(1);
      expect(round.find((x) => x.correct)?.symbol).toBe('feather');
    }
    const orders = new Set<string>();
    const rights = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const gc = planCircles(attack('goldCurse'), attack('goldCurse').telegraphMs, createRng(seed));
      expect(gc).toHaveLength(3);
      expect(gc.filter((x) => x.correct)).toHaveLength(1);
      expect(new Set(gc.map((x) => x.hitAtMs)).size).toBe(1);
      orders.add(gc.map((x) => x.symbol).join());
      rights.add(gc.find((x) => x.correct)?.symbol ?? '');
    }
    expect(orders.size).toBeGreaterThan(1);
    expect(rights).toEqual(new Set(['legs4', 'legs2', 'legs3']));
  });

  it('decoy: gets a hit time like a real circle', () => {
    const cs = planCircles(attack('rootRing'), attack('rootRing').telegraphMs, createRng(9));
    const decoy = cs.find((x) => x.kind === 'decoy');
    expect(decoy?.hitAtMs).toBeGreaterThan(0);
    expect(cs.filter(isRealCircle)).toHaveLength(2);
  });

  it('easy mode: only taps, no decoys, only the right choice', () => {
    for (const a of patterned) {
      const cs = planCircles(a, a.telegraphMs, createRng(6), R, true);
      expect(cs.every((x) => x.kind === 'tap')).toBe(true);
      expect(cs).toHaveLength(a.parryCircles);
      expect(cs.every((x) => x.order === undefined && x.releaseAtMs === undefined)).toBe(true);
    }
    const hs = planCircles(attack('heartScale'), 1800, createRng(1), R, true);
    expect(hs.map((x) => x.symbol)).toEqual(['feather', 'feather']);
  });
});

describe('hold', () => {
  const h = open({ kind: 'hold', hitAtMs: 1000, releaseAtMs: 1450 });

  it('press and release in time: worse of both grades', () => {
    let cs = pressCircle([h], 0, 1000);
    expect(cs[0].result).toBeNull();
    expect(cs[0].holding).toBe(true);
    expect(releaseCircle(cs, 0, 1450)[0].result).toBe('perfect');
    expect(releaseCircle(cs, 0, 1450 + 81)[0].result).toBe('good');
    expect(releaseCircle(cs, 0, 1450 + 161)[0].result).toBe('miss');
    cs = pressCircle([h], 0, 1000 - 150);
    expect(releaseCircle(cs, 0, 1450)[0].result).toBe('good');
  });

  it('a missed press misses at once', () => {
    expect(pressCircle([h], 0, 1000 - 161)[0].result).toBe('miss');
  });

  it('hold too long: expires as missed after releaseAtMs + goodWindowMs', () => {
    const cs = pressCircle([h], 0, 1000);
    expect(expireCircles(cs, 1450 + 160)[0].result).toBeNull();
    expect(expireCircles(cs, 1450 + 161)[0].result).toBe('miss');
  });

  it('hold too short: stays open for a second tap, otherwise missed', () => {
    const cs = releaseCircle(pressCircle([h], 0, 1000), 0, 1100);
    expect(cs[0].result).toBeNull();
    expect(cs[0].holding).toBe(false);
    expect(expireCircles(cs, 1000 + R.twoTapMaxGapMs + 1)[0].result).toBe('miss');
  });

  it('two taps: the second tap within twoTapMaxGapMs counts as the release', () => {
    const first = releaseCircle(pressCircle([h], 0, 1000), 0, 1030);
    expect(pressCircle(first, 0, 1450)[0].result).toBe('perfect');
    expect(pressCircle(first, 0, 1450 - 120)[0].result).toBe('good');
    expect(pressCircle(first, 0, 1450 - 200)[0].result).toBe('miss');
  });

  it('two taps: a second tap after twoTapMaxGapMs is missed', () => {
    const long = open({ kind: 'hold', hitAtMs: 1000, releaseAtMs: 1600 });
    const first = releaseCircle(pressCircle([long], 0, 1000 - 150), 0, 900);
    expect(pressCircle(first, 0, 1000 - 150 + R.twoTapMaxGapMs)[0].result).toBe('good');
    expect(pressCircle(first, 0, 1000 - 150 + R.twoTapMaxGapMs + 1)[0].result).toBe('miss');
  });

  it('release on other kinds changes nothing', () => {
    const t = [open({})];
    expect(releaseCircle(t, 0, 1000)).toEqual(t);
  });
});

describe('drag', () => {
  const center = { x: 100, y: 100 };
  const target = { angleDeg: 0, distancePx: R.distanceFromPlayerPx + R.dragTargetDistancePx };
  const d = open({ kind: 'drag', target });
  const tx = 100 + target.distancePx;

  it('drop inside the target: perfect until hitAtMs + perfectWindowMs, good until + goodWindowMs', () => {
    const picked = pressCircle([d], 0, 600);
    expect(picked[0].pressedAtMs).toBe(600);
    expect(dropCircle(picked, 0, { x: tx, y: 100 }, center, 700)[0].result).toBe('perfect');
    expect(dropCircle(picked, 0, { x: tx, y: 100 }, center, 1080)[0].result).toBe('perfect');
    expect(dropCircle(picked, 0, { x: tx, y: 100 }, center, 1081)[0].result).toBe('good');
    expect(dropCircle(picked, 0, { x: tx, y: 100 }, center, 1160)[0].result).toBe('good');
    expect(dropCircle(picked, 0, { x: tx, y: 100 }, center, 1161)[0].result).toBe('miss');
  });

  it('drop just outside the target: circle goes back and stays open', () => {
    const picked = pressCircle([d], 0, 600);
    const edge = dropCircle(picked, 0, { x: tx + R.dragTargetRadiusPx, y: 100 }, center, 900);
    expect(edge[0].result).toBe('perfect');
    const out = dropCircle(picked, 0, { x: tx + R.dragTargetRadiusPx + 1, y: 100 }, center, 900);
    expect(out[0].result).toBeNull();
    expect(out[0].pressedAtMs).toBeUndefined();
    expect(expireCircles(out, 1161)[0].result).toBe('miss');
  });

  it('replacement: tap the circle, then tap the target', () => {
    expect(hitTarget([d], { x: tx, y: 100 }, center)).toBeNull();
    expect(tapTarget([d], { x: tx, y: 100 }, center, 900)[0].result).toBeNull();
    const picked = tapCircle([d], 0, 800);
    expect(hitTarget(picked, { x: tx, y: 100 }, center)?.index).toBe(0);
    expect(tapTarget(picked, { x: tx, y: 100 }, center, 900)[0].result).toBe('perfect');
    expect(tapTarget(picked, { x: tx + 30, y: 100 }, center, 900)[0].result).toBeNull();
  });
});

describe('sequence', () => {
  const seq = [
    open({ index: 0, kind: 'sequence', order: 1, hitAtMs: 1000 }),
    open({ index: 1, kind: 'sequence', order: 2, hitAtMs: 1300, angleDeg: 90 }),
  ];
  it('right order is graded by time', () => {
    const cs = pressCircle(pressCircle(seq, 0, 1000), 1, 1300);
    expect(cs.map((x) => x.result)).toEqual(['perfect', 'perfect']);
  });
  it('wrong order misses this circle, the skipped one stays open', () => {
    const cs = pressCircle(seq, 1, 1300);
    expect(cs.map((x) => x.result)).toEqual([null, 'miss']);
    expect(pressCircle(cs, 0, 1000)[0].result).toBe('perfect');
  });
  it('an expired earlier circle does not block the next one', () => {
    const cs = expireCircles(seq, 1161);
    expect(pressCircle(cs, 1, 1300)[1].result).toBe('perfect');
  });
});

describe('choice', () => {
  const round = [
    open({ index: 0, kind: 'choice', group: 1, correct: false, symbol: 'heart' }),
    open({ index: 1, kind: 'choice', group: 1, correct: true, symbol: 'feather', angleDeg: 90 }),
    open({ index: 2, kind: 'choice', group: 2, correct: true, hitAtMs: 1400, angleDeg: 180 }),
  ];
  it('right circle in time: round hit and closed', () => {
    const cs = pressCircle(round, 1, 1050);
    expect(cs.map((x) => x.result)).toEqual(['perfect', 'perfect', null]);
    expect(resolveParry(cs).damageFactor).toBeCloseTo(1 / 2);
  });
  it('wrong circle: round missed and closed, other round untouched', () => {
    const cs = pressCircle(round, 0, 1000);
    expect(cs.map((x) => x.result)).toEqual(['miss', 'miss', null]);
    expect(cs[0].tapped).toBe(true);
    expect(pressCircle(cs, 1, 1000)).toEqual(cs);
  });
  it('right circle out of window misses the round', () => {
    expect(pressCircle(round, 1, 1161).map((x) => x.result)).toEqual(['miss', 'miss', null]);
  });
});

describe('decoy and beat', () => {
  it('tapping a decoy is a penalty, it disappears', () => {
    const cs = pressCircle([open({ kind: 'decoy' })], 0, 200);
    expect(cs[0].result).toBe('miss');
    expect(cs[0].tapped).toBe(true);
  });
  it('an untouched decoy expires as avoided', () => {
    const cs = expireCircles([open({ kind: 'decoy' })], 1161);
    expect(cs[0].result).toBe('perfect');
    expect(cs[0].tapped).toBeUndefined();
  });
  it('beat is graded like tap', () => {
    const b = [open({ kind: 'beat' })];
    expect(pressCircle(b, 0, 1081)[0].result).toBe('good');
    expect(pressCircle(b, 0, 1161)[0].result).toBe('miss');
  });
});

describe('resolveParry with circles', () => {
  const real = (result: ParryCircleState['result'], index: number) => open({ index, result });
  const decoy = (tapped: boolean, index: number) =>
    open({
      index,
      kind: 'decoy',
      result: tapped ? 'miss' : 'perfect',
      ...(tapped ? { tapped } : {}),
    });

  it('all hit, no decoy tapped: blocked', () => {
    expect(resolveParry([real('perfect', 0), real('good', 1), decoy(false, 2)])).toEqual({
      blocked: true,
      damageFactor: 0,
      perfectCount: 1,
    });
  });
  it('a tapped decoy costs damage / circle count and prevents blocked', () => {
    const r = resolveParry([real('perfect', 0), real('good', 1), decoy(true, 2)]);
    expect(r.blocked).toBe(false);
    expect(r.damageFactor).toBeCloseTo(1 / 2);
  });
  it('penalties together are capped at the full damage', () => {
    expect(resolveParry([real('miss', 0), decoy(true, 1), decoy(true, 2)]).damageFactor).toBe(1);
  });
  it('open real circles count as missed, open decoys do not cost anything', () => {
    const r = resolveParry([real(null, 0), real('perfect', 1), open({ index: 2, kind: 'decoy' })]);
    expect(r.damageFactor).toBeCloseTo(1 / 2);
  });
  it('wrong choice circles do not count', () => {
    const r = resolveParry([
      open({ index: 0, kind: 'choice', group: 0, correct: true, result: 'good' }),
      open({ index: 1, kind: 'choice', group: 0, correct: false, result: 'good' }),
    ]);
    expect(r).toEqual({ blocked: true, damageFactor: 0, perfectCount: 0 });
  });
  it('empty list blocks without damage', () => {
    expect(resolveParry([])).toEqual({ blocked: true, damageFactor: 0, perfectCount: 0 });
  });
});
