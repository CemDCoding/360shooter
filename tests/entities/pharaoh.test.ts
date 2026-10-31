import { describe, expect, it, vi } from 'vitest';
import type { BossAttackDef } from '../../src/contracts';
import type { BossHazard } from '../../src/entities/bosses/hazards';

// Minimal Phaser stand-in: game objects only keep position, alpha, visibility and activity; drawing is a no-op.
vi.mock('phaser', () => {
  class GameObject {
    scene: unknown;
    x = 0;
    y = 0;
    alpha = 1;
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
    setAlpha(a: number): this {
      this.alpha = a;
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
    Math: { Vector2 },
  };
  return { default: Phaser };
});

const { Pharaoh } = await import('../../src/entities/bosses/Pharaoh');
const { BOSS_TUNING, BOSSES, MIN_REACTION_MS, MIN_TELEGRAPH_MS } =
  await import('../../src/config/bosses');
const { ARENA } = await import('../../src/config/arena');
const { MAPS } = await import('../../src/config/maps');
const { variantForLevel, availableAttacks, scaledHp } = await import('../../src/logic/boss');
const { circleHitsShape } = await import('../../src/entities/bosses/hazards');
const { HIDDEN_ALPHA, stormStyle } = await import('../../src/entities/bosses/pharaohStyle');
const { OPACITY } = await import('../../src/config/theme');

const P = BOSS_TUNING.pharaoh;
const WIDTHS = [ARENA.minWidth, ARENA.maxWidth];

const { Graphics } = (
  (await import('phaser')).default as unknown as {
    GameObjects: { Graphics: new (scene: unknown, x?: number, y?: number) => object };
  }
).GameObjects;

interface FakeGfx {
  alpha: number;
  visible: boolean;
}

function fakeScene() {
  const graphics: FakeGfx[] = [];
  const scene: Record<string, unknown> = {
    add: {
      existing: () => undefined,
      graphics: () => {
        const g = new Graphics(scene) as FakeGfx;
        graphics.push(g);
        return g;
      },
      sprite: (x: number, y: number) => new Graphics(scene, x, y),
    },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => false },
    textures: { get: () => ({ has: () => true }) },
    events: { on: () => undefined, off: () => undefined },
    tweens: { add: () => undefined, killTweensOf: () => undefined },
    time: { now: 0 },
  };
  return { scene, graphics };
}

interface PharaohInternals {
  onTelegraph(a: BossAttackDef): void;
  onAttack(id: string, damage: number): void;
  behave(dt: number): void;
  despawn(): void;
  spawn(x: number, y: number): void;
  isInvulnerable: boolean;
  isHidden: boolean;
  stormLevel: number;
  active: boolean;
  alpha: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  getHazards(): readonly BossHazard[];
  takeDamage(n: number): boolean;
}

function makePharaoh(levelId = 31, width: number = ARENA.baseWidth, r = 0.25) {
  const { scene, graphics } = fakeScene();
  const center = { x: width / 2, y: ARENA.height / 2 };
  const arena = { width, height: ARENA.height, margin: 16 };
  const boss = new Pharaoh(scene as never, levelId, {
    center,
    arena,
    rng: { next: () => r },
  }) as unknown as PharaohInternals;
  // On the rim to the right of the player (like the scene spawns it).
  boss.spawn(center.x + P.orbit.rx + (width - ARENA.baseWidth) / 2, center.y);
  return { boss, center, graphics };
}

const attack = (id: string): BossAttackDef => {
  const a = BOSSES.pharaoh.attacks.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
};

interface OrbLike {
  x: number;
  y: number;
  speed: number;
  ageMs: number;
  active: boolean;
}
const orbsOf = (b: PharaohInternals): OrbLike[] =>
  ((b as unknown as { orbs: OrbLike[] }).orbs ?? []).filter((o) => o.active);

/**
 * Runs the pharaoh and sums the damage of every orb touching the player (like the scene does). Also checks
 * fairness: every new orb needs at least MIN_REACTION_MS to the player's hit circle.
 */
function runFor(
  b: PharaohInternals,
  center: { x: number; y: number },
  ms: number,
  step = 16,
): number {
  const player = { ...center, radius: BOSS_TUNING.playerHitRadius };
  let dmg = 0;
  for (let t = 0; t < ms; t += step) {
    b.behave(step);
    for (const o of orbsOf(b)) {
      if (o.ageMs > step) continue;
      const d = Math.hypot(o.x - center.x, o.y - center.y) - player.radius - P.orbRadius;
      // The orb already flew ageMs, so add it back.
      expect((d / o.speed) * 1000 + o.ageMs).toBeGreaterThanOrEqual(MIN_REACTION_MS - 1e-6);
    }
    for (const h of b.getHazards()) {
      if (h.active && circleHitsShape(player, h.shape)) dmg += h.playerHit();
    }
  }
  return dmg;
}

const probeAt = (x: number, y: number) => ({
  rect: { left: x - 8, top: y - 2, right: x + 8, bottom: y + 2 },
  circle: { x, y, radius: 8 },
});

describe('Pharaoh (AP-104)', () => {
  it('announces every attack at least MIN_TELEGRAPH_MS; sandstorm is the extra attack', () => {
    for (const a of BOSSES.pharaoh.attacks) {
      expect(a.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    }
    expect(P.sandstorm.shotWarnMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    expect(attack('goldCurse').extraOnly).toBe(false);
    expect(attack('sarcophagus').extraOnly).toBe(false);
    expect(attack('sandstorm').extraOnly).toBe(true);
    const ids = (lvl: number) =>
      availableAttacks(BOSSES.pharaoh, variantForLevel(lvl)).map((a) => a.id);
    expect(ids(31)).not.toContain('sandstorm');
    expect(ids(32)).not.toContain('sandstorm');
    expect(ids(33)).toContain('sandstorm');
    expect(ids(40)).toContain('sandstorm');
  });

  it('HP curve over 10 levels (PE-33): index 9 at level 40 gives +135 %', () => {
    expect(variantForLevel(31).index).toBe(0);
    expect(variantForLevel(40).index).toBe(9);
    expect(variantForLevel(40).hpMultiplier).toBeCloseTo(2.35);
    expect(scaledHp(BOSSES.pharaoh, variantForLevel(40))).toBe(3995);
  });

  it('floats on its path around the player and stays clear of her', () => {
    const { boss, center } = makePharaoh();
    const x0 = boss.x;
    expect(runFor(boss, center, 2000)).toBe(0);
    expect(boss.x).not.toBe(x0);
    expect(Math.hypot(boss.x - center.x, boss.y - center.y)).toBeGreaterThanOrEqual(
      P.orbit.ry - 1e-6,
    );
  });

  it.each(WIDTHS)(
    'goldCurse (width %i): holds while announced, spiral orbs keep MIN_REACTION_MS',
    (width) => {
      const { boss, center } = makePharaoh(31, width);
      boss.onTelegraph(attack('goldCurse'));
      const pos = { x: boss.x, y: boss.y };
      expect(runFor(boss, center, attack('goldCurse').telegraphMs)).toBe(0);
      expect({ x: boss.x, y: boss.y }).toEqual(pos);
      expect(boss.getHazards()).toHaveLength(0);
      boss.onAttack('goldCurse', 10);
      expect(boss.getHazards()).toHaveLength(P.goldCurse.arms);
      // Nothing reaches the player within the reaction time.
      expect(runFor(boss, center, MIN_REACTION_MS)).toBe(0);
      const total = runFor(boss, center, P.orbLifeMs);
      // The arm sweeps across the player: she gets hit if she does not shoot, but only by a few orbs.
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(10 * 3);
    },
  );

  it('goldCurse: the spiral has gaps (fewer orbs than a full ring) and orbs are shootable', () => {
    const { boss, center } = makePharaoh();
    boss.onTelegraph(attack('goldCurse'));
    boss.onAttack('goldCurse', 10);
    const hazards = boss.getHazards();
    expect(hazards.every((h) => h.shootable)).toBe(true);
    const h = hazards[0];
    if (h.shape.kind !== 'circle') throw new Error('orb is a circle');
    expect(h.laserHit(probeAt(h.shape.x, h.shape.y))).toBe(true);
    expect(boss.getHazards()).toHaveLength(P.goldCurse.arms - 1);
    // Shooting every orb that comes close keeps the player unhurt.
    let dmg = 0;
    for (let t = 0; t < P.orbLifeMs; t += 16) {
      boss.behave(16);
      for (const z of boss.getHazards()) {
        if (z.shape.kind !== 'circle') continue;
        if (Math.hypot(z.shape.x - center.x, z.shape.y - center.y) < 60) {
          z.laserHit(probeAt(z.shape.x, z.shape.y));
        }
        const pl = { ...center, radius: BOSS_TUNING.playerHitRadius };
        if (z.active && circleHitsShape(pl, z.shape)) dmg += z.playerHit();
      }
    }
    expect(dmg).toBe(0);
  });

  it('sarcophagus: fades out invulnerable, reappears at the announced spot, vulnerable again', () => {
    const { boss, center } = makePharaoh();
    const from = { x: boss.x, y: boss.y };
    boss.onTelegraph(attack('sarcophagus'));
    expect(boss.isHidden).toBe(true);
    expect(boss.isInvulnerable).toBe(true);
    expect(boss.alpha).toBe(HIDDEN_ALPHA);
    expect(HIDDEN_ALPHA).toBe(OPACITY.ghost);
    const hp = boss.hp;
    expect(boss.takeDamage(100)).toBe(false);
    expect(boss.hp).toBe(hp);
    runFor(boss, center, attack('sarcophagus').telegraphMs - 16);
    expect({ x: boss.x, y: boss.y }).toEqual(from);
    boss.onAttack('sarcophagus', 0);
    expect(boss.isHidden).toBe(false);
    expect(boss.isInvulnerable).toBe(false);
    expect(boss.alpha).toBe(1);
    // A quarter turn or more away on the path, never on the player.
    expect(Math.hypot(boss.x - from.x, boss.y - from.y)).toBeGreaterThan(100);
    expect(Math.hypot(boss.x - center.x, boss.y - center.y)).toBeGreaterThanOrEqual(
      P.orbit.ry - 1e-6,
    );
    boss.takeDamage(100);
    expect(boss.hp).toBeLessThan(hp);
  });

  it('sarcophagus: never endless, the pharaoh reappears on its own after the safety time', () => {
    const { boss, center } = makePharaoh();
    boss.onTelegraph(attack('sarcophagus'));
    runFor(boss, center, attack('sarcophagus').telegraphMs + P.sarcophagus.maxHiddenExtraMs + 32);
    expect(boss.isHidden).toBe(false);
    expect(boss.isInvulnerable).toBe(false);
  });

  it('stays defeatable: lasers kill it outside the sarcophagus', () => {
    const { boss } = makePharaoh(40);
    let killed = false;
    for (let i = 0; i < 1000 && !killed; i++) killed = boss.takeDamage(50);
    expect(killed).toBe(true);
    expect(boss.active).toBe(false);
  });

  it.each(WIDTHS)(
    'sandstorm (width %i): edge darkens, single announced shots from the edge keep MIN_REACTION_MS',
    (width) => {
      const { boss, center } = makePharaoh(33, width);
      boss.onTelegraph(attack('sandstorm'));
      runFor(boss, center, attack('sandstorm').telegraphMs / 2);
      expect(boss.stormLevel).toBeGreaterThan(0);
      expect(boss.stormLevel).toBeLessThan(1);
      runFor(boss, center, attack('sandstorm').telegraphMs / 2);
      expect(boss.getHazards()).toHaveLength(0);
      boss.onAttack('sandstorm', 8);
      expect(boss.stormLevel).toBe(1);
      // Every shot is announced first: no orb before shotWarnMs.
      runFor(boss, center, P.sandstorm.shotWarnMs - 16);
      expect(boss.getHazards()).toHaveLength(0);
      runFor(boss, center, 32);
      const first = orbsOf(boss);
      expect(first).toHaveLength(1);
      // Comes from the edge of the arena (it may already have flown one step, a few px).
      const o = first[0];
      const e = 16 + 8;
      const nearEdge = o.x <= e || o.y <= e || o.x >= width - e || o.y >= ARENA.height - e;
      expect(nearEdge).toBe(true);
      // Not shot down, every shot reaches the player once.
      const dmg = runFor(boss, center, P.sandstorm.durationMs + P.orbLifeMs);
      expect(dmg).toBeCloseTo(8 * P.sandstorm.shots);
      runFor(boss, center, P.sandstorm.fadeOutMs + 32);
      expect(boss.stormLevel).toBe(0);
    },
  );

  it('sandstorm: darkens with the ground token and vignette of the running map (no new colour)', () => {
    expect(stormStyle(33)).toEqual({ color: MAPS.oasis.baseColor, strength: MAPS.oasis.vignette });
    const { boss, center, graphics } = makePharaoh(33);
    const fx = graphics[0];
    expect(fx.visible).toBe(false);
    boss.onTelegraph(attack('sandstorm'));
    boss.onAttack('sandstorm', 8);
    runFor(boss, center, 16);
    expect(fx.visible).toBe(true);
    expect(fx.alpha).toBe(1);
  });

  it('sandstorm with prefers-reduced-motion: switches without fading (no flicker)', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      const { boss, center } = makePharaoh(33);
      boss.onTelegraph(attack('sandstorm'));
      runFor(boss, center, 16);
      expect(boss.stormLevel).toBe(1);
      boss.onAttack('sandstorm', 8);
      runFor(boss, center, P.sandstorm.durationMs + P.sandstorm.shotWarnMs + 32);
      expect(boss.stormLevel).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('despawn clears orbs, storm, sarcophagus and invulnerability', () => {
    const { boss, center } = makePharaoh(33);
    boss.onTelegraph(attack('goldCurse'));
    boss.onAttack('goldCurse', 10);
    boss.onTelegraph(attack('sandstorm'));
    runFor(boss, center, 100);
    boss.onTelegraph(attack('sarcophagus'));
    expect(boss.getHazards().length).toBeGreaterThan(0);
    boss.despawn();
    expect(boss.getHazards()).toHaveLength(0);
    expect(boss.isInvulnerable).toBe(false);
    expect(boss.isHidden).toBe(false);
    expect(boss.stormLevel).toBe(0);
    expect(boss.alpha).toBe(1);
  });
});
