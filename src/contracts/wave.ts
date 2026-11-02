import type { EnemyId } from './enemy';

/** Role of an enemy type in the threat budget and the role caps (RS-01.4, AP-174). */
export type EnemyRole = 'melee' | 'fast' | 'shooter' | 'tank' | 'aura';

/**
 * Pacing of a level (RS-01.1): a cycle is build-up, peak, relax (in this order). The last cycle ends before the
 * boss warning. Times in seconds.
 */
export interface PacingDef {
  /** Length of one full cycle (build-up + peak + relax). */
  cycleSec: number;
  /** Length of the peak (highest spawn rate). */
  peakSec: number;
  /** Length of the relax phase. */
  relaxSec: number;
  /** Spawn rate factor in the relax phase (0..1, relative to the linear base ramp). */
  relaxRate: number;
  /** Relative growth of the rate per cycle (e.g. 0.1 = +10 % each cycle). */
  growthPerCycle: number;
}

/** Kind of a scripted spawn event (RS-01.3): swarm = dense cluster, ring = around the player, pincer = two sides. */
export type SpawnEventKind = 'swarm' | 'ring' | 'pincer';

/** A scripted spawn event at a fixed second of the round (RS-01.3). */
export interface SpawnEventDef {
  kind: SpawnEventKind;
  /** Second of the round at which the event starts (inside a peak). */
  atSec: number;
  /** Number of enemies of the event. */
  count: number;
  /** Fixed enemy type; without it the role or the pool decides. */
  enemy?: EnemyId;
  /** Role of the enemies if no fixed type is set. */
  role?: EnemyRole;
  /** Opening angle in degrees (pincer, swarm). */
  sectorDeg?: number;
  /** Announcement before the enemies appear (ms). */
  announceMs: number;
}

/** Rules for elite enemies (RS-01.5). Switched off until AP-178. */
export interface EliteRules {
  enabled: boolean;
  /** First level with elites. */
  fromLevel: number;
  hpMul: number;
  damageMul: number;
  scaleMul: number;
  /** Threat budget cost factor of an elite. */
  costMul: number;
  /** Maximum share of elites among the living enemies (0..1). */
  maxShare: number;
  /** An elite always drops something. */
  guaranteedDrop: boolean;
}
