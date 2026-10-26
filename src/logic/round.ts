import { BOSS_SPAWN_REMAINING_MS, BOSS_WARNING_REMAINING_MS } from '../config/bosses';
import type { LevelDef } from '../contracts';

export type RoundStatus = 'running' | 'won' | 'lost';

/** none: boss not yet announced (or level without boss). warning: 33 s to 30 s left. active: boss alive. defeated. */
export type BossPhase = 'none' | 'warning' | 'active' | 'defeated';

const FINAL_MINUTE_MS = 60_000;

/**
 * Rundenablauf ohne Phaser (PE-05, PE-17, PE-18).
 * Niederlage hat Vorrang vor gleichzeitigem Timer-Ende.
 */
export class RoundState {
  /** PE-18: a level with a bossId is won only after the boss is defeated. */
  readonly requiresBossDefeat: boolean;

  private elapsedMs = 0;
  private readonly durationMs: number;
  private bossDefeatedFlag = false;
  private statusValue: RoundStatus = 'running';

  constructor(level: LevelDef) {
    this.durationMs = level.durationSec * 1000;
    this.requiresBossDefeat = !!level.bossId;
  }

  get status(): RoundStatus {
    return this.statusValue;
  }

  get elapsed(): number {
    return this.elapsedMs;
  }

  get remainingMs(): number {
    return Math.max(0, this.durationMs - this.elapsedMs);
  }

  get isFinalMinute(): boolean {
    return this.statusValue === 'running' && this.remainingMs <= FINAL_MINUTE_MS;
  }

  /** Boss timeline: warning at 33 s left, boss at 30 s left (PE-76), until bossDefeated(). */
  get bossPhase(): BossPhase {
    if (!this.requiresBossDefeat || this.statusValue === 'lost') return 'none';
    if (this.bossDefeatedFlag) return 'defeated';
    if (this.remainingMs <= BOSS_SPAWN_REMAINING_MS) return 'active';
    if (this.remainingMs <= BOSS_WARNING_REMAINING_MS) return 'warning';
    return 'none';
  }

  /** Timer is over but the boss lives: the round goes on (status stays 'running'). */
  get bossFight(): boolean {
    return (
      this.statusValue === 'running' &&
      this.requiresBossDefeat &&
      !this.bossDefeatedFlag &&
      this.remainingMs <= 0
    );
  }

  tick(dtMs: number): void {
    if (this.statusValue !== 'running' || !Number.isFinite(dtMs) || dtMs <= 0) return;
    this.elapsedMs = Math.min(this.durationMs, this.elapsedMs + dtMs);
    this.evaluate();
  }

  playerDied(): void {
    if (this.statusValue === 'running') this.statusValue = 'lost';
  }

  /** The boss was defeated. Ignored before the boss appeared and for levels without boss. */
  bossDefeated(): void {
    if (this.bossPhase !== 'active') return;
    this.bossDefeatedFlag = true;
    this.evaluate();
  }

  private evaluate(): void {
    if (this.statusValue !== 'running') return;
    // PE-76: a defeated boss ends the round at once, even before 0:00.
    if (this.requiresBossDefeat && this.bossDefeatedFlag) {
      this.statusValue = 'won';
      return;
    }
    if (this.remainingMs > 0) return;
    if (this.requiresBossDefeat) return;
    this.statusValue = 'won';
  }
}
