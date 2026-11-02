import { describe, expect, it } from 'vitest';
import { BALANCE_BANDS, LEVELS, LEVEL_COUNT, maxStepForLevel } from '../../src/config';
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
  /** Referenz-Druck ausserhalb 0,75 bis 1,8: nach AP-168 keine Ausreisser mehr (Level 4 und Oase geglaettet). */
  pressure: [] as readonly Known[],
  /** Level 40 liegt in 1,7 bis 1,8 (1,799): kein Eintrag mehr. */
  finalPressure: [] as readonly Known[],
  /**
   * Schritt zum Vorgaenger im selben Batch ueber dem Band des Abschnitts (PE-225: Level 0 bis 4 1,22, Level 21 bis 30
   * 1,15, sonst 1,12). Level 23 (Wueste) liegt mit 1,1513 (+15,13 %) knapp ueber 1,15. Das ist KEIN Rundungsfall (der
   * Wert ist 1,1513, nicht 1,1500): Level 21 bis 30 bleiben nach Q-78 (a) unveraendert, das Band wird nicht angehoben.
   * Dem Lead gemeldet; Entscheidung beim Nutzer.
   */
  step: [{ levels: [23], ist: '1,1513 gegen 1,15', paket: 'Q-78' }],
  /**
   * Gold je Minute weicht mehr als 10 % vom Nachbarlevel im selben Batch ab. Level 3: +13,1 % (180 s zu 300 s, die
   * Rundenlaenge aendert Gold je Minute, AP-167). Level 4: +11,1 % gegen Level 3 (gleich lang). Gold je Runde bleibt
   * durch AP-168 unveraendert (xp/coin folgen dem Gegnerzahl-Faktor), die Spreizung stammt aus der Pool-Mischung und den
   * Level-Werten und liegt ausserhalb dieses Pakets (Spielwerte Gold, Entscheidung des Nutzers).
   */
  gold: [
    { levels: [3], ist: '+13,1 % (180 s zu 300 s)', paket: 'AP-168' },
    { levels: [4], ist: '+11,1 % (gleich lang)', paket: 'AP-168' },
  ],
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
      [4, 1.54], // AP-168: Zielzahl RS-05.2 (vorher 2,12, Spitze behoben)
      [9, 1.68],
      [21, 0.93],
      [30, 1.8],
      [40, 1.8], // AP-168: Zielzahl RS-05.2 (vorher 3,99, Steilwand behoben)
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
  const { pressure, finalLevelPressure } = BALANCE_BANDS;

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

  it('limits the step inside a batch to the band of its section (PE-225), except the known levels', () => {
    const out = range(1, 40).filter(
      (i) => sameBatch(i) && referencePressure(i) / referencePressure(i - 1) > maxStepForLevel(i),
    );
    expectExactly(out, KNOWN_OUT_OF_BAND.step, 'step');
  });

  it('uses the section bands 1.22 (levels 0-4), 1.15 (levels 21-30) and 1.12 otherwise (PE-225)', () => {
    expect(maxStepForLevel(1)).toBe(1.22);
    expect(maxStepForLevel(4)).toBe(1.22);
    expect(maxStepForLevel(5)).toBe(1.12);
    expect(maxStepForLevel(21)).toBe(1.15);
    expect(maxStepForLevel(30)).toBe(1.15);
    expect(maxStepForLevel(31)).toBe(1.12);
    expect(maxStepForLevel(40)).toBe(1.12);
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

  it('keeps gold per minute within 10 percent of every neighbour in the batch, except the known levels (PE-224)', () => {
    const tol = BALANCE_BANDS.goldPerMinuteTolerance;
    const out = range(1, 40).filter(
      (i) =>
        sameBatch(i) &&
        Math.abs(goldPerMinute(i) / goldPerMinute(i - 1) - 1) > tol,
    );
    expectExactly(out, KNOWN_OUT_OF_BAND.gold, 'gold');
  });
});
