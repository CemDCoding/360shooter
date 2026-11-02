import type Phaser from 'phaser';
import { PET_RULES, eggTextureKey, petTextureKey } from '../../config/pets';
import { STORABLE_POWERS } from '../../config/powerStore';
import { THEME, themeColor, type ColorName } from '../../config/theme';
import type { PetId, PetRoundState } from '../../contracts';
import { petBarFraction } from '../../logic/pets';
import { prefersReducedMotion } from '../../platform/motion';
import { FunkPanel, funkText, type PanelStyle } from './FunkPanel';
import { clampSpan } from '../safeInsets';
import type { Rect } from './hudMath';

// Pet bar in the HUD (AP-144, brief H-35 "Pet-Leiste"; position moved by AP-156/PE-194): radio glass 88 x 20,
// centred below the timer, its upper edge size.hud-petbar-gap under the timer. Fixed size like the slots
// (PE-94), not tappable.

/** Inner padding left/right and gap between icon, track and the right part (mockup .petbar). */
const PAD_X = 3;
const ITEM_GAP = 4;
const ICON_PX = 16;
const TRACK_W = 40;
const TRACK_H = 6;
const PIP_W = 4;
const PIP_H = 6;
const PIP_GAP = 2;

/** Slot metrics the bar width is derived from (same values as PowerSlots, desktop size at every k). */
const SLOT_BASE = {
  size: THEME.sizePx['size.hud-slot'],
  gap: THEME.sizePx['size.hud-slot-gap'],
};

/** Width of the bar: as wide as the slots together (2 x 40 + 8 = 88). */
export function petBarWidth(): number {
  const n = Math.max(1, STORABLE_POWERS.length);
  return n * SLOT_BASE.size + (n - 1) * SLOT_BASE.gap;
}

/**
 * Bar rectangle: centred under the timer, upper edge size.hud-petbar-gap below the timer's lower edge.
 * It only moves sideways if it would leave `[leftEdge, arenaW - rightEdge]` (safe area) or reach into
 * the chip row: `chipsRight` is the right end of the chips in the row under the timer (optional); the
 * bar then moves right of it, `size.hud-petbar-gap` away, as far as the free strip allows.
 */
export function petBarRect(
  timer: Rect,
  arenaW: number,
  leftEdge: number,
  rightEdge: number,
  chipsRight?: number,
): Rect {
  const w = petBarWidth();
  const h = THEME.sizePx['size.hud-petbar-h'];
  const gap = THEME.sizePx['size.hud-petbar-gap'];
  const centred = Math.round(timer.x + timer.w / 2 - w / 2);
  const wantX = chipsRight !== undefined ? Math.max(centred, chipsRight + gap) : centred;
  return { x: clampSpan(wantX, w, leftEdge, arenaW - rightEdge), y: timer.y + timer.h + gap, w, h };
}

export interface PetBarParts {
  /** Centre of the egg or pet icon (1x). */
  icon: { x: number; y: number };
  track: Rect;
  pips: Rect[];
  /** Right end and vertical centre of "EI". */
  eggLabel: { x: number; y: number };
  /** Left start and vertical centre of "MAX" (in place of the track). */
  maxLabel: { x: number; y: number };
}

/** Inner layout of the bar (mockup: padding 0 3, gap 4, items centred, pips/EI pushed right). */
export function petBarParts(r: Rect): PetBarParts {
  const cy = r.y + r.h / 2;
  const trackX = r.x + PAD_X + ICON_PX + ITEM_GAP;
  const right = r.x + r.w - PAD_X;
  const pipsW = 3 * PIP_W + 2 * PIP_GAP;
  const pipY = Math.round(cy - PIP_H / 2);
  return {
    icon: { x: r.x + PAD_X + ICON_PX / 2, y: cy },
    track: { x: trackX, y: Math.round(cy - TRACK_H / 2), w: TRACK_W, h: TRACK_H },
    pips: [0, 1, 2].map((i) => ({
      x: right - pipsW + i * (PIP_W + PIP_GAP),
      y: pipY,
      w: PIP_W,
      h: PIP_H,
    })),
    eggLabel: { x: right, y: cy },
    maxLabel: { x: trackX, y: cy },
  };
}

export interface PetBarLook {
  /** Egg or hatched pet as the icon. */
  icon: 'egg' | 'pet';
  /** Track fill 0..1 (not shown at MAX). */
  fraction: number;
  /** Stage 3: "MAX" instead of the track, accent frame with glow. */
  max: boolean;
  /** Lit pips 0..3 after the hatch; null while it is an egg ("EI"). */
  pips: number | null;
  style: PanelStyle;
}

/** What the bar shows for a round state (brief H-35). */
export function petBarLook(s: PetRoundState): PetBarLook {
  const hatched = s.phase === 'hatched';
  const pips = hatched
    ? Math.min(PET_RULES.maxPowerUps, Math.max(0, Math.floor(s.powerUps)))
    : null;
  const max = hatched && pips !== null && pips >= PET_RULES.maxPowerUps;
  return {
    icon: hatched ? 'pet' : 'egg',
    fraction: petBarFraction(s),
    max,
    pips,
    style: max ? { line: 'hud.accent', glow: true } : { line: 'hud.line' },
  };
}

/** The bar became full since the last state: hatch or a new power-up (store-flash). */
export function petBarFilled(prev: PetRoundState | null, next: PetRoundState): boolean {
  if (!prev) return false;
  if (prev.phase === 'egg' && next.phase === 'hatched') return true;
  return next.phase === 'hatched' && next.powerUps > prev.powerUps;
}

/** Track fill width in whole pixels. */
export function trackFillWidth(fraction: number): number {
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  return Math.round(TRACK_W * f);
}

export class PetBar {
  private readonly panel: FunkPanel;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly eggText: Phaser.GameObjects.BitmapText;
  private readonly maxText: Phaser.GameObjects.BitmapText;
  private readonly parts: PetBarParts;
  private state: PetRoundState | null = null;
  private flashing = false;
  private flashTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly rect: Rect,
    private readonly petId: PetId,
  ) {
    this.parts = petBarParts(rect);
    this.panel = new FunkPanel(scene, rect.x, rect.y, rect.w, rect.h);
    this.icon = scene.add.image(this.parts.icon.x, this.parts.icon.y, eggTextureKey(petId), 0);
    this.gfx = scene.add.graphics();
    this.eggText = funkText(
      scene,
      this.parts.eggLabel.x,
      this.parts.eggLabel.y,
      'EI',
      1,
      'hud.text-muted',
    ).setOrigin(1, 0.5);
    this.maxText = funkText(
      scene,
      this.parts.maxLabel.x,
      this.parts.maxLabel.y,
      'MAX',
      1,
      'hud.accent',
    )
      .setOrigin(0, 0.5)
      .setVisible(false);
  }

  set(next: PetRoundState): void {
    const filled = petBarFilled(this.state, next);
    this.state = { ...next };
    if (filled) this.flash();
    this.redraw();
  }

  /** Bar full: hud.flash fill for motion.store-flash; nothing with reduced motion. No blinking. */
  private flash(): void {
    if (prefersReducedMotion()) return;
    this.flashTimer?.remove(false);
    this.flashing = true;
    this.flashTimer = this.scene.time.delayedCall(THEME.motionMs['motion.store-flash'], () => {
      this.flashing = false;
      this.flashTimer = undefined;
      this.redraw();
    });
  }

  private redraw(): void {
    const s = this.state;
    if (!s) return;
    const look = petBarLook(s);
    this.panel.setStyle(this.flashing ? { ...look.style, fill: 'hud.flash' } : look.style);
    const key = look.icon === 'pet' ? petTextureKey(this.petId) : eggTextureKey(this.petId);
    if (this.icon.texture.key !== key && this.scene.textures.exists(key))
      this.icon.setTexture(key, 0);

    const g = this.gfx.clear();
    if (!look.max) {
      const t = this.parts.track;
      g.fillStyle(themeColor('hud.line-dim').num, 1);
      g.fillRect(t.x, t.y, t.w, t.h);
      const fw = trackFillWidth(look.fraction);
      if (fw > 0) {
        g.fillStyle(themeColor('hud.accent').num, 1);
        g.fillRect(t.x, t.y, fw, t.h);
      }
    }
    if (look.pips !== null) {
      this.parts.pips.forEach((p, i) => {
        const on = i < (look.pips ?? 0);
        const color: ColorName = on ? 'hud.accent' : 'hud.line';
        if (on) {
          g.fillStyle(themeColor(color).num, 1);
          g.fillRect(p.x, p.y, p.w, p.h);
        } else {
          g.lineStyle(1, themeColor(color).num, 1);
          g.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
        }
      });
    }
    this.eggText.setVisible(look.pips === null);
    this.maxText.setVisible(look.max);
  }

  destroy(): void {
    this.flashTimer?.remove(false);
    this.flashTimer = undefined;
    this.panel.destroy();
    this.icon.destroy();
    this.gfx.destroy();
    this.eggText.destroy();
    this.maxText.destroy();
  }
}
