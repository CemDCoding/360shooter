/** Pure helpers for the HUD indicators (no Phaser). */
import type { ActiveArmour } from '../../contracts';

/** Whole seconds left, rounded up; 0 for invalid or non-positive input. */
export function secondsLeft(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/** Fill ratio 0..1 of the shield bar (shieldLeft is capped at maxStacks * perStack). */
export function shieldRatio(shieldLeft: number, perStack: number, maxStacks: number): number {
  const cap = perStack * maxStacks;
  if (!(cap > 0) || !Number.isFinite(shieldLeft)) return 0;
  return Math.min(1, Math.max(0, shieldLeft / cap));
}

export type ArmourPhase = 'hidden' | 'active' | 'cooldown';

/** What the armour indicator shows: active time, then cooldown, then nothing. */
export function armourDisplay(a: ActiveArmour): { phase: ArmourPhase; sec: number } {
  if (a.id === null) return { phase: 'hidden', sec: 0 };
  if (a.activeMsLeft > 0) return { phase: 'active', sec: secondsLeft(a.activeMsLeft) };
  if (a.cooldownMsLeft > 0) return { phase: 'cooldown', sec: secondsLeft(a.cooldownMsLeft) };
  return { phase: 'hidden', sec: 0 };
}
