import { describe, expect, it } from 'vitest';
import { BOSSES, MIN_TELEGRAPH_MS } from '../../src/config/bosses';
import { LEVELS } from '../../src/config/levels';
import {
  AttackScheduler,
  NO_TINT,
  availableAttacks,
  bossForLevel,
  indexInBatch,
  scaledDamage,
  scaledHp,
  variantForLevel,
  type AttackEvent,
} from '../../src/logic/boss';

const BATCHES: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
];

function fixedRng(value = 0): { next(): number } {
  return { next: () => value };
}

describe('variantForLevel', () => {
  it('uses the index inside the batch', () => {
    expect([0, 4, 5, 9, 10, 20].map(indexInBatch)).toEqual([0, 4, 0, 4, 0, 10]);
    expect(() => indexInBatch(21)).toThrow(RangeError);
    expect(() => indexInBatch(-1)).toThrow(RangeError);
  });

  it('gives index 0 the plain boss', () => {
    expect(variantForLevel(0)).toEqual({
      index: 0,
      hpMultiplier: 1,
      damageMultiplier: 1,
      tint: NO_TINT,
      extraAttack: false,
    });
  });

  it('raises HP by 15 % and damage by 10 % per index', () => {
    const v = variantForLevel(8);
    expect(v.index).toBe(3);
    expect(v.hpMultiplier).toBeCloseTo(1.45);
    expect(v.damageMultiplier).toBeCloseTo(1.3);
  });

  it('unlocks the extra attack from index 2', () => {
    expect(variantForLevel(1).extraAttack).toBe(false);
    expect(variantForLevel(2).extraAttack).toBe(true);
    expect(variantForLevel(7).extraAttack).toBe(true);
    expect(variantForLevel(10).extraAttack).toBe(false);
    expect(variantForLevel(12).extraAttack).toBe(true);
  });

  it.each(BATCHES.map((b, i) => [i, b] as const))(
    'rises monotonically with a new tint per level in batch %i',
    (_i, ids) => {
      const vs = ids.map(variantForLevel);
      for (let i = 1; i < vs.length; i++) {
        expect(vs[i].hpMultiplier).toBeGreaterThan(vs[i - 1].hpMultiplier);
        expect(vs[i].damageMultiplier).toBeGreaterThan(vs[i - 1].damageMultiplier);
        expect(vs[i].tint).not.toBe(vs[i - 1].tint);
        if (vs[i - 1].extraAttack) expect(vs[i].extraAttack).toBe(true);
      }
    },
  );

  it('scales HP and damage', () => {
    const def = BOSSES.rootMonster;
    expect(scaledHp(def, variantForLevel(0))).toBe(def.baseHp);
    expect(scaledHp(def, variantForLevel(4))).toBe(Math.round(def.baseHp * 1.6));
    expect(scaledDamage(10, variantForLevel(2))).toBe(12);
  });
});

describe('boss data', () => {
  it('gives all 21 levels a boss of their batch', () => {
    expect(LEVELS).toHaveLength(21);
    expect(BATCHES[0].map((id) => bossForLevel(id)?.id)).toEqual(Array(5).fill('rootMonster'));
    expect(BATCHES[1].map((id) => bossForLevel(id)?.id)).toEqual(Array(5).fill('forestGhost'));
    expect(BATCHES[2].map((id) => bossForLevel(id)?.id)).toEqual(Array(11).fill('giantStone'));
    expect(bossForLevel(99)).toBeUndefined();
  });

  it('has unique attack ids and fair warnings (at least 700 ms)', () => {
    for (const def of Object.values(BOSSES)) {
      const ids = def.attacks.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(def.baseHp).toBeGreaterThan(0);
      for (const a of def.attacks) {
        expect(a.telegraphMs, `${def.id}.${a.id}`).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
        expect(a.cooldownMs).toBeGreaterThan(a.telegraphMs);
        expect(a.damage).toBeGreaterThanOrEqual(0);
      }
      // Every boss has at least one attack without extraOnly.
      expect(availableAttacks(def, variantForLevel(0)).length).toBeGreaterThan(0);
    }
  });

  it('adds the extra attacks only with extraAttack', () => {
    const def = BOSSES.rootMonster;
    expect(availableAttacks(def, variantForLevel(1)).map((a) => a.id)).toEqual([
      'rootThrust',
      'forestCall',
    ]);
    expect(availableAttacks(def, variantForLevel(2)).map((a) => a.id)).toContain('rootRing');
  });
});

describe('AttackScheduler', () => {
  function collect(sched: AttackScheduler, totalMs: number, stepMs = 50): AttackEvent[] {
    const out: AttackEvent[] = [];
    for (let t = 0; t < totalMs; t += stepMs) out.push(...sched.tick(stepMs));
    return out;
  }

  it('starts nothing before the first cooldown is over', () => {
    const def = BOSSES.rootMonster;
    const s = new AttackScheduler(def, variantForLevel(0), fixedRng());
    expect(collect(s, 3400)).toEqual([]);
  });

  it('announces first and executes exactly telegraphMs later', () => {
    const def = BOSSES.rootMonster;
    const s = new AttackScheduler(def, variantForLevel(0), fixedRng());
    let now = 0;
    const seen: { e: AttackEvent; at: number }[] = [];
    for (; now < 6000;) {
      now += 10;
      for (const e of s.tick(10)) seen.push({ e, at: now });
    }
    const [warn, hit] = seen;
    expect(warn.e.type).toBe('telegraph');
    expect(hit.e.type).toBe('execute');
    expect(hit.e.attackId).toBe(warn.e.attackId);
    expect(warn.e.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    expect(hit.at - warn.at).toBeGreaterThanOrEqual(warn.e.telegraphMs);
    expect(hit.at - warn.at).toBeLessThan(warn.e.telegraphMs + 20);
    expect(hit.e.executeAtMs).toBe(warn.e.executeAtMs);
  });

  it('never hits without a warning and runs one attack at a time', () => {
    const def = BOSSES.giantStone;
    const s = new AttackScheduler(def, variantForLevel(3), fixedRng(0.5));
    const events = collect(s, 120_000, 16);
    expect(events.length).toBeGreaterThan(10);
    let open: AttackEvent | null = null;
    for (const e of events) {
      if (e.type === 'telegraph') {
        expect(open).toBeNull();
        open = e;
      } else {
        expect(open?.attackId).toBe(e.attackId);
        open = null;
      }
    }
  });

  it('respects the cooldown of every attack and the gap', () => {
    const def = BOSSES.rootMonster;
    const s = new AttackScheduler(def, variantForLevel(2), fixedRng(0.3));
    const events = collect(s, 200_000, 16);
    const lastExec = new Map<string, number>();
    const times: { e: AttackEvent; at: number }[] = [];
    // Rebuild times from executeAtMs: warning and hit share it.
    for (const e of events) {
      if (e.type !== 'execute') continue;
      times.push({ e, at: e.executeAtMs });
    }
    for (const { e, at } of times) {
      const def2 = def.attacks.find((a) => a.id === e.attackId);
      const prev = lastExec.get(e.attackId);
      if (prev !== undefined && def2) {
        // Cooldown counts from the hit to the next hit minus the next warning.
        expect(at - prev).toBeGreaterThanOrEqual(def2.cooldownMs + def2.telegraphMs - 16);
      }
      lastExec.set(e.attackId, at);
    }
    expect(times.length).toBeGreaterThan(5);
  });

  it('uses extra attacks only for variants with extraAttack', () => {
    const def = BOSSES.forestGhost;
    const plain = collect(new AttackScheduler(def, variantForLevel(5), fixedRng(0.9)), 200_000);
    expect(plain.some((e) => e.attackId === 'decoys')).toBe(false);
    const extra = new AttackScheduler(def, variantForLevel(7), { next: seq([0.99, 0.5, 0.1]) });
    expect(collect(extra, 200_000).some((e) => e.attackId === 'decoys')).toBe(true);
  });

  it('scales the damage with the variant', () => {
    const def = BOSSES.rootMonster;
    const events = collect(new AttackScheduler(def, variantForLevel(4), fixedRng()), 5000);
    const hit = events.find((e) => e.type === 'execute');
    expect(hit?.damage).toBe(scaledDamage(15, variantForLevel(4)));
  });

  it('ignores invalid time steps and stops after cancel', () => {
    const s = new AttackScheduler(BOSSES.rootMonster, variantForLevel(0), fixedRng());
    expect(s.tick(Number.NaN)).toEqual([]);
    expect(s.tick(-5)).toEqual([]);
    collect(s, 3500);
    expect(s.busy).toBe(true);
    s.cancel();
    expect(s.busy).toBe(false);
    expect(s.tick(2000).every((e) => e.type === 'telegraph')).toBe(true);
  });
});

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}
