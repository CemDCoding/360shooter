import { BOSS_SPAWN_RATE_FACTOR } from '../config/bosses';
import { ENEMIES } from '../config/enemies';
import { MIX_LAST_LEVEL } from '../config/levels';
import {
  BANK_SEC,
  BOSS_WARNING_SEC,
  BUDGET_MARGIN,
  BUILD_FROM,
  BUILD_TO,
  ELITE_CHANCE_OTHER,
  ELITE_CHANCE_PEAK,
  ELITE_RULES,
  FILL_INTERVAL_MS,
  MAX_BACKLOG,
  PEAK_FACTOR,
  PEAK_RESERVE_SEC,
  ROLE_CAPS,
  ROLE_CAP_HEADROOM,
  WAVE_PLANS,
  minAliveOf,
  pacingOf,
} from '../config/waves';
import type {
  ArenaSize,
  EliteRules,
  EnemyId,
  EnemyRole,
  LevelDef,
  PacingDef,
  SpawnEventKind,
} from '../contracts';
import {
  dueEvents,
  eventCount,
  eventPositions,
  eventSchedule,
  type EventPosition,
  type ScheduledEvent,
} from './spawnEvents';

/** Minimale RNG-Schnittstelle: Zahl in [0, 1). */
export interface SpawnRng {
  next(): number;
}

export interface SpawnRequest {
  enemyId: EnemyId;
  /** Radiant, 0..2*PI */
  angle: number;
  radius: number;
  /** Elite variant (RS-01.5). Chosen by the director from AP-175, takes effect from AP-178. */
  elite?: boolean;
  /** Index of the spawn event in the schedule (`spawnEvents.ts`) for event spawns (AP-177). */
  eventId?: number;
}

/** Announcement of a spawn event (AP-177, RS-01.3): what the scene shows as an edge marker and plays as a sound. */
export interface EventAnnouncement {
  /** Index in the schedule; the event's spawns carry the same `eventId`. */
  eventId: number;
  kind: SpawnEventKind;
  /** Direction of the group (rad, 0..2*PI): swarm one, pincer two opposite ones, ring none (all around). */
  angles: readonly number[];
  /** Time from the announcement to the spawn (ms). */
  announceMs: number;
}

const EV_IDLE = 0;
/** Announced in this tick: fires at the earliest in the next one (PE-228 (a)). */
const EV_NEW = 1;
const EV_WAITING = 2;
const EV_DONE = 3;

/** Faktor auf das Spawn-Intervall am Rundenende (Start: 1,0). */
export const MIN_INTERVAL_FACTOR = 0.6;

/** Most enemies of the same type in a row in level 0 to 2 (AP-166, PE-207). */
export const MAX_RUN = 3;

/** Every available type has spawned at the latest at this spawn of the round (AP-166, PE-207). */
export const FIRST_APPEARANCE_BY = 8;

/** Tokens per bag of the variety rule: share resolution of 1 % (AP-166). */
const BAG_TOKENS = 100;

/** Radius der Eroeffnungswelle als Anteil des Spawn-Radius (Startwert, angenommen; AP-56). */
export const OPENING_RADIUS_FACTOR = 0.65;

// Wave rhythm (M12, AP-175, RS-01.1, RS-01.2, RS-01.4). All values are in config/waves.ts, explained in
// docs/balancing.md "Wellen-Rhythmus (M12)".

/** Integration step of the rate curve (ms, numerics only): a frame of 16 ms is one step, a long dt is split. */
export const PACING_STEP_MS = 50;

/** Phase of the wave rhythm; `boss` = from the boss warning on (unchanged base ramp, no pacing). */
export type WavePhase = 'build' | 'peak' | 'relax' | 'boss';

const BUILD = 0;
const PEAK = 1;
const RELAX = 2;
const BOSS = 3;
const PHASE_NAMES: readonly WavePhase[] = ['build', 'peak', 'relax', 'boss'];

const ROLES: readonly EnemyRole[] = ['melee', 'fast', 'shooter', 'tank', 'aura'];
const roleIndex = (role: EnemyRole | undefined): number =>
  Math.max(0, ROLES.indexOf(role ?? 'melee'));

const OPENING = 0;
const REGULAR = 1;
const FILL = 2;

const TAU = Math.PI * 2;

/** Anzahl der Gegner der Eroeffnungswelle: 15 % von maxEnemies, mindestens 3, hoechstens 8. */
export function openingCount(level: LevelDef): number {
  return Math.min(8, Math.max(3, Math.round(level.maxEnemies * 0.15)));
}

/** Circular mean of the angles `from` to `to` (exclusive) of the positions, 0..2*PI. */
function meanAngle(spots: readonly { angle: number }[], from: number, to: number): number {
  let x = 0;
  let y = 0;
  for (let j = from; j < to; j++) {
    x += Math.cos(spots[j].angle);
    y += Math.sin(spots[j].angle);
  }
  const a = Math.atan2(y, x);
  return a < 0 ? a + TAU : a;
}

/** Rate curve of one level (pure data, built once per round). */
export interface PacingCurve {
  readonly pacing: PacingDef;
  readonly durationSec: number;
  /** End of the last cycle = boss warning (seconds since round start). */
  readonly windowSec: number;
  readonly cycles: number;
  readonly buildSec: number;
  /** Normalisation factor on build-up and peak. */
  readonly scale: number;
}

/** Base spawn rate relative to the start of the round (1 / interval factor of the linear ramp). */
function baseRate(tSec: number, durationSec: number): number {
  const progress = durationSec > 0 ? Math.min(1, tSec / durationSec) : 1;
  return 1 / (1 - (1 - MIN_INTERVAL_FACTOR) * progress);
}

function cycleAt(c: Omit<PacingCurve, 'scale'>, tSec: number): number {
  if (c.cycles <= 0 || tSec >= c.windowSec) return -1;
  return Math.min(c.cycles - 1, Math.floor(tSec / c.pacing.cycleSec));
}

function phaseCode(c: Omit<PacingCurve, 'scale'>, tSec: number): number {
  const cycle = cycleAt(c, tSec);
  if (cycle < 0) return BOSS;
  const u = tSec - cycle * c.pacing.cycleSec;
  if (u < c.buildSec) return BUILD;
  if (u < c.buildSec + c.pacing.peakSec) return PEAK;
  return RELAX;
}

/** Shape of build-up and peak before normalisation, with the growth per cycle. */
function rawFactor(c: Omit<PacingCurve, 'scale'>, tSec: number, phase: number): number {
  const cycle = cycleAt(c, tSec);
  const growth = 1 + c.pacing.growthPerCycle * cycle;
  if (phase === PEAK) return PEAK_FACTOR * growth;
  const u = tSec - cycle * c.pacing.cycleSec;
  const frac = c.buildSec > 0 ? u / c.buildSec : 1;
  return (BUILD_FROM + (BUILD_TO - BUILD_FROM) * frac) * growth;
}

/** Rate factor of the curve at second `tSec` (relative to the linear base ramp; boss phase 1). */
export function pacingFactorAt(c: PacingCurve, tSec: number): number {
  const phase = phaseCode(c, tSec);
  if (phase === BOSS) return 1;
  if (phase === RELAX) return c.pacing.relaxRate;
  return c.scale * rawFactor(c, tSec, phase);
}

/** Phase of the curve at second `tSec`. */
export function pacingPhaseAt(c: PacingCurve, tSec: number): WavePhase {
  return PHASE_NAMES[phaseCode(c, tSec)];
}

/**
 * Rate curve of a level (RS-01.1). Pacing comes from `WAVE_PLANS[level.id]` (PE-227), for unknown ids from `pacingOf`.
 * The last cycle ends at the boss warning (its relax phase takes the seconds left over by rounding). Build-up and peak
 * are scaled so that the spawns up to the boss warning equal those of the linear base ramp.
 */
export function pacingCurve(level: Pick<LevelDef, 'id' | 'durationSec'>): PacingCurve {
  const pacing = WAVE_PLANS[level.id]?.pacing ?? pacingOf(level);
  const durationSec = Math.max(0, level.durationSec);
  const windowSec = Math.max(0, durationSec - BOSS_WARNING_SEC);
  const cycles = pacing.cycleSec > 0 ? Math.floor(windowSec / pacing.cycleSec) : 0;
  const buildSec = Math.max(0, pacing.cycleSec - pacing.peakSec - pacing.relaxSec);
  const base = { pacing, durationSec, windowSec, cycles, buildSec };
  let target = 0;
  let fixed = 0;
  let shaped = 0;
  const step = PACING_STEP_MS / 1000;
  for (let t = step / 2; t < windowSec; t += step) {
    const r = baseRate(t, durationSec);
    const phase = phaseCode(base, t);
    if (phase === BOSS) break;
    target += r;
    if (phase === RELAX) fixed += r * pacing.relaxRate;
    else shaped += r * rawFactor(base, t, phase);
  }
  const scale = shaped > 0 ? Math.max(0, target - fixed) / shaped : 1;
  return { ...base, scale };
}

/**
 * Spawns of the round with the rate curve relative to the linear base ramp (RS-01.6). By construction 1 (up to
 * rounding); the balance model multiplies its spawn count with it.
 */
export function pacingSpawnFactor(level: Pick<LevelDef, 'id' | 'durationSec'>): number {
  const c = pacingCurve(level);
  const step = PACING_STEP_MS / 1000;
  let paced = 0;
  let flat = 0;
  for (let t = step / 2; t < c.durationSec; t += step) {
    const r = baseRate(t, c.durationSec);
    flat += r;
    paced += r * pacingFactorAt(c, t);
  }
  return flat > 0 ? paced / flat : 1;
}

/**
 * Spawn director (AP-56, AP-166, M12 AP-175): opening wave, wave rhythm (build-up, peak, relax per cycle), minimum
 * occupancy, threat budget with role caps and the choice of elites. Pure: randomness only from `SpawnRng`.
 */
export class SpawnDirector {
  private openingDone = false;
  private elapsedMs = 0;
  private readonly totalWeight: number;
  private readonly durationMs: number;
  // Variety rule state (AP-166); allocated once, no per-call allocations.
  private readonly varied: boolean;
  private readonly active: number[] = [];
  private readonly quota: number[] = [];
  private readonly left: number[];
  private readonly seen: boolean[];
  private unseen: number;
  private spawned = 0;
  private lastIndex = -1;
  private run = 0;
  // Wave rhythm (AP-175); all arrays allocated once.
  private readonly curve: PacingCurve;
  private readonly minAlive: number;
  private readonly weightOf: number[] = [];
  private readonly costOf: number[] = [];
  private readonly roleOf: number[] = [];
  private readonly capOf: number[];
  private readonly roleShare: number[];
  private readonly roleCount: number[];
  private readonly meanCost: number;
  private readonly eliteOn: boolean;
  private readonly out: SpawnRequest[] = [];
  private tracked = 0;
  private eliteAlive = 0;
  private credit = 0;
  private fillCooldownMs = FILL_INTERVAL_MS;
  private budget: number;
  private eliteFlag = false;
  // Spawn events (AP-177); empty without an arena. Arrays allocated once.
  private readonly schedule: ScheduledEvent[];
  private readonly eventState: number[];
  private readonly eventSpots: (EventPosition[] | null)[];
  private readonly announced: EventAnnouncement[] = [];
  private readonly ended: number[] = [];
  private eventFromMs = -1;
  private nextEventMs = Number.POSITIVE_INFINITY;

  /**
   * @param spawnRadius Ring knapp ausserhalb des Sichtfelds (Pixel vom Zentrum)
   * @param eliteRules elite rules (default `ELITE_RULES` from config/waves.ts; tests pass their own)
   * @param arena arena of the round: switches on the spawn events of `WAVE_PLANS` (AP-177); without it none run
   */
  constructor(
    private readonly level: LevelDef,
    private readonly rng: SpawnRng,
    private readonly spawnRadius: number,
    private readonly eliteRules: EliteRules = ELITE_RULES,
    private readonly arena?: ArenaSize,
  ) {
    this.durationMs = level.durationSec * 1000;
    this.totalWeight = level.enemyPool.reduce((s, e) => s + Math.max(0, e.weight), 0);
    // Variety rule (AP-166, PE-207): only level 0 to 2 with at least two types. Level 3 and up draw independently.
    for (let j = 0; j < level.enemyPool.length; j++) {
      if (level.enemyPool[j].weight > 0) this.active.push(j);
    }
    this.varied = level.id <= MIX_LAST_LEVEL && this.active.length >= 2;
    let costSum = 0;
    for (const j of this.active) {
      const entry = level.enemyPool[j];
      const def = ENEMIES[entry.enemyId];
      this.quota.push(Math.max(1, Math.round((entry.weight / this.totalWeight) * BAG_TOKENS)));
      this.weightOf.push(entry.weight);
      this.costOf.push(Math.max(0, def?.threatCost ?? 1));
      this.roleOf.push(roleIndex(def?.role));
      costSum += entry.weight * this.costOf[this.costOf.length - 1];
    }
    this.left = this.quota.slice();
    this.seen = this.active.map(() => false);
    this.unseen = this.active.length;
    this.capOf = ROLES.map((r) => ROLE_CAPS[r] ?? Number.POSITIVE_INFINITY);
    this.roleShare = ROLES.map(() => 0);
    for (let k = 0; k < this.active.length; k++) {
      this.roleShare[this.roleOf[k]] += this.weightOf[k] / this.totalWeight;
    }
    this.roleCount = ROLES.map(() => 0);
    this.meanCost = this.totalWeight > 0 ? costSum / this.totalWeight : 0;
    // Minimum occupancy and pacing from WAVE_PLANS (PE-227); never above the cap.
    this.curve = pacingCurve(level);
    this.minAlive = Math.min(level.maxEnemies, WAVE_PLANS[level.id]?.minAlive ?? minAliveOf(level));
    this.eliteOn =
      eliteRules.enabled && level.id >= eliteRules.fromLevel && eliteRules.maxShare > 0;
    this.budget = this.reserve();
    this.schedule = arena && this.totalWeight > 0 ? eventSchedule(level.id) : [];
    this.eventState = this.schedule.map(() => EV_IDLE);
    this.eventSpots = this.schedule.map(() => null);
    this.nextEventMs = this.nextAnnounceMs();
  }

  /**
   * Spawn events announced in the last `tick` (AP-177). Reused like the `tick` result: read it right away. An event
   * fires `announceMs` later, never in the same tick as its announcement (PE-228 (a)).
   */
  get eventAnnouncements(): readonly EventAnnouncement[] {
    return this.announced;
  }

  /**
   * Ids of the events that ended in the last `tick`: fired (their spawns carry the id) or dropped because the boss
   * phase began. The scene removes their markers. Reused array.
   */
  get endedEvents(): readonly number[] {
    return this.ended;
  }

  /** Aktuelles Intervall der Grundrampe: sinkt linear von x1,0 auf x0,6 ueber die Rundendauer. */
  get currentIntervalMs(): number {
    return this.intervalAt(this.elapsedMs);
  }

  /** Current phase of the wave rhythm. */
  get phase(): WavePhase {
    return PHASE_NAMES[phaseCode(this.curve, this.elapsedMs / 1000)];
  }

  /** Current cycle (0-based), -1 from the boss warning on. */
  get cycle(): number {
    return cycleAt(this.curve, this.elapsedMs / 1000);
  }

  /** Threat budget on the account. */
  get threatBudget(): number {
    return this.budget;
  }

  /** Minimum occupancy of this round (RS-01.2). */
  get minimumAlive(): number {
    return this.minAlive;
  }

  /** Living enemies of a role as the director counts them (exact with `noteRemoved`, else estimated). */
  roleAlive(role: EnemyRole): number {
    return this.roleCount[roleIndex(role)];
  }

  /**
   * Current cap of a role (RS-01.4, AP-175): the larger of `ROLE_CAPS` and `ROLE_CAP_HEADROOM` x pool share x
   * (living + 1), so the cap grows with the field and the pool shares hold on average.
   */
  roleCap(role: EnemyRole): number {
    return this.capFor(roleIndex(role));
  }

  /** Living elites as the director counts them. */
  get elitesAlive(): number {
    return this.eliteAlive;
  }

  /**
   * Reports that an enemy of this director left the field (killed or despawned). Keeps the role caps exact. Without
   * these reports the director spreads the drop of `aliveCount` evenly over the roles (estimate).
   */
  noteRemoved(enemyId: EnemyId, elite = false): void {
    const r = roleIndex(ENEMIES[enemyId]?.role);
    this.roleCount[r] = Math.max(0, this.roleCount[r] - 1);
    if (elite) this.eliteAlive = Math.max(0, this.eliteAlive - 1);
    this.tracked = Math.max(0, this.tracked - 1);
  }

  /**
   * @param bossActive true while the boss lives: normal spawns come at half the rate (PE-18).
   * @returns the spawns of this frame. The array is reused by the next call (no allocation per frame), read it right away.
   */
  tick(dtMs: number, aliveCount: number, bossActive = false): SpawnRequest[] {
    const out = this.out;
    out.length = 0;
    this.announced.length = 0;
    this.ended.length = 0;
    if (!Number.isFinite(dtMs) || dtMs <= 0 || this.totalWeight <= 0) return out;
    this.syncAlive(aliveCount);
    let alive = aliveCount;
    if (!this.openingDone) {
      // Eroeffnungswelle: genau einmal, sofort, gleichmaessig auf dem Ring verteilt (ohne Budget, mit Rollen-Caps).
      this.openingDone = true;
      const n = Math.max(0, Math.min(openingCount(this.level), this.level.maxEnemies - alive));
      if (n > 0) {
        const start = this.rng.next() * TAU;
        for (let i = 0; i < n; i++) {
          const k = this.pickEnemy(OPENING, BOSS, n - i);
          if (k < 0) break;
          this.emit(k, (start + (i * TAU) / n) % TAU, this.spawnRadius * OPENING_RADIUS_FACTOR);
          alive += 1;
        }
      }
    }
    this.advance(dtMs, bossActive);
    const phase = phaseCode(this.curve, this.elapsedMs / 1000);
    // Spawn events (AP-177) before the regular spawns: an announced group gets its room under the cap first.
    if (this.schedule.length > 0) alive = this.runEvents(alive, phase, bossActive);
    while (this.credit >= 1) {
      if (alive >= this.level.maxEnemies) {
        // Kein Aufstauen: verpasste Spawns werden nicht nachgeholt.
        this.credit = 1;
        break;
      }
      const k = this.pickEnemy(REGULAR, phase, 0);
      // Nothing affordable or every type capped: the spawn waits (at most MAX_BACKLOG queue up).
      if (k < 0) break;
      this.credit -= 1;
      this.emit(k, this.rng.next() * TAU, this.spawnRadius);
      alive += 1;
    }
    // Minimum occupancy (RS-01.2): one spawn per FILL_INTERVAL_MS, also in the relax phase; not in the boss phase.
    // Fill spawns are taken from the schedule ahead (credit), at most `minAlive` spawns in advance.
    if (
      phase !== BOSS &&
      !bossActive &&
      alive < this.minAlive &&
      alive < this.level.maxEnemies &&
      this.fillCooldownMs <= 0
    ) {
      const k = this.pickEnemy(FILL, phase, 0);
      if (k >= 0) {
        this.emit(k, this.rng.next() * TAU, this.spawnRadius);
        this.credit = Math.max(this.credit - 1, -this.minAlive);
        this.fillCooldownMs = FILL_INTERVAL_MS;
      }
    }
    if (this.fillCooldownMs < 0) this.fillCooldownMs = 0;
    return out;
  }

  private intervalAt(ms: number): number {
    const progress = this.durationMs > 0 ? Math.min(1, ms / this.durationMs) : 1;
    return this.level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * progress);
  }

  /** Budget income per ms at the current time. */
  private incomePerMs(): number {
    return (BUDGET_MARGIN * this.meanCost) / this.currentIntervalMs;
  }

  /** Budget kept outside the peak. */
  private reserve(): number {
    return PEAK_RESERVE_SEC * 1000 * this.incomePerMs();
  }

  /** Advances time: spawn credit along the rate curve, budget along the base ramp. */
  private advance(dtMs: number, bossActive: boolean): void {
    let left = dtMs;
    while (left > 0) {
      const step = left < PACING_STEP_MS ? left : PACING_STEP_MS;
      const mid = this.elapsedMs + step / 2;
      const interval = this.intervalAt(mid);
      const rate = pacingFactorAt(this.curve, mid / 1000) / interval;
      // Fill spawns taken ahead are not carried into the boss phase: from the warning on the old base ramp runs.
      if (this.credit < 0 && mid >= this.curve.windowSec * 1000) this.credit = 0;
      this.credit += step * (bossActive ? rate * BOSS_SPAWN_RATE_FACTOR : rate);
      this.budget += (step * BUDGET_MARGIN * this.meanCost) / interval;
      this.elapsedMs += step;
      left -= step;
    }
    const bank = BANK_SEC * 1000 * this.incomePerMs();
    if (this.budget > bank) this.budget = bank;
    if (this.credit > MAX_BACKLOG) this.credit = MAX_BACKLOG;
    this.fillCooldownMs -= dtMs;
  }

  /** Unreported deaths: spread the drop of the living count evenly over roles and elites. */
  private syncAlive(aliveCount: number): void {
    const alive = Number.isFinite(aliveCount) ? Math.max(0, aliveCount) : 0;
    if (alive >= this.tracked) return;
    const s = this.tracked > 0 ? alive / this.tracked : 0;
    for (let r = 0; r < this.roleCount.length; r++) this.roleCount[r] *= s;
    this.eliteAlive *= s;
    this.tracked = alive;
  }

  /** Earliest announcement time of an event not announced yet (infinite if none is left). */
  private nextAnnounceMs(): number {
    let next = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.schedule.length; i++) {
      const at = this.schedule[i].announceMs;
      if (this.eventState[i] === EV_IDLE && at < next) next = at;
    }
    return next;
  }

  /**
   * Spawn events (AP-177, RS-01.3): announcements from `dueEvents` of `spawnEvents.ts`, the spawns `announceMs` later.
   * The times are fixed by the schedule (all in peaks); the boss phase drops waiting events (their markers end).
   * Announcement and spawn never come in the same tick, also after a long frame (PE-228 (a)): an event announced in
   * this tick fires in the next one at the earliest.
   * @returns living count after the event spawns
   */
  private runEvents(alive: number, phase: number, bossActive: boolean): number {
    const now = this.elapsedMs;
    const blocked = bossActive || phase === BOSS;
    const state = this.eventState;
    for (let i = 0; i < state.length; i++) if (state[i] === EV_NEW) state[i] = EV_WAITING;
    if (now >= this.nextEventMs) {
      // dueEvents builds new arrays: only called in the few ticks that pass an announcement time.
      for (const s of dueEvents(this.schedule, now, this.eventFromMs).announce) {
        const i = this.schedule.indexOf(s);
        if (i < 0 || state[i] !== EV_IDLE) continue;
        if (blocked) state[i] = EV_DONE;
        else this.announce(i);
      }
      this.nextEventMs = this.nextAnnounceMs();
    }
    this.eventFromMs = now;
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== EV_NEW && state[i] !== EV_WAITING) continue;
      if (blocked) {
        state[i] = EV_DONE;
        this.eventSpots[i] = null;
        this.ended.push(i);
      } else if (state[i] === EV_WAITING && this.schedule[i].fireMs <= now) {
        alive = this.fireEvent(i, alive);
        state[i] = EV_DONE;
        this.ended.push(i);
      }
    }
    return alive;
  }

  /** Fixes the spawn positions now, so the marker shows where the group will come from. */
  private announce(i: number): void {
    const { event } = this.schedule[i];
    const spots = eventPositions(event, this.arena as ArenaSize, this.rng);
    const angles: number[] = [];
    if (event.kind === 'swarm') angles.push(meanAngle(spots, 0, spots.length));
    if (event.kind === 'pincer') {
      // eventPositions lists side A, then side B. Interleave them, so a cut at the cap keeps both groups.
      const a = Math.ceil(spots.length / 2);
      const first = meanAngle(spots, 0, a);
      angles.push(first, (first + Math.PI) % TAU);
      const sideA = spots.slice(0, a);
      const sideB = spots.slice(a);
      spots.length = 0;
      for (let j = 0; j < a; j++) {
        spots.push(sideA[j]);
        if (j < sideB.length) spots.push(sideB[j]);
      }
    }
    this.eventSpots[i] = spots;
    this.eventState[i] = EV_NEW;
    this.announced.push({ eventId: i, kind: event.kind, angles, announceMs: event.announceMs });
  }

  /**
   * Spawns of an event on top of the schedule (PE-228 (b)): only the free room under `maxEnemies` (`eventCount`, no
   * catch-up), role caps hold, the threat budget pays like a fill spawn. The spawns are taken from the regular
   * credit, so the spawns per minute stay those of the base ramp.
   */
  private fireEvent(i: number, alive: number): number {
    const { event } = this.schedule[i];
    const spots = this.eventSpots[i] ?? [];
    this.eventSpots[i] = null;
    const n = Math.min(spots.length, eventCount(event, alive, this.level.maxEnemies));
    const fixed = event.enemy === undefined ? -1 : this.activeIndexOf(event.enemy);
    let emitted = 0;
    for (let j = 0; j < n; j++) {
      let k: number;
      if (fixed >= 0) {
        this.eliteFlag = false;
        k = this.allowed(fixed, Number.POSITIVE_INFINITY) ? fixed : -1;
      } else k = this.pickEnemy(FILL, PEAK, 0);
      if (k < 0) continue;
      this.emit(k, spots[j].angle, spots[j].radius, i);
      emitted += 1;
    }
    this.credit -= emitted;
    return alive + emitted;
  }

  private activeIndexOf(id: EnemyId): number {
    for (let k = 0; k < this.active.length; k++) {
      if (this.level.enemyPool[this.active[k]].enemyId === id) return k;
    }
    return -1;
  }

  private emit(k: number, angle: number, radius: number, eventId = -1): void {
    const elite = this.eliteFlag;
    const req: SpawnRequest = {
      enemyId: this.level.enemyPool[this.active[k]].enemyId,
      angle,
      radius,
      elite,
    };
    if (eventId >= 0) req.eventId = eventId;
    this.out.push(req);
    this.roleCount[this.roleOf[k]] += 1;
    this.tracked += 1;
    if (elite) this.eliteAlive += 1;
  }

  /** Under the role cap (with a little room for the estimate's rounding) and affordable. */
  private allowed(k: number, spend: number): boolean {
    const r = this.roleOf[k];
    return this.roleCount[r] + 1 <= this.capFor(r) + 1e-9 && this.costOf[k] <= spend;
  }

  private capFor(r: number): number {
    const base = this.capOf[r];
    if (base === Number.POSITIVE_INFINITY) return base;
    return Math.max(base, Math.ceil(ROLE_CAP_HEADROOM * this.roleShare[r] * (this.tracked + 1)));
  }

  /**
   * @param openingLeft spawns of the opening wave still to place including this one (0 outside the opening).
   * @returns index into `active`, -1 if nothing may spawn now.
   */
  private pickEnemy(mode: number, phase: number, openingLeft: number): number {
    this.eliteFlag = false;
    const budgeted = mode === REGULAR && phase !== BOSS;
    const spend = budgeted
      ? phase === PEAK
        ? this.budget
        : this.budget - this.reserve()
      : Number.POSITIVE_INFINITY;
    const k = this.varied
      ? this.pickVaried(spend, openingLeft, mode === FILL)
      : this.pickIndependent(spend);
    if (k < 0) return -1;
    if (budgeted && this.eliteOn) this.rollElite(k, spend, phase);
    const cost = this.eliteFlag ? this.costOf[k] * this.eliteRules.costMul : this.costOf[k];
    if (budgeted) this.budget -= cost;
    else if (mode === FILL) this.budget = Math.max(0, this.budget - cost);
    return k;
  }

  /** Elite (RS-01.5): affordable at `costMul`, below `maxShare` of the living, preferred in the peak. */
  private rollElite(k: number, spend: number, phase: number): void {
    const rules = this.eliteRules;
    if (this.costOf[k] * rules.costMul > spend) return;
    if (this.eliteAlive + 1 > rules.maxShare * (this.tracked + 1)) return;
    const chance = phase === PEAK ? ELITE_CHANCE_PEAK : ELITE_CHANCE_OTHER;
    this.eliteFlag = this.rng.next() < chance;
  }

  /** Level 3 and up: independent weighted draw among the allowed types. */
  private pickIndependent(spend: number): number {
    let sum = 0;
    for (let k = 0; k < this.active.length; k++)
      if (this.allowed(k, spend)) sum += this.weightOf[k];
    if (sum <= 0) return -1;
    let r = this.rng.next() * sum;
    let pick = -1;
    for (let k = 0; k < this.active.length; k++) {
      if (!this.allowed(k, spend)) continue;
      pick = k;
      r -= this.weightOf[k];
      if (r < 0) break;
    }
    return pick;
  }

  /** Level 0 to 2: variety rule (AP-166) among the allowed types. */
  private pickVaried(spend: number, openingLeft: number, fill: boolean): number {
    let k = -1;
    if (this.unseen > 0) {
      // Every type shows up early: spread over the opening wave, at the latest at spawn FIRST_APPEARANCE_BY.
      const force =
        openingLeft > 0
          ? this.rng.next() * openingLeft < this.unseen
          : this.spawned >= FIRST_APPEARANCE_BY - 1;
      if (force) {
        let n = 0;
        let waiting = false;
        for (let j = 0; j < this.active.length; j++) {
          if (this.seen[j]) continue;
          if (this.allowed(j, spend)) n += 1;
          else if (this.allowed(j, Number.POSITIVE_INFINITY)) waiting = true;
        }
        // An unseen type is only short of budget: wait for it instead of drawing another one.
        if (n === 0 && waiting) return -1;
        if (n > 0) {
          let r = Math.floor(this.rng.next() * n);
          for (let j = 0; j < this.active.length; j++) {
            if (this.seen[j] || !this.allowed(j, spend)) continue;
            if (r-- === 0) {
              k = j;
              break;
            }
          }
          if (this.left[k] <= 0) this.refillBag();
          this.left[k] -= 1;
        }
      }
    }
    if (k < 0) k = this.drawFromBag(spend, fill);
    if (k < 0) return -1;
    if (k === this.lastIndex) this.run += 1;
    else {
      this.lastIndex = k;
      this.run = 1;
    }
    if (!this.seen[k]) {
      this.seen[k] = true;
      this.unseen -= 1;
    }
    this.spawned += 1;
    return k;
  }

  private refillBag(): void {
    for (let j = 0; j < this.left.length; j++) this.left[j] += this.quota[j];
  }

  private bagSum(blocked: number, spend: number): number {
    let sum = 0;
    for (let j = 0; j < this.left.length; j++) {
      if (j !== blocked && this.allowed(j, spend)) sum += this.left[j];
    }
    return sum;
  }

  /**
   * Draws from the "bag" (remaining tokens per type, refilled when empty): the long-run shares equal the pool shares,
   * and a type that already came MAX_RUN times in a row is skipped. Types over their role cap or above the budget are
   * skipped too; their tokens stay in the bag, so the shares stay unbiased as long as the caps free up again. The run
   * rule gives way only if every other type is over its role cap (or for a fill spawn of the minimum occupancy);
   * if the others are only short of budget, the spawn waits.
   */
  private drawFromBag(spend: number, fill: boolean): number {
    let blocked = this.run >= MAX_RUN ? this.lastIndex : -1;
    let any = false;
    let uncapped = false;
    for (let j = 0; j < this.left.length; j++) {
      if (j === blocked) continue;
      if (this.allowed(j, spend)) any = true;
      if (this.allowed(j, Number.POSITIVE_INFINITY)) uncapped = true;
    }
    if (!any) {
      if (blocked < 0 || !this.allowed(blocked, spend) || (uncapped && !fill)) return -1;
      blocked = -1;
    }
    let sum = this.bagSum(blocked, spend);
    if (sum <= 0) {
      this.refillBag();
      sum = this.bagSum(blocked, spend);
    }
    let r = this.rng.next() * sum;
    let pick = -1;
    for (let j = 0; j < this.left.length; j++) {
      if (j === blocked || !this.allowed(j, spend)) continue;
      pick = j;
      r -= this.left[j];
      if (r < 0) break;
    }
    this.left[pick] -= 1;
    return pick;
  }
}
