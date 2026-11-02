import { describe, expect, it } from 'vitest';
import { ARENA, spawnRadiusFor } from '../../src/config/arena';
import { WAVE_PLANS } from '../../src/config/waves';
import type { SpawnEventDef } from '../../src/contracts';
import { dueEvents, eventCount, eventPositions, eventSchedule } from '../../src/logic/spawnEvents';

function rngOf(seed: number): { next(): number } {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
const TAU = Math.PI * 2;
const angDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % TAU;
  return Math.min(d, TAU - d);
};
const ev = (kind: SpawnEventDef['kind'], count = 12, sectorDeg?: number): SpawnEventDef => ({
  kind,
  atSec: 30,
  count,
  announceMs: 1000,
  ...(sectorDeg !== undefined ? { sectorDeg } : {}),
});
const arenas = [ARENA.minWidth, 760, ARENA.maxWidth].map((width) => ({
  width,
  height: ARENA.height,
}));

describe('eventSchedule / dueEvents', () => {
  it('is fixed and reproducible, announcement exactly announceMs before the first spawn', () => {
    for (let id = 0; id < WAVE_PLANS.length; id++) {
      const s = eventSchedule(id);
      expect(eventSchedule(id)).toEqual(s);
      expect(s.length).toBe(WAVE_PLANS[id].events.length);
      for (const e of s) {
        expect(e.fireMs - e.announceMs).toBe(e.event.announceMs);
        expect(e.announceMs).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('reports each announcement and firing once, announcement first', () => {
    const id = WAVE_PLANS.findIndex((p) => p.events.length > 0);
    const s = eventSchedule(id);
    expect(s.length).toBeGreaterThan(0);
    let prev = -1;
    let ann = 0;
    let fire = 0;
    const announced = new Set<unknown>();
    for (let t = 0; t <= 600000; t += 100) {
      const d = dueEvents(s, t, prev);
      for (const a of d.announce) announced.add(a);
      for (const f of d.fire) expect(announced.has(f)).toBe(true);
      ann += d.announce.length;
      fire += d.fire.length;
      prev = t;
    }
    expect(ann).toBe(s.length);
    expect(fire).toBe(s.length);
  });
  it('moves an event planned too early so the announcement stays at or after 0', () => {
    const s = eventSchedule(0);
    for (const e of s) expect(e.announceMs).toBeGreaterThanOrEqual(0);
  });
  it('returns an empty schedule for an unknown level', () => {
    expect(eventSchedule(9999)).toEqual([]);
  });
});

describe('eventPositions', () => {
  it('swarm stays inside one sector of the given width', () => {
    for (const arena of arenas)
      for (let seed = 1; seed <= 30; seed++) {
        const pos = eventPositions(ev('swarm', 14, 60), arena, rngOf(seed));
        expect(pos).toHaveLength(14);
        for (const p of pos) {
          for (const q of pos)
            expect(angDiff(p.angle, q.angle)).toBeLessThanOrEqual(Math.PI / 3 + 1e-9);
          expect(p.radius).toBeCloseTo(spawnRadiusFor(arena));
        }
      }
  });
  it('ring is evenly spread', () => {
    const pos = eventPositions(ev('ring', 10), arenas[0], rngOf(3));
    const sorted = pos.map((p) => p.angle).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i] - sorted[i - 1]).toBeCloseTo(TAU / 10);
    }
  });
  it('pincer fills two opposite sectors', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const pos = eventPositions(ev('pincer', 11, 50), arenas[2], rngOf(seed));
      expect(pos).toHaveLength(11);
      const w = (50 * Math.PI) / 180;
      const a = pos.slice(0, 6);
      const b = pos.slice(6);
      for (const p of a)
        for (const q of a) expect(angDiff(p.angle, q.angle)).toBeLessThanOrEqual(w + 1e-9);
      for (const p of b)
        for (const q of b) expect(angDiff(p.angle, q.angle)).toBeLessThanOrEqual(w + 1e-9);
      // sector centres are opposite: every point of b is within w of the mirror of any point of a
      for (const p of b)
        expect(angDiff(p.angle, a[0].angle + Math.PI)).toBeLessThanOrEqual(w + 1e-9);
    }
  });
  it('is reproducible with the same rng and never exceeds the limit', () => {
    expect(eventPositions(ev('ring'), arenas[1], rngOf(9))).toEqual(
      eventPositions(ev('ring'), arenas[1], rngOf(9)),
    );
    expect(eventPositions(ev('swarm', 12, 60), arenas[1], rngOf(9), 4)).toHaveLength(4);
    expect(eventPositions(ev('ring'), arenas[1], rngOf(9), 0)).toEqual([]);
  });
  it('spawns outside the arena (distance to the player at least the margin)', () => {
    for (const arena of arenas) {
      const r = eventPositions(ev('ring'), arena, rngOf(1))[0].radius;
      expect(r).toBeGreaterThanOrEqual(
        Math.hypot(arena.width, arena.height) / 2 + ARENA.spawnMarginPx,
      );
    }
  });
  it('rejects a sector event without sectorDeg', () => {
    expect(() => eventPositions(ev('swarm'), arenas[0], rngOf(1))).toThrow();
  });
});

describe('eventCount', () => {
  it('caps by free room under maxEnemies, no catch-up', () => {
    expect(eventCount(ev('ring', 12), 10, 20)).toBe(10);
    expect(eventCount(ev('ring', 12), 20, 20)).toBe(0);
    expect(eventCount(ev('ring', 12), 25, 20)).toBe(0);
    expect(eventCount(ev('ring', 12), 0, 40)).toBe(12);
  });
});
