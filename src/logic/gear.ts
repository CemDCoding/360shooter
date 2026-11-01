/**
 * Bought gear (M8, AP-138, PE-169): stat sums, single-piece effects and set effects.
 * Pure logic, no Phaser, no wall clock; randomness only via `Rng`.
 *
 * Neutral rule: with empty gear every function returns neutral values and draws no random
 * number, so a round without gear runs exactly as before (same Rng sequence).
 */
import type {
  ActivePowers,
  EquippedGear,
  GearEffectDef,
  GearModifiers,
  GearSet,
  GearSetBonusDef,
  GearSlot,
} from '../contracts';
import {
  GEAR_SETS,
  GEAR_SET_BONUSES,
  GEAR_SET_LABELS,
  GEAR_SLOTS,
  getGearPiece,
} from '../config/gear';
import { circlesOverlap } from './geometry';
import { absorbDamage } from './powers';
import type { Rng } from './rng';
import type { UpgradeFactors } from './upgrades';

/** Pieces of one set needed for the set effect. */
export const GEAR_SET_SIZE = GEAR_SLOTS.length;

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Equipped piece of a slot; unknown ids or pieces in the wrong slot count as empty. */
function pieceIn(equipped: EquippedGear, slot: GearSlot) {
  const id = equipped[slot];
  if (id === null || id === undefined) return undefined;
  const piece = getGearPiece(id);
  return piece && piece.slot === slot ? piece : undefined;
}

function setCounts(equipped: EquippedGear): Record<GearSet, number> {
  const counts: Record<GearSet, number> = { diamond: 0, hell: 0, heaven: 0 };
  for (const slot of GEAR_SLOTS) {
    const piece = pieceIn(equipped, slot);
    if (piece) counts[piece.set] += 1;
  }
  return counts;
}

/** Sum of the equipped gear: multipliers multiply, `maxHpAdd` adds; set bonus only for a full set. */
export function gearModifiers(equipped: EquippedGear): GearModifiers {
  const m: GearModifiers = {
    maxHpAdd: 0,
    damageMul: 1,
    fireRateMul: 1,
    turnSpeedMul: 1,
    damageTakenMul: 1,
    effects: [],
    setBonuses: [],
  };
  for (const slot of GEAR_SLOTS) {
    const piece = pieceIn(equipped, slot);
    if (!piece) continue;
    const s = piece.stats;
    m.maxHpAdd += s.maxHpAdd ?? 0;
    m.damageMul *= s.damageMul ?? 1;
    m.fireRateMul *= s.fireRateMul ?? 1;
    m.turnSpeedMul *= s.turnSpeedMul ?? 1;
    m.damageTakenMul *= s.damageTakenMul ?? 1;
    m.effects.push(piece.effect);
  }
  const counts = setCounts(equipped);
  for (const bonus of GEAR_SET_BONUSES) {
    if (counts[bonus.set] >= GEAR_SET_SIZE) m.setBonuses.push(bonus);
  }
  return m;
}

export interface SetProgress {
  set: GearSet;
  count: number;
  total: number;
  complete: boolean;
  /** Hint like "SET HÖLLE 2/3". */
  text: string;
}

/** Progress of every set with at least one equipped piece; most pieces first, then set order. */
export function setProgress(equipped: EquippedGear): SetProgress[] {
  const counts = setCounts(equipped);
  return GEAR_SETS.filter((set) => counts[set] > 0)
    .map((set) => ({
      set,
      count: counts[set],
      total: GEAR_SET_SIZE,
      complete: counts[set] >= GEAR_SET_SIZE,
      text: `SET ${GEAR_SET_LABELS[set]} ${counts[set]}/${GEAR_SET_SIZE}`,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Texture layers from bottom to top: legs, body, head (empty slots are skipped). */
export function gearTextureKeys(equipped: EquippedGear): string[] {
  const order: GearSlot[] = ['legs', 'body', 'head'];
  const keys: string[] = [];
  for (const slot of order) {
    const piece = pieceIn(equipped, slot);
    if (piece) keys.push(piece.id);
  }
  return keys;
}

/** Applies the gear on top of the gold upgrades (F-16): factors multiply, max HP adds. */
export function applyGearToStats(base: UpgradeFactors, m: GearModifiers): UpgradeFactors {
  return {
    weaponFireRateMult: base.weaponFireRateMult * m.fireRateMul,
    weaponDamageMult: base.weaponDamageMult * m.damageMul,
    playerMaxHp: base.playerMaxHp + m.maxHpAdd,
    playerTurnSpeedDegPerSec: base.playerTurnSpeedDegPerSec * m.turnSpeedMul,
  };
}

function effectOf<K extends GearEffectDef['kind']>(
  m: GearModifiers,
  kind: K,
): Extract<GearEffectDef, { kind: K }> | undefined {
  return m.effects.find((e): e is Extract<GearEffectDef, { kind: K }> => e.kind === kind);
}

/** Diamond head: chance to block a hit completely. Draws only if the effect is worn. */
export function rollBlock(m: GearModifiers, rng: Rng): boolean {
  const e = effectOf(m, 'blockChance');
  return e ? rng.next() < e.chance : false;
}

/** Hell head: damage factor of one shot (1 or the crit factor). Draws only if the effect is worn. */
export function rollCrit(m: GearModifiers, rng: Rng): number {
  const e = effectOf(m, 'crit');
  if (!e) return 1;
  return rng.next() < e.chance ? e.mul : 1;
}

/** Diamond body: damage to an enemy that touches the player (0 without the piece). */
export function thornsDamage(m: GearModifiers): number {
  return effectOf(m, 'thorns')?.damage ?? 0;
}

/** Diamond legs: push of an enemy on contact, away from the player; zero vector without the piece. */
export function knockbackVector(
  m: GearModifiers,
  playerX: number,
  playerY: number,
  enemyX: number,
  enemyY: number,
): { x: number; y: number } {
  const e = effectOf(m, 'knockback');
  const dx = enemyX - playerX;
  const dy = enemyY - playerY;
  const len = Math.hypot(dx, dy);
  if (!e || !(len > 0)) return { x: 0, y: 0 };
  return { x: (dx / len) * e.px, y: (dy / len) * e.px };
}

/** Hell body: burn applied by a laser hit, or null without the piece. */
export function burnOnHit(m: GearModifiers): { durationMs: number; dps: number } | null {
  const e = effectOf(m, 'burn');
  return e ? { durationMs: e.durationMs, dps: e.dps } : null;
}

export interface BlastTarget {
  x: number;
  y: number;
  /** Hit radius of the target in px. */
  radius: number;
}

/**
 * Hell legs: a defeated enemy at (x, y) explodes; returns the damage and the targets whose
 * circle touches the blast circle. The caller passes the other enemies (not the dead one).
 */
export function deathBlastTargets<T extends BlastTarget>(
  m: GearModifiers,
  x: number,
  y: number,
  targets: readonly T[],
): { damage: number; targets: T[] } {
  const e = effectOf(m, 'deathBlast');
  if (!e) return { damage: 0, targets: [] };
  return {
    damage: e.damage,
    targets: targets.filter((t) => circlesOverlap(x, y, e.radiusPx, t.x, t.y, sane(t.radius))),
  };
}

/** Heaven head: heal of a heal item (doubled with the piece). */
export function healAmount(m: GearModifiers, baseHeal: number): number {
  return sane(baseHeal) * (effectOf(m, 'healBoost')?.mul ?? 1);
}

/** Heaven body: number of extra enemies a laser shot passes through (0 without the piece). */
export function pierceCount(m: GearModifiers): number {
  return effectOf(m, 'pierce')?.extraTargets ?? 0;
}

/** Heaven legs: factor on the coin magnet radius (1 without the piece). */
export function magnetFactor(m: GearModifiers): number {
  return effectOf(m, 'magnet')?.magnetMul ?? 1;
}

/** Heaven legs: factor on how long items lie on the ground (1 without the piece). */
export function itemLifetimeFactor(m: GearModifiers): number {
  return effectOf(m, 'magnet')?.itemLifetimeMul ?? 1;
}

export interface GearSetTick {
  /** Number of hell-set ring ignitions in this step (ring: `HELL_SET_RING` from config/gear). */
  ringTriggers: number;
  /** Whole HP healed by the heaven set in this step. */
  regenHp: number;
}

/**
 * Set effects of one round as a small state machine; `dtMs` is pausable game time.
 * - timedBlock: one block is ready at round start; after `consumeBlock()` the next one is
 *   ready `intervalMs` later.
 * - autoRing: one trigger every `intervalMs` (first after `intervalMs`).
 * - regen: `hpPerTick` whole HP every `intervalMs`.
 */
export class GearSetState {
  private readonly block?: GearSetBonusDef;
  private readonly ring?: GearSetBonusDef;
  private readonly regen?: GearSetBonusDef;
  private blockIsReady = false;
  private blockMs = 0;
  private ringMs = 0;
  private regenMs = 0;

  constructor(setBonuses: readonly GearSetBonusDef[]) {
    this.block = setBonuses.find((b) => b.kind === 'timedBlock' && sane(b.intervalMs) > 0);
    this.ring = setBonuses.find((b) => b.kind === 'autoRing' && sane(b.intervalMs) > 0);
    this.regen = setBonuses.find((b) => b.kind === 'regen' && sane(b.intervalMs) > 0);
    this.blockIsReady = this.block !== undefined;
  }

  tick(dtMs: number): GearSetTick {
    const dt = sane(dtMs);
    if (this.block && !this.blockIsReady) {
      this.blockMs += dt;
      if (this.blockMs >= this.block.intervalMs) {
        this.blockIsReady = true;
        this.blockMs = 0;
      }
    }
    let ringTriggers = 0;
    if (this.ring) {
      this.ringMs += dt;
      ringTriggers = Math.floor(this.ringMs / this.ring.intervalMs);
      this.ringMs -= ringTriggers * this.ring.intervalMs;
    }
    let regenHp = 0;
    if (this.regen) {
      this.regenMs += dt;
      const ticks = Math.floor(this.regenMs / this.regen.intervalMs);
      this.regenMs -= ticks * this.regen.intervalMs;
      regenHp = ticks * Math.floor(sane(this.regen.hpPerTick ?? 0));
    }
    return { ringTriggers, regenHp };
  }

  /** True if the diamond set block is ready (visible shine). */
  blockReady(): boolean {
    return this.blockIsReady;
  }

  /** Uses the ready block; false if none is ready. */
  consumeBlock(): boolean {
    if (!this.blockIsReady) return false;
    this.blockIsReady = false;
    this.blockMs = 0;
    return true;
  }
}

export interface IncomingDamageResult {
  /** Damage that reaches the HP. */
  damage: number;
  /** Powers after the shield took its part. */
  powers: ActivePowers;
  /** Which step stopped the hit completely, or null. */
  blockedBy: 'setBlock' | 'blockChance' | null;
  /** True if the caller must call `GearSetState.consumeBlock()`. */
  setBlockUsed: boolean;
}

/**
 * Damage path of a hit on the player (AP-143 wires it exactly like this):
 * 1. diamond set block (ready block stops the whole hit),
 * 2. block chance of the diamond head (Rng draw only with the piece),
 * 3. damage reduction (`damageTakenMul`),
 * 4. shield power-up absorbs the rest (`absorbDamage`).
 * Pure: the set block state comes in as a flag, `setBlockUsed` tells the caller to consume it.
 */
export function resolveIncomingDamage(
  damage: number,
  m: GearModifiers,
  setBlockReady: boolean,
  powers: ActivePowers,
  rng: Rng,
): IncomingDamageResult {
  const dmg = sane(damage);
  if (dmg === 0) return { damage: 0, powers: { ...powers }, blockedBy: null, setBlockUsed: false };
  if (setBlockReady) {
    return { damage: 0, powers: { ...powers }, blockedBy: 'setBlock', setBlockUsed: true };
  }
  if (rollBlock(m, rng)) {
    return { damage: 0, powers: { ...powers }, blockedBy: 'blockChance', setBlockUsed: false };
  }
  const reduced = dmg * m.damageTakenMul;
  const absorbed = absorbDamage(powers, reduced);
  return {
    damage: absorbed.remainingDamage,
    powers: absorbed.state,
    blockedBy: null,
    setBlockUsed: false,
  };
}
