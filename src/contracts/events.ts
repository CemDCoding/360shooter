import type { ActiveArmour } from './armour';
import type { BossId } from './boss';
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
} as const;

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
  'boss-hp-changed': { hp: number; maxHp: number };
  'boss-defeated': { bossId: BossId };
}
