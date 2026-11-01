import { describe, expect, it, vi } from 'vitest';
import { THEME } from '../../../src/config/theme';
import { ENEMIES } from '../../../src/config/enemies';
import { AuraEnemy } from '../../../src/entities/enemies/AuraEnemy';
import { ChaseEnemy } from '../../../src/entities/enemies/ChaseEnemy';
import { ForestWitch } from '../../../src/entities/enemies/ForestWitch';
import { WitchBoltPool } from '../../../src/entities/enemies/WitchBoltPool';
import { tierTintColor, tierTintToken } from '../../../src/entities/enemies/tierTint';
import { DEFAULT_ENEMY_SCALE, enemyScaleFor } from '../../../src/logic/scaling';
import { CENTER, sceneOf, simulate } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

const tintOf = (e: object) => e as unknown as { tint?: number; tintMode?: string };
const FLASH = THEME.colors['game.hit-flash'].num;

describe('tier tint tokens (AP-134)', () => {
  it('maps stages 0, 1, 2, 3, 4 and 9 to the tier tokens', () => {
    expect(tierTintToken(0)).toBe('game.tier-0');
    expect(tierTintToken(1)).toBe('game.tier-1');
    expect(tierTintToken(2)).toBe('game.tier-2');
    expect(tierTintToken(3)).toBe('game.tier-3');
    expect(tierTintToken(4)).toBe('game.tier-3');
    expect(tierTintToken(9)).toBe('game.tier-3');
  });

  it('treats broken steps as 0 and gives no colour for step 0', () => {
    expect(tierTintToken(-2)).toBe('game.tier-0');
    expect(tierTintToken(Number.NaN)).toBe('game.tier-0');
    expect(tierTintColor(0)).toBeNull();
    expect(tierTintColor(1)).toBe(THEME.colors['game.tier-1'].num);
    expect(tierTintColor(9)).toBe(THEME.colors['game.tier-3'].num);
  });
});

describe('enemy tint (AP-134)', () => {
  const chase = () => new ChaseEnemy(sceneOf(makeScene()), 'cursedTree', { center: CENTER });

  it('stage 0 stays untinted, other stages tint multiplicatively', () => {
    const e = chase();
    e.spawn(100, 100);
    expect(tintOf(e).tint).toBeUndefined();
    e.spawn(100, 100, 1, 2);
    expect(tintOf(e).tint).toBe(THEME.colors['game.tier-2'].num);
    expect(tintOf(e).tintMode).toBe('multiply');
  });

  it('returns to the tier tint after the hit flash', () => {
    const e = chase();
    e.spawn(100, 100, 1, 3);
    e.takeDamage(1);
    expect(tintOf(e).tint).toBe(FLASH);
    expect(tintOf(e).tintMode).toBe('fill');
    simulate(e, 200);
    expect(tintOf(e).tint).toBe(THEME.colors['game.tier-3'].num);
    expect(tintOf(e).tintMode).toBe('multiply');
  });

  it('returns to no tint after the flash in stage 0', () => {
    const e = chase();
    e.spawn(100, 100);
    e.takeDamage(1);
    simulate(e, 200);
    expect(tintOf(e).tint).toBeUndefined();
  });

  it('a pooled enemy takes the new tint on respawn (also back to none)', () => {
    const e = chase();
    e.spawn(100, 100, 1, 3);
    e.despawn();
    e.spawn(100, 100, 1, 1);
    expect(tintOf(e).tint).toBe(THEME.colors['game.tier-1'].num);
    e.despawn();
    e.spawn(100, 100);
    expect(tintOf(e).tint).toBeUndefined();
  });

  it('boss summons use the default scale: no tint, shot 1', () => {
    expect(DEFAULT_ENEMY_SCALE.tintStep).toBe(0);
    expect(DEFAULT_ENEMY_SCALE.shot).toBe(1);
  });
});

describe('tier damage on aura and bolts (AP-134, V-24 (a))', () => {
  const auraId = (Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]).find((id) => ENEMIES[id].aura)!;
  const aura = ENEMIES[auraId].aura!;

  it('auraDamageAt: stage 0 unchanged, stage n multiplied by the damage factor', () => {
    const e = new AuraEnemy(sceneOf(makeScene()), auraId, { center: CENTER });
    for (const level of [0, 5, 6, 9]) {
      const scale = enemyScaleFor(level);
      e.spawn(100, 100, 1, scale.tintStep, scale.shot);
      expect(e.auraDamageAt(100, 100, 1000)).toBeCloseTo(aura.dps * scale.shot);
    }
    e.spawn(100, 100);
    expect(e.auraDamageAt(100, 100, 1000)).toBeCloseTo(aura.dps);
  });

  it('forest witch bolt damage: stage 0 unchanged, stage n times the damage factor', () => {
    const base = ENEMIES.forestWitch.projectile!;
    for (const level of [0, 5, 6, 9]) {
      const scale = enemyScaleFor(level);
      const scene = makeScene({ 'witch-bolt': [8, 8] });
      const pool = new WitchBoltPool(sceneOf(scene));
      const witch = new ForestWitch(sceneOf(scene), 'forestWitch', {
        center: CENTER,
        boltPool: pool,
      });
      witch.spawn(CENTER.x + base.keepDistance - 10, CENTER.y, 1, scale.tintStep, scale.shot);
      for (let t = 0; t < base.intervalMs + 100 && !pool.bolts.some((b) => b.active); t += 16) {
        simulate(witch, 16);
      }
      expect(pool.bolts[0]!.damage).toBeCloseTo(base.damage * scale.shot);
    }
  });

  it('a pooled shooter or aura enemy respawned without scale deals the base damage again', () => {
    const e = new AuraEnemy(sceneOf(makeScene()), auraId, { center: CENTER });
    e.spawn(100, 100, 1, 3, 1.5);
    e.despawn();
    e.spawn(100, 100);
    expect(e.auraDamageAt(100, 100, 1000)).toBeCloseTo(aura.dps);
  });
});
