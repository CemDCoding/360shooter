import type { ActiveArmour } from './armour';
import type { BossId } from './boss';
import type { PowerStoreState } from './powerStore';
import type { ActivePowers } from './weapon';

export const GameEvents = {
  HpChanged: 'hp-changed',
  TimerTick: 'timer-tick',
  RoundEnded: 'round-ended',
  MuteChanged: 'mute-changed',
  CoinsChanged: 'coins-changed',
  PowersChanged: 'powers-changed',
  ArmourChanged: 'armour-changed',
  BossWarning: 'boss-warning',
  BossSpawned: 'boss-spawned',
  BossHpChanged: 'boss-hp-changed',
  BossDefeated: 'boss-defeated',
  PowerStoreChanged: 'power-store-changed',
  PlayerStatus: 'player-status',
} as const;

/** Kind of a status effect on the player (PE-127). */
export type PlayerStatusKind = 'poison' | 'slow';

/** One active status effect with its remaining time, for the HUD (AP-102). */
export interface ActivePlayerStatus {
  kind: PlayerStatusKind;
  remainingMs: number;
}

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];

export interface GameEventPayloads {
  'hp-changed': { hp: number; maxHp: number };
  'timer-tick': { remainingSec: number };
  'round-ended': { result: 'won' | 'lost'; xpGained: number };
  'mute-changed': { muted: boolean };
  'coins-changed': { roundCoins: number };
  'powers-changed': ActivePowers;
  'armour-changed': ActiveArmour;
  /** 3 s before the boss appears. */
  'boss-warning': { bossId: BossId };
  'boss-spawned': { bossId: BossId; hp: number; maxHp: number };
  /** Also sent when only `invulnerable` changes (e.g. ghost phase, V-12/PE-87). */
  'boss-hp-changed': { hp: number; maxHp: number; invulnerable: boolean };
  'boss-defeated': { bossId: BossId };
  'power-store-changed': PowerStoreState;
  /** Active status effects of the player (empty list: none). Sent when the set or the remaining time changes. */
  'player-status': { effects: ActivePlayerStatus[] };
}
