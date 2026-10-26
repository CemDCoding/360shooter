import Phaser from 'phaser';
import { ITEMS } from '../../config';
import { STORABLE_POWERS } from '../../config/powerStore';
import { OPACITY, THEME, themeColor } from '../../config/theme';
import type { ActiveArmour, ActivePowers, PowerStoreState, StorablePowerDef } from '../../contracts';
import { ARMOUR_PICKUP_SPRITE } from '../../entities/ArmourPickup';
import { slotStatus, type SlotStatus } from '../../logic/powerStore';
import { prefersReducedMotion } from '../../platform/motion';
import { FunkPanel, funkScale, funkText, setFunk } from './FunkPanel';
import { powerBlock, powerSlotRects, secondsText, slotIconScale, slotPanelStyle, type Rect } from './hudMath';

/** Scene event of the HudScene: a ready slot was tapped (payload: power id). */
export const POWER_SLOT_PRESSED = 'power-slot-pressed';

/** Hover fill: accent at 18 % over the glass (mockup lagerplatz-und-boss.html, like FunkButton). */
const HOVER_FILL_ALPHA = 0.18;
/** Item sprites are 16x16 (config/assets.ts). */
const SPRITE_PX = 16;

type SlotLook = SlotStatus;

/** Sprite key of a storable power: item sprite or the armour pickup sprite. */
function spriteFor(def: StorablePowerDef): string {
  if (def.kind === 'armour') return ARMOUR_PICKUP_SPRITE;
  return ITEMS.find((i) => i.id === def.id)?.spriteKey ?? '';
}

/** One slot: glass square, item symbol, lock seconds on top; states as in the H-14 addition. */
class PowerSlot {
  private readonly panel: FunkPanel;
  private readonly overlay: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.BitmapText;
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly zone: Phaser.GameObjects.Zone;
  private look: SlotLook = 'empty';
  private sec = 0;
  private hover = false;
  private pressed = false;
  private flashing = false;
  private paused = false;
  private flashTimer?: Phaser.Time.TimerEvent;
  private pressTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: StorablePowerDef,
    private readonly r: Rect,
    iconScale: number,
    textScale: number,
    onPress: (id: string) => void,
  ) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    this.panel = new FunkPanel(scene, r.x, r.y, r.w, r.h);
    this.overlay = scene.add.graphics();
    this.icon = scene.add.image(cx, cy, spriteFor(def), 0).setScale(iconScale).setOrigin(0.5);
    this.shadow = funkText(scene, cx + 1, cy + 1, '', textScale, 'hud.screen').setOrigin(0.5);
    this.text = funkText(scene, cx, cy, '', textScale, 'hud.text').setOrigin(0.5);
    // The zone is always interactive: a tap on the slot (even empty or blocked) never reaches the
    // GameScene below and so never moves the aim (Phaser globalTopOnly, like the pause button).
    this.zone = scene.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive();
    // While the game is paused the zone stays interactive (it still swallows the tap) but does
    // nothing: no hover, no press, no activation (V-14 d).
    this.zone.on('pointerover', () => this.setHover(true));
    this.zone.on('pointerout', () => this.setHover(false));
    this.zone.on('pointerdown', () => {
      if (this.paused || this.look !== 'ready') return;
      this.showPressed();
      onPress(this.def.id);
    });
    this.redraw();
  }

  set(look: SlotLook, sec: number): void {
    if (look === this.look && sec === this.sec) return;
    if (look === 'empty') this.stopFlash();
    this.look = look;
    this.sec = sec;
    this.redraw();
  }

  /** Pause of the game: the slot ignores taps and hover until resumed. */
  setPaused(on: boolean): void {
    this.paused = on === true;
    if (this.paused) this.hover = false;
    this.redraw();
  }

  /** Lights up once after storing (store-flash); with reduced motion only the frame changes. */
  flash(): void {
    if (prefersReducedMotion()) return;
    this.flashTimer?.remove(false);
    this.flashing = true;
    this.redraw();
    this.flashTimer = this.scene.time.delayedCall(THEME.motionMs['motion.store-flash'], () => {
      this.flashing = false;
      this.flashTimer = undefined;
      this.redraw();
    });
  }

  destroy(): void {
    this.flashTimer?.remove(false);
    this.pressTimer?.remove(false);
    this.zone.removeAllListeners();
    this.zone.destroy();
    this.panel.destroy();
    this.overlay.destroy();
    this.icon.destroy();
    this.shadow.destroy();
    this.text.destroy();
  }

  private stopFlash(): void {
    this.flashTimer?.remove(false);
    this.flashTimer = undefined;
    this.flashing = false;
  }

  private setHover(on: boolean): void {
    this.hover = on && !this.paused;
    this.redraw();
  }

  private showPressed(): void {
    this.pressTimer?.remove(false);
    this.pressed = true;
    this.redraw();
    this.pressTimer = this.scene.time.delayedCall(THEME.motionMs['motion.fast'], () => {
      this.pressed = false;
      this.pressTimer = undefined;
      this.redraw();
    });
  }

  private redraw(): void {
    const ready = this.look === 'ready';
    this.panel.setStyle(slotPanelStyle({ look: this.look, pressed: this.pressed, flashing: this.flashing }));

    // Mouse over a ready slot: accent fill at 18 % on top of the glass.
    this.overlay.clear();
    if (ready && this.hover && !this.pressed && !this.flashing) {
      this.overlay.fillStyle(themeColor('hud.accent').num, HOVER_FILL_ALPHA);
      this.overlay.fillRect(this.r.x + 1, this.r.y + 1, this.r.w - 2, this.r.h - 2);
    }

    if (this.look === 'empty') {
      this.icon.setTint(themeColor('hud.line').num).setAlpha(OPACITY.ghost);
    } else if (this.look === 'blocked') {
      this.icon.clearTint().setAlpha(OPACITY.dim);
    } else if (this.pressed) {
      this.icon.setTint(themeColor('hud.screen').num).setAlpha(1);
    } else {
      this.icon.clearTint().setAlpha(1);
    }

    const showSec = this.look === 'blocked' && this.sec > 0;
    const label = showSec ? secondsText(this.sec) : '';
    setFunk(this.text, label, 'hud.text');
    setFunk(this.shadow, label, 'hud.screen');
    this.text.setVisible(showSec);
    this.shadow.setVisible(showSec);

    if (this.zone.input) this.zone.input.cursor = this.paused ? 'default' : ready ? 'pointer' : this.look === 'blocked' ? 'not-allowed' : 'default';
  }
}

/**
 * Power storage slots bottom left (H-14, PE-70): one slot per STORABLE_POWERS entry, always
 * visible. Empty: dotted frame, ghost symbol. Ready: accent frame with glow. Blocked (power
 * running or cooldown): dim frame, dimmed symbol, seconds of the lock on top.
 */
export class PowerSlots {
  private readonly slots: PowerSlot[];
  private store: PowerStoreState = { stored: [] };
  private powers: ActivePowers = { doubleShotStage: 0, shieldLeft: 0, rapidFireMsLeft: 0 };
  private armour: ActiveArmour = { id: null, activeMsLeft: 0, cooldownMsLeft: 0 };

  constructor(scene: Phaser.Scene, k: number, arenaH: number, onPress: (id: string) => void) {
    const rects = powerSlotRects(STORABLE_POWERS.length, k, arenaH, {
      size: THEME.sizePx['size.hud-slot'],
      gap: THEME.sizePx['size.hud-slot-gap'],
      margin: THEME.spacePx['space.2'],
    });
    const iconScale = slotIconScale(rects[0]?.w ?? 0, SPRITE_PX, THEME.sizeCount['size.hud-slot-icon-scale']);
    const textScale = funkScale(2, k);
    this.slots = STORABLE_POWERS.map((def, i) => new PowerSlot(scene, def, rects[i], iconScale, textScale, onPress));
  }

  setStore(next: PowerStoreState): void {
    const added = next.stored.filter((id) => !this.store.stored.includes(id));
    this.store = { stored: [...next.stored] };
    this.refresh();
    for (const slot of this.slots) if (added.includes(slot.def.id)) slot.flash();
  }

  setPowers(p: ActivePowers): void {
    this.powers = { ...p };
    this.refresh();
  }

  setArmour(a: ActiveArmour): void {
    this.armour = { ...a };
    this.refresh();
  }

  /** Game paused or resumed: slots ignore taps while paused (V-14 d). */
  setPaused(on: boolean): void {
    for (const s of this.slots) s.setPaused(on);
  }

  destroy(): void {
    for (const s of this.slots) s.destroy();
    this.slots.length = 0;
  }

  private refresh(): void {
    for (const slot of this.slots) {
      const block = powerBlock(slot.def, this.powers, this.armour);
      const look = slotStatus(this.store, slot.def.id, block.blocked);
      slot.set(look, look === 'blocked' ? block.sec : 0);
    }
  }
}
