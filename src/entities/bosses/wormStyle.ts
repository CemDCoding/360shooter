// Colours of the giant sand worm effects (AP-100, PE-133). Only tokens, no colour literals.
import { THEME } from '../../config/theme';

/** `game.sand` (brief 2026-10-31, theme sync AP-110): skin spikes and sand trail. */
export const SAND_COLOR = THEME.colors['game.sand'].num;
/** Outline of the drawn spikes and strokes (shape readable on every ground). */
export const OUTLINE_COLOR = THEME.colors['sprite.outline'].num;
/** Spark when a laser bounces off a body link (no flash of the boss). */
export const SPARK_COLOR = THEME.colors['sprite.muzzle-flash'].num;
