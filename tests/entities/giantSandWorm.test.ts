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

const { GiantSandWorm } = await import('../../src/entities/bosses/GiantSandWorm');
const { BOSS_TUNING, BOSSES, MIN_TELEGRAPH_MS } = await import('../../src/config/bosses');

const W = BOSS_TUNING.giantSandWorm;
const CENTER = { x: 320, y: 180 };
const PLAYER = { x: 320, y: 180, radius: 10 };

// The mocked Graphics class (a plain game object) from the phaser stand-in.
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

interface WormInternals {
  onTelegraph(a: BossAttackDef): void;
  onAttack(id: string, damage: number): void;
  behave(dt: number): void;
  isInvulnerable: boolean;
  visible: boolean;
  x: number;
  y: number;
  getHazards(): readonly BossHazard[];
  takeDamage(n: number): boolean;
  isCoiling: boolean;
  hp: number;
  maxHp: number;
}

function makeWorm(levelId = 21) {
  const scene = fakeScene();
  const worm = new GiantSandWorm(scene as never, levelId, {
    center: CENTER,
    rng: { next: () => 0.25 },
  }) as unknown as WormInternals & { spawn(x: number, y: number): void };
  worm.spawn(CENTER.x + 150, CENTER.y);
  return worm;
}

const attack = (id: string): BossAttackDef => {
  const a = BOSSES.giantSandWorm.attacks.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
};

const touches = (h: BossHazard, p: { x: number; y: number; radius: number }): boolean =>
  h.shape.kind === 'circle' &&
  Math.hypot(h.shape.x - p.x, h.shape.y - p.y) <= h.shape.radius + p.radius;

const probeAt = (x: number, y: number) => ({
  rect: { left: x - 8, top: y - 2, right: x + 8, bottom: y + 2 },
  circle: { x, y, radius: 8 },
});

/** Runs the worm and sums the damage of every hazard touching the player (like the scene does). */
function runFor(worm: WormInternals, ms: number, step = 16): number {
  let dmg = 0;
  for (let t = 0; t < ms; t += step) {
    worm.behave(step);
    for (const h of worm.getHazards()) if (h.active && touches(h, PLAYER)) dmg += h.playerHit();
  }
  return dmg;
}

describe('GiantSandWorm (AP-100)', () => {
  it('announces every attack at least MIN_TELEGRAPH_MS', () => {
    for (const a of BOSSES.giantSandWorm.attacks) {
      expect(a.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    }
  });

  it('roams with its body links behind the head', () => {
    const worm = makeWorm();
    runFor(worm, 500);
    const links = worm.getHazards();
    expect(links).toHaveLength(W.segmentCount);
    expect(links.every((h) => h.shootable)).toBe(true);
  });

  it('burrow: invulnerable and hidden under the sand, hurts once only in the announced circle', () => {
    const worm = makeWorm();
    const before = runFor(worm, 100);
    expect(before).toBe(0);
    worm.onTelegraph(attack('burrow'));
    expect(worm.isInvulnerable).toBe(true);
    expect(worm.visible).toBe(false);
    // Nothing hurts during the dive; only the sand mound is there (no body links shown).
    const hazards = worm.getHazards();
    expect(hazards).toHaveLength(1);
    expect(hazards[0].shootable).toBe(true);
    expect(runFor(worm, attack('burrow').telegraphMs)).toBe(0);
    worm.onAttack('burrow', 18);
    expect(worm.isInvulnerable).toBe(false);
    expect(worm.visible).toBe(true);
    expect(Math.hypot(worm.x - CENTER.x, worm.y - CENTER.y)).toBeCloseTo(W.burrow.emergeDistance);
    expect(runFor(worm, W.burrow.eruptMs + 100)).toBeCloseTo(18);
  });

  it('burrow: laser hits on the sand mound weaken and finally cancel the break-out', () => {
    const worm = makeWorm();
    worm.onTelegraph(attack('burrow'));
    for (let i = 0; i < W.burrow.moundHits; i++) {
      const mound = worm.getHazards()[0];
      expect(mound.laserHit(probeAt(0, 0))).toBe(true);
    }
    expect(worm.getHazards()).toHaveLength(0);
    runFor(worm, attack('burrow').telegraphMs);
    worm.onAttack('burrow', 18);
    expect(runFor(worm, W.burrow.eruptMs + 100)).toBe(0);
  });

  it('spikeVolley: fires a fan of shootable spikes that need at least MIN_REACTION_MS', () => {
    const worm = makeWorm();
    worm.onTelegraph(attack('spikeVolley'));
    worm.onAttack('spikeVolley', 10);
    const spikes = () =>
      worm
        .getHazards()
        .filter((h) => h.shape.kind === 'circle' && h.shape.radius === W.volley.spikeRadius);
    expect(spikes()).toHaveLength(W.volley.count);
    // No spike reaches the player within the reaction time.
    expect(runFor(worm, 984)).toBe(0);
    // One is shot down, the middle one would hit later.
    const first = spikes()[0];
    const s = first.shape as { x: number; y: number };
    expect(first.laserHit(probeAt(s.x, s.y))).toBe(true);
    expect(first.active).toBe(false);
    expect(runFor(worm, 3000)).toBeGreaterThan(0);
  });

  it('coil: links bounce lasers off, the ring squeezes onto the player after the announcement', () => {
    const worm = makeWorm(23);
    worm.onTelegraph(attack('coil'));
    expect(worm.isCoiling).toBe(true);
    expect(runFor(worm, attack('coil').telegraphMs)).toBe(0);
    worm.onAttack('coil', 15);
    const hpBefore = worm.hp;
    const link = worm.getHazards()[0];
    expect(link.laserHit(probeAt(0, 0))).toBe(true); // bounced: laser used up
    expect(worm.hp).toBe(hpBefore); // no damage to the boss
    // Reaction time: nothing reaches the player in the first second.
    expect(runFor(worm, 1000)).toBe(0);
    const dmg = runFor(worm, 1500);
    expect(dmg).toBeCloseTo(15 * W.coil.damageShare * W.segmentCount);
    expect(worm.isCoiling).toBe(false);
  });

  it('coil: head hits weaken it and enough hits break it up', () => {
    const worm = makeWorm(23);
    worm.onTelegraph(attack('coil'));
    worm.onAttack('coil', 15);
    for (let i = 0; i < W.coil.breakHits; i++) worm.takeDamage(1);
    expect(worm.isCoiling).toBe(false);
    expect(runFor(worm, 3000)).toBe(0);
  });
});
