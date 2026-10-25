import { describe, expect, it } from 'vitest';
import { addContact, isContactSpent } from '../../src/logic/contactBudget';

describe('contactBudget', () => {
  it('adds amounts', () => {
    expect(addContact(10, 5)).toBe(15);
  });
  it('ignores non finite and negative values', () => {
    expect(addContact(10, Number.NaN)).toBe(10);
    expect(addContact(10, Infinity)).toBe(10);
    expect(addContact(10, -4)).toBe(10);
    expect(addContact(Number.NaN, 3)).toBe(3);
  });
  it('is never spent without a limit', () => {
    expect(isContactSpent(1000, undefined)).toBe(false);
    expect(isContactSpent(1000, 0)).toBe(false);
    expect(isContactSpent(1000, Number.NaN)).toBe(false);
  });
  it('is spent at the limit and above only', () => {
    expect(isContactSpent(29.9, 30)).toBe(false);
    expect(isContactSpent(30, 30)).toBe(true);
    expect(isContactSpent(31, 30)).toBe(true);
  });
});
