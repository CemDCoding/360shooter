import { describe, expect, it, vi } from 'vitest';
import type { ParryOutcome } from '../../src/entities/bosses/hazards';

// Minimal Phaser stand-in (like bossParry.test.ts): game objects keep position, visibility and activity.
vi.mock('phaser', () => {
  class GameObject {
    scene: unknown;
    x = 0;
    y = 0;
    alpha = 1;
    active = true;
    visible = true;
    depth = 0;
    body: { enable: boolean; updateFromGameObject(): void } | null = {
      enable: true,
      updateFromGameObject: () => undefined,
    };
    constructor(scene: unknown, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    setPosition(x: number, y: number): this {
      this.x = x;
      this.y = y;
      return this;
    }
    setVisible(v: boolean): this {
      this.visible = v;
      return this;
    }
    setActive(v: boolean): this {
      this.active = v;
      return this;
    }
    setAlpha(a: number): this {
      this.alpha = a;
      return this;
    }
    destroy(): void {
      this.active = false;
    }
  }
  const noop = function (this: unknown) {
    return this;
  };
  for (const m of [
    'setDepth',
    'setScale',
    'setTint',
    'setTintFill',
    'clearTint',
    'setVelocity',
    'play',
    'clear',
    'lineStyle',
    'strokeCircle',
    'fillStyle',
    'fillRect',
    'fillCircle',
    'strokePoints',
    'fillPoints',
    'strokeRect',
    'arc',
    'lineBetween',
    'beginPath',
    'moveTo',
    'lineTo',
    'strokePath',
    'once',
  ]) {
    (GameObject.prototype as unknown as Record<string, unknown>)[m] = noop;
  }
  class Sprite extends GameObject {
    enableBody(_r: boolean, x: number, y: number, a: boolean, v: boolean): this {
      this.setPosition(x, y);
      this.active = a;
      this.visible = v;
      return this;
    }
    disableBody(a: boolean, v: boolean): this {
      if (a) this.active = false;
      if (v) this.visible = false;
      return this;
    }
  }
  return {
    default: {
      Physics: { Arcade: { Sprite } },
      GameObjects: { Graphics: GameObject, Events: { DESTROY: 'destroy' } },
      Scenes: { Events: { UPDATE: 'update' } },
      Math: {
        Vector2: class {
          constructor(
            public x = 0,
            public y = 0,
          ) {}
        },
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
        },
      },
    },
  };
});

const { GiantStone } = await import('../../src/entities/bosses/GiantStone');
const { BOSSES, BOSS_TUNING } = await import('../../src/config/bosses');
const { PARRY_RULES } = await import('../../src/config/parry');
const { scaledDamage, variantForLevel } = await import('../../src/logic/boss');
const { circlePosition, targetPosition } = await import('../../src/logic/parry');
const { angleDegOf, deltaDeg, spacingDeg } = await import('../../src/entities/bosses/bossGeometry');

type Stone = InstanceType<typeof GiantStone>;

function fakeScene(registry: Record<string, unknown> = {}) {
  // Any drawing call is a no-op that returns the graphics object.
  const graphics = (): object => {
    const g: object = new Proxy({}, { get: () => () => g });
    return g;
  };
  return {
    add: { existing: () => undefined, graphics },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => false },
    events: { on: () => undefined, off: () => undefined },
    tweens: { add: () => undefined, killTweensOf: () => undefined },
    registry: { get: (k: string) => registry[k] },
  };
}

const CENTER = { x: 320, y: 180 };
const ARENA = { width: 640, height: 360, margin: 16 };
/** Level index 0 (no extra attack) and index 2 (extra attack: split and quarrel). */
const LEVEL_PLAIN = 10;
const LEVEL_EXTRA = 12;
const T = BOSS_TUNING.giantStone;
const MIN_SPACING = spacingDeg(
  PARRY_RULES.circleRadiusPx + PARRY_RULES.touchSlackPx,
  PARRY_RULES.distanceFromPlayerPx,
);

interface Internals {
  handle(ev: {
    type: 'telegraph' | 'execute';
    attackId: string;
    telegraphMs: number;
    damage: number;
    executeAtMs: number;
  }): void;
  parry: { tick(dt: number): void };
  scheduler: { attacks: { id: string }[] };
  phase: string;
  target: { x: number; y: number };
  pendingDamage: number;
  damageFactor: number;
  warning?: unknown;
  behave(delta: number): void;
}

const inner = (s: Stone) => s as unknown as Internals;

function makeStone(levelId: number, ctx: Record<string, unknown> = {}): Stone {
  return new GiantStone(fakeScene() as never, levelId, {
    center: CENTER,
    arena: ARENA,
    rng: { next: () => 0.4 },
    ...ctx,
  });
}

function attackDef(id: string) {
  const a = BOSSES.giantStone.attacks.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
}

/** Announces `id` on `stone`; `run(solve)` solves every circle (or none) and lets the attack hit. */
function announce(stone: Stone, id: string, levelId: number) {
  const a = attackDef(id);
  const ev = {
    attackId: id,
    telegraphMs: a.telegraphMs,
    damage: scaledDamage(a.damage, variantForLevel(levelId)),
    executeAtMs: 0,
  };
  inner(stone).handle({ type: 'telegraph', ...ev });
  return {
    damage: ev.damage,
    run(solve: boolean) {
      let at = 0;
      const circles = [...(stone.parryGroups[0]?.circles ?? [])].sort(
        (x, y) => x.hitAtMs - y.hitAtMs,
      );
      if (solve) {
        circles.forEach((c, i) => {
          inner(stone).parry.tick(c.hitAtMs - at);
          at = c.hitAtMs;
          const p = circlePosition(c, CENTER);
          if (c.kind === 'drag') {
            const t = targetPosition(c, CENTER)!;
            expect(stone.pressParry(p, CENTER, i + 1)).toBe(true);
            stone.releaseParry(i + 1, t, CENTER);
            return;
          }
          expect(stone.pressParry(p, CENTER)).toBe(true);
          if (c.kind === 'hold' && c.releaseAtMs !== undefined) {
            inner(stone).parry.tick(c.releaseAtMs - at);
            at = c.releaseAtMs;
            expect(stone.pressParry(p, CENTER)).toBe(true);
          }
        });
      }
      inner(stone).parry.tick(a.telegraphMs - at);
      inner(stone).handle({ type: 'execute', ...ev });
    },
  };
}

/**
 * Splits the stone (extra attack) and returns the two fragments, leader first. Like after their first rolls, the
 * fragments then wait on two sides of the rim (right after the split they stand side by side).
 */
function split(
  stone: Stone,
  spots: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: 600, y: 180 },
    { x: 140, y: 290 },
  ],
): [Stone, Stone] {
  stone.takeDamage(stone.maxHp);
  const parts = stone.parts as Stone[];
  expect(parts).toHaveLength(2);
  parts.forEach((p, i) => p.setPosition(spots[i].x, spots[i].y));
  return [parts[0], parts[1]];
}

describe('GiantStone Morgenlicht (AP-154)', () => {
  it('the sun hold circle sits on the lane of the stone, the circles keep their spacing', () => {
    for (const spot of [
      { x: 600, y: 180 },
      { x: 320, y: 40 },
      { x: 120, y: 300 },
    ]) {
      const stone = makeStone(LEVEL_PLAIN);
      stone.spawn(spot.x, spot.y);
      announce(stone, 'roll', LEVEL_PLAIN);
      const circles = stone.parryGroups[0].circles;
      expect(circles).toHaveLength(3);
      const sun = circles.find((c) => c.symbol === 'sun');
      expect(sun?.kind).toBe('hold');
      expect(Math.abs(deltaDeg(sun!.angleDeg, angleDegOf(CENTER, spot)))).toBeLessThan(1e-9);
      for (let i = 0; i < circles.length; i++)
        for (let j = i + 1; j < circles.length; j++)
          expect(
            Math.abs(deltaDeg(circles[i].angleDeg, circles[j].angleDeg)),
          ).toBeGreaterThanOrEqual(MIN_SPACING - 1e-6);
    }
  });

  it('easy parry: the sun tap circle still sits on the lane', () => {
    const stone = new GiantStone(fakeScene({ easyParry: true }) as never, LEVEL_PLAIN, {
      center: CENTER,
      arena: ARENA,
      rng: { next: () => 0.7 },
    });
    stone.spawn(320, 320);
    announce(stone, 'roll', LEVEL_PLAIN);
    const sun = stone.parryGroups[0].circles.find((c) => c.symbol === 'sun');
    expect(sun?.kind).toBe('tap');
    expect(Math.abs(deltaDeg(sun!.angleDeg, 90))).toBeLessThan(1e-9);
  });

  it('all circles hit: the stone freezes, then bounces off with open armour; it never rolls', () => {
    const hits: number[] = [];
    const stone = new GiantStone(
      fakeScene() as never,
      LEVEL_PLAIN,
      { center: CENTER, arena: ARENA, rng: { next: () => 0.4 } },
      { getPlayerPos: () => CENTER, onPlayerHit: (d) => hits.push(d) },
    );
    stone.spawn(600, 180);
    announce(stone, 'roll', LEVEL_PLAIN).run(true);
    expect(inner(stone).phase).toBe('frozen');
    inner(stone).behave(100);
    expect(stone.x).toBe(600);
    inner(stone).behave(300);
    expect(inner(stone).phase).toBe('retreating');
    expect(inner(stone).damageFactor).toBe(1);
    expect(hits).toEqual([]);
  });

  it('circles missed: the stone rolls to the middle with the damage', () => {
    const stone = makeStone(LEVEL_PLAIN);
    stone.spawn(600, 180);
    const t = announce(stone, 'roll', LEVEL_PLAIN);
    t.run(false);
    expect(inner(stone).phase).toBe('rolling');
    expect(inner(stone).target).toEqual(CENTER);
    expect(inner(stone).pendingDamage).toBe(t.damage);
  });
});

describe('GiantStone Riesenzank (AP-154)', () => {
  it('never before the split: the whole stone has no quarrel, only the first fragment has it', () => {
    const plain = makeStone(LEVEL_PLAIN);
    expect(inner(plain).scheduler.attacks.map((a) => a.id)).toEqual(['roll']);
    const whole = makeStone(LEVEL_EXTRA);
    expect(inner(whole).scheduler.attacks.map((a) => a.id)).toEqual(['roll']);
    whole.spawn(600, 180);
    // Even if announced, the whole stone does nothing and gets no circles.
    announce(whole, 'quarrel', LEVEL_EXTRA);
    expect(whole.parryGroups).toHaveLength(0);
    expect(inner(whole).phase).toBe('idle');
    const [leader, follower] = split(whole);
    expect(inner(leader).scheduler.attacks.map((a) => a.id)).toEqual(['roll', 'quarrel']);
    expect(inner(follower).scheduler.attacks.map((a) => a.id)).toEqual(['roll']);
  });

  it('two pebble drag circles, each with its target on the lane of one stone', () => {
    const whole = makeStone(LEVEL_EXTRA);
    whole.spawn(600, 180);
    const [leader, follower] = split(whole);
    announce(leader, 'quarrel', LEVEL_EXTRA);
    const circles = leader.parryGroups[0].circles;
    expect(circles).toHaveLength(2);
    expect(circles.every((c) => c.kind === 'drag' && c.symbol === 'pebble')).toBe(true);
    const lanes = [angleDegOf(CENTER, leader), angleDegOf(CENTER, follower)];
    circles.forEach((c, i) => {
      expect(Math.abs(deltaDeg(c.target!.angleDeg, lanes[i]))).toBeLessThan(1e-9);
    });
    expect(inner(leader).phase).toBe('quarrel');
    expect(inner(follower).phase).toBe('quarrel');
    expect(follower.parryGroups).toHaveLength(0);
  });

  it('all hit: both stones roll only to their clash point, clear of the player, without damage', () => {
    const resolved: ParryOutcome[] = [];
    const whole = makeStone(LEVEL_EXTRA, {
      onParryResolved: (o: ParryOutcome) => resolved.push(o),
    });
    whole.spawn(600, 180);
    const [leader, follower] = split(whole);
    announce(leader, 'quarrel', LEVEL_EXTRA).run(true);
    expect(resolved.at(-1)?.blocked).toBe(true);
    const minDist = T.baseRadius * 0.5 + BOSS_TUNING.playerHitRadius;
    for (const s of [leader, follower]) {
      expect(inner(s).phase).toBe('rolling');
      expect(inner(s).pendingDamage).toBe(0);
      const t = inner(s).target;
      expect(Math.hypot(t.x - CENTER.x, t.y - CENTER.y)).toBeGreaterThan(minDist);
      expect(Math.abs(deltaDeg(angleDegOf(CENTER, t), angleDegOf(CENTER, s)))).toBeLessThan(1e-6);
    }
  });

  it('missed: both stones roll to the player with half the damage each', () => {
    const whole = makeStone(LEVEL_EXTRA);
    whole.spawn(600, 180);
    const [leader, follower] = split(whole);
    const q = announce(leader, 'quarrel', LEVEL_EXTRA);
    q.run(false);
    for (const s of [leader, follower]) {
      expect(inner(s).phase).toBe('rolling');
      expect(inner(s).target).toEqual(CENTER);
      expect(inner(s).pendingDamage).toBe(q.damage / 2);
    }
  });

  it('no quarrel while both stones stand side by side (the two targets would overlap)', () => {
    const whole = makeStone(LEVEL_EXTRA);
    whole.spawn(600, 180);
    const [leader, follower] = split(whole, [
      { x: 600, y: 160 },
      { x: 600, y: 200 },
    ]);
    announce(leader, 'quarrel', LEVEL_EXTRA);
    expect(leader.parryGroups).toHaveLength(0);
    expect(inner(follower).phase).toBe('idle');
  });

  it('no quarrel while the other stone has its own roll announced', () => {
    const whole = makeStone(LEVEL_EXTRA);
    whole.spawn(600, 180);
    const [leader, follower] = split(whole);
    announce(follower, 'roll', LEVEL_EXTRA);
    announce(leader, 'quarrel', LEVEL_EXTRA);
    expect(leader.parryGroups).toHaveLength(0);
    expect(inner(leader).phase).toBe('idle');
  });

  it('a roll announced by the waiting partner gets no circles; the leader dying frees the partner', () => {
    const whole = makeStone(LEVEL_EXTRA);
    whole.spawn(600, 180);
    const [leader, follower] = split(whole);
    announce(leader, 'quarrel', LEVEL_EXTRA);
    announce(follower, 'roll', LEVEL_EXTRA);
    expect(follower.parryGroups).toHaveLength(0);
    leader.despawn();
    expect(inner(follower).phase).toBe('idle');
    expect(inner(follower).warning).toBeUndefined();
  });

  it('the partner died during the announcement: the leader rolls alone with its half', () => {
    const whole = makeStone(LEVEL_EXTRA);
    whole.spawn(600, 180);
    const [leader, follower] = split(whole);
    const q = announce(leader, 'quarrel', LEVEL_EXTRA);
    follower.despawn();
    q.run(false);
    expect(inner(leader).phase).toBe('rolling');
    expect(inner(leader).pendingDamage).toBe(q.damage / 2);
  });
});
