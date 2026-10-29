import { describe, expect, it } from 'vitest';
import {
  decideArenaWidth,
  LAYOUT_FLAG_KEY,
  layoutDebugWanted,
  layoutFlagStorage,
  layoutReport,
  readLayoutFlag,
  writeLayoutFlag,
} from '../../src/platform/layoutDebug';

const base = {
  innerW: 852,
  innerH: 393,
  screenW: 393,
  screenH: 852,
  dpr: 3,
  probe: { width: 852, height: 393, top: 0, right: 59, bottom: 21, left: 59 },
  game: { x: 59, y: 0, width: 656, height: 369 },
  standaloneMedia: true,
  standaloneNav: true,
  landscape: true,
  arenaDesiredW: 734,
  arenaCurrentW: 640,
};

describe('layoutReport', () => {
  it('contains all measured values', () => {
    const t = layoutReport({
      ...base,
      vv: { width: 852, height: 393, offsetLeft: 0, offsetTop: 0 },
    }).join('\n');
    for (const s of [
      'inner 852x393',
      'vv 852x393',
      'screen 393x852',
      'dpr 3',
      'probe 852x393',
      'b21',
      'game 656x369',
      'standalone media true nav true',
      'landscape',
      'arena want 734 now 640',
    ]) {
      expect(t).toContain(s);
    }
  });
  it('does not crash without visualViewport or with NaN', () => {
    const t = layoutReport({ ...base, vv: null, innerW: NaN, standaloneNav: undefined });
    expect(t.join('\n')).toContain('vv none');
    expect(() => layoutReport(base)).not.toThrow();
  });
});

describe('layoutDebugWanted', () => {
  it('only reacts to layout=1', () => {
    expect(layoutDebugWanted('?layout=1')).toBe(true);
    expect(layoutDebugWanted('')).toBe(false);
    expect(layoutDebugWanted('?layout=0')).toBe(false);
  });
});

/** In-memory storage; `fail` makes every call throw (like Safari private mode). */
function memoryStorage(fail = false) {
  const data = new Map<string, string>();
  const guard = (): void => {
    if (fail) throw new Error('QuotaExceededError');
  };
  return {
    data,
    getItem: (k: string) => (guard(), data.get(k) ?? null),
    setItem: (k: string, v: string) => (guard(), void data.set(k, v)),
    removeItem: (k: string) => (guard(), void data.delete(k)),
  };
}

describe('layout flag', () => {
  it('is off by default and survives a write/read round trip', () => {
    const s = memoryStorage();
    expect(readLayoutFlag(s)).toBe(false);
    expect(writeLayoutFlag(s, true)).toBe(true);
    expect(s.data.get(LAYOUT_FLAG_KEY)).toBe('1');
    expect(readLayoutFlag(s)).toBe(true);
    expect(writeLayoutFlag(s, false)).toBe(true);
    expect(s.data.has(LAYOUT_FLAG_KEY)).toBe(false);
    expect(readLayoutFlag(s)).toBe(false);
  });
  it('stores only "on", nothing else', () => {
    const s = memoryStorage();
    writeLayoutFlag(s, true);
    expect([...s.data.entries()]).toEqual([[LAYOUT_FLAG_KEY, '1']]);
  });
  it('missing or throwing storage means off, without an error', () => {
    expect(readLayoutFlag(null)).toBe(false);
    expect(readLayoutFlag(undefined)).toBe(false);
    expect(writeLayoutFlag(null, true)).toBe(false);
    const broken = memoryStorage(true);
    expect(() => readLayoutFlag(broken)).not.toThrow();
    expect(readLayoutFlag(broken)).toBe(false);
    expect(writeLayoutFlag(broken, true)).toBe(false);
  });
  it('other values do not count as on', () => {
    const s = memoryStorage();
    s.data.set(LAYOUT_FLAG_KEY, 'true');
    expect(readLayoutFlag(s)).toBe(false);
  });
  it('without localStorage (node) the accessor returns null', () => {
    expect(layoutFlagStorage()).toBeNull();
  });
});

describe('decideArenaWidth', () => {
  it('keeps an unchanged width', () => {
    expect(decideArenaWidth(640, 640, false)).toBe('keep');
    expect(decideArenaWidth(640, 640, true)).toBe('keep');
  });
  it('applies a new width when no round exists', () => {
    expect(decideArenaWidth(734, 640, false)).toBe('apply');
  });
  it('defers a new width while a round exists', () => {
    expect(decideArenaWidth(734, 640, true)).toBe('defer');
  });
});
