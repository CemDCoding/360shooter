import { describe, expect, it } from 'vitest';
import { BALANCE_BANDS, LEVELS, LEVEL_COUNT } from '../../src/config';
import {
  basePressure,
  goldPerMinute,
  goldPerWin,
  referenceGoldBefore,
  referenceLoadout,
  referencePressure,
  stageForGold,
} from '../../src/logic/balanceModel';

// AP-167 (PE-208, RS-05.1): Kurve, Saegezahn und Gold je Minute der Referenzspielerin. Die Baender stehen in
// config/balanceTargets.ts. Heute verletzte Baender stehen in KNOWN_OUT_OF_BAND: der Test prueft, dass genau diese Level
// ausserhalb liegen. Ein neuer Ausreisser schlaegt fehl, ein behobener auch (dann den Eintrag loeschen).

interface Known {
  levels: readonly number[];
  /** Ist-Wert bei Einfuehrung (AP-167), nur zur Lesbarkeit. */
  ist: string;
  /** Zustaendiges Paket oder offene Entscheidung. */
  paket: string;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Prueft, dass `actual` genau die Level der Eintraege enthaelt (ohne Doppelte, jeder Eintrag mit Paket). */
function expectExactly(actual: readonly number[], known: readonly Known[], what: string): void {
  for (const k of known) expect(k.paket, `${what}: paket`).toMatch(/^(AP-\d+|Q-\d+)/);
  const want = known.flatMap((k) => k.levels);
  expect(new Set(want).size, `${what}: duplicate entries`).toBe(want.length);
  expect(
    [...actual].sort((a, b) => a - b),
    what,
  ).toEqual([...want].sort((a, b) => a - b));
}

const ids = range(0, LEVEL_COUNT - 1);
const sameBatch = (i: number): boolean => LEVELS[i].batch === LEVELS[i - 1].batch;

const KNOWN_OUT_OF_BAND = {
  /** Referenz-Druck ausserhalb 0,75 bis 1,8 (RS-05: Level 4 und Oase). */
  pressure: [
    { levels: [4], ist: '2,11', paket: 'AP-168' },
    { levels: range(33, 40), ist: '1,86 bis 3,99', paket: 'AP-168' },
  ],
  /** Level 40 liegt nicht in 1,7 bis 1,8. */
  finalPressure: [{ levels: [40], ist: '3,99', paket: 'AP-168' }],
  /**
   * Schritt zum Vorgaenger im selben Batch ueber +12 %. Wald 1 bis 4 und Oase 32 bis 36 sind AP-168. ACHTUNG: Die Zahlen
   * aus RS-05.2 fuer Level 0 bis 4 (0,77 / 0,91 / 1,11 / 1,31 / 1,54) ergeben selbst +18 bis +22 % je Schritt; Level 23
   * und 27 bis 29 (Wueste, Pyramiden) bleiben nach AP-168 unveraendert. Beides widerspricht dem Band und braucht eine
   * Entscheidung des Planners (Q-78, Band lockern oder Level 21 bis 30 aendern).
   */
  step: [
    { levels: [1, 2, 3, 4], ist: '1,23 bis 1,34', paket: 'AP-168 / Q-78' },
    { levels: [23], ist: '1,151', paket: 'Q-78' },
    { levels: [27, 28, 29], ist: '1,122 bis 1,129', paket: 'Q-78' },
    { levels: range(32, 36), ist: '1,124 bis 1,140', paket: 'AP-168' },
  ],
  /** Gold je Minute weicht mehr als 10 % vom Nachbarlevel (andere Laenge, gleicher Batch) ab. */
  gold: [{ levels: [3], ist: '+13,4 % (180 s zu 300 s)', paket: 'AP-168' }],
} as const satisfies Record<string, readonly Known[]>;

describe('balance model: reference player (AP-167)', () => {
  it('is deterministic and covers all 41 levels', () => {
    expect(ids).toHaveLength(41);
    for (const i of [0, 4, 20, 40]) {
      expect(referencePressure(i)).toBe(referencePressure(i));
      expect(referenceLoadout(i)).toEqual(referenceLoadout(i));
    }
  });

  it('has no upgrades before level 0 and the stages rise with the gold of the levels before', () => {
    expect(referenceGoldBefore(0)).toBe(0);
    expect(referenceLoadout(0).weaponDamage).toBe(0);
    for (const i of range(1, 40)) {
      expect(referenceGoldBefore(i), `level ${i}`).toBeGreaterThan(referenceGoldBefore(i - 1));
      expect(referenceLoadout(i).weaponDamage, `level ${i}`).toBeGreaterThanOrEqual(
        referenceLoadout(i - 1).weaponDamage,
      );
    }
    expect(stageForGold(0)).toBe(0);
    expect(stageForGold(1e9)).toBe(15);
  });

  it('spends 35 percent of the gold on each damage track and 30 percent on the rest', () => {
    const l = referenceLoadout(20);
    expect(l.weaponFireRate).toBe(l.weaponDamage);
    expect(l.playerMaxHp).toBe(l.playerTurnSpeed);
    expect(l.playerMaxHp).toBeLessThan(l.weaponDamage);
  });

  it('matches the numbers of RS-05 section 0 within 10 percent', () => {
    const rs: [number, number][] = [
      [0, 0.77],
      [4, 2.12],
      [9, 1.68],
      [21, 0.93],
      [30, 1.8],
      [40, 3.99],
    ];
    for (const [level, want] of rs) {
      expect(referencePressure(level) / want, `level ${level}`).toBeGreaterThan(0.9);
      expect(referencePressure(level) / want, `level ${level}`).toBeLessThan(1.1);
    }
    expect(referenceLoadout(40).weaponDamage).toBeGreaterThan(13.5);
    expect(referenceLoadout(40).weaponDamage).toBeLessThan(14.7);
  });

  it('pressure without upgrades is larger than the reference pressure', () => {
    for (const i of range(1, 40)) expect(basePressure(i)).toBeGreaterThan(referencePressure(i));
  });
});

describe('balance model: difficulty curve targets (RS-05.1)', () => {
  const { pressure, finalLevelPressure, maxStepInBatch } = BALANCE_BANDS;

  it('keeps the reference pressure in 0.75 to 1.8, except the known levels', () => {
    const out = ids.filter((i) => {
      const p = referencePressure(i);
      return p < pressure.min || p > pressure.max;
    });
    expectExactly(out, KNOWN_OUT_OF_BAND.pressure, 'pressure');
  });

  it('makes level 40 the maximum, and 1.7 to 1.8 except the known case', () => {
    const top = Math.max(...ids.map(referencePressure));
    expect(referencePressure(40)).toBe(top);
    const p = referencePressure(40);
    const out = p < finalLevelPressure.min || p > finalLevelPressure.max ? [40] : [];
    expectExactly(out, KNOWN_OUT_OF_BAND.finalPressure, 'final pressure');
  });

  it('limits the step inside a batch to +12 percent, except the known levels', () => {
    const out = range(1, 40).filter(
      (i) => sameBatch(i) && referencePressure(i) / referencePressure(i - 1) > maxStepInBatch,
    );
    expectExactly(out, KNOWN_OUT_OF_BAND.step, 'step');
  });

  it('starts every batch below the end of the previous one (sawtooth)', () => {
    const starts = range(1, 40).filter((i) => !sameBatch(i));
    expect(starts).toHaveLength(5);
    for (const i of starts) {
      expect(referencePressure(i), `level ${i}`).toBeLessThan(referencePressure(i - 1));
    }
  });

  it('does not fall inside a batch by more than 2 percent (the tier carries the rise)', () => {
    for (const i of range(1, 40).filter(sameBatch)) {
      expect(referencePressure(i), `level ${i}`).toBeGreaterThan(referencePressure(i - 1) * 0.98);
    }
  });
});

describe('balance model: gold per minute (RS-05.1)', () => {
  it('gives every level gold, rising from level 0 to level 40', () => {
    for (const i of ids) expect(goldPerWin(i), `level ${i}`).toBeGreaterThan(5);
    expect(goldPerMinute(40)).toBeGreaterThan(goldPerMinute(0) * 10);
  });

  it('keeps 3-minute and 5-minute levels of one batch within 10 percent, except the known level', () => {
    const tol = BALANCE_BANDS.goldPerMinuteTolerance;
    const out = range(1, 40).filter(
      (i) =>
        sameBatch(i) &&
        LEVELS[i].durationSec !== LEVELS[i - 1].durationSec &&
        Math.abs(goldPerMinute(i) / goldPerMinute(i - 1) - 1) > tol,
    );
    expectExactly(out, KNOWN_OUT_OF_BAND.gold, 'gold');
  });
});
