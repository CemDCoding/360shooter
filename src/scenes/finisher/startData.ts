// Start data of the finisher scene: input check and the debug start `?finisher=n` (AP-160). No Phaser import.
import type { FinisherActor, FinisherPlan, FinisherStartData } from '../../contracts';
import { BOSSES } from '../../config/bosses';
import { LEVELS } from '../../config/levels';
import { buildFinisher } from '../../logic/finisher';

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isActor(v: unknown): v is FinisherActor {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<FinisherActor>;
  return (
    typeof a.texture === 'string' && finite(a.x) && finite(a.y) && finite(a.scale) && a.scale > 0
  );
}

function isPlan(v: unknown): v is FinisherPlan {
  if (!v || typeof v !== 'object') return false;
  const p = v as Partial<FinisherPlan>;
  return (
    typeof p.variantId === 'string' &&
    Array.isArray(p.steps) &&
    finite(p.totalMs) &&
    p.totalMs >= 0 &&
    p.steps.every(
      (s: unknown) =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as { block?: unknown }).block === 'string' &&
        finite((s as { atMs?: unknown }).atMs) &&
        finite((s as { durationMs?: unknown }).durationMs),
    )
  );
}

/** True when `v` can be played: a plan with timed steps and two actors with finite positions. */
export function isFinisherStartData(v: unknown): v is FinisherStartData {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<FinisherStartData>;
  return isPlan(d.plan) && isActor(d.boss) && isActor(d.player) && finite(d.levelId);
}

/** Debug start: boss right of the astronaut, astronaut in the middle (standard positions, scale 1). */
export const DEBUG_BOSS_OFFSET_X = 160;

/**
 * Data for `?finisher=n`: plan of level n, boss texture of the level as in the boss classes
 * (`BOSSES[bossId].spriteKey`), no `result` (the scene ends in the menu).
 */
export function debugFinisherData(
  levelId: number,
  width: number,
  height: number,
  reduceEffects: boolean,
): FinisherStartData {
  const plan = buildFinisher(levelId, { reduceEffects, seen: [] });
  const bossId = LEVELS[levelId]?.bossId ?? 'rootMonster';
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  return {
    plan,
    levelId,
    bossId,
    boss: {
      texture: BOSSES[bossId].spriteKey,
      frame: 0,
      x: cx + DEBUG_BOSS_OFFSET_X,
      y: cy,
      scale: 1,
    },
    player: { texture: 'astronaut', frame: 0, x: cx, y: cy, scale: 1 },
  };
}
