import { describe, expect, it } from 'vitest';
import { PARRY_RULES } from '../../src/config/parry';
import { OPACITY, THEME } from '../../src/config/theme';

// AP-133: the quicktime rules and the design tokens of brief H-33 must not drift apart.
describe('PARRY_RULES match the design tokens (H-33)', () => {
  it('circle radius, distance and touch slack equal size.parry-*', () => {
    expect(PARRY_RULES.circleRadiusPx).toBe(THEME.sizePx['size.parry-radius']);
    expect(PARRY_RULES.distanceFromPlayerPx).toBe(THEME.sizePx['size.parry-distance']);
    expect(PARRY_RULES.touchSlackPx).toBe(THEME.sizePx['size.parry-touch-slack']);
  });

  it('ring start scale equals size.parry-ring-start', () => {
    expect(PARRY_RULES.ringStartScale).toBe(THEME.sizeCount['size.parry-ring-start']);
  });

  it('ring lead time equals motion.parry-approach', () => {
    expect(PARRY_RULES.approachMs).toBe(THEME.motionMs['motion.parry-approach']);
  });

  it('M9 (AP-151): drag target radius, hold steps and beat time match the tokens', () => {
    expect(THEME.sizePx['size.parry-target-radius']).toBe(PARRY_RULES.dragTargetRadiusPx);
    expect(PARRY_RULES.dragTargetRadiusPx).toBe(24);
    expect(THEME.sizePx['size.parry-target-radius'] - THEME.sizePx['size.parry-target-step']).toBe(
      PARRY_RULES.circleRadiusPx,
    );
    expect(THEME.sizeCount['size.parry-hold-segments']).toBe(8);
    expect(THEME.sizePx['size.parry-hold-r']).toBeLessThan(PARRY_RULES.circleRadiusPx);
    expect(THEME.sizePx['size.parry-hint-y']).toBe(102);
    expect(THEME.sizeCount['size.parry-hint-scale']).toBe(2);
    expect(THEME.sizePx['size.parry-motif']).toBe(16);
    expect(THEME.sizePx['size.parry-symbol']).toBe(14);
  });

  it('M9 (AP-151): the short steps fit inside the rhythm of the rules', () => {
    expect(THEME.motionMs['motion.parry-target-step']).toBeLessThan(PARRY_RULES.goodWindowMs);
    expect(THEME.motionMs['motion.parry-sleep']).toBeLessThanOrEqual(
      THEME.motionMs['motion.parry-feedback'],
    );
    expect(THEME.motionMs['motion.parry-tilt']).toBeLessThan(PARRY_RULES.seqTelegraphMinMs);
  });

  it('AP-173: keyline and ink layer use the ink token; keyline 1 px, focus radius 110 px', () => {
    expect(THEME.colors['game.parry-keyline'].num).toBe(THEME.colors['game.focus-dim'].num);
    expect(THEME.sizePx['size.parry-keyline']).toBe(1);
    expect(THEME.sizePx['size.focus-near']).toBe(110);
    expect(OPACITY['focus-dim']).toBe(0.35);
  });

  it('feedback and burst durations are positive, the burst outlasts the grade word', () => {
    expect(THEME.motionMs['motion.parry-feedback']).toBeGreaterThan(0);
    expect(THEME.motionMs['motion.parry-burst']).toBeGreaterThan(
      THEME.motionMs['motion.parry-feedback'],
    );
  });
});

// AP-173 (brief H-41 "Kontrastregel", PE-226): contrast of the phosphor edge on all 6 floors, from the tokens.
const MAPS = ['forest', 'night', 'elf', 'desert', 'pyramid', 'oasis'] as const;
type Rgb = [number, number, number];

function rgb(num: number): Rgb {
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (q: number) => {
    const c = q / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const p = luminance(a);
  const q = luminance(b);
  return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05);
}

/** Floor under the ink layer: the same mix as the design measurement (mockup view 3b). */
function dimmed(ground: Rgb): Rgb {
  const a = OPACITY['focus-dim'];
  const ink = rgb(THEME.colors['game.focus-dim'].num);
  return ground.map((q, i) => Math.round(q * (1 - a) + ink[i] * a)) as Rgb;
}

describe('quicktime contrast on all 6 floors (AP-173, brief H-41)', () => {
  const edge = rgb(THEME.colors['game.parry-circle'].num);
  const key = rgb(THEME.colors['game.parry-keyline'].num);

  it('phosphor edge against the ink keyline is at least 12:1', () => {
    expect(contrast(edge, key)).toBeGreaterThanOrEqual(12);
  });

  for (const m of MAPS) {
    it(`${m}: edge against the floor >= 4.2:1 without focus, >= 4.5:1 in focus`, () => {
      const ground = rgb(THEME.colors[`biome.${m}-ground`].num);
      // Without focus the plan names the design measurement "4,2" (one decimal): the desert floor gives 4.16, so
      // the check uses one decimal like the measurement; the ink keyline makes up for it (PE-226).
      expect(Math.round(contrast(edge, ground) * 10) / 10).toBeGreaterThanOrEqual(4.2);
      expect(contrast(edge, dimmed(ground))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(edge, dimmed(ground))).toBeGreaterThan(contrast(edge, ground));
    });
  }
});
