import { describe, expect, it } from 'vitest';
import { BOSS_TUNING } from '../../src/config/bosses';
import { PARRY_RULES } from '../../src/config/parry';
import {
  angleDegOf,
  boxDistance,
  boxFits,
  clashDistance,
  coilAnchors,
  coilAngles,
  deltaDeg,
  fitDistance,
  normDeg,
  polarPoint,
  quarrelAnchors,
  safeZone,
  spacingDeg,
  spreadAngles,
  type DragAnchor,
  type DragAnchorOptions,
  type Point,
  type SafeZone,
} from '../../src/entities/bosses/bossGeometry';

// AP-154: anchors of the stone and worm quicktimes as pure functions.

const C = { x: 320, y: 180 };
const ARENA = { width: 640, height: 360, margin: 16 };
const P = PARRY_RULES;
const REACH = P.circleRadiusPx + P.touchSlackPx;
const HALF = P.dragTargetRadiusPx;
const MIN_SPACING = spacingDeg(REACH, P.distanceFromPlayerPx);
/** Stick catch circle bottom right like VirtualStick (126 px, edge 24). */
const STICK = { x: 640 - 24 - 63, y: 360 - 24 - 63, r: 63 };
const ZONE: SafeZone = safeZone(ARENA, 58, [STICK]);

function opts(zone: SafeZone = ZONE, sideDeg = 30): DragAnchorOptions {
  return {
    circleDist: P.distanceFromPlayerPx,
    sideDeg,
    circleReach: REACH,
    minSpacingDeg: MIN_SPACING,
    half: HALF,
    zone,
  };
}

/** Checks the fairness rules of a set of drag anchors: zone, no overlap of circles, boxes and circles. */
function expectFair(anchors: readonly DragAnchor[], zone: SafeZone = ZONE): void {
  const circles: Point[] = anchors.map((a) => polarPoint(C, a.angleDeg, P.distanceFromPlayerPx));
  const boxes: Point[] = anchors.map((a) => polarPoint(C, a.target.angleDeg, a.target.distancePx));
  for (let i = 0; i < anchors.length; i++) {
    expect(boxFits(boxes[i], HALF, zone)).toBe(true);
    for (const c of circles) expect(boxDistance(c, boxes[i], HALF)).toBeGreaterThanOrEqual(REACH);
    for (let j = i + 1; j < anchors.length; j++) {
      expect(Math.abs(deltaDeg(anchors[i].angleDeg, anchors[j].angleDeg))).toBeGreaterThanOrEqual(
        MIN_SPACING - 1e-9,
      );
      const d = Math.hypot(boxes[i].x - boxes[j].x, boxes[i].y - boxes[j].y);
      expect(d).toBeGreaterThan(2 * HALF);
    }
  }
}

describe('angles (AP-154)', () => {
  it('normalises and measures the shortest turn', () => {
    expect(normDeg(-30)).toBe(330);
    expect(normDeg(725)).toBe(5);
    expect(deltaDeg(350, 10)).toBe(20);
    expect(deltaDeg(10, 350)).toBe(-20);
    expect(deltaDeg(0, 180)).toBe(180);
  });

  it('direction from the player, y pointing down', () => {
    expect(angleDegOf(C, { x: 420, y: 180 })).toBeCloseTo(0);
    expect(angleDegOf(C, { x: 320, y: 280 })).toBeCloseTo(90);
    expect(angleDegOf(C, { x: 220, y: 180 })).toBeCloseTo(180);
    const p = polarPoint(C, 270, 50);
    expect(p.x).toBeCloseTo(320);
    expect(p.y).toBeCloseTo(130);
  });

  it('minimum spacing: tap areas of 24 px at 56 px need about 50.8 degrees', () => {
    expect(MIN_SPACING).toBeCloseTo(50.75, 1);
    expect(spacingDeg(100, 10)).toBe(180);
  });
});

describe('burrow: circles on the side of the sand trail (AP-154)', () => {
  it('three circles centred on the trail, never closer than the minimum spacing', () => {
    const a = spreadAngles(90, 3, 30, MIN_SPACING);
    expect(a[1]).toBeCloseTo(90);
    expect(deltaDeg(a[0], a[1])).toBeCloseTo(MIN_SPACING);
    expect(deltaDeg(a[1], a[2])).toBeCloseTo(MIN_SPACING);
  });

  it('keeps +-30 degrees when the circles fit, wraps around 0', () => {
    expect(spreadAngles(0, 2, 30, 20)).toEqual([330, 30]);
    expect(spreadAngles(45, 1, 30, MIN_SPACING)).toEqual([45]);
    expect(spreadAngles(45, 0, 30, MIN_SPACING)).toEqual([]);
  });
});

describe('safe zone of drag targets (AP-154)', () => {
  it('a box must lie inside the arena margin, below the HUD and off the stick', () => {
    expect(boxFits({ x: 320, y: 100 }, HALF, ZONE)).toBe(true);
    expect(boxFits({ x: 320, y: 70 }, HALF, ZONE)).toBe(false); // under the HUD timer
    expect(boxFits({ x: 30, y: 180 }, HALF, ZONE)).toBe(false); // beyond the margin
    expect(boxFits({ x: STICK.x - 40, y: STICK.y }, HALF, ZONE)).toBe(false); // on the stick
  });

  it('box distance is 0 inside and measured to the edge outside', () => {
    expect(boxDistance({ x: 5, y: 5 }, { x: 0, y: 0 }, 10)).toBe(0);
    expect(boxDistance({ x: 13, y: 14 }, { x: 0, y: 0 }, 10)).toBe(5);
  });

  it('fitDistance shortens the target until it fits, null if nothing fits', () => {
    expect(fitDistance(C, 0, 112, 80, HALF, ZONE)).toBe(112);
    const up = fitDistance(C, 270, 112, 80, HALF, ZONE);
    expect(up).not.toBeNull();
    expect(up!).toBeLessThan(112);
    expect(boxFits(polarPoint(C, 270, up!), HALF, ZONE)).toBe(true);
    expect(fitDistance(C, 270, 112, 110, HALF, ZONE)).toBeNull();
  });
});

describe('Riesenzank: stones clash before the player (AP-154)', () => {
  const r = BOSS_TUNING.giantStone.baseRadius * 0.5;
  const min = r + BOSS_TUNING.playerHitRadius + 4;

  it('stones from opposite sides stop clear of the player', () => {
    expect(clashDistance(180, r, min)).toBe(min);
  });

  it('closer lanes clash further out, where the stones touch', () => {
    const d = clashDistance(30, r, min);
    expect(d).toBeCloseTo(r / Math.sin(Math.PI / 12));
    expect(d).toBeGreaterThan(min);
    const a = polarPoint(C, 0, d);
    const b = polarPoint(C, 30, d);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(2 * r);
    expect(clashDistance(0, r, min)).toBe(Infinity);
  });
});

describe('Riesenzank anchors (AP-154)', () => {
  const TARGET = P.distanceFromPlayerPx + P.dragTargetDistancePx;
  const MIN_TARGET = P.distanceFromPlayerPx + P.dragTargetRadiusPx;

  it('one target on the lane of each stone, circles turned away from the other lane', () => {
    const plan = quarrelAnchors(C, [0, 180], TARGET, MIN_TARGET, opts());
    expect(plan).not.toBeNull();
    const [a, b] = plan!;
    expect(a.target.angleDeg).toBe(0);
    expect(b.target.angleDeg).toBe(180);
    expect(a.target.distancePx).toBe(TARGET);
    expect(Math.abs(deltaDeg(a.angleDeg, 0))).toBeCloseTo(30);
    expect(Math.abs(deltaDeg(b.angleDeg, 180))).toBeCloseTo(30);
    expectFair(plan!);
  });

  it('fair for lanes all around, also close together', () => {
    let planned = 0;
    for (let a = 0; a < 360; a += 15) {
      for (let gap = 15; gap <= 180; gap += 15) {
        const plan = quarrelAnchors(C, [a, a + gap], TARGET, MIN_TARGET, opts());
        if (!plan) continue;
        planned += 1;
        expectFair(plan);
        expect(plan[0].target.angleDeg).toBeCloseTo(normDeg(a));
        expect(plan[1].target.angleDeg).toBeCloseTo(normDeg(a + gap));
      }
    }
    expect(planned).toBeGreaterThan(200);
  });

  it('circles keep the spacing even for the same lane, else no quarrel', () => {
    const same = quarrelAnchors(C, [40, 40], TARGET, MIN_TARGET, opts());
    // Same lane: the two targets cannot both sit on it without overlapping.
    expect(same).toBeNull();
    expect(quarrelAnchors(C, [0, 30], TARGET, MIN_TARGET, opts(ZONE, 10))).toBeNull();
  });

  it('no room in the zone: no quarrel', () => {
    const tiny = safeZone(ARENA, 170, []);
    expect(quarrelAnchors(C, [270, 90], TARGET, MIN_TARGET, opts(tiny))).toBeNull();
  });
});

describe('Fessel der Göttinnen anchors (AP-154)', () => {
  const W = BOSS_TUNING.giantSandWorm;
  const links = (gapStart: number): number[] =>
    coilAngles(W.segmentCount, gapStart, W.coil.gapRad).links.map((a) => (a * 180) / Math.PI);

  it('two rope circles with their targets on links of the ring', () => {
    for (let g = 0; g < 360; g += 20) {
      const ls = links((g * Math.PI) / 180);
      const plan = coilAnchors(C, ls, W.coil.radius, 2, 3, opts());
      expect(plan).not.toBeNull();
      expect(plan).toHaveLength(2);
      for (const a of plan!) {
        expect(a.target.distancePx).toBe(W.coil.radius);
        expect(ls.some((l) => Math.abs(deltaDeg(l, a.target.angleDeg)) < 1e-9)).toBe(true);
        expect(Math.abs(Math.abs(deltaDeg(a.target.angleDeg, a.angleDeg)) - 30)).toBeLessThan(1e-9);
      }
      expect(plan![0].target.angleDeg).not.toBe(plan![1].target.angleDeg);
      expectFair(plan!);
    }
  });

  it('null when no link fits', () => {
    const none = safeZone({ width: 640, height: 360, margin: 16 }, 400, []);
    expect(coilAnchors(C, links(0), W.coil.radius, 2, 0, opts(none))).toBeNull();
  });
});
