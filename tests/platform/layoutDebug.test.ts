import { describe, expect, it } from 'vitest';
import { decideArenaWidth, layoutDebugWanted, layoutReport } from '../../src/platform/layoutDebug';

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
