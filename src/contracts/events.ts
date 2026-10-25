import type { ActiveArmour } from './armour';
import type { ActivePowers } from './weapon';

export const GameEvents = {
  HpChanged: 'hp-changed',
  TimerTick: 'timer-tick',
  RoundEnded: 'round-ended',
  MuteChanged: 'mute-changed',
  CoinsChanged: 'coins-changed',
  PowersChanged: 'powers-changed',
  ArmourChanged: 'armour-changed',
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
}
