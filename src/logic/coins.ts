// Muenzen (AP-29): Drop, Groesse, Magnet. Reine Funktionen.
import type { CoinRules } from '../contracts';
import { BIG_COIN_MIN_VALUE } from '../config/coins';
import type { Rng } from './rng';

export interface Point {
  x: number;
  y: number;
}

export interface MagnetResult extends Point {
  collected: boolean;
}

export function rollCoinDrop(rng: Rng, rules: CoinRules): boolean {
  return rng.next() < rules.dropChance;
}

export function coinSizeFor(value: number): 'small' | 'big' {
  return value >= BIG_COIN_MIN_VALUE ? 'big' : 'small';
}

/** Ein Magnetschritt: ausserhalb des Radius bleibt die Muenze liegen, sonst fliegt sie zur Spielerin. */
export function coinMagnetStep(
  coin: Point,
  player: Point,
  dtMs: number,
  rules: CoinRules,
): MagnetResult {
  const dx = player.x - coin.x;
  const dy = player.y - coin.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= rules.collectRadiusPx) return { x: coin.x, y: coin.y, collected: true };
  if (dist > rules.magnetRadiusPx || !(dtMs > 0)) return { x: coin.x, y: coin.y, collected: false };
  const step = (rules.magnetSpeedPxPerSec * dtMs) / 1000;
  if (dist - step <= rules.collectRadiusPx) return { x: player.x, y: player.y, collected: true };
  const k = step / dist;
  return { x: coin.x + dx * k, y: coin.y + dy * k, collected: false };
}
