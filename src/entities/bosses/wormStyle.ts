// Colours of the giant sand worm effects (AP-100, PE-133). Only tokens, no colour literals.
import { THEME } from '../../config/theme';

const TOKENS = THEME.colors as Readonly<Record<string, { num: number } | undefined>>;

/**
 * `game.sand` (brief 2026-10-31): skin spikes and sand trail. The token arrives with the theme sync (AP-110);
 * until then the nearest existing warm token `game.firefly` stands in, so the build stays green either way.
 */
export const SAND_COLOR = (TOKENS['game.sand'] ?? THEME.colors['game.firefly']).num;
/** Outline of the drawn spikes and strokes (shape readable on every ground). */
export const OUTLINE_COLOR = THEME.colors['sprite.outline'].num;
/** Spark when a laser bounces off a body link (no flash of the boss). */
export const SPARK_COLOR = THEME.colors['sprite.muzzle-flash'].num;
