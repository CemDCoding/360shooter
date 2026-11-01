import { describe, expect, it } from 'vitest';
import { shouldClearForBoss } from '../../src/logic/bossClear';

describe('boss clear trigger (AP-114)', () => {
  it('level without boss never clears', () => {
    expect(shouldClearForBoss(undefined, false)).toBe(false);
  });
  it('second trigger in the same round is blocked by bossSpawned', () => {
    expect(shouldClearForBoss('sandWorm', false)).toBe(true);
    expect(shouldClearForBoss('sandWorm', true)).toBe(false);
  });
});
