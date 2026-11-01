import { describe, expect, it } from 'vitest';
import {
  COIN_RULES,
  CONTACT_COMPENSATION,
  ENEMIES,
  LEVEL_COUNT,
  LEVEL_SCALING,
} from '../../src/config';

/** First level of M5 (desert): from here the enemies get stronger (PE-129, AP-105). */
const M5_FIRST = 21;

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
          expect(v, `${name} level ${id}`).toBeLessThanOrEqual(
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

  it('weakens the single enemies of level 5 to 20 by about the density factor 1.3 (AP-95)', () => {
    for (let i = 5; i < M5_FIRST; i++) {
      const s = LEVEL_SCALING[i];
      expect(s.hp, `level ${i}`).toBeGreaterThanOrEqual(0.7);
      expect(s.hp, `level ${i}`).toBeLessThanOrEqual(0.85);
      expect(s.contact, `level ${i}`).toBeGreaterThanOrEqual(0.7 * CONTACT_COMPENSATION);
      expect(s.contact, `level ${i}`).toBeLessThanOrEqual(0.85 * CONTACT_COMPENSATION);
      expect(s.xp, `level ${i}`).toBeGreaterThanOrEqual(0.7);
      expect(s.xp, `level ${i}`).toBeLessThanOrEqual(0.85);
      expect(s.coin, `level ${i}`).toBe(s.xp);
    }
  });

  it('makes the single enemies of level 21 to 40 stronger beyond 0.77 (PE-129, AP-105)', () => {
    for (let i = M5_FIRST; i < LEVEL_COUNT; i++) {
      const s = LEVEL_SCALING[i];
      const prev = LEVEL_SCALING[i - 1];
      expect(s.hp, `level ${i}`).toBeGreaterThan(0.77);
      // Level 21 liegt knapp unter dem hp von Level 20 (0,81, AP-113), ab Level 22 steigt es.
      if (i > M5_FIRST) expect(s.hp, `level ${i}`).toBeGreaterThan(prev.hp);
      expect(s.contact, `level ${i}`).toBeGreaterThanOrEqual(0.77 * CONTACT_COMPENSATION);
      expect(s.contact, `level ${i}`).toBeLessThanOrEqual(CONTACT_COMPENSATION);
      expect(s.contact, `level ${i}`).toBeGreaterThanOrEqual(prev.contact);
      expect(s.coin, `level ${i}`).toBe(s.xp);
      expect(s.coin, `level ${i}`).toBeGreaterThan(prev.coin);
    }
    // Hoechstens 2,5-fache Lebenspunkte: Stufe 15 der Spuren Feuerrate und Schaden bringt das 6,25-fache.
    expect(LEVEL_SCALING[LEVEL_COUNT - 1].hp).toBeLessThanOrEqual(2.5);
  });

  it('keeps the coin drop chance of level 40 below 20 percent', () => {
    expect(COIN_RULES.dropChance * LEVEL_SCALING[LEVEL_COUNT - 1].coin).toBeLessThan(0.2);
  });
});
