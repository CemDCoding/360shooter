import { describe, expect, it } from 'vitest';
import { BALANCE_BANDS, LEVELS, LEVEL_COUNT } from '../../src/config';
import {
  announceShare,
  attackCount,
  bossDuration,
  bossDurationBand,
  bossHp,
  levelAttacks,
} from '../../src/logic/balanceModel';
import { availableAttacks, bossForLevel, variantForLevel } from '../../src/logic/boss';

// AP-167 (PE-208, RS-05.1, RS-05.3): Boss-Dauer und Ankuendigungs-Anteil der Referenzspielerin (ohne Pet, Doppelschuss im
// Mittel 1,5). Heute verletzte Baender stehen in KNOWN_OUT_OF_BAND (genau diese Level muessen ausserhalb liegen).

interface Known {
  levels: readonly number[];
  ist: string;
  paket: string;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

function expectExactly(actual: readonly number[], known: readonly Known[], what: string): void {
  for (const k of known) expect(k.paket, `${what}: paket`).toMatch(/^AP-\d+/);
  const want = known.flatMap((k) => k.levels);
  expect(new Set(want).size, `${what}: duplicate entries`).toBe(want.length);
  expect(
    [...actual].sort((a, b) => a - b),
    what,
  ).toEqual([...want].sort((a, b) => a - b));
}

const ids = range(0, LEVEL_COUNT - 1);

// AP-170: Boss-HP nach Zielzeit und laengere Abklingzeiten, beide Listen sind leer.
const KNOWN_OUT_OF_BAND = {
  duration: [],
  announce: [],
} as const satisfies Record<string, readonly Known[]>;

describe('balance boss: duration (AP-167, RS-05.3)', () => {
  it('has a boss hp and a target band for every level', () => {
    for (const i of ids) {
      expect(bossHp(i), `level ${i}`).toBeGreaterThan(0);
      const b = bossDurationBand(i);
      expect(b.max, `level ${i}`).toBeGreaterThan(b.min);
    }
    expect(bossDurationBand(0)).toEqual(BALANCE_BANDS.bossDurationBatchStart);
    expect(bossDurationBand(4)).toEqual(BALANCE_BANDS.bossDurationBatchEnd);
    expect(bossDurationBand(40)).toEqual(BALANCE_BANDS.bossDurationFinal);
    expect(bossDurationBand(21)).toEqual(BALANCE_BANDS.bossDurationBatchStart);
    expect(bossDurationBand(25)).toEqual(BALANCE_BANDS.bossDurationBatchEnd);
  });

  it('keeps the duration in the band, except the known levels', () => {
    const out = ids.filter((i) => {
      const d = bossDuration(i);
      const b = bossDurationBand(i);
      return d < b.min || d > b.max;
    });
    expectExactly(out, KNOWN_OUT_OF_BAND.duration, 'duration');
  });

  it('puts the duration near the middle of the band (AP-170, target time)', () => {
    for (const i of ids) {
      const b = bossDurationBand(i);
      expect(bossDuration(i), `level ${i}`).toBeCloseTo((b.min + b.max) / 2, 0);
    }
  });

  it('keeps the duration without double shot below 70 s (RI-41)', () => {
    for (const i of ids)
      expect(bossDuration(i, { doubleShot: false }), `level ${i}`).toBeLessThan(70);
  });

  it('is longer by the double shot mean without double shot (AP-170: up to about 70 s)', () => {
    // Die Tabelle aus RS-05 Abschnitt 2 galt fuer die alten Boss-HP; seit AP-170 gilt die Zielzeit.
    for (const level of [0, 21, 40]) {
      const ratio = bossDuration(level, { doubleShot: false }) / bossDuration(level);
      expect(ratio, `level ${level}`).toBeCloseTo(1.5, 6);
    }
    expect(bossDuration(40, { doubleShot: false })).toBeCloseTo(67.5, 0);
  });

  it('is shorter with double shot and with a pet', () => {
    for (const i of [0, 20, 40]) {
      expect(bossDuration(i)).toBeLessThan(bossDuration(i, { doubleShot: false }));
      expect(bossDuration(i, { pet: 'bee' })).toBeLessThan(bossDuration(i));
    }
  });
});

describe('balance boss: announcements (AP-167, RS-05.3)', () => {
  it('keeps the announce share at 0.40 or less, except the known levels', () => {
    const out = ids.filter(
      (i) => announceShare(LEVELS[i].bossId!, i) > BALANCE_BANDS.announceShareMax,
    );
    expectExactly(out, KNOWN_OUT_OF_BAND.announce, 'announce');
  });

  it('counts an attack from its cooldown on, then every cooldown plus warning', () => {
    expect(attackCount(3500, 1200, 4.6)).toBe(0);
    expect(attackCount(3500, 1200, 4.7)).toBe(1);
    expect(attackCount(3500, 1200, 9.4)).toBe(2);
  });

  it('shows every attack of the level at least once at the lower end of the target band', () => {
    for (const i of ids) {
      const t = bossDurationBand(i).min;
      for (const a of levelAttacks(i)) {
        expect(
          attackCount(a.cooldownMs, a.telegraphMs, t),
          `level ${i} ${a.id}`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('shows every attack including opt-in ones at the target time (AP-170)', () => {
    for (const i of ids) {
      const t = bossDuration(i);
      const def = bossForLevel(i)!;
      const attacks = availableAttacks(
        def,
        variantForLevel(i),
        def.attacks.filter((a) => a.optIn).map((a) => a.id),
      );
      for (const a of attacks) {
        expect(
          attackCount(a.cooldownMs, a.telegraphMs, t),
          `level ${i} ${a.id}`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('leaves out opt-in attacks and the extra attacks of the first two levels of a batch', () => {
    expect(levelAttacks(0).map((a) => a.id)).not.toContain('rootRing');
    expect(levelAttacks(2).map((a) => a.id)).toContain('rootRing');
    expect(levelAttacks(23).map((a) => a.id)).not.toContain('quarrel');
  });
});
