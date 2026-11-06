// Shared speedline ring of the main hit (M13, AP-194, brief H-50, decision 13a, Q-95). One building block
// for all six bosses: a ring of 24 pixel wedges around the hit point that shows three steps of 33 ms
// together with the boss white (same `atMs` as the `hitWhite` event) and then is gone. Every number comes
// from the tokens `size.rig-hit-ring-*`, `motion.rig-hit-ring-step` and `opacity.rig-hit-ring-last`.
//
// Use in a boss module: `'hit-ring': hitRingFx({ refH: BOSS_REF_H })`, in the choreography an `fx` event
// `{ kind: 'fx', atMs: <atMs of hitWhite>, durationMs: HIT_RING_MS, name: 'hit-ring', flash: false,
// reduce: 'drop' }`. Rules: no tint, no FX (Canvas-safe), all objects are made in the factory (3 Graphics
// drawn once, one per step), `update` only switches which one is visible. The ring is no flash.
import type Phaser from 'phaser';
import { OPACITY, THEME } from '../../../config/theme';
import { CHOREO_DEPTH } from '../context';
import { seededRandom } from '../layout';
import type { FxApi, FxFactory, FxInstance } from './index';

const S = THEME.sizeCount;
const P = THEME.sizePx;
const RAYS = S['size.rig-hit-ring-rays'];
const JITTER = (S['size.rig-hit-ring-jitter'] * Math.PI) / 180;
const SQUASH = S['size.rig-hit-ring-squash'];
const STEPS = S['size.rig-hit-ring-steps'];
const STEP_MS = THEME.motionMs['motion.rig-hit-ring-step'];
const STEP_OUT = P['size.rig-hit-ring-step-out'];
const RAY_MIN = P['size.rig-hit-ring-ray-min'];
const RAY_MAX = P['size.rig-hit-ring-ray-max'];
const DOT_IN = P['size.rig-hit-ring-dot-in'];
const DOT_OUT = P['size.rig-hit-ring-dot-out'];
const GAP = P['size.rig-hit-ring-gap'];
const GROUND = P['size.rig-ground'];

/** Duration of the whole ring (all steps); the `durationMs` of its `fx` event. */
export const HIT_RING_MS = STEPS * STEP_MS;
/** Reference height (px of the unscaled boss image) of the 64 px bosses; the forest ghost uses 48. */
export const BOSS_REF_H = 64;
export const FOREST_GHOST_REF_H = 48;
/** Seed base: the angles and lengths are drawn once per hit and are the same in all steps. */
const SEED = 4177;

/** Inner radius of the ring: half the scaled reference height plus the gap (104 for 64 px at 3x, 80 for 48). */
export function ringRadius(refH: number, scale: number): number {
  return (refH / 2) * scale + GAP;
}

/** Default hit point: boss x, ground minus half the scaled reference height (64 px: 300 - 96 = 204). */
export function defaultRingCentre(api: FxApi, refH: number, out: { x: number; y: number }): void {
  const boss = api.boss();
  out.x = boss ? boss.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
  out.y = GROUND - (refH / 2) * api.bossScale;
}

export interface HitRingSpec {
  /** Reference height of the boss in px of its unscaled image (`BOSS_REF_H`, forest ghost `FOREST_GHOST_REF_H`). */
  refH: number;
  /** Own hit point (e.g. head of the sand worm, collar of the dog); writes into `out`. Default: boss x, ground - refH / 2 * scale. */
  centre?: (api: FxApi, out: { x: number; y: number }) => void;
  /** Added to the seed so that two rings in one choreography differ. */
  seed?: number;
}

/**
 * Factory of the ring for a boss module. Geometry is drawn relative to (0, 0) in the factory, one `Graphics`
 * per step; `start` moves them to the hit point, `update` shows the step of the time since the start and
 * hides the ring after the last step (no fade). The ring lies in front of the boss (also its silhouette
 * parts) and not in the shaking figure container.
 */
export function hitRingFx(spec: HitRingSpec): FxFactory {
  return (api, event): FxInstance => {
    const r0 = ringRadius(spec.refH, api.bossScale);
    const rnd = seededRandom(SEED + (spec.seed ?? 0) + event.atMs);
    const cos = new Float64Array(RAYS);
    const sin = new Float64Array(RAYS);
    const len = new Float64Array(RAYS);
    for (let i = 0; i < RAYS; i++) {
      const a = ((i + 0.5) / RAYS) * Math.PI * 2 + (rnd() * 2 - 1) * JITTER;
      cos[i] = Math.cos(a);
      sin[i] = Math.sin(a);
      len[i] = RAY_MIN + rnd() * (RAY_MAX - RAY_MIN);
    }
    const colour = THEME.colors['finisher.speedline'].num;
    const steps: Phaser.GameObjects.Graphics[] = [];
    for (let step = 0; step < STEPS; step++) {
      const last = step === STEPS - 1;
      const out = STEP_OUT * step;
      const g = api.ctx.scene.add.graphics().setDepth(CHOREO_DEPTH.particles).setVisible(false);
      api.ctx.addWorld(g);
      g.fillStyle(colour, last ? OPACITY['rig-hit-ring-last'] : 1);
      for (let i = 0; i < RAYS; i++) {
        const l = last ? len[i] / 2 : len[i];
        for (let k = 0; k < l; k++) {
          const d = k < l / 2 ? DOT_IN : DOT_OUT;
          const rr = r0 + out + k;
          g.fillRect(
            Math.round(cos[i] * rr - d / 2),
            Math.round(sin[i] * rr * SQUASH - d / 2),
            d,
            d,
          );
        }
      }
      steps.push(g);
    }
    const at = { x: 0, y: 0 };
    const centre = spec.centre ?? ((a, o) => defaultRingCentre(a, spec.refH, o));
    let shown = -1;
    const show = (step: number): void => {
      shown = step;
      for (let i = 0; i < STEPS; i++) steps[i].setVisible(i === step);
    };
    return {
      start() {
        centre(api, at);
        const boss = api.boss();
        // Under the astronaut (so under both figures), over the afterimages; read now so `order` tracks count.
        const astro = api.figure('astronaut');
        const depth = astro
          ? astro.container.depth - 0.5
          : boss
            ? boss.container.depth + 0.5
            : CHOREO_DEPTH.particles;
        for (let i = 0; i < STEPS; i++) {
          steps[i].setPosition(Math.round(at.x), Math.round(at.y)).setDepth(depth);
        }
        show(0);
      },
      update(since) {
        const step = since < HIT_RING_MS ? Math.floor(since / STEP_MS) : -1;
        if (step !== shown) show(step);
      },
      stop() {
        show(-1);
      },
      destroy() {
        for (const g of steps) g.destroy();
        steps.length = 0;
      },
    };
  };
}
