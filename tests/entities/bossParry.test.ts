import { describe, expect, it, vi } from 'vitest';
import type { ParryOutcome } from '../../src/entities/bosses/hazards';

// Minimal Phaser stand-in (like pharaoh.test.ts): game objects keep position, alpha, visibility and activity.
vi.mock('phaser', () => {
  class GameObject {
    scene: unknown;
    x = 0;
    y = 0;
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

const { BossBase } = await import('../../src/entities/bosses/BossBase');
const { RootMonster } = await import('../../src/entities/bosses/RootMonster');
const { GiantStone } = await import('../../src/entities/bosses/GiantStone');
const { PARRY_RULES } = await import('../../src/config/parry');
const { BOSSES } = await import('../../src/config/bosses');
const { scaledDamage, variantForLevel } = await import('../../src/logic/boss');

function fakeScene() {
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
    add: { existing: () => undefined, graphics: () => new Graphics() },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => false },
    events: { on: () => undefined, off: () => undefined },
    tweens: { add: () => undefined, killTweensOf: () => undefined },
  };
}

const CENTER = { x: 320, y: 180 };
const LEVEL = 0;

/** White-box view of BossBase: the private event handler and the tracker (driven without the scheduler). */
interface Internals {
  handle(ev: {
    type: 'telegraph' | 'execute';
    attackId: string;
    telegraphMs: number;
    damage: number;
    executeAtMs: number;
  }): void;
  parry: { tick(dt: number): void };
}

class TestBoss extends BossBase {
  attacks: { id: string; damage: number; factor: number }[] = [];
  constructor(ctx: ConstructorParameters<typeof BossBase>[3] = {}) {
    super(fakeScene() as never, 'rootMonster', LEVEL, {
      center: CENTER,
      rng: { next: () => 0.4 },
      ...ctx,
    });
  }
  protected override onAttack(attackId: string, damage: number, parryFactor: number): void {
    this.attacks.push({ id: attackId, damage, factor: parryFactor });
  }
}

const attack = (bossId: 'rootMonster' | 'giantStone', id: string) => {
  const a = BOSSES[bossId].attacks.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
};

function announce(
  boss: InstanceType<typeof BossBase>,
  bossId: 'rootMonster' | 'giantStone',
  id: string,
) {
  const a = attack(bossId, id);
  const damage = scaledDamage(a.damage, variantForLevel(LEVEL));
  const ev = { attackId: id, telegraphMs: a.telegraphMs, damage, executeAtMs: 0 };
  const i = boss as unknown as Internals;
  i.handle({ type: 'telegraph', ...ev });
  return {
    damage,
    a,
    /** Taps every circle exactly at its hit moment (`count` circles), then lets the attack hit. */
    run(count: number) {
      let at = 0;
      for (const c of [...(boss.parryGroups[0]?.circles ?? [])].slice(0, count)) {
        i.parry.tick(c.hitAtMs - at);
        at = c.hitAtMs;
        const rad = (c.angleDeg * Math.PI) / 180;
        const p = {
          x: CENTER.x + Math.cos(rad) * PARRY_RULES.distanceFromPlayerPx,
          y: CENTER.y + Math.sin(rad) * PARRY_RULES.distanceFromPlayerPx,
        };
        expect(boss.tapParry(p, CENTER)).toBe(true);
      }
      i.parry.tick(a.telegraphMs - at);
      i.handle({ type: 'execute', ...ev });
    },
  };
}

describe('BossBase quicktime (AP-133)', () => {
  it('opens circles only for attacks with damage', () => {
    const boss = new TestBoss();
    boss.spawn(500, 180);
    announce(boss, 'rootMonster', 'forestCall');
    expect(boss.parryGroups).toHaveLength(0);
    announce(boss, 'rootMonster', 'rootThrust');
    expect(boss.parryGroups).toHaveLength(1);
    expect(boss.parryGroups[0].circles).toHaveLength(
      attack('rootMonster', 'rootThrust').parryCircles,
    );
  });

  it('all circles hit: the attack arrives with 0 damage and PARRY! is reported', () => {
    const resolved: ParryOutcome[] = [];
    const boss = new TestBoss({ onParryResolved: (o) => resolved.push(o) });
    boss.spawn(500, 180);
    announce(boss, 'rootMonster', 'rootThrust').run(2);
    expect(boss.attacks).toEqual([{ id: 'rootThrust', damage: 0, factor: 0 }]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].blocked).toBe(true);
    expect(boss.parryGroups).toHaveLength(0);
  });

  it('half hit: half damage for this attack, the next one is full again', () => {
    const boss = new TestBoss();
    boss.spawn(500, 180);
    const first = announce(boss, 'rootMonster', 'rootThrust');
    first.run(1);
    const second = announce(boss, 'rootMonster', 'rootThrust');
    second.run(0);
    expect(boss.attacks).toEqual([
      { id: 'rootThrust', damage: first.damage / 2, factor: 0.5 },
      { id: 'rootThrust', damage: second.damage, factor: 1 },
    ]);
  });

  it('an attack without circles keeps its full damage', () => {
    const boss = new TestBoss();
    boss.spawn(500, 180);
    const i = boss as unknown as Internals;
    i.handle({
      type: 'execute',
      attackId: 'rootThrust',
      telegraphMs: 1200,
      damage: 15,
      executeAtMs: 0,
    });
    expect(boss.attacks).toEqual([{ id: 'rootThrust', damage: 15, factor: 1 }]);
  });

  it('despawn (boss death, round end) removes open circles; taps then do nothing', () => {
    const resolved: ParryOutcome[] = [];
    const boss = new TestBoss({ onParryResolved: (o) => resolved.push(o) });
    boss.spawn(500, 180);
    announce(boss, 'rootMonster', 'rootThrust');
    boss.despawn();
    expect(boss.parryGroups).toHaveLength(0);
    expect(boss.tapParry({ x: CENTER.x + 56, y: CENTER.y }, CENTER)).toBe(false);
    expect(resolved).toHaveLength(0);
  });
});

describe('boss subclasses pass the share on (AP-133)', () => {
  it('root monster: the bud made during the announcement takes the share of its attack', () => {
    const boss = new RootMonster(fakeScene() as never, LEVEL, {
      center: CENTER,
      rng: { next: () => 0.4 },
    });
    boss.spawn(500, 180);
    const t = announce(boss, 'rootMonster', 'rootThrust');
    const bud = boss.activeSpikes[0] as unknown as {
      damageFactor: number;
      tick(dt: number): boolean;
    };
    expect(bud.damageFactor).toBe(1);
    t.run(2);
    expect(bud.damageFactor).toBe(0);
    bud.tick(t.a.telegraphMs + 1);
    expect(boss.activeSpikes[0].tryHit()).toBe(0);
  });

  it('root monster: a missed parry leaves the bud at full damage', () => {
    const boss = new RootMonster(fakeScene() as never, LEVEL, {
      center: CENTER,
      rng: { next: () => 0.4 },
    });
    boss.spawn(500, 180);
    const t = announce(boss, 'rootMonster', 'rootThrust');
    t.run(0);
    const bud = boss.activeSpikes[0];
    bud.tick(t.a.telegraphMs + 1);
    expect(bud.tryHit()).toBe(t.damage);
  });

  it('giant stone: no circles while it is still rolling (the roll is not announced)', () => {
    const stone = new GiantStone(fakeScene() as never, LEVEL, { center: CENTER });
    stone.spawn(600, 180);
    announce(stone, 'giantStone', 'roll');
    expect(stone.parryGroups).toHaveLength(1);
    (stone as unknown as { phase: string }).phase = 'rolling';
    (stone as unknown as Internals).handle({
      type: 'telegraph',
      attackId: 'roll',
      telegraphMs: 1200,
      damage: 20,
      executeAtMs: 0,
    });
    expect(stone.parryGroups).toHaveLength(1);
  });
});
