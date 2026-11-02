import { describe, expect, it } from 'vitest';
import game from '../../src/scenes/GameScene.ts?raw';
import player from '../../src/entities/Player.ts?raw';

// GameScene cannot be imported in vitest, so the gear wiring (AP-143) is checked on the source text.

function body(src: string, name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

function publicBody(src: string, signature: string): string {
  const start = src.indexOf(`\n  ${signature}`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('gear at round start (AP-143)', () => {
  it('reads the gear once from the save and applies it after the upgrades', () => {
    const b = game.slice(
      game.indexOf('  create(): void {'),
      game.indexOf('private readonly sendHudStartState'),
    );
    expect(b.match(/loadSave\(\)/g)).toHaveLength(1);
    expect(b).toContain('gearModifiers(equipped)');
    expect(b).toContain('playerConfigFor(save.upgrades, this.gear)');
    expect(b).toContain('this.player.setGear(');
    expect(b).toContain('this.lasers.pierce = pierceCount(this.gear)');
    expect(b).toContain('withMagnetFactor(COIN_RULES, magnetFactor(this.gear))');
    expect(b).toContain('withLifetimeFactor(ITEM_RULES, itemLifetimeFactor(this.gear))');
    // The gear goes into the player before the HUD start values are taken (max HP with gear).
    expect(b.indexOf('this.playerConfig = playerConfigFor')).toBeLessThan(b.indexOf('hudData'));
  });

  it('items and armour pickups use the gear lifetime', () => {
    expect(body(game, 'spawnItem')).toContain('this.itemRules');
    expect(body(game, 'spawnArmourPickup')).toContain('this.itemRules');
  });

  it('the debug level still comes from the URL', () => {
    expect(game).toContain('resolveLevelId(data?.levelId, window.location.search)');
    expect(game).toContain('parseDebugLevel(window.location.search)');
  });
});

describe('damage path of the player (AP-143)', () => {
  it('all player damage goes through Player.takeDamage', () => {
    expect(body(game, 'applyAreaDamage')).toContain('this.player.takeDamage(damage)');
    expect(game).not.toMatch(/absorbDamage|resolveIncomingDamage/);
  });

  it('Player.takeDamage uses resolveIncomingDamage and consumes the set block', () => {
    const b = publicBody(player, 'takeDamage(');
    expect(b).toContain('this.resolveDamage(amount, overTime)');
    expect(b).toContain('consumeBlock()');
    const r = body(player, 'resolveDamage');
    expect(r).toContain('resolveIncomingDamage(amount, gear.modifiers, blockReady');
    expect(r).toContain('!overTime && gear.sets.blockReady()');
  });

  it('a blocked contact hit drops its status effect', () => {
    const b = body(game, 'applyAreaDamage');
    expect(b).toContain('landed ? this.player : NO_STATUS_TARGET');
  });

  it('thorns and knockback act on contact damage only, over the kill path', () => {
    const b = body(game, 'applyAreaDamage');
    expect(b.indexOf('this.contactRecoil(enemy)')).toBeGreaterThan(b.indexOf('if (dealt > 0)'));
    const r = body(game, 'contactRecoil');
    expect(r).toContain('thornsDamage(this.gear, this.player.stats.damage)');
    expect(r).toContain('knockbackVector(this.gear');
    expect(r).toContain('this.onEnemyKilled(enemy, x, y)');
  });
});

describe('laser hits (AP-143)', () => {
  it('a piercing laser hits every enemy once and is released when no pierce is left', () => {
    const start = game.indexOf('// Laser vs enemy');
    const b = game.slice(start, game.indexOf('// Laser vs item'));
    const has = b.indexOf('laser.hasHit(enemy)');
    const reg = b.indexOf('laser.registerHit(enemy)');
    const hit = b.indexOf('this.laserHitsEnemy(enemy, laser.damage)');
    expect(has).toBeGreaterThan(-1);
    expect(has).toBeLessThan(reg);
    expect(reg).toBeLessThan(hit);
  });

  it('crit and burn run over damageEnemy (same path as every laser hit)', () => {
    const b = body(game, 'laserHitsEnemy');
    expect(b).toContain('rollCrit(this.gear, this.rng)');
    expect(b).toContain("crit > 1 ? 'crit' : 'hit'");
    expect(b).toContain('this.damageEnemy(');
    expect(b).toContain('burnOnHit(this.gear, damage)');
    expect(b).toContain('enemy.applyBurn(burn)');
  });

  it('burn ticks and blasts deal damage over damageEnemy and only exist with the pieces', () => {
    const burn = body(game, 'applyBurnDamage');
    expect(burn).toContain('if (!this.hasBurn) return');
    expect(burn).toContain("this.damageEnemy(e, d, 'none')");
    const blast = body(game, 'updateBlasts');
    expect(blast).toContain('deathBlastTargets(this.gear');
    expect(blast).toContain('this.damageEnemy(t.enemy, hit.damage)');
    expect(body(game, 'onEnemyKilled')).toContain('if (this.blasts) this.pendingBlasts.push');
  });
});

describe('set effects (AP-143)', () => {
  it('the hell set ring runs on its own timer and never touches the item armour state', () => {
    const b = body(game, 'updateGearSets');
    expect(b).toContain(
      'this.setRingMsLeft = Math.max(this.setRingMsLeft, HELL_SET_RING.durationMs)',
    );
    expect(b).not.toMatch(/activateArmour|this\.armour\b|cooldown/);
    expect(b).toContain('this.player.heal(tick.regenHp)');
  });

  it('only one ring damages per frame (item ring first, else the set ring)', () => {
    const b = body(game, 'updateArmour');
    expect(b).toContain('itemActive ? def : setActive ? HELL_SET_RING : null');
    expect(b.match(/ringDamageFor\(/g)).toHaveLength(1);
  });
});

describe('no leftovers after "Nochmal" or abort (AP-143)', () => {
  it('init resets the gear state of the round', () => {
    const b = game.slice(
      game.indexOf('  init(data?: GameSceneData)'),
      game.indexOf('  create(): void {'),
    );
    for (const s of [
      'this.gearOverlay = undefined',
      'this.blasts = undefined',
      'this.pendingBlasts = []',
      'this.setRingMsLeft = 0',
      'this.ringShown = false',
      'this.hasBurn = false',
    ]) {
      expect(b).toContain(s);
    }
  });

  it('endRound stops the set ring and pending blasts', () => {
    const b = body(game, 'endRound');
    expect(b).toContain('this.setRingMsLeft = 0');
    expect(b).toContain('this.pendingBlasts = []');
  });

  it('cleanup removes the block callback, the gear and the gear objects', () => {
    const b = body(game, 'cleanup');
    expect(b).toContain('this.player.callbacks.onGearBlock = undefined');
    expect(b).toContain('this.player.setGear(null)');
    expect(b).toContain('this.gearOverlay?.destroy()');
    expect(b).toContain('this.blasts?.destroy()');
  });

  it('uses no timers or tweens for the gear effects (all on pausable play time)', () => {
    expect(game).not.toMatch(/time\.addEvent|time\.delayedCall|tweens\.add/);
  });
});
