import { BOSSES, BOSS_DAMAGE_STEP, BOSS_EXTRA_ATTACK_INDEX, BOSS_HP_STEP } from '../config/bosses';
import { getLevel } from '../config/levels';
import { THEME } from '../config/theme';
import type { BossAttackDef, BossDef, BossId, BossVariant } from '../contracts';

/** Phaser tint value that leaves a sprite unchanged. */
export const NO_TINT = 0xffffff;

/** Tints for index 1, 2, 3, ... of a batch (index 0 keeps the original colours). Repeats after the end. */
const TINTS: readonly number[] = [
  THEME.colors['coral.300'].num,
  THEME.colors['mint.400'].num,
  THEME.colors['gold.400'].num,
  THEME.colors['biome.night'].num,
  THEME.colors['biome.elf'].num,
  THEME.colors['mint.200'].num,
  THEME.colors['gold.200'].num,
  THEME.colors['coral.400'].num,
  THEME.colors['plum.400'].num,
  THEME.colors['phos.300'].num,
];

/** Position of a level inside its batch, starting with 0 (Wald 0-4, Nacht 5-9, Elfenwald 10-20). */
export function indexInBatch(levelId: number): number {
  if (!Number.isInteger(levelId) || levelId < 0 || levelId > 20) {
    throw new RangeError(`unknown level ${levelId}`);
  }
  if (levelId <= 4) return levelId;
  if (levelId <= 9) return levelId - 5;
  return levelId - 10;
}

/** HP +15 %, damage +10 % per index, tint per index, extra attack from index 2 (PE-33). */
export function variantForLevel(levelId: number): BossVariant {
  const index = indexInBatch(levelId);
  return {
    index,
    hpMultiplier: 1 + BOSS_HP_STEP * index,
    damageMultiplier: 1 + BOSS_DAMAGE_STEP * index,
    tint: index === 0 ? NO_TINT : TINTS[(index - 1) % TINTS.length],
    extraAttack: index >= BOSS_EXTRA_ATTACK_INDEX,
  };
}

/** Boss of a level, undefined if the level has none. */
export function bossForLevel(levelId: number): BossDef | undefined {
  const bossId = getLevel(levelId)?.bossId;
  return bossId ? BOSSES[bossId] : undefined;
}

export function scaledHp(def: BossDef, variant: BossVariant): number {
  return Math.round(def.baseHp * variant.hpMultiplier);
}

/** Damage of a base value (attack or body) after the variant multiplier. */
export function scaledDamage(base: number, variant: BossVariant): number {
  return Math.round(base * variant.damageMultiplier * 100) / 100;
}

/** Attacks the variant may use. */
export function availableAttacks(def: BossDef, variant: BossVariant): BossAttackDef[] {
  return def.attacks.filter((a) => variant.extraAttack || !a.extraOnly);
}

export interface AttackEvent {
  /** telegraph: show the warning now. execute: the warning is over, the attack hits now. */
  type: 'telegraph' | 'execute';
  attackId: string;
  /** Length of the warning in ms. */
  telegraphMs: number;
  /** Damage after the variant multiplier. */
  damage: number;
  /** Time since the scheduler start when the attack hits (ms). */
  executeAtMs: number;
}

export interface SchedulerRng {
  next(): number;
}

/** Pause between the end of one attack and the warning of the next one (ms). */
export const ATTACK_GAP_MS = 800;

/**
 * Chooses the boss attacks (pure, driven by game time so it stops with the pause).
 * One attack at a time: warning, then the hit, then the cooldown of that attack.
 * Per tick it returns at most one event of each type; the first attack starts after its own cooldown.
 */
export class AttackScheduler {
  private readonly attacks: BossAttackDef[];
  private readonly cooldownLeft = new Map<string, number>();
  private pending: { attack: BossAttackDef; leftMs: number; executeAtMs: number } | null = null;
  private gapLeftMs = 0;
  private nowMs = 0;

  constructor(
    def: BossDef,
    private readonly variant: BossVariant,
    private readonly rng: SchedulerRng,
  ) {
    this.attacks = availableAttacks(def, variant);
    for (const a of this.attacks) this.cooldownLeft.set(a.id, a.cooldownMs);
  }

  /** true while a warning is running. */
  get busy(): boolean {
    return this.pending !== null;
  }

  /** Stops new attacks (boss defeated or hidden); a running warning is dropped. */
  cancel(): void {
    this.pending = null;
  }

  tick(dtMs: number): AttackEvent[] {
    const out: AttackEvent[] = [];
    if (!Number.isFinite(dtMs) || dtMs <= 0) return out;
    this.nowMs += dtMs;
    for (const [id, left] of this.cooldownLeft) this.cooldownLeft.set(id, left - dtMs);
    if (this.pending) {
      this.pending.leftMs -= dtMs;
      if (this.pending.leftMs <= 0) {
        const { attack, executeAtMs } = this.pending;
        this.pending = null;
        this.cooldownLeft.set(attack.id, attack.cooldownMs);
        this.gapLeftMs = ATTACK_GAP_MS;
        out.push(this.event('execute', attack, executeAtMs));
      }
      return out;
    }
    this.gapLeftMs -= dtMs;
    if (this.gapLeftMs > 0) return out;
    const ready = this.attacks.filter((a) => (this.cooldownLeft.get(a.id) ?? 0) <= 0);
    if (ready.length === 0) return out;
    const attack = ready[Math.min(ready.length - 1, Math.floor(this.rng.next() * ready.length))];
    const executeAtMs = this.nowMs + attack.telegraphMs;
    this.pending = { attack, leftMs: attack.telegraphMs, executeAtMs };
    out.push(this.event('telegraph', attack, executeAtMs));
    return out;
  }

  private event(type: AttackEvent['type'], a: BossAttackDef, executeAtMs: number): AttackEvent {
    return {
      type,
      attackId: a.id,
      telegraphMs: a.telegraphMs,
      damage: scaledDamage(a.damage, this.variant),
      executeAtMs,
    };
  }
}

/** Boss ids for tests and UI. */
export function isBossId(value: string): value is BossId {
  return Object.prototype.hasOwnProperty.call(BOSSES, value);
}
