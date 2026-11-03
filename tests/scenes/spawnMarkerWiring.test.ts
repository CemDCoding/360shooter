import { describe, expect, it, vi } from 'vitest';
import { THEME } from '../../src/config/theme';
import src from '../../src/scenes/GameScene.ts?raw';
import markerSrc from '../../src/entities/SpawnMarker.ts?raw';
import { EVENT_SOUND_KEYS } from '../../src/platform/audio';

vi.mock('phaser', () => ({ default: {} }));

const {
  EDGE_ROTATION,
  MARKER_WORD,
  PIP_COUNT,
  edgePoint,
  markerFrame,
  markerPlace,
  pipsLeft,
  ringDots,
  slideLeft,
  tagSize,
} = await import('../../src/entities/SpawnMarker');

// GameScene cannot be imported in vitest, so the wiring is checked on the source text (AP-177).
function body(name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start, name).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

const W = 640;
const H = 360;
const INSETS = { top: 20, right: 44, bottom: 21, left: 44 };

describe('SpawnMarker layout (AP-177, brief H-43)', () => {
  const f = markerFrame(W, H, INSETS);
  const inside = (x: number, y: number): boolean =>
    x >= INSETS.left && x <= W - INSETS.right && y >= INSETS.top && y <= H - INSETS.bottom;

  it('puts the marker frame inside the safe area with the event tokens', () => {
    expect(f.left).toBe(INSETS.left + THEME.sizePx['size.event-inset']);
    expect(f.right).toBe(W - INSETS.right - THEME.sizePx['size.event-inset']);
    expect(f.top).toBe(INSETS.top + THEME.sizePx['size.event-top']);
    expect(f.bottom).toBe(H - INSETS.bottom - THEME.sizePx['size.event-bottom']);
  });

  it('places the marker on the edge the group comes from, rotated in 90 degree steps', () => {
    const c = { x: W / 2, y: H / 2 };
    const cases: [number, keyof typeof EDGE_ROTATION][] = [
      [0, 'right'],
      [Math.PI / 2, 'bottom'],
      [Math.PI, 'left'],
      [(3 * Math.PI) / 2, 'top'],
    ];
    for (const [angle, edge] of cases) {
      const p = edgePoint(f, c.x, c.y, angle);
      expect(p.edge).toBe(edge);
      const place = markerPlace(f, c.x, c.y, angle, 0, tagSize(30));
      expect(place.rotation).toBe(EDGE_ROTATION[edge]);
      expect([0, 90, 180, 270]).toContain(place.rotation);
      expect(inside(place.x, place.y), `${edge}`).toBe(true);
      expect(inside(place.tagX, place.tagY), `${edge} tag`).toBe(true);
    }
    // A group up right sits on the top or right edge and keeps away from the corner.
    const p = edgePoint(f, c.x, c.y, -Math.PI / 4);
    expect(['top', 'right']).toContain(p.edge);
    expect(p.x).toBeLessThanOrEqual(f.right - THEME.sizePx['size.event-corner'] + 1e-9);
  });

  it('keeps every position of every angle inside the safe area', () => {
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      for (const slide of [0, THEME.sizePx['size.event-slide']]) {
        const place = markerPlace(f, W / 2, H / 2, a, slide, tagSize(40));
        expect(inside(place.x, place.y), `angle ${k}`).toBe(true);
        expect(inside(place.tagX, place.tagY), `angle ${k}`).toBe(true);
      }
    }
    for (const d of ringDots(f)) expect(inside(d.x, d.y)).toBe(true);
    expect(ringDots(f).length).toBeGreaterThan(0);
  });

  it('uses the words SCHWARM, RING and ZANGE with 3 pips', () => {
    expect(MARKER_WORD).toEqual({ swarm: 'SCHWARM', ring: 'RING', pincer: 'ZANGE' });
    expect(PIP_COUNT).toBe(3);
    expect(pipsLeft(0, 900)).toBe(3);
    expect(pipsLeft(300, 900)).toBe(2);
    expect(pipsLeft(600, 900)).toBe(1);
    expect(pipsLeft(900, 900)).toBe(0);
  });

  it('slides 4 px in 3 steps and stands still at once with reduced motion', () => {
    const ms = THEME.motionMs['motion.event-slide'];
    expect(slideLeft(0, false)).toBe(THEME.sizePx['size.event-slide']);
    expect(slideLeft(ms, false)).toBe(0);
    const steps = new Set<number>();
    for (let t = 0; t <= ms; t += 5) steps.add(slideLeft(t, false));
    expect(steps.size).toBeLessThanOrEqual(4);
    expect(slideLeft(0, true)).toBe(0);
  });

  it('has no blinking, pulsing or flash (no tweens, no alpha toggles, no camera effects)', () => {
    expect(markerSrc).not.toMatch(/tweens|flash\(|setBlendMode|camera/i);
    expect(markerSrc).not.toMatch(/setVisible\(!|Math\.sin\(.*time/);
  });
});

describe('spawn marker wiring in GameScene (AP-177, PE-228)', () => {
  it('passes the arena to the director and builds the marker frame from the safe insets', () => {
    expect(src).toMatch(/new SpawnDirector\([\s\S]*?ELITE_RULES,\s*\{ width, height \}/);
    expect(src).toContain('markerFrame(width, height, readSafeInsets(this.registry))');
  });

  it('syncs the markers after the director tick and before the spawn loop', () => {
    const b = body('spawnEnemies');
    const tick = b.indexOf('this.spawner.tick(');
    const sync = b.indexOf('this.syncMarkers(dt)');
    const loop = b.indexOf('for (const req of reqs)');
    expect(tick).toBeGreaterThan(-1);
    expect(sync).toBeGreaterThan(tick);
    expect(loop).toBeGreaterThan(sync);
  });

  it('creates a marker with its warning sound per announcement and removes ended ones', () => {
    const b = body('syncMarkers');
    expect(b).toContain('this.spawner.endedEvents');
    expect(b).toContain('m.destroy()');
    expect(b).toContain('this.spawner.eventAnnouncements');
    expect(b).toContain('new SpawnMarker(');
    expect(b).toContain('this.sfx.play(EVENT_SOUND_KEYS[a.kind])');
    expect(b).toContain('m.update(dt)');
  });

  it('ends all markers at the boss warning, the round end and the abort', () => {
    expect(body('updateBossTimeline')).toContain('this.clearMarkers()');
    expect(body('endRound')).toContain('this.clearMarkers()');
    expect(body('cleanup')).toContain('this.clearMarkers()');
  });

  it('runs the markers on play time only (scene update with the clamped frame time, none after the end)', () => {
    const u = src.slice(src.indexOf('  update(time: number, delta: number)'));
    expect(u.indexOf('if (this.ended) return')).toBeLessThan(u.indexOf('this.spawnEnemies(dt)'));
  });

  it('reports every removed director enemy with its elite flag (PE-228 (c))', () => {
    const b = body('spawnEnemies');
    const report = b.indexOf('this.reportRemovedEnemies()');
    expect(report).toBeGreaterThan(-1);
    // Also while the boss lives (before the gate), so enemies cleared for the boss are reported.
    expect(report).toBeLessThan(b.indexOf('shouldSpawnNormalEnemies(bossAlive)'));
    expect(b).toContain('this.directorEnemies.set(e, req.elite === true)');
    expect(src).toMatch(
      /reportIfGone = \(elite: boolean, e: Enemy\)[\s\S]*?this\.spawner\.noteRemoved\(e\.def\.id, elite\)/,
    );
    expect(body('spawnScaled')).toContain('this.spawner.noteRemoved(e.def.id, elite)');
  });

  it('has a sound key per event kind', () => {
    expect(EVENT_SOUND_KEYS).toEqual({
      swarm: 'sfx-event-swarm',
      ring: 'sfx-event-ring',
      pincer: 'sfx-event-pincer',
    });
  });
});
