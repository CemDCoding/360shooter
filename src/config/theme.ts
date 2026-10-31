// erzeugt, nicht von Hand ändern: scripts/build-theme.mjs (npm run theme:build)
// Quelle: docs/design/export/tokens.resolved.json

interface ThemeColor {
  /** 0xRRGGBB für Phaser */
  readonly num: number;
  /** '#rrggbb' für CSS und Textstile */
  readonly css: string;
  /** nur bei Alpha-Tokens, 0..1 */
  readonly alpha?: number;
}

/** Farben, Schlüssel = Tokenname (z. B. 'menu.bg'). */
const COLORS = {
  'ink.950': { num: 0x0b0610, css: '#0b0610' },
  'plum.400': { num: 0x8a6a9a, css: '#8a6a9a' },
  'plum.500': { num: 0x4a2c60, css: '#4a2c60' },
  'plum.550': { num: 0x55306e, css: '#55306e' },
  'plum.600': { num: 0x3d2252, css: '#3d2252' },
  'plum.700': { num: 0x2d1a3d, css: '#2d1a3d' },
  'plum.750': { num: 0x24142f, css: '#24142f' },
  'plum.800': { num: 0x20122c, css: '#20122c' },
  'plum.900': { num: 0x1a0f24, css: '#1a0f24' },
  'plum.950': { num: 0x120a19, css: '#120a19' },
  'coral.300': { num: 0xffa0ae, css: '#ffa0ae' },
  'coral.400': { num: 0xff6b8a, css: '#ff6b8a' },
  'coral.500': { num: 0xde4c6e, css: '#de4c6e' },
  'coral.600': { num: 0xbf3458, css: '#bf3458' },
  'mint.200': { num: 0xb8ffe9, css: '#b8ffe9' },
  'mint.400': { num: 0x5fe0c0, css: '#5fe0c0' },
  'mint.600': { num: 0x2fb393, css: '#2fb393' },
  'cream.50': { num: 0xfff4e8, css: '#fff4e8' },
  'cream.200': { num: 0xe0c9d6, css: '#e0c9d6' },
  'cream.300': { num: 0xd8c3d6, css: '#d8c3d6' },
  'gold.200': { num: 0xffe2a0, css: '#ffe2a0' },
  'gold.400': { num: 0xffcf4a, css: '#ffcf4a' },
  'gold.600': { num: 0xc7922a, css: '#c7922a' },
  'red.300': { num: 0xff8a7b, css: '#ff8a7b' },
  'red.700': { num: 0x5a2236, css: '#5a2236' },
  'red.800': { num: 0x3a1726, css: '#3a1726' },
  'phos.50': { num: 0xe5f2d8, css: '#e5f2d8' },
  'phos.200': { num: 0xcae3af, css: '#cae3af' },
  'phos.300': { num: 0xa8d86b, css: '#a8d86b' },
  'phos.350': { num: 0xa9c48a, css: '#a9c48a' },
  'phos.600': { num: 0x567f02, css: '#567f02' },
  'phos.800': { num: 0x2c4210, css: '#2c4210' },
  'phos.950': { num: 0x0a1108, css: '#0a1108' },
  'biome.forest': { num: 0x6cc04a, css: '#6cc04a' },
  'biome.night': { num: 0x6a86ff, css: '#6a86ff' },
  'biome.elf': { num: 0xc89bff, css: '#c89bff' },
  'biome.forest-ground': { num: 0x2f5d34, css: '#2f5d34' },
  'biome.night-ground': { num: 0x0f1c3a, css: '#0f1c3a' },
  'biome.elf-ground': { num: 0x3b2a6b, css: '#3b2a6b' },
  'biome.forest-ground-hi': { num: 0x3a6e3f, css: '#3a6e3f' },
  'biome.forest-ground-lo': { num: 0x26502b, css: '#26502b' },
  'biome.night-ground-hi': { num: 0x1c2d58, css: '#1c2d58' },
  'biome.night-ground-lo': { num: 0x0a142c, css: '#0a142c' },
  'biome.elf-ground-hi': { num: 0x4a3880, css: '#4a3880' },
  'biome.elf-ground-lo': { num: 0x30215a, css: '#30215a' },
  'biome.desert': { num: 0xf0c060, css: '#f0c060' },
  'biome.pyramid': { num: 0xe8784a, css: '#e8784a' },
  'biome.oasis': { num: 0x4ad8b8, css: '#4ad8b8' },
  'biome.desert-ground': { num: 0x755428, css: '#755428' },
  'biome.pyramid-ground': { num: 0x5e3424, css: '#5e3424' },
  'biome.oasis-ground': { num: 0x1c4a3c, css: '#1c4a3c' },
  'biome.desert-ground-hi': { num: 0x84603a, css: '#84603a' },
  'biome.desert-ground-lo': { num: 0x664824, css: '#664824' },
  'biome.pyramid-ground-hi': { num: 0x6c3e2c, css: '#6c3e2c' },
  'biome.pyramid-ground-lo': { num: 0x4e2a1c, css: '#4e2a1c' },
  'biome.oasis-ground-hi': { num: 0x245a48, css: '#245a48' },
  'biome.oasis-ground-lo': { num: 0x123a2e, css: '#123a2e' },
  'sprite.outline': { num: 0x0b0610, css: '#0b0610' },
  'sprite.suit': { num: 0xfff4e8, css: '#fff4e8' },
  'sprite.suit-shade': { num: 0xe0c9d6, css: '#e0c9d6' },
  'sprite.visor': { num: 0x2a1640, css: '#2a1640' },
  'sprite.visor-glint': { num: 0xffa0ae, css: '#ffa0ae' },
  'sprite.eyes': { num: 0x5fe0c0, css: '#5fe0c0' },
  'sprite.cheeks': { num: 0xffa0ae, css: '#ffa0ae' },
  'sprite.accent': { num: 0xff6b8a, css: '#ff6b8a' },
  'sprite.raygun-glow': { num: 0xff8fae, css: '#ff8fae' },
  'sprite.highlight': { num: 0xffffff, css: '#ffffff' },
  'sprite.suit-deep': { num: 0xac90b0, css: '#ac90b0' },
  'sprite.accent-shade': { num: 0xbf3458, css: '#bf3458' },
  'sprite.eyes-hi': { num: 0xb8ffe9, css: '#b8ffe9' },
  'sprite.eyes-shade': { num: 0x2fb393, css: '#2fb393' },
  'sprite.muzzle-flash': { num: 0xfff3b0, css: '#fff3b0' },
  'sprite.coin': { num: 0xffcf4a, css: '#ffcf4a' },
  'sprite.coin-hi': { num: 0xffe2a0, css: '#ffe2a0' },
  'sprite.coin-lo': { num: 0xc7922a, css: '#c7922a' },
  'menu.bg': { num: 0x1a0f24, css: '#1a0f24' },
  'menu.surface': { num: 0x2d1a3d, css: '#2d1a3d' },
  'menu.surface-hi': { num: 0x4a2c60, css: '#4a2c60' },
  'menu.surface-lo': { num: 0x20122c, css: '#20122c' },
  'menu.surface-sunken': { num: 0x3d2252, css: '#3d2252' },
  'menu.surface-sunken-hi': { num: 0x55306e, css: '#55306e' },
  'menu.outline': { num: 0x0b0610, css: '#0b0610' },
  'menu.text': { num: 0xfff4e8, css: '#fff4e8' },
  'menu.text-muted': { num: 0xd8c3d6, css: '#d8c3d6' },
  'menu.text-disabled': { num: 0x8a6a9a, css: '#8a6a9a' },
  'menu.action-bg': { num: 0xff6b8a, css: '#ff6b8a' },
  'menu.action-hi': { num: 0xffa0ae, css: '#ffa0ae' },
  'menu.action-lo': { num: 0xbf3458, css: '#bf3458' },
  'menu.action-fg': { num: 0x0b0610, css: '#0b0610' },
  'menu.done-bg': { num: 0x5fe0c0, css: '#5fe0c0' },
  'menu.done-hi': { num: 0xb8ffe9, css: '#b8ffe9' },
  'menu.done-lo': { num: 0x2fb393, css: '#2fb393' },
  'menu.done-fg': { num: 0x0b0610, css: '#0b0610' },
  'menu.locked-bg': { num: 0x24142f, css: '#24142f' },
  'menu.locked-fg': { num: 0x8a6a9a, css: '#8a6a9a' },
  'menu.sticker-bg': { num: 0xfff4e8, css: '#fff4e8' },
  'menu.sticker-fg': { num: 0x0b0610, css: '#0b0610' },
  'menu.danger-bg': { num: 0x3a1726, css: '#3a1726' },
  'menu.danger-hi': { num: 0x5a2236, css: '#5a2236' },
  'menu.danger-fg': { num: 0xff8a7b, css: '#ff8a7b' },
  'menu.gold': { num: 0xffcf4a, css: '#ffcf4a' },
  'menu.focus': { num: 0xfff4e8, css: '#fff4e8' },
  'menu.scrim': { num: 0x0b0610, css: '#0b0610', alpha: 0.8 },
  'hud.glass': { num: 0x060c05, css: '#060c05', alpha: 0.722 },
  'hud.screen': { num: 0x0a1108, css: '#0a1108' },
  'hud.line': { num: 0x567f02, css: '#567f02' },
  'hud.line-dim': { num: 0x2c4210, css: '#2c4210' },
  'hud.text': { num: 0xe5f2d8, css: '#e5f2d8' },
  'hud.text-muted': { num: 0xa9c48a, css: '#a9c48a' },
  'hud.accent': { num: 0xa8d86b, css: '#a8d86b' },
  'hud.energy': { num: 0xa8d86b, css: '#a8d86b' },
  'hud.energy-low': { num: 0xff8a7b, css: '#ff8a7b' },
  'hud.gold': { num: 0xffcf4a, css: '#ffcf4a' },
  'hud.danger': { num: 0xff8a7b, css: '#ff8a7b' },
  'hud.glow': { num: 0xa8d86b, css: '#a8d86b', alpha: 0.451 },
  'hud.scrim': { num: 0x0a1108, css: '#0a1108', alpha: 0.851 },
  'hud.focus': { num: 0xe5f2d8, css: '#e5f2d8' },
  'hud.flash': { num: 0xa8d86b, css: '#a8d86b', alpha: 0.502 },
  'hud.trail': { num: 0xe0c9d6, css: '#e0c9d6' },
  'hud.danger-dim': { num: 0x5a2236, css: '#5a2236' },
  'game.laser-raygun': { num: 0xff8fae, css: '#ff8fae' },
  'game.shield-ring': { num: 0x5fb8ff, css: '#5fb8ff' },
  'game.fire-ring': { num: 0xff8a3a, css: '#ff8a3a' },
  'game.hit-flash': { num: 0xfff4e8, css: '#fff4e8' },
  'game.firefly': { num: 0xf3f07a, css: '#f3f07a' },
  'game.spore': { num: 0x9ff5ec, css: '#9ff5ec' },
  'game.sand': { num: 0xf0c878, css: '#f0c878' },
  'game.ember': { num: 0xffb04a, css: '#ffb04a' },
  'game.oasis-mote': { num: 0xd8ff8a, css: '#d8ff8a' },
  'game.ward': { num: 0x7ad8ff, css: '#7ad8ff' },
  'game.aura': { num: 0x5fe0c0, css: '#5fe0c0' },
} as const satisfies Record<string, ThemeColor>;

/** Abstände in px. */
const SPACE_PX = {
  'space.1': 4,
  'space.2': 8,
  'space.3': 12,
  'space.4': 16,
  'space.6': 24,
  'space.8': 32,
  'space.half': 2,
} as const;

/** Rahmenstärken in px. */
const BORDER_PX = {
  'border.menu': 2,
  'border.hud': 1,
  'border.focus': 2,
} as const;

/** Größen in px. */
const SIZE_PX = {
  'size.target': 32,
  'size.tile': 32,
  'size.button-h': 32,
  'size.hud-chip-h': 24,
  'size.stick': 88,
  'size.stick-knob': 28,
  'size.hud-slot': 40,
  'size.hud-slot-gap': 8,
} as const;

/** Größen als Anzahl. */
const SIZE_COUNT = {
  'size.energy-segments': 10,
  'size.hud-slot-icon-scale': 3,
} as const;

/** Zeiten in ms. */
const MOTION_MS = {
  'motion.fast': 80,
  'motion.base': 150,
  'motion.slow': 300,
  'motion.blink': 500,
  'motion.hit': 120,
  'motion.store-flash': 200,
  'motion.trail': 300,
} as const;

/** Bewegung als Anzahl. */
const MOTION_COUNT = {
  'motion.banner-blinks': 3,
} as const;

/** Easing-Angaben (CSS-Schreibweise). */
const MOTION_EASING = {
  'motion.pixel': 'steps(3)',
  'motion.out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

/** Deckkraft-Stufen, 0..1. */
const OPACITY = {
  'dim': 0.35,
  'ghost': 0.6,
  'hover': 0.18,
  'blink': 0.55,
  'aura': 0.25,
} as const;

/** Schrift: Familien (Fallback-Reihenfolge), Skalierungsstufen, Zeichenabstand und Zeilenabstand in px. */
const FONT = {
  family: { menu: ['Astro Kapsel'], hud: ['Astro Funk'] },
  scale: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
  },
  tracking: 1,
  lineGap: 3,
} as const;

export const THEME = {
  colors: COLORS,
  spacePx: SPACE_PX,
  borderPx: BORDER_PX,
  sizePx: SIZE_PX,
  sizeCount: SIZE_COUNT,
  motionMs: MOTION_MS,
  motionCount: MOTION_COUNT,
  motionEasing: MOTION_EASING,
  font: FONT,
  opacity: OPACITY,
} as const;

export { OPACITY };

export type ColorName = keyof typeof COLORS;
export type SpaceName = keyof typeof SPACE_PX;
export type BorderName = keyof typeof BORDER_PX;
export type SizeName = keyof typeof SIZE_PX;
export type MotionName = keyof typeof MOTION_MS;
export type OpacityName = keyof typeof OPACITY;

/** Farbe nach Tokenname; ein falscher Name ist ein Typfehler. */
export function themeColor(name: ColorName): ThemeColor {
  return COLORS[name];
}
