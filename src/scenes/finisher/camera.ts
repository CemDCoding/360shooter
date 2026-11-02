// Time and camera blocks of the finisher (AP-160, brief H-39): hitstop, slowmo, zoom and shake.
// They act on the scene's own copies only, never on the camera or objects of the game scene.
import type { FinisherStep } from '../../contracts';
import { THEME } from '../../config/theme';
import type { BlockEffect, FinisherContext } from './context';
import { shakeOffset } from './timing';

const NOOP: BlockEffect = { update() {}, destroy() {} };

/**
 * hitstop: boss and astronaut freeze. The copies stand still anyway; the effect clock rate is 0
 * while a hitstop runs (see `effectRate`), so shake, beam growth and shards stop as well.
 */
export function hitstop(): BlockEffect {
  return NOOP;
}

/**
 * slowmo: tweens run at `strength` (0.3), the effect clock as well (`effectRate`). The sequence time
 * (Timeline) keeps its rate, so the plan's total length and the skip lock stay exact.
 */
export function slowmo(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const tweens = ctx.scene.tweens;
  const before = tweens.timeScale;
  const s = step.strength;
  tweens.timeScale = Number.isFinite(s) && (s as number) > 0 ? Math.min(1, s as number) : 1;
  return {
    update() {},
    destroy() {
      tweens.timeScale = before;
    },
  };
}

/**
 * zoom: the copies are shown at a whole zoom step (1 -> `size.finisher-zoom`) around the boss. The
 * zoom holds after the step (the boss is gone before the sequence ends; brief stage boards show it
 * zoomed until it vanishes).
 */
export function zoom(ctx: FinisherContext): BlockEffect {
  ctx.zoom = THEME.sizeCount['size.finisher-zoom'];
  return NOOP;
}

/** shake: 6 px, halves every 80 ms; the boss copy shakes away as a ghost and is gone at the end. */
export function shake(ctx: FinisherContext): BlockEffect {
  const amplitude = THEME.sizePx['size.finisher-shake'];
  if (!ctx.plan.isFinale && ctx.actors.bossMode === 'hidden') ctx.actors.setBossMode('ghost');
  return {
    update(_seqMs, fxMs) {
      const o = shakeOffset(fxMs, amplitude);
      ctx.shake.x = o.x;
      ctx.shake.y = o.y;
    },
    destroy() {
      ctx.shake.x = 0;
      ctx.shake.y = 0;
      if (ctx.actors.bossMode === 'ghost') ctx.actors.setBossMode('hidden');
    },
  };
}
