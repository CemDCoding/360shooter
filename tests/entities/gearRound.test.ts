import { describe, expect, it, vi } from 'vitest';
import { COIN_RULES, ITEM_RULES } from '../../src/config';
import { THEME } from '../../src/config/theme';
import type { EquippedGear, UpgradeLevels } from '../../src/contracts';
import { withMagnetFactor } from '../../src/entities/CoinPool';
import { withLifetimeFactor } from '../../src/entities/ItemPickup';
import { Laser } from '../../src/entities/Laser';
import { hitPlayer, playerConfigFor } from '../../src/entities/Player';
import { ChaseEnemy } from '../../src/entities/enemies/ChaseEnemy';
import { Enemy } from '../../src/entities/enemies/Enemy';
import { burnOnHit, gearModifiers, itemLifetimeFactor, magnetFactor } from '../../src/logic/gear';
import { upgradeFactors } from '../../src/logic/upgrades';
import { weaponStageForUpgrades } from '../../src/logic/weaponMount';
import { bodyOf, CENTER, sceneOf, simulate } from './enemies/helpers';
import { makeScene, type StubScene } from './enemies/phaserStub';

vi.mock('phaser', () => import('./enemies/phaserStub'));

const NONE: EquippedGear = { head: null, body: null, legs: null };
const HELL: EquippedGear = {
  head: 'gear-hell-head',
  body: 'gear-hell-body',
  legs: 'gear-hell-legs',
};
const HEAVEN: EquippedGear = {
  head: 'gear-heaven-head',
  body: 'gear-heaven-body',
  legs: 'gear-heaven-legs',
};

/** The player values before AP-143 (GameScene.playerConfigFrom), for the "identical without gear" check. */
function oldConfig(levels: UpgradeLevels) {
  const f = upgradeFactors(levels);
  return {
    maxHp: f.playerMaxHp,
    turnSpeedDegPerSec: f.playerTurnSpeedDegPerSec,
    weaponFireRateMult: f.weaponFireRateMult,
    weaponDamageMult: f.weaponDamageMult,
    weaponStage: weaponStageForUpgrades(levels),
  };
}

describe('round values with gear (AP-143)', () => {
  const levelSets: UpgradeLevels[] = [
    { weaponFireRate: 0, weaponDamage: 0, playerMaxHp: 0, playerTurnSpeed: 0 },
    { weaponFireRate: 3, weaponDamage: 7, playerMaxHp: 2, playerTurnSpeed: 5 },
    { weaponFireRate: 10, weaponDamage: 10, playerMaxHp: 10, playerTurnSpeed: 10 },
  ];

  it('without gear the values equal the upgrade values exactly', () => {
    for (const levels of levelSets) {
      expect(playerConfigFor(levels, gearModifiers(NONE))).toEqual(oldConfig(levels));
    }
    expect(playerConfigFor(undefined, gearModifiers(NONE))).toEqual(oldConfig(levelSets[0]!));
  });

  it('applies the gear after the gold upgrades', () => {
    const levels = levelSets[1]!;
    const base = oldConfig(levels);
    const hell = playerConfigFor(levels, gearModifiers(HELL));
    expect(hell.weaponDamageMult).toBeCloseTo(base.weaponDamageMult * 1.1 * 1.1 * 1.05);
    expect(hell.maxHp).toBe(base.maxHp);
    const diamond = playerConfigFor(
      levels,
      gearModifiers({ head: 'gear-diamond-head', body: null, legs: 'gear-diamond-legs' }),
    );
    expect(diamond.maxHp).toBe(base.maxHp + 20);
    const heaven = playerConfigFor(levels, gearModifiers(HEAVEN));
    expect(heaven.turnSpeedDegPerSec).toBeCloseTo(base.turnSpeedDegPerSec * 1.1 * 1.1);
    expect(heaven.weaponFireRateMult).toBeCloseTo(base.weaponFireRateMult * 1.1);
    expect(heaven.weaponStage).toBe(base.weaponStage);
  });

  it('coin magnet and item lifetime stay untouched without gear', () => {
    expect(withMagnetFactor(COIN_RULES, magnetFactor(gearModifiers(NONE)))).toBe(COIN_RULES);
    expect(withLifetimeFactor(ITEM_RULES, itemLifetimeFactor(gearModifiers(NONE)))).toBe(
      ITEM_RULES,
    );
  });

  it('heaven legs widen the magnet and lengthen the item lifetime by their factors', () => {
    const m = gearModifiers(HEAVEN);
    expect(withMagnetFactor(COIN_RULES, magnetFactor(m)).magnetRadiusPx).toBeCloseTo(
      COIN_RULES.magnetRadiusPx * 1.5,
    );
    expect(withLifetimeFactor(ITEM_RULES, itemLifetimeFactor(m)).lifetimeMs).toBeCloseTo(
      ITEM_RULES.lifetimeMs * 1.5,
    );
    expect(withMagnetFactor(COIN_RULES, Number.NaN)).toBe(COIN_RULES);
    expect(withLifetimeFactor(ITEM_RULES, -2)).toBe(ITEM_RULES);
  });
});

describe('hitPlayer with a gear block (AP-143)', () => {
  it('a blocked hit brings no status effect', () => {
    const applyStatus = vi.fn();
    hitPlayer({ takeDamage: () => false, applyStatus }, 5, {
      poison: { dps: 1, durationMs: 1000 },
    } as never);
    expect(applyStatus).not.toHaveBeenCalled();
  });

  it('a landed hit (true or no answer) still applies the status', () => {
    const applyStatus = vi.fn();
    hitPlayer({ takeDamage: () => true, applyStatus }, 5, undefined);
    hitPlayer({ takeDamage: () => undefined, applyStatus }, 5, undefined);
    expect(applyStatus).toHaveBeenCalledTimes(2);
  });
});

describe('piercing laser (AP-143)', () => {
  const laser = () => new Laser(sceneOf(makeScene()), 0, 0);

  it('without pierce the first hit releases the laser', () => {
    const l = laser();
    const a = {};
    expect(l.registerHit(a)).toBe(false);
    expect(l.hasHit(a)).toBe(false);
  });

  it('passes through one more enemy and never hits the same enemy twice', () => {
    const l = laser();
    l.pierceLeft = 1;
    const a = {};
    const b = {};
    expect(l.registerHit(a)).toBe(true);
    expect(l.hasHit(a)).toBe(true);
    expect(l.hasHit(b)).toBe(false);
    expect(l.registerHit(b)).toBe(false);
  });
});

/** Stub scene that can also create sprites (burn mark). */
function sceneWithSprites(): StubScene & { sprites: object[] } {
  const scene = makeScene() as StubScene & { sprites: object[] };
  scene.sprites = [];
  const add = scene.add as unknown as Record<string, unknown>;
  add.sprite = () => {
    const s = {
      visible: true,
      x: 0,
      y: 0,
      depth: 0,
      anim: undefined as string | undefined,
      destroyed: false,
      setVisible(v: boolean) {
        s.visible = v;
        return s;
      },
      setDepth(d: number) {
        s.depth = d;
        return s;
      },
      setPosition(x: number, y: number) {
        s.x = x;
        s.y = y;
        return s;
      },
      play(k: string) {
        s.anim = k;
        return s;
      },
      destroy() {
        s.destroyed = true;
      },
    };
    scene.sprites.push(s);
    return s;
  };
  return scene;
}

const tintOf = (e: object) => e as unknown as { tint?: number; tintMode?: string };

describe('enemy burn, slow, crit flash and recoil (AP-143)', () => {
  const make = (scene: StubScene = sceneWithSprites()) => {
    const e = new ChaseEnemy(sceneOf(scene), 'cursedTree', { center: CENTER });
    e.spawn(100, 100);
    return e;
  };
  const burn = burnOnHit(gearModifiers(HELL))!;

  it('burns for 3 s at 5 per second, the scene takes the damage', () => {
    const e = make();
    e.applyBurn(burn);
    expect(e.isBurning).toBe(true);
    let total = 0;
    simulate(e, 4000, 16, () => {
      total += e.takeBurnDamage();
    });
    expect(total).toBeCloseTo(15, 5);
    expect(e.isBurning).toBe(false);
    expect(e.takeBurnDamage()).toBe(0);
  });

  it('a second burn refreshes and does not stack', () => {
    const e = make();
    e.applyBurn(burn);
    simulate(e, 1000);
    e.applyBurn(burn);
    let total = e.takeBurnDamage();
    simulate(e, 5000, 16, () => {
      total += e.takeBurnDamage();
    });
    // 1008 ms (16 ms steps) of the first burn plus 3 s of the refreshed one, not 15 + 15.
    expect(total).toBeCloseTo(20.04, 5);
  });

  it('creates the burn mark only on the first burn and hides it when it ends or on despawn', () => {
    const scene = sceneWithSprites();
    const e = make(scene);
    expect(scene.sprites).toHaveLength(0);
    e.applyBurn(burn);
    expect(scene.sprites).toHaveLength(1);
    const mark = scene.sprites[0] as { visible: boolean; y: number };
    expect(mark.visible).toBe(true);
    expect(mark.y).toBeLessThan(e.y);
    simulate(e, 3100);
    expect(mark.visible).toBe(false);
    e.applyBurn(burn);
    expect(scene.sprites).toHaveLength(1);
    expect(mark.visible).toBe(true);
    e.despawn();
    expect(mark.visible).toBe(false);
    e.spawn(100, 100);
    expect(e.isBurning).toBe(false);
  });

  it('slow lowers the walking speed and ends after its time', () => {
    const e = make();
    simulate(e, 16);
    const full = Math.hypot(bodyOf(e).velocity.x, bodyOf(e).velocity.y);
    e.applySlow({ slow: 0.4, durationMs: 500 });
    expect(e.speedFactor).toBeCloseTo(0.6);
    simulate(e, 16);
    const slow = Math.hypot(bodyOf(e).velocity.x, bodyOf(e).velocity.y);
    expect(slow).toBeCloseTo(full * 0.6, 3);
    simulate(e, 600);
    expect(e.speedFactor).toBe(1);
  });

  it('a critical hit flashes golden and returns to the tier tint', () => {
    const scene = sceneWithSprites();
    const e = new ChaseEnemy(sceneOf(scene), 'cursedTree', { center: CENTER });
    e.spawn(100, 100, 1, 2);
    e.takeDamage(1, 'crit');
    expect(tintOf(e).tint).toBe(THEME.colors['game.crit'].num);
    expect(tintOf(e).tintMode).toBe('fill');
    simulate(e, 200);
    expect(tintOf(e).tint).toBe(THEME.colors['game.tier-2'].num);
    e.takeDamage(1);
    expect(tintOf(e).tint).toBe(THEME.colors['game.hit-flash'].num);
  });

  it('burn ticks deal damage without a flash', () => {
    const e = make();
    e.takeDamage(1, 'none');
    expect(tintOf(e).tintMode).toBeUndefined();
    expect(e.hp).toBe(e.def.hp - 1);
  });

  it('recoil pushes and damages at most once per gap, also during the contact flash', () => {
    const onDeath = vi.fn();
    const e = new ChaseEnemy(sceneOf(sceneWithSprites()), 'cursedTree', {
      center: CENTER,
      onDeath,
    }) as Enemy;
    e.spawn(100, 100);
    expect(e.contactDamageFor(16)).toBeGreaterThan(0);
    expect(e.takeDamage(1000)).toBe(false);
    expect(e.recoil(5, 10, 0)).toBe(false);
    expect(e.x).toBe(110);
    expect(e.hp).toBe(e.def.hp - 5);
    expect(e.recoil(5, 10, 0)).toBe(false);
    expect(e.x).toBe(110);
    simulate(e, 100);
    e.spawn(100, 100);
    expect(e.recoil(e.def.hp, 0, 0)).toBe(true);
    expect(onDeath).toHaveBeenCalledTimes(1);
  });

  it('recoil without damage and push does nothing', () => {
    const e = make();
    expect(e.recoil(0, 0, 0)).toBe(false);
    expect(e.hp).toBe(e.def.hp);
  });
});
