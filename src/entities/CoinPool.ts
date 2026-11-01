import type Phaser from 'phaser';
import type { CoinRules } from '../contracts';
import { COIN_RULES } from '../config';
import { Coin } from './Coin';

/**
 * Coin rules with the magnet radius times `factor` (heaven legs, AP-143). Factor 1 (no gear) returns the
 * rules unchanged; broken factors count as 1.
 */
export function withMagnetFactor(rules: CoinRules, factor: number): CoinRules {
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return rules;
  return { ...rules, magnetRadiusPx: rules.magnetRadiusPx * factor };
}

/** Pool of coins. Coins have no lifetime; they stay until collected or cleared. */
export class CoinPool {
  readonly coins: Coin[] = [];
  /** Called with the coin value whenever a coin is collected. */
  onCollected?: (value: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rules: CoinRules = COIN_RULES,
  ) {}

  spawn(x: number, y: number, value: number): Coin {
    let coin = this.coins.find((c) => !c.active);
    if (!coin) {
      coin = new Coin(this.scene, x, y);
      coin.onCollected = (v) => this.onCollected?.(v);
      this.coins.push(coin);
    }
    coin.spawn(x, y, value);
    return coin;
  }

  /** Call every frame with pausable game time (ms). */
  update(dtMs: number, player: { x: number; y: number }): void {
    for (const c of this.coins) if (c.active) c.update(dtMs, player, this.rules);
  }

  clear(): void {
    for (const c of this.coins) c.despawn();
  }

  /** Unregisters listeners and destroys all coins. */
  destroy(): void {
    this.onCollected = undefined;
    for (const c of this.coins) {
      c.onCollected = undefined;
      c.destroy();
    }
    this.coins.length = 0;
  }
}
