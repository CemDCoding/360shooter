// Colours of the guardian dog effects (AP-103, PE-133). Only tokens, no colour literals.
import { OPACITY, THEME } from '../../config/theme';

/** `game.ward`: shield area, dotted shield ring and the runes. */
export const WARD_COLOR = THEME.colors['game.ward'].num;
/** Fill alpha of the shield area (brief: `game.ward` with OPACITY.aura). */
export const WARD_ALPHA = OPACITY.aura;
/** Runes while they are still announced (not yet shootable). */
export const ANNOUNCE_ALPHA = OPACITY.dim;
/** Bark shock wave: solid ring in `hud.danger` (solid, so it never looks like the dotted shield ring). */
export const BARK_COLOR = THEME.colors['hud.danger'].num;
/** Outline of the drawn runes and the wave (shape readable on every ground). */
export const OUTLINE_COLOR = THEME.colors['sprite.outline'].num;
/** Spark when a laser bounces off the shield (no flash of the boss). */
export const SPARK_COLOR = THEME.colors['sprite.muzzle-flash'].num;
