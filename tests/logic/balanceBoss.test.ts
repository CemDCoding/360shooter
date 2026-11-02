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

const KNOWN_OUT_OF_BAND = {
  /**
   * Boss-Dauer ausserhalb des Zielbands. Alle 41 Level liegen darunter (RS-05.3: Boss-HP ab Level 21 etwa mal 2,2 bis
   * 2,4, im Wald, Nachtwald und Elfenwald zum Batch-Ende mal 1,6 bis 1,7).
   */
  duration: [{ levels: ids, ist: '10,4 bis 25,5 s', paket: 'AP-170' }],
  /** Ankuendigungs-Anteil ueber 0,40: Baummonster (2 bis 4), Waldgeist (7 bis 9), Pharao (35 bis 38, 40). */
  announce: [
    { levels: range(2, 4), ist: '0,41 bis 0,48 (Baummonster)', paket: 'AP-170' },
    { levels: range(7, 9), ist: '0,40 bis 0,42 (Waldgeist)', paket: 'AP-170' },
    { levels: [35, 36, 37, 38, 40], ist: '0,40 bis 0,45 (Pharao)', paket: 'AP-170' },
  ],
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
    // Pauschaleintrag: alle Level liegen unter dem Band (Ist-Grenze), nicht darueber.
    for (const i of out)
      expect(bossDuration(i), `level ${i}`).toBeLessThan(bossDurationBand(i).min);
  });

  it('matches the table of RS-05 section 2 without double shot within 10 percent', () => {
    // Dauer ohne Doppelschuss und ohne Pet (RS-05 Abschnitt 2).
    const rs: [number, number][] = [
      [21, 16],
      [25, 22],
      [26, 17],
      [30, 25],
      [31, 19],
      [40, 38],
    ];
    for (const [level, want] of rs) {
      const d = bossDuration(level, { doubleShot: false });
      expect(d / want, `level ${level}`).toBeGreaterThan(0.9);
      expect(d / want, `level ${level}`).toBeLessThan(1.1);
    }
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

  it('leaves out opt-in attacks and the extra attacks of the first two levels of a batch', () => {
    expect(levelAttacks(0).map((a) => a.id)).not.toContain('rootRing');
    expect(levelAttacks(2).map((a) => a.id)).toContain('rootRing');
    expect(levelAttacks(23).map((a) => a.id)).not.toContain('quarrel');
  });
});
