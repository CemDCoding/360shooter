import { describe, expect, it, vi } from 'vitest';
import type { BossAttackDef } from '../../src/contracts';
import type { BossHazard } from '../../src/entities/bosses/hazards';

// Minimal Phaser stand-in: game objects only keep position, visibility and activity; drawing is a no-op.
vi.mock('phaser', () => {
  class GameObject {
    scene: unknown;
    x = 0;
    y = 0;
    depth = 0;
    active = true;
    visible = true;
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
    destroy(): void {
      this.active = false;
      this.scene = undefined;
    }
  }
  const noop = function (this: unknown) {
    return this;
  };
  for (const m of [
    'setDepth',
    'setRotation',
    'setDisplaySize',
    'setTint',
    'setTintFill',
    'clearTint',
    'setFrame',
    'setVelocity',
    'setImmovable',
    'setAlpha',
    'play',
    'clear',
    'fillStyle',
    'fillRect',
    'lineStyle',
    'lineBetween',
    'fillPoints',
    'strokePoints',
    'strokeCircle',
    'fillCircle',
    'beginPath',
    'arc',
    'strokePath',
    'fillPath',
    'closePath',
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
  class Vector2 {
    constructor(
      public x: number,
      public y: number,
    ) {}
  }
  const Phaser = {
    Physics: { Arcade: { Sprite } },
    GameObjects: { Graphics: GameObject, Events: { DESTROY: 'destroy' } },
    Scenes: { Events: { UPDATE: 'update' } },
    Math: { Vector2, DegToRad: (d: number) => (d * Math.PI) / 180 },
  };
  return { default: Phaser };
});

const { GuardianDog } = await import('../../src/entities/bosses/GuardianDog');
const { BOSS_TUNING, BOSSES, MIN_REACTION_MS, MIN_TELEGRAPH_MS } =
  await import('../../src/config/bosses');
const { ARENA, spawnRadiusFor } = await import('../../src/config/arena');
const { angleInGap, circleHitsShape } = await import('../../src/entities/bosses/hazards');

const D = BOSS_TUNING.guardianDog;
const CENTER = { x: 320, y: 180 };
/** Player hit circle as used by the fairness rules (PE-75). */
const PLAYER = { x: CENTER.x, y: CENTER.y, radius: BOSS_TUNING.playerHitRadius };
const ARENA_RECT = { width: ARENA.baseWidth, height: ARENA.height, margin: 16 };

const { Graphics } = (
  (await import('phaser')).default as unknown as {
    GameObjects: { Graphics: new (scene: unknown, x?: number, y?: number) => object };
  }
).GameObjects;

function fakeScene() {
  const scene: Record<string, unknown> = {
    add: {
      existing: () => undefined,
      graphics: () => new Graphics(scene),
      sprite: (x: number, y: number) => new Graphics(scene, x, y),
    },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => false },
    textures: { get: () => ({ has: () => true }) },
    events: { on: () => undefined, off: () => undefined },
    tweens: { add: () => undefined, killTweensOf: () => undefined },
    time: { now: 0 },
  };
  return scene;
}

interface DogInternals {
  onTelegraph(a: BossAttackDef): void;
  onAttack(id: string, damage: number): void;
  behave(dt: number): void;
  update(time: number, dt: number): void;
  despawn(): void;
  isInvulnerable: boolean;
  isShielded: boolean;
  runesLeft: number;
  active: boolean;
  x: number;
  y: number;
  getHazards(): readonly BossHazard[];
  takeDamage(n: number): boolean;
  hp: number;
  maxHp: number;
}

function makeDog(levelId = 26, onSummon = vi.fn()) {
  const scene = fakeScene();
  const dog = new GuardianDog(scene as never, levelId, {
    center: CENTER,
    arena: ARENA_RECT,
    rng: { next: () => 0.25 },
    onSummon,
  }) as unknown as DogInternals & { spawn(x: number, y: number): void };
  // On the rim to the right of the player (like the scene spawns it).
  dog.spawn(CENTER.x + D.orbit.rx, CENTER.y);
  return { dog, onSummon };
}

const attack = (id: string): BossAttackDef => {
  const a = BOSSES.guardianDog.attacks.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
};

const probeAt = (x: number, y: number) => ({
  rect: { left: x - 8, top: y - 2, right: x + 8, bottom: y + 2 },
  circle: { x, y, radius: 8 },
});

/** Runs the dog and sums the damage of every hazard touching the player (like the scene does). */
function runFor(dog: DogInternals, ms: number, step = 16): number {
  let dmg = 0;
  for (let t = 0; t < ms; t += step) {
    dog.behave(step);
    for (const h of dog.getHazards()) {
      if (h.active && circleHitsShape(PLAYER, h.shape)) dmg += h.playerHit();
    }
  }
  return dmg;
}

function raiseShield(dog: DogInternals): void {
  dog.onTelegraph(attack('runeShield'));
  dog.onAttack('runeShield', 0);
}

describe('GuardianDog (AP-103)', () => {
  it('announces every attack at least MIN_TELEGRAPH_MS; summonMummies is the extra attack', () => {
    for (const a of BOSSES.guardianDog.attacks) {
      expect(a.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    }
    expect(attack('runeShield').extraOnly).toBe(false);
    expect(attack('guardBark').extraOnly).toBe(false);
    expect(attack('summonMummies').extraOnly).toBe(true);
  });

  it('walks slowly on its path and stays clear of the player', () => {
    const { dog } = makeDog();
    const x0 = dog.x;
    expect(runFor(dog, 2000)).toBe(0);
    expect(dog.x).not.toBe(x0);
    expect(Math.hypot(dog.x - CENTER.x, dog.y - CENTER.y)).toBeGreaterThanOrEqual(
      D.orbit.ry - 1e-6,
    );
  });

  it('runeShield: runes only fade in during the announcement, then the dog is invulnerable', () => {
    const { dog } = makeDog();
    dog.onTelegraph(attack('runeShield'));
    expect(dog.isInvulnerable).toBe(false);
    expect(dog.getHazards()).toHaveLength(0);
    dog.onAttack('runeShield', 0);
    expect(dog.isInvulnerable).toBe(true);
    expect(dog.isShielded).toBe(true);
    const hazards = dog.getHazards();
    // 3 runes first, then the shield circle; all shootable, none hurts the player.
    expect(hazards).toHaveLength(D.runeShield.runeCount + 1);
    expect(hazards.every((h) => h.shootable)).toBe(true);
    expect(hazards.map((h) => h.playerHit())).toEqual(hazards.map(() => 0));
    const hp = dog.hp;
    expect(dog.takeDamage(50)).toBe(false);
    expect(dog.hp).toBe(hp);
  });

  it('runeShield: lasers bounce off the shield; shot runes end it', () => {
    const { dog } = makeDog();
    raiseShield(dog);
    const shield = dog.getHazards()[D.runeShield.runeCount];
    expect(shield.laserHit(probeAt(CENTER.x + 100, CENTER.y))).toBe(true); // bounced, laser used up
    expect(dog.isInvulnerable).toBe(true);
    for (let r = 0; r < D.runeShield.runeCount; r++) {
      for (let k = 0; k < D.runeShield.runeHits; k++) {
        const rune = dog.getHazards()[0];
        expect(rune.laserHit(probeAt(0, 0))).toBe(true);
      }
      expect(dog.runesLeft).toBe(D.runeShield.runeCount - r - 1);
    }
    expect(dog.isInvulnerable).toBe(false);
    expect(dog.getHazards()).toHaveLength(0);
    const hp = dog.hp;
    dog.takeDamage(50);
    expect(dog.hp).toBeLessThan(hp);
  });

  it('runeShield: never endless, the shield ends after its time limit', () => {
    const { dog } = makeDog();
    raiseShield(dog);
    runFor(dog, D.runeShield.maxMs - 100);
    expect(dog.isInvulnerable).toBe(true);
    runFor(dog, 200);
    expect(dog.isInvulnerable).toBe(false);
    expect(dog.isShielded).toBe(false);
  });

  it('runeShield: the runes float outside the shield and follow the dog', () => {
    const { dog } = makeDog();
    raiseShield(dog);
    runFor(dog, 500);
    const runes = dog.getHazards().slice(0, D.runeShield.runeCount);
    for (const r of runes) {
      if (r.shape.kind !== 'circle') throw new Error('rune is a circle');
      expect(Math.hypot(r.shape.x - dog.x, r.shape.y - dog.y)).toBeCloseTo(D.runeShield.runeOrbit);
    }
  });

  it('guardBark: the dog holds during the announcement, the wave keeps MIN_REACTION_MS and hurts once', () => {
    const { dog } = makeDog();
    dog.onTelegraph(attack('guardBark'));
    const pos = { x: dog.x, y: dog.y };
    expect(runFor(dog, attack('guardBark').telegraphMs)).toBe(0);
    expect({ x: dog.x, y: dog.y }).toEqual(pos);
    dog.onAttack('guardBark', 15);
    expect(dog.getHazards()).toHaveLength(D.guardBark.arcCount);
    expect(runFor(dog, MIN_REACTION_MS)).toBe(0);
    expect(runFor(dog, 6000)).toBe(15);
    expect(dog.getHazards()).toHaveLength(0);
  });

  it('guardBark: the gap stays open and lasers break arcs, so the player can open her own gap', () => {
    const { dog } = makeDog();
    dog.onTelegraph(attack('guardBark'));
    dog.onAttack('guardBark', 15);
    const toPlayer = Math.atan2(CENTER.y - dog.y, CENTER.x - dog.x);
    const facing = dog.getHazards().filter((h) => {
      if (h.shape.kind !== 'ring') throw new Error('wave arcs are rings');
      return !angleInGap(toPlayer, h.shape.gapStart ?? 0, h.shape.gapSize ?? 0);
    });
    expect(facing.length).toBeGreaterThan(0);
    for (const h of facing) {
      for (let k = 0; k < D.guardBark.arcHits; k++) expect(h.laserHit(probeAt(0, 0))).toBe(true);
    }
    expect(dog.getHazards()).toHaveLength(D.guardBark.arcCount - facing.length);
    expect(runFor(dog, 6000)).toBe(0);
  });

  it('summonMummies: warns first, then calls 3 mummies from outside the screen', () => {
    const { dog, onSummon } = makeDog(28);
    dog.onTelegraph(attack('summonMummies'));
    expect(onSummon).not.toHaveBeenCalled();
    dog.onAttack('summonMummies', 0);
    expect(onSummon).toHaveBeenCalledTimes(1);
    const [enemyId, positions] = onSummon.mock.calls[0] as [string, { x: number; y: number }[]];
    expect(enemyId).toBe('mummy');
    expect(positions).toHaveLength(D.summonMummies.count);
    const ring = spawnRadiusFor(ARENA_RECT);
    for (const p of positions) {
      expect(Math.hypot(p.x - CENTER.x, p.y - CENTER.y)).toBeCloseTo(ring);
      const outside = p.x < 0 || p.x > ARENA_RECT.width || p.y < 0 || p.y > ARENA_RECT.height;
      expect(outside).toBe(true);
    }
    // Calls only once per announcement.
    dog.onAttack('summonMummies', 0);
    expect(onSummon).toHaveBeenCalledTimes(1);
  });

  it('despawn clears shield, wave and invulnerability', () => {
    const { dog } = makeDog();
    raiseShield(dog);
    dog.onTelegraph(attack('guardBark'));
    dog.onAttack('guardBark', 15);
    expect(dog.getHazards().length).toBeGreaterThan(0);
    dog.despawn();
    expect(dog.getHazards()).toHaveLength(0);
    expect(dog.isInvulnerable).toBe(false);
  });
});
