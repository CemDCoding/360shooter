import { describe, expect, it } from 'vitest';
import { BALANCE_BANDS, LEVEL_COUNT, PET_IDS } from '../../src/config';
import type { PetId } from '../../src/contracts';
import { petDps, petShare, referenceDps } from '../../src/logic/balanceModel';

// AP-167 (PE-208, RS-05.1, RS-05.4): Anteil des Pets am Schaden gegen den Boss (Pet mit allen Power-ups, ein Ziel,
// Doppelschuss im Mittel 1,5). Heute verletzte Baender stehen in KNOWN_OUT_OF_BAND (genau diese Level je Pet).

interface Known {
  pet: PetId;
  levels: readonly number[];
  ist: string;
  paket: string;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const ids = range(0, LEVEL_COUNT - 1);

const KNOWN_OUT_OF_BAND: readonly Known[] = [
  // Zu stark: Power-ups wirken auf Schaden und Rate (1,3 hoch 6 = 4,8-fach), AP-169 (RS-05.4) senkt auf etwa 2,2-fach.
  { pet: 'bee', levels: ids, ist: '0,43 bis 0,64', paket: 'AP-169' },
  { pet: 'penguin', levels: range(0, 18), ist: '0,40 bis 0,54', paket: 'AP-169' },
  // Zu schwach gegen ein Ziel: die Aura trifft den Boss nur einmal (RS-05 Abschnitt 4). Auch nach AP-169 unter 20 %;
  // die Entscheidung ueber die Aura-Staerke gegen Bosse faellt in AP-170.
  { pet: 'capybara', levels: ids, ist: '0,08 bis 0,17', paket: 'AP-170' },
];

describe('balance pets: share of the damage against the boss (AP-167, RS-05.4)', () => {
  it('keeps the pet share in 0.2 to 0.4, except the known levels', () => {
    const { min, max } = BALANCE_BANDS.petShare;
    for (const k of KNOWN_OUT_OF_BAND) expect(k.paket).toMatch(/^AP-\d+/);
    for (const pet of PET_IDS) {
      const out = ids.filter((i) => {
        const s = petShare(i, pet);
        return s < min || s > max;
      });
      const want = KNOWN_OUT_OF_BAND.filter((k) => k.pet === pet).flatMap((k) => k.levels);
      expect(out, pet).toEqual([...want].sort((a, b) => a - b));
      // Ist-Grenze der Pauschaleintraege: Biene und Pinguin zu stark, Capybara zu schwach.
      for (const i of out) {
        if (pet === 'capybara') expect(petShare(i, pet), `${pet} ${i}`).toBeLessThan(min);
        else expect(petShare(i, pet), `${pet} ${i}`).toBeGreaterThan(max);
      }
    }
  });

  it('lists every pet at most once', () => {
    for (const pet of PET_IDS) {
      expect(KNOWN_OUT_OF_BAND.filter((k) => k.pet === pet).length).toBeLessThanOrEqual(1);
    }
  });

  it('adds the pet to the total damage and keeps the share between 0 and 1', () => {
    for (const pet of PET_IDS) {
      for (const i of [0, 20, 40]) {
        expect(petDps(i, pet)).toBeGreaterThan(0);
        expect(referenceDps(i, { pet })).toBeCloseTo(referenceDps(i) + petDps(i, pet), 9);
        expect(petShare(i, pet)).toBeGreaterThan(0);
        expect(petShare(i, pet)).toBeLessThan(1);
      }
    }
  });

  it('puts the bee at about 55 to 60 percent without double shot around level 20 (RS-05 section 4)', () => {
    const s = petShare(20, 'bee', { doubleShot: false });
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(0.66);
    expect(petShare(20, 'bee')).toBeLessThan(s);
  });

  it('ranks the pets bee, penguin, capybara against a single target', () => {
    for (const i of [0, 20, 40]) {
      expect(petShare(i, 'bee')).toBeGreaterThan(petShare(i, 'penguin'));
      expect(petShare(i, 'penguin')).toBeGreaterThan(petShare(i, 'capybara'));
    }
  });
});
