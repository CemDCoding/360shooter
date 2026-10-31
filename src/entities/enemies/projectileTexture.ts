import type Phaser from 'phaser';
import type { EnemyId } from '../../contracts';
import { THEME } from '../../config/theme';

/** Default projectile sprite of the shooters (forest witch). */
export const DEFAULT_PROJECTILE_KEY = 'witch-bolt';

/**
 * Magnifier light beam of the archaeologist (brief gap, transition PE-133): drawn at runtime, fill
 * `sprite.muzzle-flash`, outline `sprite.outline`. Points right, the bolt rotates it to its flight direction.
 */
export const MAGNIFIER_BEAM_KEY = 'magnifier-beam';
const BEAM_WIDTH = 12;
const BEAM_HEIGHT = 4;
const BEAM_OUTLINE = 1;

/** Projectiles without a sprite in the brief, drawn instead (until H-29 or AP-106 deliver one). */
const DRAWN_PROJECTILES: Partial<Record<EnemyId, string>> = {
  archaeologist: MAGNIFIER_BEAM_KEY,
};

function drawMagnifierBeam(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(THEME.colors['sprite.outline'].num, 1);
  g.fillRect(0, 0, BEAM_WIDTH, BEAM_HEIGHT);
  g.fillStyle(THEME.colors['sprite.muzzle-flash'].num, 1);
  g.fillRect(
    BEAM_OUTLINE,
    BEAM_OUTLINE,
    BEAM_WIDTH - 2 * BEAM_OUTLINE,
    BEAM_HEIGHT - 2 * BEAM_OUTLINE,
  );
  g.generateTexture(MAGNIFIER_BEAM_KEY, BEAM_WIDTH, BEAM_HEIGHT);
  g.destroy();
}

/**
 * Texture key the projectile of `id` uses: `projectile.spriteKey` if that texture is loaded, else a drawn
 * transition (archaeologist beam), else the witch bolt. Keys from the brief that are not in the manifest
 * yet (`mummy-wrap`, `camel-spit`, AP-106) fall back to the witch bolt, never to Phaser's missing texture.
 */
export function projectileTextureKey(
  scene: Phaser.Scene,
  id: EnemyId,
  spriteKey: string | undefined,
): string {
  if (spriteKey && scene.textures.exists(spriteKey)) return spriteKey;
  const drawn = DRAWN_PROJECTILES[id];
  if (drawn === MAGNIFIER_BEAM_KEY) {
    if (!scene.textures.exists(drawn)) drawMagnifierBeam(scene);
    return drawn;
  }
  return DEFAULT_PROJECTILE_KEY;
}
