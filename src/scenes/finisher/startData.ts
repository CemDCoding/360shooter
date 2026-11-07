// Start data of the finisher scene: input check and the debug start `?finisher=n` (AP-160). No Phaser import.
import type { ChoreoDef, FinisherActor, FinisherPlan, FinisherStartData } from '../../contracts';
import { FINISHER_ATLASES, type FinisherAtlasDef } from '../../config/assets';
import { BOSSES } from '../../config/bosses';
import { LEVELS } from '../../config/levels';
import { DEFAULT_FINISHER_SOURCE, buildFinisher } from '../../logic/finisher';
import { DEBUG_CHOREO, DEBUG_CHOREO_LEVEL } from './debugChoreo';
import { atlasKey } from './rig';

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
    finite(p.totalMs) &&
    p.totalMs >= 0 &&
    finite(p.skipFromMs) &&
    choreoOf(p as FinisherPlan) !== null
  );
}

/**
 * The choreography of a plan when it has the shape the player needs (M13, AP-182); null = unusable plan.
 * Content rules are checked by `validateChoreo` in the tests of each choreography.
 */
export function choreoOf(plan: FinisherPlan): ChoreoDef | null {
  const c = plan.choreo as Partial<ChoreoDef> | undefined;
  if (!c || typeof c !== 'object') return null;
  const ok =
    typeof c.variantId === 'string' &&
    finite(c.durationMs) &&
    c.durationMs > 0 &&
    Array.isArray(c.actors) &&
    Array.isArray(c.tracks) &&
    Array.isArray(c.events) &&
    Array.isArray(c.beats) &&
    (c.shots === undefined || Array.isArray(c.shots));
  return ok ? (c as ChoreoDef) : null;
}

/**
 * Atlas the scene still has to load for a choreography (`finisher-rig-<BossId>` from `FINISHER_ATLASES`);
 * null when it is loaded already (`exists`) or not registered (the figures then show the game sprites).
 */
export function atlasToLoad(
  def: ChoreoDef,
  exists: (key: string) => boolean,
  atlases: readonly FinisherAtlasDef[] = FINISHER_ATLASES,
): FinisherAtlasDef | null {
  const key = atlasKey(def);
  if (exists(key)) return null;
  return atlases.find((a) => a.key === key) ?? null;
}

/** True when `v` can be played: a plan with a usable choreography and two actors with finite positions. */
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
  // `?finisher=0` plays the player test sequence while the register has no choreography for it (AP-182).
  const plan =
    levelId === DEBUG_CHOREO_LEVEL
      ? buildFinisher(
          levelId,
          { reduceEffects, seen: [] },
          {
            ...DEFAULT_FINISHER_SOURCE,
            choreos: {
              ...DEFAULT_FINISHER_SOURCE.choreos,
              [DEBUG_CHOREO.variantId]:
                DEFAULT_FINISHER_SOURCE.choreos?.[DEBUG_CHOREO.variantId] ?? DEBUG_CHOREO,
            },
          },
        )
      : buildFinisher(levelId, { reduceEffects, seen: [] });
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
