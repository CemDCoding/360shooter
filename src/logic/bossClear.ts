/** Boss appearance clears normal enemies without reward or damage (AP-114, PE-137, Q-58). */

interface Despawnable {
  active: boolean;
  despawn(): void;
}

/** Despawns every active item exactly once; returns how many were despawned. */
export function despawnAllActive(items: readonly Despawnable[]): number {
  let n = 0;
  for (const item of items) {
    if (!item.active) continue;
    item.despawn();
    n += 1;
  }
  return n;
}

/** Clears normal enemies and their projectiles (no kill, no coin, no xp, no damage). */
export function clearForBoss(
  enemies: readonly Despawnable[],
  bolts: readonly Despawnable[],
): { enemies: number; bolts: number } {
  return { enemies: despawnAllActive(enemies), bolts: despawnAllActive(bolts) };
}

/** Q-58: no normal enemy spawns while the boss lives. */
export function shouldSpawnNormalEnemies(bossAlive: boolean): boolean {
  return !bossAlive;
}

/** The clear runs only for a level with a boss, once per round. */
export function shouldClearForBoss(bossId: string | undefined, bossSpawned: boolean): boolean {
  return bossId !== undefined && !bossSpawned;
}
