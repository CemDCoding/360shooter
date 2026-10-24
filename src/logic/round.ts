import type { LevelDef } from '../contracts';

export type RoundStatus = 'running' | 'won' | 'lost';

const FINAL_MINUTE_MS = 60_000;

/**
 * Rundenablauf ohne Phaser (PE-05, PE-17, PE-18).
 * Niederlage hat Vorrang vor gleichzeitigem Timer-Ende.
 */
export class RoundState {
  /** Erweiterungspunkt Boss (PE-18): in M1 immer false, M3 setzt ihn pro Level. */
  readonly requiresBossDefeat: boolean = false;

  private elapsedMs = 0;
  private readonly durationMs: number;
  private bossDefeatedFlag = false;
  private statusValue: RoundStatus = 'running';

  constructor(level: LevelDef) {
    this.durationMs = level.durationSec * 1000;
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

  tick(dtMs: number): void {
    if (this.statusValue !== 'running' || !Number.isFinite(dtMs) || dtMs <= 0) return;
    this.elapsedMs = Math.min(this.durationMs, this.elapsedMs + dtMs);
    this.evaluate();
  }

  playerDied(): void {
    if (this.statusValue === 'running') this.statusValue = 'lost';
  }

  /** Erweiterungspunkt Boss: M3 meldet hier den Sieg ueber den Boss. */
  bossDefeated(): void {
    this.bossDefeatedFlag = true;
    this.evaluate();
  }

  private evaluate(): void {
    if (this.statusValue !== 'running') return;
    if (this.remainingMs > 0) return;
    if (this.requiresBossDefeat && !this.bossDefeatedFlag) return;
    this.statusValue = 'won';
  }
}
