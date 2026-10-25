import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from '../../src/platform/motion';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prefersReducedMotion', () => {
  it('is false without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('asks the reduce query and returns its result', () => {
    const mm = vi.fn((q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }));
    vi.stubGlobal('matchMedia', mm);
    expect(prefersReducedMotion()).toBe(true);
    expect(mm).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('is false when the query does not match', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it('is false when matchMedia throws', () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('boom');
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});
