import { spawnRadiusFor } from '../config/arena';
import { WAVE_PLANS } from '../config/waves';
import type { ArenaSize, SpawnEventDef } from '../contracts';
import type { SpawnRng } from './spawn';

/** One event of the round with fixed times (ms since round start). */
export interface ScheduledEvent {
  event: SpawnEventDef;
  /** Time of the announcement; always `announceMs` before `fireMs`. */
  announceMs: number;
  /** Time of the first spawn. */
  fireMs: number;
}

/** Events that become due in a time window. */
export interface DueEvents {
  announce: ScheduledEvent[];
  fire: ScheduledEvent[];
}

/** One spawn position: angle (rad, 0..2*PI) and radius around the player, like `SpawnRequest`. */
export interface EventPosition {
  angle: number;
  radius: number;
}

const TAU = Math.PI * 2;

/**
 * Fixed, reproducible schedule of a level (no randomness). An event planned earlier than its own
 * announcement time is moved back so the announcement is never before the round start.
 */
export function eventSchedule(levelId: number): ScheduledEvent[] {
  const plan = WAVE_PLANS[levelId];
  if (!plan) return [];
  return plan.events
    .map((event) => {
      const fireMs = Math.max(event.atSec * 1000, event.announceMs);
      return { event, announceMs: fireMs - event.announceMs, fireMs };
    })
    .sort((a, b) => a.fireMs - b.fireMs);
}

/**
 * Events whose announcement or firing time lies in the window (fromMs, elapsedMs]. The caller passes the
 * previous elapsed time as `fromMs` (start: -1), so nothing is reported twice and nothing is skipped.
 */
export function dueEvents(
  schedule: readonly ScheduledEvent[],
  elapsedMs: number,
  fromMs: number,
): DueEvents {
  return {
    announce: schedule.filter((s) => s.announceMs > fromMs && s.announceMs <= elapsedMs),
    fire: schedule.filter((s) => s.fireMs > fromMs && s.fireMs <= elapsedMs),
  };
}

/** Number of enemies an event may spawn: the free room under the cap; the rest is dropped (no catch-up). */
export function eventCount(event: SpawnEventDef, alive: number, maxEnemies: number): number {
  return Math.max(0, Math.min(event.count, maxEnemies - alive));
}

function sectorRad(event: SpawnEventDef): number {
  if (event.sectorDeg === undefined || !(event.sectorDeg > 0)) {
    throw new Error(`Spawn event "${event.kind}" needs sectorDeg > 0`);
  }
  return Math.min(TAU, (event.sectorDeg * Math.PI) / 180);
}

/** Random angles inside a sector of the given width around `center`. */
function inSector(center: number, width: number, n: number, rng: SpawnRng): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(center + (rng.next() - 0.5) * width);
  return out;
}

/**
 * Spawn positions of an event on the spawn ring outside the arena, so the distance to the player is at
 * least the spawn margin, like normal spawns; the ring radius follows the arena width 640..900.
 * Swarm: one sector, ring: evenly around, pincer: two opposite sectors. The direction comes from the rng.
 * `limit` caps the number (free room under maxEnemies, see `eventCount`).
 */
export function eventPositions(
  event: SpawnEventDef,
  arena: ArenaSize,
  rng: SpawnRng,
  limit: number = event.count,
): EventPosition[] {
  const n = Math.max(0, Math.min(event.count, Math.floor(limit)));
  if (n === 0) return [];
  const radius = spawnRadiusFor(arena);
  const start = rng.next() * TAU;
  let angles: number[];
  if (event.kind === 'ring') {
    angles = Array.from({ length: n }, (_, i) => start + (i * TAU) / n);
  } else if (event.kind === 'swarm') {
    angles = inSector(start, sectorRad(event), n, rng);
  } else {
    const w = sectorRad(event);
    const a = Math.ceil(n / 2);
    angles = [...inSector(start, w, a, rng), ...inSector(start + Math.PI, w, n - a, rng)];
  }
  return angles.map((angle) => ({ angle: ((angle % TAU) + TAU) % TAU, radius }));
}
