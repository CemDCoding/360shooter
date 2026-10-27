import { describe, expect, it } from 'vitest';
import { canLaserDestroyBolt } from '../../src/logic/projectiles';

const c = (x: number, active = true) => ({ active, x, y: 0, radius: 5 });

describe('canLaserDestroyBolt', () => {
  it('hits on overlap', () => expect(canLaserDestroyBolt(c(0), c(6))).toBe(true));
  it('counts touching as hit', () => expect(canLaserDestroyBolt(c(0), c(10))).toBe(true));
  it('misses without overlap', () => expect(canLaserDestroyBolt(c(0), c(10.5))).toBe(false));
  it('misses with inactive laser', () =>
    expect(canLaserDestroyBolt(c(0, false), c(1))).toBe(false));
  it('misses with inactive bolt', () => expect(canLaserDestroyBolt(c(0), c(1, false))).toBe(false));
});
