import { describe, expect, it, vi } from 'vitest';

// Minimal Phaser stand-in (like bossParry.test.ts).
vi.mock('phaser', () => {
  class GameObject {
    scene: unknown;
    x = 0;
    y = 0;
    width = 32;
    height = 32;
    alpha = 1;
    active = true;
    visible = true;
    depth = 0;
    body: { enable: boolean } | null = { enable: true };
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
    'setCircle',
    'setTint',
    'setTintFill',
    'clearTint',
    'setVelocity',
    'setImmovable',
    'setRotation',
    'play',
    'clear',
    'fillStyle',
    'fillRect',
    'lineStyle',
    'strokeCircle',
    'fillCircle',
    'strokePoints',
    'fillPoints',
    'lineBetween',
    'strokeRect',
    'beginPath',
    'arc',
    'strokePath',
    'closePath',
    'fillPath',
    'once',
  ]) {
    (GameObject.prototype as unknown as Record<string, unknown>)[m] = noop;
  }
  class Sprite extends GameObject {
    enableBody(_r: boolean, x: number, y: number, a: boolean, v: boolean): this {
      this.body = { enable: true };
      this.setPosition(x, y);
      this.active = a;
      this.visible = v;
      return this;
    }
    disableBody(a: boolean, v: boolean): this {
      this.body = { enable: false };
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
        DegToRad: (d: number) => (d * Math.PI) / 180,
        Distance: { Between: () => 1e9 },
        Vector2: class {
          constructor(
            public x = 0,
            public y = 0,
          ) {}
        },
      },
    },
  };
});

const { RootMonster, circleFan, fanBaseAngle, awayFromBodyDeg } =
  await import('../../src/entities/bosses/RootMonster');
const { ForestGhost, ghostCircleAngle } = await import('../../src/entities/bosses/ForestGhost');
const { PARRY_RULES } = await import('../../src/config/parry');
const { BOSSES, BOSS_TUNING } = await import('../../src/config/bosses');
const { circlePosition } = await import('../../src/logic/parry');
const { scaledDamage, variantForLevel } = await import('../../src/logic/boss');

class Sprite {
  setAlpha() {
    return this;
  }
  setDepth() {
    return this;
  }
  setPosition() {
    return this;
  }
  destroy() {}
}

function fakeScene(easy = false) {
  const Graphics = class {
    setDepth() {
      return this;
    }
    setVisible() {
      return this;
    }
    clear() {
      return this;
    }
  };
  return {
    add: {
      existing: () => undefined,
      graphics: () => new Graphics(),
      sprite: () => new Sprite(),
    },
    physics: { add: { existing: () => undefined }, velocityFromRotation: () => undefined },
    anims: { exists: () => false },
    events: { on: () => undefined, off: () => undefined },
    tweens: { add: () => undefined, killTweensOf: () => undefined },
    registry: { get: () => easy },
    time: { now: 0 },
  };
}

const CENTER = { x: 320, y: 180 };
const R = PARRY_RULES.circleRadiusPx;
const BODY_R = 16;

interface Internals {
  handle(ev: {
    type: 'telegraph' | 'execute';
    attackId: string;
    telegraphMs: number;
    damage: number;
    executeAtMs: number;
  }): void;
  onAttack(id: string, damage: number, factor: number): void;
}

const bossAttack = (id: 'rootMonster' | 'forestGhost', attackId: string) => {
  const a = BOSSES[id].attacks.find((x) => x.id === attackId);
  if (!a) throw new Error(attackId);
  return a;
};

function announce(boss: object, id: 'rootMonster' | 'forestGhost', attackId: string): void {
  const a = bossAttack(id, attackId);
  (boss as Internals).handle({
    type: 'telegraph',
    attackId,
    telegraphMs: a.telegraphMs,
    damage: scaledDamage(a.damage, variantForLevel(0)),
    executeAtMs: 0,
  });
}

function pos(angleDeg: number) {
  return circlePosition({ angleDeg }, CENTER);
}

/** Smallest distance between two circle centres of one attack. */
function minGap(angles: number[]): number {
  let min = Infinity;
  for (let i = 0; i < angles.length; i++)
    for (let j = i + 1; j < angles.length; j++) {
      const a = pos(angles[i]);
      const b = pos(angles[j]);
      min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    }
  return min;
}

describe('circle geometry helpers (AP-153)', () => {
  it('circleFan is centred on the base angle', () => {
    expect(circleFan(90, 3, 70)).toEqual([20, 90, 160]);
    expect(circleFan(0, 2, 64)).toEqual([-32, 32]);
  });

  it('fanBaseAngle keeps the preferred angle when the body is far, else turns away from it', () => {
    const far = { x: 600, y: 180, radius: 30 };
    expect(fanBaseAngle(0, 3, 70, CENTER, far)).toBe(0);
    const near = { x: CENTER.x + 70, y: CENTER.y, radius: 30 };
    const base = fanBaseAngle(0, 3, 70, CENTER, near);
    expect(Math.abs(base)).toBeCloseTo(180);
    for (const a of circleFan(base, 3, 70)) {
      const p = pos(a);
      expect(Math.hypot(p.x - near.x, p.y - near.y)).toBeGreaterThanOrEqual(near.radius + R);
    }
  });

  it('awayFromBodyDeg points from the boss to the player', () => {
    expect(Math.abs(awayFromBodyDeg(CENTER, { x: CENTER.x + 100, y: CENTER.y }))).toBeCloseTo(180);
  });
});

describe('RootMonster circles (AP-153)', () => {
  function make(rng = 0.4, easy = false) {
    const boss = new RootMonster(fakeScene(easy) as never, 0, {
      center: CENTER,
      rng: { next: () => rng },
    });
    boss.spawn(560, 180);
    return boss;
  }

  it('rootThrust: hold and tap circle sit away from the boss and do not overlap', () => {
    const boss = make();
    announce(boss, 'rootMonster', 'rootThrust');
    const circles = boss.parryGroups[0].circles;
    expect(circles.map((c) => c.kind)).toEqual(['hold', 'tap']);
    expect(minGap(circles.map((c) => c.angleDeg))).toBeGreaterThan(2 * R);
    for (const c of circles) {
      const p = pos(c.angleDeg);
      expect(Math.hypot(p.x - boss.x, p.y - boss.y)).toBeGreaterThanOrEqual(R + BODY_R);
    }
  });

  it('rootRing: two rose taps and one spindle decoy sit opposite the gap and apart', () => {
    const boss = make(0.25);
    announce(boss, 'rootMonster', 'rootRing');
    const circles = boss.parryGroups[0].circles;
    expect(circles.map((c) => [c.kind, c.symbol])).toEqual([
      ['tap', 'rose'],
      ['tap', 'rose'],
      ['decoy', 'spindle'],
    ]);
    expect(minGap(circles.map((c) => c.angleDeg))).toBeGreaterThan(2 * R);
    const gapCentre =
      (0.25 * Math.PI * 2 + BOSS_TUNING.rootMonster.ring.gapRad / 2) * (180 / Math.PI);
    const mid = circles[1].angleDeg;
    expect(Math.cos(((mid - gapCentre) * Math.PI) / 180)).toBeCloseTo(-1, 5);
  });

  it('rootRing with Einfache Abwehr: two circles only, still apart', () => {
    const boss = make(0.25, true);
    announce(boss, 'rootMonster', 'rootRing');
    const circles = boss.parryGroups[0].circles;
    expect(circles).toHaveLength(2);
    expect(minGap(circles.map((c) => c.angleDeg))).toBeGreaterThan(2 * R);
  });

  it('attacks without circles of their own keep the planned place', () => {
    const boss = make();
    const a = bossAttack('rootMonster', 'rootThrust');
    const c = { index: 0, angleDeg: 33, hitAtMs: 500, result: null };
    const anchor = (
      boss as unknown as { parryAnchor(a: unknown, c: unknown): { angleDeg: number } }
    ).parryAnchor({ ...a, id: 'forestCall' }, c);
    expect(anchor.angleDeg).toBe(33);
  });
});

describe('ForestGhost circles (AP-153)', () => {
  function make() {
    const boss = new ForestGhost(fakeScene() as never, 0, {
      center: CENTER,
      rng: { next: () => 0.4 },
    });
    boss.spawn(0, 0);
    return boss;
  }

  it('decoys now get circles: the real ghost tap plus two mist decoys', () => {
    const boss = make();
    announce(boss, 'forestGhost', 'decoys');
    expect(boss.parryGroups).toHaveLength(1);
    const circles = boss.parryGroups[0].circles;
    expect(circles.map((c) => [c.kind, c.symbol])).toEqual([
      ['tap', 'ghost'],
      ['decoy', 'mist'],
      ['decoy', 'mist'],
    ]);
  });

  it('decoys: circle angles match the ghost and the decoy sprites', () => {
    const T = BOSS_TUNING.forestGhost;
    expect(ghostCircleAngle('decoys', 0, 10, T.decoyCount)).toBe(10);
    expect(ghostCircleAngle('decoys', 1, 10, T.decoyCount)).toBe(130);
    expect(ghostCircleAngle('decoys', 2, 10, T.decoyCount)).toBe(250);
    const boss = make();
    announce(boss, 'forestGhost', 'decoys');
    const ghostDeg = Math.atan2(boss.y - CENTER.y, boss.x - CENTER.x) * (180 / Math.PI);
    const angles = boss.parryGroups[0].circles.map((c) => c.angleDeg);
    expect(Math.cos(((angles[0] - ghostDeg) * Math.PI) / 180)).toBeCloseTo(1, 5);
    expect(minGap(angles)).toBeGreaterThan(2 * R);
  });

  it('orbFan: two pebbles face the fan, apart from each other and from the ghost body', () => {
    const boss = make();
    announce(boss, 'forestGhost', 'orbFan');
    const circles = boss.parryGroups[0].circles;
    expect(circles.map((c) => c.kind)).toEqual(['sequence', 'sequence']);
    expect(minGap(circles.map((c) => c.angleDeg))).toBeGreaterThan(2 * R);
    for (const c of circles) {
      const p = pos(c.angleDeg);
      expect(Math.hypot(p.x - boss.x, p.y - boss.y)).toBeGreaterThan(R + BODY_R);
    }
  });

  it('other attacks keep the default places', () => {
    expect(ghostCircleAngle('fade', 0, 0, 2)).toBeNull();
  });

  it('decoys: a missed real circle lets one orb fly with the damage, a full parry none', () => {
    const boss = make();
    const dmg = scaledDamage(bossAttack('forestGhost', 'decoys').damage, variantForLevel(0));
    expect(dmg).toBeGreaterThan(0);
    const i = boss as unknown as Internals;
    i.onAttack('decoys', 0, 0);
    expect(boss.orbs.filter((o) => o.active)).toHaveLength(0);
    i.onAttack('decoys', dmg, 1);
    const live = boss.orbs.filter((o) => o.active);
    expect(live).toHaveLength(1);
    expect(live[0].damage).toBe(dmg);
  });
});
