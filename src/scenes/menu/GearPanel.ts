import Phaser from 'phaser';
import type { EquippedGear, PetId } from '../../contracts';
import { THEME } from '../../config/theme';
import { prefersReducedMotion } from '../../platform/motion';
import { loadSave, writeSave } from '../../platform/storage';
import { Button } from './Button';
import { GearPreview } from './GearPreview';
import {
  GEAR_ROWS,
  GEAR_ROW_LABELS,
  NONE_LABEL,
  SET_COLORS,
  canBrowse,
  currentIndex,
  gearSummary,
  nextFocusRow,
  nothingOwned,
  rowOptions,
  setSticker,
  stepRow,
  wrapLine,
  type GearRow,
} from './gearPanelLogic';
import { drawBevel, drawRing, kText, motionMs, textWidth, type KText } from './kassette';

/** The menu camera may be lifted a few units (RS-02): the scrim reaches below the canvas. */
const BACKDROP_EXTRA = 64;
const PANEL = { x: 16, y: 52, w: 608, h: 296 };
const PAD = 10;
const HEAD_H = 32;
const PREVIEW = { w: 196, h: 236 };
const COL_GAP = 12;
const ROW_H = 32;
const ROW_GAP = 4;
const LABEL_W = 76;
const ARROW_W = 32;
const BOX_H = 52;
const WRAP_CHARS = 50;

const PREVIEW_SCALE = THEME.sizeCount['size.gear-preview-scale'];

function sunken(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(THEME.colors['menu.surface-sunken'].num).fillRect(x, y, w, h);
  g.fillStyle(THEME.colors['menu.surface-lo'].num).fillRect(x, y, w, 2).fillRect(x, y, 2, h);
}

/** Planet arc at the bottom of the preview, drawn in rows (no mask needed). */
function drawPlanet(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  const cx = PREVIEW.w / 2;
  const cy = 281;
  const rx = 138;
  const ry = 105;
  for (let row = 176; row < PREVIEW.h; row += 2) {
    const t = (row - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
    const left = Math.max(0, Math.round(cx - half));
    const right = Math.min(PREVIEW.w, Math.round(cx + half));
    if (right <= left) continue;
    g.fillStyle(
      THEME.colors[row <= 178 ? 'menu.surface-sunken-hi' : 'menu.surface-hi'].num,
    ).fillRect(x + left, y + row, right - left, Math.min(2, PREVIEW.h - row));
  }
}

/** Modal window for gear, pet and pet armour; every change is saved at once. */
export class GearPanel extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly onClose: () => void;
  private readonly escKey: Phaser.Input.Keyboard.Key | null;
  private readonly onEsc = (): void => this.close();
  private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);
  private focusRow = -1;
  private closed = false;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, 0, 0);
    this.onClose = onClose;
    this.setDepth(1000);
    const { width, height } = scene.scale;
    const scrim = THEME.colors['menu.scrim'];
    const backdrop = scene.add
      .rectangle(0, 0, width, height + BACKDROP_EXTRA, scrim.num, scrim.alpha)
      .setOrigin(0)
      .setInteractive();
    this.content = scene.add.container(0, 0);
    this.add([backdrop, this.content]);
    this.escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ?? null;
    this.escKey?.on('down', this.onEsc);
    scene.input.keyboard?.on('keydown', this.onKey);
    const first = nextFocusRow(loadSave(), -1, 1);
    this.focusRow = first;
    this.redraw();
    scene.add.existing(this);
    const fade = motionMs(prefersReducedMotion(), THEME.motionMs['motion.base']);
    if (fade > 0) {
      this.setAlpha(0);
      scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: fade,
        ease: 'Stepped',
        easeParams: [3],
      });
    }
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.destroy();
    this.onClose();
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.closed) return;
    const save = loadSave();
    switch (e.code) {
      case 'ArrowDown':
        this.focusRow = nextFocusRow(save, this.focusRow, 1);
        this.redraw();
        break;
      case 'ArrowUp':
        this.focusRow = nextFocusRow(save, this.focusRow, -1);
        this.redraw();
        break;
      case 'ArrowLeft':
        this.step(this.focusRow, -1);
        break;
      case 'ArrowRight':
        this.step(this.focusRow, 1);
        break;
      default:
    }
  }

  /** Browses one row; saves right after the change. */
  private step(rowIndex: number, dir: 1 | -1): void {
    const row = GEAR_ROWS[rowIndex];
    if (!row) return;
    const result = stepRow(loadSave(), row, dir);
    if (result?.ok) writeSave(result.save);
    this.focusRow = rowIndex;
    // The pet row can change what the pet armour row offers.
    if (this.focusRow >= 0 && !canBrowse(loadSave(), row)) {
      this.focusRow = nextFocusRow(loadSave(), rowIndex, 1);
    }
    this.redraw();
  }

  private redraw(): void {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const save = loadSave();
    this.content.removeAll(true);
    const ox = Math.round((width - 640) / 2);
    const oy = Math.round((height - 360) / 2);
    const px = ox + PANEL.x;
    const py = oy + PANEL.y;
    const g = scene.add.graphics();
    const items: Phaser.GameObjects.GameObject[] = [g];
    drawBevel(g, px, py, PANEL.w, PANEL.h, {
      fill: 'menu.surface',
      hi: 'menu.surface-hi',
      lo: 'menu.surface-lo',
    });

    // Head
    const x0 = px + PAD;
    const y0 = py + PAD;
    items.push(kText(scene, x0, y0 + 9, 'AUSRÜSTUNG', 2, 'menu.text'));
    const done = new Button(scene, 0, 0, 'FERTIG', () => this.close(), {
      variant: 'primary',
      scale: 2,
      height: HEAD_H,
    });
    done.setPosition(px + PANEL.w - PAD - done.width / 2, y0 + HEAD_H / 2);
    items.push(done);

    // Preview
    const bodyY = y0 + HEAD_H + 8;
    sunken(g, x0, bodyY, PREVIEW.w, PREVIEW.h);
    drawPlanet(g, x0, bodyY);
    const eq: EquippedGear = save.equippedGear ?? { head: null, body: null, legs: null };
    const pet: PetId | null = save.activePet ?? null;
    items.push(
      new GearPreview(scene, x0 + 68, bodyY + 110, {
        scale: PREVIEW_SCALE,
        equipped: eq,
        pet,
        petGear: pet ? (save.petGear?.[pet] ?? null) : null,
      }),
    );
    this.addSticker(items, g, x0 + 8, bodyY + 8, eq);

    // Rows
    const rx = x0 + PREVIEW.w + COL_GAP;
    const rw = px + PANEL.w - PAD - rx;
    const fieldW = rw - LABEL_W - 2 * ARROW_W - 2 * 4;
    GEAR_ROWS.forEach((row, i) => {
      this.addRow(items, g, row, i, rx, bodyY + i * (ROW_H + ROW_GAP), fieldW);
    });

    // Summary
    const boxY = bodyY + GEAR_ROWS.length * (ROW_H + ROW_GAP) - ROW_GAP + 8;
    sunken(g, rx, boxY, rw, BOX_H);
    const summary = gearSummary(eq);
    const lines = [
      ...wrapLine(summary.values, WRAP_CHARS),
      ...wrapLine(summary.effects, WRAP_CHARS),
    ];
    lines.slice(0, 4).forEach((line, i) => {
      items.push(kText(scene, rx + 8, boxY + 7 + i * 10, line, 1, 'menu.text'));
    });
    if (nothingOwned(save)) {
      items.push(
        kText(
          scene,
          rx + 8,
          boxY + 7 + 2 * 10 + 4,
          'NOCH NICHTS GEKAUFT: GEH IN DEN SHOP.',
          1,
          'menu.text-muted',
        ),
      );
    }
    this.content.add(items);
  }

  private addSticker(
    items: Phaser.GameObjects.GameObject[],
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    eq: EquippedGear,
  ): void {
    const sticker = setSticker(eq);
    if (!sticker) return;
    const scene = this.scene;
    const color = THEME.colors[SET_COLORS[sticker.set]].num;
    const title = kText(scene, x + 5 + 10 + 5, y + 5, sticker.title, 1, 'menu.sticker-fg');
    const titleW = textWidth(title) || sticker.title.length * 7;
    const pipsX = x + 5 + 10 + 5 + titleW + 6;
    const count = kText(
      scene,
      pipsX + sticker.total * 6 + 4,
      y + 5,
      sticker.countText,
      1,
      'menu.sticker-fg',
    );
    const w = pipsX + sticker.total * 6 + 4 + (textWidth(count) || 21) + 5 - x;
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x - 2, y - 2, w + 4, 18);
    g.fillStyle(THEME.colors['menu.sticker-bg'].num).fillRect(x, y, w, 14);
    g.fillStyle(color).fillRect(x + 5, y + 2, 10, 10);
    for (let i = 0; i < sticker.total; i++) {
      const on = i < sticker.count;
      g.fillStyle(on ? color : THEME.colors['menu.outline'].num).fillRect(
        pipsX + i * 6,
        y + 5,
        4,
        4,
      );
    }
    items.push(title, count);
    if (sticker.missing) items.push(kText(scene, x, y + 20, sticker.missing, 1, 'menu.text-muted'));
  }

  private addRow(
    items: Phaser.GameObjects.GameObject[],
    g: Phaser.GameObjects.Graphics,
    row: GearRow,
    index: number,
    x: number,
    y: number,
    fieldW: number,
  ): void {
    const scene = this.scene;
    const save = loadSave();
    const options = rowOptions(save, row);
    const option = options[currentIndex(save, row)] ?? options[0];
    const midY = y + ROW_H / 2;
    const browse = options.length > 1;
    items.push(
      kText(
        scene,
        x,
        midY - 4,
        GEAR_ROW_LABELS[row],
        1,
        browse ? 'menu.text-muted' : 'menu.text-disabled',
      ),
    );

    const mkArrow = (label: string, cx: number, dir: 1 | -1): Button => {
      const b = new Button(
        scene,
        cx,
        midY,
        label,
        () => {
          this.step(index, dir);
        },
        { scale: 2, width: ARROW_W, height: ROW_H },
      );
      b.setEnabled(browse);
      return b;
    };
    items.push(mkArrow('<', x + LABEL_W + ARROW_W / 2, -1));
    const fx = x + LABEL_W + ARROW_W + 4;
    sunken(g, fx, y, fieldW, ROW_H);
    items.push(mkArrow('>', fx + fieldW + 4 + ARROW_W / 2, 1));

    let textX = fx + 8;
    const set = option?.set;
    if (option && row === 'pet' && option.petId) {
      const key = `pet-${option.petId}`;
      if (scene.textures.exists(key)) {
        items.push(scene.add.image(fx + 8 + 8, midY, key, 0));
      }
      textX = fx + 8 + 16 + 6;
    } else if (set) {
      g.fillStyle(THEME.colors['menu.outline'].num).fillRect(fx + 6, midY - 7, 14, 14);
      g.fillStyle(THEME.colors[SET_COLORS[set]].num).fillRect(fx + 8, midY - 5, 10, 10);
      textX = fx + 26;
    }
    const isNone = option?.id === null || !option;
    const name: KText = kText(
      scene,
      textX,
      midY - 7,
      isNone ? NONE_LABEL : option.label,
      2,
      isNone ? 'menu.text-muted' : 'menu.text',
    );
    items.push(name);
    if (row === 'petGear' && !save.activePet) {
      // Disabled without a pet: dim the whole field.
      name.setAlpha(0.6);
    }
    if (index === this.focusRow) {
      drawRing(g, fx, y, fieldW, ROW_H, THEME.spacePx['space.half'], 'menu.focus');
    }
  }

  override destroy(fromScene?: boolean): void {
    this.escKey?.off('down', this.onEsc);
    this.scene?.input?.keyboard?.off('keydown', this.onKey);
    super.destroy(fromScene);
  }
}

/** Opens the gear window; `onClose` runs after it is closed (FERTIG or ESC). */
export function openGearPanel(scene: Phaser.Scene, onClose: () => void): GearPanel {
  return new GearPanel(scene, onClose);
}
