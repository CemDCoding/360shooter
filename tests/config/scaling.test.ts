import { describe, expect, it } from 'vitest';
import {
  CAP_HP_BONUS,
  COIN_RULES,
  CONTACT_COMPENSATION,
  ENEMIES,
  ENEMY_COUNT_FACTOR,
  LEVELS,
  LEVEL_COUNT,
  LEVEL_SCALING,
  MAX_ENEMIES_CAP,
  MAX_ENEMIES_WANTED,
} from '../../src/config';

/** First level of M5 (desert): from here the enemies get stronger (PE-129, AP-105). */
const M5_FIRST = 21;

/** hp, xp/coin and contact before AP-127 (Stand AP-113), index = level id. */
const HP_BEFORE_AP127 = [
  0.44, 0.46, 0.5, 0.54, 0.6, 0.714, 0.71, 0.7, 0.7, 0.7, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81,
  0.81, 0.81, 0.81, 0.81, 0.806, 0.85, 0.917, 0.984, 1.043, 1.054, 1.122, 1.191, 1.279, 1.344,
  1.385, 1.472, 1.563, 1.663, 1.772, 1.891, 2.022, 2.147, 2.272, 2.422,
];
const COIN_BEFORE_AP127 = [
  0.462, 0.488, 0.512, 0.57, 0.621, 0.781, 0.779, 0.783, 0.78, 0.781, 0.781, 0.783, 0.781, 0.778,
  0.782, 0.778, 0.777, 0.779, 0.777, 0.781, 0.777, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6,
  1.65, 1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2, 2.05, 2.1, 2.15,
];
/** xp before AP-127: like coin, except level 0 to 4 (AP-113, pool mix with boar and bear). */
const XP_BEFORE_AP127 = [0.443, 0.467, 0.49, 0.546, 0.595, ...COIN_BEFORE_AP127.slice(5)];

/** Level factor before AP-127: hp without the cap bonus, xp and coin times the effective count factor. */
const baseHp = (id: number): number => LEVEL_SCALING[id].hp / CAP_HP_BONUS[id];
const baseXp = (id: number): number =>
  (LEVEL_SCALING[id].xp * ENEMY_COUNT_FACTOR[id]) / CAP_HP_BONUS[id];

describe('LEVEL_SCALING', () => {
  it('has one entry per level 0 to 40 (AP-105)', () => {
    expect(LEVEL_SCALING).toHaveLength(LEVEL_COUNT);
  });

  it('has finite positive factors, level 0 to 20 never exceed 1 (contact: compensation factor 2, AP-113)', () => {
    expect(CONTACT_COMPENSATION).toBe(2);
    LEVEL_SCALING.forEach((s, id) => {
      for (const [name, v] of [
        ['hp', s.hp],
        ['xp', s.xp],
        ['coin', s.coin],
        ['contact', s.contact],
      ] as const) {
        expect(Number.isFinite(v), `level ${id}`).toBe(true);
        expect(v, `level ${id}`).toBeGreaterThan(0);
        if (id < M5_FIRST) {
          // AP-127: hp ohne den Aufschlag der Obergrenze, xp und coin sind ohnehin kleiner als vorher.
          const base = name === 'hp' ? baseHp(id) : v;
          expect(base, `${name} level ${id}`).toBeLessThanOrEqual(
            name === 'contact' ? CONTACT_COMPENSATION : 1,
          );
        }
      }
    });
  });

  it('raises contact by the compensation factor, rising over level 0 to 20 (AP-113)', () => {
    for (let i = 1; i < M5_FIRST; i++) {
      expect(LEVEL_SCALING[i].contact, `level ${i}`).toBeGreaterThanOrEqual(
        LEVEL_SCALING[i - 1].contact,
      );
    }
    for (let i = 5; i < M5_FIRST; i++)
      expect(LEVEL_SCALING[i].contact).toBeCloseTo(0.77 * CONTACT_COMPENSATION, 9);
  });

  it('weakens the single enemies of the denser level 0 to 4 step by step (AP-91)', () => {
    for (let i = 1; i <= 4; i++) {
      expect(LEVEL_SCALING[i].hp, `level ${i}`).toBeGreaterThan(LEVEL_SCALING[i - 1].hp);
    }
    expect(LEVEL_SCALING[0].hp).toBeLessThan(1);
    expect(LEVEL_SCALING[0].hp).toBeGreaterThanOrEqual(0.4);
  });

  it('gives whole hit points for the cursed tree in level 0 to 4', () => {
    for (let i = 0; i <= 4; i++) {
      const hp = ENEMIES.cursedTree.hp * LEVEL_SCALING[i].hp;
      expect(hp).toBeCloseTo(Math.round(hp), 9);
    }
  });

  it('weakens the single enemies of level 5 to 20 by about the density factor 1.3 (AP-95, values without AP-127)', () => {
    for (let i = 5; i < M5_FIRST; i++) {
      const s = LEVEL_SCALING[i];
      expect(baseHp(i), `level ${i}`).toBeGreaterThanOrEqual(0.7);
      expect(baseHp(i), `level ${i}`).toBeLessThanOrEqual(0.85);
      expect(s.contact, `level ${i}`).toBeGreaterThanOrEqual(0.7 * CONTACT_COMPENSATION);
      expect(s.contact, `level ${i}`).toBeLessThanOrEqual(0.85 * CONTACT_COMPENSATION);
      expect(baseXp(i), `level ${i}`).toBeGreaterThanOrEqual(0.7);
      expect(baseXp(i), `level ${i}`).toBeLessThanOrEqual(0.85);
      expect(s.coin, `level ${i}`).toBe(s.xp);
    }
  });

  it('keeps hp and contact per enemy and divides xp and coin by the count factor (AP-127, PE-152, PE-163)', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const s = LEVEL_SCALING[i];
      const bonus = CAP_HP_BONUS[i];
      expect(s.hp, `hp level ${i}`).toBeCloseTo(HP_BEFORE_AP127[i] * bonus, 3);
      // xp/coin durch den wirksamen Faktor (Faktor / Aufschlag), ohne Obergrenze genau durch den Faktor.
      const reward = bonus / ENEMY_COUNT_FACTOR[i];
      expect(s.coin, `coin level ${i}`).toBeCloseTo(COIN_BEFORE_AP127[i] * reward, 4);
      expect(s.xp, `xp level ${i}`).toBeCloseTo(XP_BEFORE_AP127[i] * reward, 4);
    }
    // contact unveraendert: Level 0 bis 4 wie AP-113, ab Level 5 ab 0,77 mal Ausgleich (oben).
    expect(LEVEL_SCALING.slice(0, 5).map((s) => s.contact)).toEqual([0.92, 0.98, 1.02, 1.14, 1.24]);
  });

  it('raises hp by wanted over possible enemies where the cap of 250 bites (AP-127, PE-152)', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const expected = Math.max(1, MAX_ENEMIES_WANTED[i] / MAX_ENEMIES_CAP);
      expect(CAP_HP_BONUS[i], `level ${i}`).toBeCloseTo(expected, 4);
      expect(CAP_HP_BONUS[i] > 1, `level ${i}`).toBe(LEVELS[i].maxEnemies < MAX_ENEMIES_WANTED[i]);
    }
    expect(CAP_HP_BONUS[14]).toBe(1);
    expect(CAP_HP_BONUS[15]).toBeCloseTo(1.04, 4);
    expect(CAP_HP_BONUS[20]).toBeCloseTo(1.3, 4);
    expect(CAP_HP_BONUS[40]).toBeCloseTo(1.5, 4);
  });

  it('makes the single enemies of level 21 to 40 stronger beyond 0.77 (PE-129, AP-105)', () => {
    for (let i = M5_FIRST; i < LEVEL_COUNT; i++) {
      const s = LEVEL_SCALING[i];
      const prev = LEVEL_SCALING[i - 1];
      expect(s.hp, `level ${i}`).toBeGreaterThan(0.77);
      // Ohne Aufschlag liegt Level 21 knapp unter dem hp von Level 20 (0,81, AP-113), ab Level 22 steigt es.
      if (i > M5_FIRST) expect(baseHp(i), `level ${i}`).toBeGreaterThan(baseHp(i - 1));
      if (i > M5_FIRST) expect(s.hp, `level ${i}`).toBeGreaterThan(prev.hp);
      expect(s.contact, `level ${i}`).toBeGreaterThanOrEqual(0.77 * CONTACT_COMPENSATION);
      expect(s.contact, `level ${i}`).toBeLessThanOrEqual(CONTACT_COMPENSATION);
      expect(s.contact, `level ${i}`).toBeGreaterThanOrEqual(prev.contact);
      expect(s.coin, `level ${i}`).toBe(s.xp);
      expect(s.coin, `level ${i}`).toBeGreaterThan(prev.coin);
    }
    // Ohne Aufschlag hoechstens 2,5-fache Lebenspunkte: Stufe 15 der Spuren Feuerrate und Schaden bringt das 6,25-fache.
    // Mit dem Aufschlag der Obergrenze (AP-127, x1,5) sind es 3,633 (Druck siehe docs/balancing.md).
    expect(baseHp(LEVEL_COUNT - 1)).toBeLessThanOrEqual(2.5);
    expect(LEVEL_SCALING[LEVEL_COUNT - 1].hp).toBeCloseTo(3.633, 3);
  });

  it('keeps the coin drop chance of level 40 below 20 percent', () => {
    expect(COIN_RULES.dropChance * LEVEL_SCALING[LEVEL_COUNT - 1].coin).toBeLessThan(0.2);
  });
});
