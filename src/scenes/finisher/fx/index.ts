// Register of the boss effect modules of the choreographies (M13, AP-182, §4 event `fx`). An `fx` event
// names an effect; the player looks it up in the module of the boss rig (`fx/<bossId>.ts`). Every module
// starts empty and is filled by the package of its boss (AP-184, AP-186 to AP-190). Effects build their
// objects in the factory (scene start), never during the update.
import type { BossId, ChoreoEvent, RigId } from '../../../contracts';
import type { ChoreoContext } from '../context';
import type { RigFigure } from '../rig';
import { FOREST_GHOST_FX } from './forestGhost';
import { GIANT_SAND_WORM_FX } from './giantSandWorm';
import { GIANT_STONE_FX } from './giantStone';
import { GUARDIAN_DOG_FX } from './guardianDog';
import { PHARAOH_FX } from './pharaoh';
import { ROOT_MONSTER_FX } from './rootMonster';

export {
  BOSS_REF_H,
  FOREST_GHOST_REF_H,
  HIT_RING_MS,
  defaultRingCentre,
  hitRingFx,
  ringRadius,
  type HitRingSpec,
} from './hitRing';

export type FxEvent = Extract<ChoreoEvent, { kind: 'fx' }>;

/** What an effect may use. */
export interface FxApi {
  ctx: ChoreoContext;
  /** Atlas of the choreography (`finisher-rig-<BossId>`). */
  atlas: string;
  /** Scale of the boss figure (`size.rig-scale-boss-*`). */
  bossScale: number;
  /** Figure of a rig in this choreography, null when it is not an actor. */
  figure(rigId: RigId): RigFigure | null;
  /** The boss figure, null without a boss actor. */
  boss(): RigFigure | null;
}

/** One prepared effect: created at the start, shown from `start` until the player calls `stop`. */
export interface FxInstance {
  start(): void;
  /** `sinceMs`: real time since the start; `dtMs`: real time of this frame. */
  update(sinceMs: number, dtMs: number): void;
  stop(): void;
  destroy(): void;
}

/** Builds an effect for one `fx` event (called once per event at the scene start). */
export type FxFactory = (api: FxApi, event: FxEvent) => FxInstance;

/** Effects of one boss by name. */
export type BossFxModule = Readonly<Record<string, FxFactory>>;

export const BOSS_FX: Readonly<Record<BossId, BossFxModule>> = {
  rootMonster: ROOT_MONSTER_FX,
  forestGhost: FOREST_GHOST_FX,
  giantStone: GIANT_STONE_FX,
  giantSandWorm: GIANT_SAND_WORM_FX,
  guardianDog: GUARDIAN_DOG_FX,
  pharaoh: PHARAOH_FX,
};

/** Effect `name` of a module; own keys only (an event name like `constructor` finds nothing). */
export function findFx(mod: BossFxModule | undefined, name: string): FxFactory | null {
  if (!mod || !Object.prototype.hasOwnProperty.call(mod, name)) return null;
  const f = mod[name];
  return typeof f === 'function' ? f : null;
}
