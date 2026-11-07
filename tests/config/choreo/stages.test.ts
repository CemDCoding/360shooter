// Stage presets of the finisher choreographies (M13, AP-195, Q-97, PE-259).
import { describe, expect, it } from 'vitest';
import {
  STAGES,
  STAGE_DARK_DEFAULT,
  STAGE_WORLDS,
  stageOf,
  type StageBody,
} from '../../../src/config/choreo/stages';
import { THEME } from '../../../src/config/theme';

const BOSSES = ['forestGhost', 'giantStone', 'giantSandWorm', 'guardianDog', 'pharaoh'];
const GROUND = THEME.sizePx['size.rig-ground'];
const ids = Object.keys(STAGES);

describe('stage presets', () => {
  it('has a moment preset and a cinematic start preset for each of the five new bosses', () => {
    for (const boss of BOSSES) {
      expect(stageOf(`${boss}-moment`), `${boss}-moment`).not.toBeNull();
      expect(stageOf(`${boss}-1`), `${boss}-1`).not.toBeNull();
    }
    // The shot ids are named after the boss and the storyboard board.
    for (const id of ids) {
      expect(id).toMatch(
        /^(forestGhost|giantStone|giantSandWorm|guardianDog|pharaoh)-(moment(-\d)?|\d[a-c]?)$/,
      );
    }
  });

  it('gives each boss the world of its storyboard', () => {
    const world = (boss: string): string[] =>
      ids.filter((i) => i.startsWith(`${boss}-`)).map((i) => STAGES[i].world);
    const only = (boss: string, w: string): void => {
      expect(new Set(world(boss)), boss).toEqual(new Set([w]));
    };
    only('forestGhost', 'night');
    only('giantStone', 'elf');
    only('giantSandWorm', 'desert');
    only('guardianDog', 'pyramid');
    only('pharaoh', 'oasis');
  });

  it.each(ids)('%s: known world, tokens exist, values are inside the picture', (id) => {
    const s = STAGES[id];
    expect(STAGE_WORLDS).toContain(s.world);
    for (const name of [
      `finisher.bg-${s.world}`,
      `biome.${s.world}-ground`,
      `biome.${s.world}-ground-hi`,
      `biome.${s.world}-ground-lo`,
    ]) {
      expect(THEME.colors, name).toHaveProperty([name]);
    }
    expect(Number.isInteger(s.seed)).toBe(true);
    for (const v of [s.mist, s.dark]) {
      if (v !== undefined) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    for (const b of [s.moon, s.sun] as (StageBody | undefined)[]) {
      if (!b) continue;
      expect(b.r).toBeGreaterThan(4);
      expect(b.r).toBeLessThan(80);
      expect(b.x - b.r).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(640);
      // The disc may sink into the horizon (rising sun) but its centre is above the ground.
      expect(b.y).toBeGreaterThan(0);
      expect(b.y).toBeLessThanOrEqual(GROUND);
    }
    expect(s.dark ?? STAGE_DARK_DEFAULT).toBeGreaterThan(0);
  });

  it('keeps the values of the mockup world() calls', () => {
    expect(STAGES['forestGhost-moment']).toMatchObject({
      world: 'night',
      moon: { x: 560, y: 90, r: 20 },
      mist: 0.12,
    });
    expect(STAGES['forestGhost-1'].mist).toBe(0.35);
    expect(STAGES['giantSandWorm-moment'].sun).toEqual({ x: 120, y: 100, r: 22 });
    expect(STAGES['guardianDog-1'].dark).toBe(0.85);
    expect(STAGES['pharaoh-6c']).toMatchObject({
      dark: 0.15,
      sun: { x: 330, y: GROUND - 40, r: 44 },
    });
    expect(STAGES['pharaoh-6b'].moon).toBeUndefined();
  });

  it('returns null for an unknown id and for names from the prototype chain', () => {
    expect(stageOf('nope')).toBeNull();
    expect(stageOf('')).toBeNull();
    expect(stageOf('constructor')).toBeNull();
    expect(stageOf('__proto__')).toBeNull();
  });
});
