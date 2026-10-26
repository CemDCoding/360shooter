// Muenzen (AP-29): Drop, Groesse, Magnet. Reine Funktionen.
import type { CoinRules } from '../contracts';
import { BIG_COIN_MIN_VALUE, COIN_MAGNET_EASE } from '../config/coins';
import type { Rng } from './rng';

export interface Point {
  x: number;
  y: number;
}

export interface MagnetResult extends Point {
  collected: boolean;
  /** Zugdauer in ms (waechst nur im Magnetradius) */
  pullMs: number;
}

export interface MagnetEase {
  startSpeedPxPerSec: number;
  rampMs: number;
}

export function rollCoinDrop(rng: Rng, rules: CoinRules): boolean {
  return rng.next() < rules.dropChance;
}

export function coinSizeFor(value: number): 'small' | 'big' {
  return value >= BIG_COIN_MIN_VALUE ? 'big' : 'small';
}

/** Magnetgeschwindigkeit nach pullMs: smoothstep von Start- auf Hoechstgeschwindigkeit ueber rampMs. */
export function magnetSpeed(pullMs: number, rules: CoinRules, ease: MagnetEase): number {
  const t0 = Number.isFinite(pullMs) && pullMs > 0 ? pullMs : 0;
  const t = ease.rampMs > 0 ? Math.min(1, t0 / ease.rampMs) : 1;
  const s = t * t * (3 - 2 * t);
  return ease.startSpeedPxPerSec + (rules.magnetSpeedPxPerSec - ease.startSpeedPxPerSec) * s;
}

/**
 * Ein Magnetschritt: ausserhalb des Radius bleibt die Muenze liegen, sonst fliegt sie zur Spielerin.
 * Ohne pullMs gilt die Hoechstgeschwindigkeit (wie bisher).
 */
export function coinMagnetStep(
  coin: Point,
  player: Point,
  dtMs: number,
  rules: CoinRules,
  pullMs?: number,
): MagnetResult {
  const pull =
    pullMs === undefined ? undefined : Number.isFinite(pullMs) && pullMs > 0 ? pullMs : 0;
  const dx = player.x - coin.x;
  const dy = player.y - coin.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= rules.collectRadiusPx) {
    return { x: coin.x, y: coin.y, collected: true, pullMs: pull ?? 0 };
  }
  if (dist > rules.magnetRadiusPx || !(dtMs > 0)) {
    return { x: coin.x, y: coin.y, collected: false, pullMs: pull ?? 0 };
  }
  const speed =
    pull === undefined ? rules.magnetSpeedPxPerSec : magnetSpeed(pull, rules, COIN_MAGNET_EASE);
  const nextPull = (pull ?? 0) + dtMs;
  const step = (speed * dtMs) / 1000;
  if (dist - step <= rules.collectRadiusPx) {
    return { x: player.x, y: player.y, collected: true, pullMs: nextPull };
  }
  const k = step / dist;
  return { x: coin.x + dx * k, y: coin.y + dy * k, collected: false, pullMs: nextPull };
}
