import { describe, expect, it } from 'vitest';
import { BALANCE_BANDS, LEVEL_COUNT, PET_IDS } from '../../src/config';
import type { PetId } from '../../src/contracts';
import { petDps, petShare, referenceDps } from '../../src/logic/balanceModel';

// AP-167 (PE-208, RS-05.1, RS-05.4): Anteil des Pets am Schaden gegen den Boss (Pet mit allen Power-ups, ein Ziel,
// Doppelschuss im Mittel 1,5). Heute verletzte Baender stehen in KNOWN_OUT_OF_BAND (genau diese Level je Pet).

interface Known {
  pet: PetId;
  levels: readonly number[];
  side: 'over' | 'under';
  ist: string;
  paket: string;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const ids = range(0, LEVEL_COUNT - 1);

// AP-169: Power-ups nur auf den Schaden (1,3 hoch 3 = 2,2-fach), Capybara damageFractionPerSec 0,5 -> 1,6 (Lead-Freigabe).
// Capybara liegt danach im Band (0,21 bis 0,39) und ist nicht mehr gelistet.
const KNOWN_OUT_OF_BAND: readonly Known[] = [
  // Biene: das Modell rechnet Doppelschuss mit 1,5 im Mittel; nur Level 0 bis 6 bleiben darueber (ohne Doppelschuss
  // 0,34 bis 0,55). Entscheidung ueber damageFraction der Biene oder das Band beim Nutzer (Meldung an den Lead).
  { pet: 'bee', levels: range(0, 6), side: 'over', ist: '0,40 bis 0,45', paket: 'AP-169' },
  // Pinguin: Schneeball-Schaden waechst langsamer als der Laser, ab Level 31 knapp unter 20 %.
  { pet: 'penguin', levels: range(31, 40), side: 'under', ist: '0,18 bis 0,20', paket: 'AP-169' },
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
      // Richtung der Eintraege: zu stark (over) oder zu schwach (under).
      for (const k of KNOWN_OUT_OF_BAND.filter((e) => e.pet === pet)) {
        for (const i of k.levels) {
          if (k.side === 'under') expect(petShare(i, pet), `${pet} ${i}`).toBeLessThan(min);
          else expect(petShare(i, pet), `${pet} ${i}`).toBeGreaterThan(max);
        }
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

  it('puts the bee at about 40 percent without double shot around level 20 (AP-169, power-ups on damage only)', () => {
    const s = petShare(20, 'bee', { doubleShot: false });
    expect(s).toBeGreaterThan(0.3);
    expect(s).toBeLessThan(0.5);
    expect(petShare(20, 'bee')).toBeLessThan(s);
  });

  it('ranks the bee above penguin and capybara against a single target', () => {
    for (const i of [0, 20, 40]) {
      expect(petShare(i, 'bee')).toBeGreaterThan(petShare(i, 'penguin'));
      expect(petShare(i, 'bee')).toBeGreaterThan(petShare(i, 'capybara'));
    }
  });
});
