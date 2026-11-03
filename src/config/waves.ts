// Wave rhythm data (M12, AP-174, RS-01, PE-216 to PE-221). Start values RS-01, hand test H-44.
// Data only: the spawn director (AP-175) and the event logic (AP-176) read it. Nothing changes in the game yet.
import type {
  EliteRules,
  EnemyRole,
  LevelDef,
  PacingDef,
  SpawnEventDef,
  SpawnEventKind,
} from '../contracts';
import { BOSS_WARNING_REMAINING_MS } from './bosses';
import { LEVELS } from './levels';

/** Seconds of the boss phase at the end of a round; the last cycle ends before it (F-03). */
export const BOSS_WARNING_SEC = BOSS_WARNING_REMAINING_MS / 1000;

/** Number of pacing cycles by round length in seconds (3 min = about 3, 5 min = about 5; F-03). */
export const CYCLES_BY_DURATION: Readonly<Record<number, number>> = { 180: 3, 300: 5 };

/** Length of the peak and of the relax phase in seconds (RS-01.1: peak 5-8 s, relax 8-12 s). */
export const PEAK_SEC = 6;
export const RELAX_SEC = 10;
/** Spawn rate factor in the relax phase (RS-01.1). */
export const RELAX_RATE = 0.25;
/** Relative growth of the rate per cycle (RS-01.1). */
export const GROWTH_PER_CYCLE = 0.1;

/** Minimum occupancy as a share of `maxEnemies` and its upper limit (RS-01.2). */
export const MIN_ALIVE_SHARE = 0.3;
export const MIN_ALIVE_CAP = 60;

/** First level in which an event kind appears (RS-01.3): ring from 0, swarm from 5, pincer from 10. */
export const EVENT_FROM_LEVEL: Readonly<Record<SpawnEventKind, number>> = {
  ring: 0,
  swarm: 5,
  pincer: 10,
};

/** Enemy count of an event by kind (RS-01.3). */
export const EVENT_COUNT: Readonly<Record<SpawnEventKind, number>> = {
  ring: 8,
  swarm: 12,
  pincer: 10,
};

/** Opening angle in degrees by event kind (swarm, pincer; RS-01.3). */
export const EVENT_SECTOR_DEG: Readonly<Partial<Record<SpawnEventKind, number>>> = {
  swarm: 60,
  pincer: 50,
};

/** Announcement before an event (ms), at least one second (RS-01.3). */
export const EVENT_ANNOUNCE_MS = 1000;

/** Maximum number of living enemies per role (RS-01.4). Roles without an entry have no cap. */
export const ROLE_CAPS: Readonly<Partial<Record<EnemyRole, number>>> = {
  shooter: 3,
  aura: 4,
  tank: 6,
};

/**
 * Role caps grow with the field (AP-175): the cap of a role is the larger of `ROLE_CAPS` and `ROLE_CAP_HEADROOM` times
 * its expected count (pool share x living enemies). So a role never comes in clumps of more than twice its share,
 * and the pool shares (AP-166) hold within 2 percentage points also in dense fields (RS-01.4, measured in
 * tests/logic/spawn.test.ts).
 */
export const ROLE_CAP_HEADROOM = 2;

/**
 * Shape of the spawn rate curve before normalisation (RS-01.1, AP-175): the build-up rises linearly from `BUILD_FROM`
 * to `BUILD_TO`, the peak holds `PEAK_FACTOR` (x linear base ramp). The director scales build-up and peak per level so
 * that the spawns of the whole round stay those of the base ramp; the relax phase keeps `RELAX_RATE` exactly.
 */
export const BUILD_FROM = 0.5;
export const BUILD_TO = 1;
export const PEAK_FACTOR = 2;

/** Minimum occupancy: at most one fill spawn per this many ms (RS-01.2). */
export const FILL_INTERVAL_MS = 250;

/**
 * Threat budget (RS-01.4, AP-175): income per second = `BUDGET_MARGIN` x mean threat cost of the pool x base spawn
 * rate (rises over the round and with the level). Outside the peak `PEAK_RESERVE_SEC` seconds of income stay saved,
 * the peak may spend them. The account holds at most `BANK_SEC` seconds of income.
 */
export const BUDGET_MARGIN = 1.6;
export const PEAK_RESERVE_SEC = 8;
export const BANK_SEC = 30;

/** Spawns that may queue up while the budget is short; more are dropped (no catch-up, like the cap). */
export const MAX_BACKLOG = 10;

/** Chance that an affordable regular spawn becomes an elite: in the peak and elsewhere (RS-01.5, AP-175). */
export const ELITE_CHANCE_PEAK = 0.15;
export const ELITE_CHANCE_OTHER = 0.03;

/** Elite rules (RS-01.5). On from AP-178: hp x3, damage x1.5, same speed. */
export const ELITE_RULES: EliteRules = {
  enabled: true,
  fromLevel: 3,
  hpMul: 3,
  damageMul: 1.5,
  scaleMul: 1.25,
  costMul: 6,
  maxShare: 0.1,
  guaranteedDrop: true,
};

/** Number of pacing cycles of a level (last cycle ends before the boss warning). */
export function cyclesOf(durationSec: number): number {
  const known = CYCLES_BY_DURATION[durationSec];
  if (known !== undefined) return known;
  return Math.max(1, Math.round(durationSec / 60));
}

/** Pacing of a level by its round length (RS-01.1). */
export function pacingOf(level: Pick<LevelDef, 'durationSec'>): PacingDef {
  const window = level.durationSec - BOSS_WARNING_SEC;
  return {
    cycleSec: Math.floor(window / cyclesOf(level.durationSec)),
    peakSec: PEAK_SEC,
    relaxSec: RELAX_SEC,
    relaxRate: RELAX_RATE,
    growthPerCycle: GROWTH_PER_CYCLE,
  };
}

/** Minimum occupancy of a level (RS-01.2). */
export function minAliveOf(level: Pick<LevelDef, 'maxEnemies'>): number {
  return Math.min(MIN_ALIVE_CAP, Math.round(level.maxEnemies * MIN_ALIVE_SHARE));
}

/**
 * Event schedule of a level (RS-01.3): from the second cycle on, one event per cycle one second after the
 * start of the peak. The kinds rotate (newest first) through those that are open at the level.
 */
export function eventsOf(level: Pick<LevelDef, 'id' | 'durationSec'>): SpawnEventDef[] {
  const pacing = pacingOf(level);
  const cycles = cyclesOf(level.durationSec);
  // Newest kind first, so every kind that is open at the level shows up early in the round.
  const kinds = (Object.keys(EVENT_FROM_LEVEL) as SpawnEventKind[])
    .filter((k) => level.id >= EVENT_FROM_LEVEL[k])
    .reverse();
  const buildSec = pacing.cycleSec - pacing.peakSec - pacing.relaxSec;
  const events: SpawnEventDef[] = [];
  for (let cycle = 1; cycle < cycles; cycle++) {
    const kind = kinds[(cycle - 1) % kinds.length];
    const event: SpawnEventDef = {
      kind,
      atSec: cycle * pacing.cycleSec + buildSec + 1,
      count: EVENT_COUNT[kind],
      announceMs: EVENT_ANNOUNCE_MS,
    };
    const sector = EVENT_SECTOR_DEG[kind];
    if (sector !== undefined) event.sectorDeg = sector;
    events.push(event);
  }
  return events;
}

/** Wave plan of one level: the optional `LevelDef` fields of M12. */
export interface WavePlan {
  minAlive: number;
  pacing: PacingDef;
  events: SpawnEventDef[];
}

/** Wave plan for every level 0 to 40, index = level id. */
export const WAVE_PLANS: readonly WavePlan[] = LEVELS.map((level) => ({
  minAlive: minAliveOf(level),
  pacing: pacingOf(level),
  events: eventsOf(level),
}));
