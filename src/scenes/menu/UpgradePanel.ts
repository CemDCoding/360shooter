import Phaser from 'phaser';
import { MAX_UPGRADE_LEVEL } from '../../contracts';
import type { UpgradeTrack } from '../../contracts';
import { UPGRADES } from '../../config/upgrades';
import { THEME } from '../../config/theme';
import { WEAPON_MOUNT } from '../../config/weaponMount';
import { buyUpgrade, upgradeCost } from '../../logic/upgrades';
import { weaponFrame, weaponStageForUpgrades } from '../../logic/weaponMount';
import { prefersReducedMotion } from '../../platform/motion';
import { loadSave, writeSave } from '../../platform/storage';
import { attachKeyboardFocus, Button, type KeyboardFocus } from './Button';
import { drawBevel, kText, motionMs, textWidth } from './kassette';
import { buyCaption, nextWeaponStage, pipStates } from './menuLogic';

const WEAPON_TRACKS: readonly UpgradeTrack[] = ['weaponFireRate', 'weaponDamage'];
const SUIT_TRACKS: readonly UpgradeTrack[] = ['playerMaxHp', 'playerTurnSpeed'];

/** Kurzform für Beschriftungen, die in die Spalte nicht passen. */
const SHORT_LABEL: Partial<Record<UpgradeTrack, string>> = { playerTurnSpeed: 'Drehgeschw.' };

const PANEL_W = 512;
const PANEL_H = 304;
const PAD_X = 16;
const PAD_Y = 14;
const ROW_W = PANEL_W - 2 * PAD_X;
const ROW_H = 38;
const ROW_GAP = 4;
const STICKER_H = 14;
/** 15 Pips: 5 px breit, 1 px Lücke (Stride 6), ganzzahlig; Spalte 90 px statt 80 (AP-99). */
const PIP_STRIDE = 6;
const PIP_W = 5;
const PIP_COL_W = MAX_UPGRADE_LEVEL * PIP_STRIDE;

/** Modal upgrade shop; buys via buyUpgrade + writeSave and redraws itself. */
export class UpgradePanel extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly onChange: () => void;
  private readonly onClose: () => void;
  private readonly escKey: Phaser.Input.Keyboard.Key | null;
  private readonly onEsc = (): void => this.onClose();
  private focus: KeyboardFocus | null = null;
  private lastFocus = -1;

  constructor(scene: Phaser.Scene, onChange: () => void, onClose: () => void) {
    super(scene, 0, 0);
    this.onChange = onChange;
    this.onClose = onClose;
    this.setDepth(1000);
    const { width, height } = scene.scale;
    const scrim = THEME.colors['menu.scrim'];
    const backdrop = scene.add
      .rectangle(0, 0, width, height, scrim.num, scrim.alpha)
      .setOrigin(0)
      .setInteractive();
    this.content = scene.add.container(0, 0);
    this.add([backdrop, this.content]);
    this.escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ?? null;
    this.escKey?.on('down', this.onEsc);
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

  private redraw(): void {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const save = loadSave();
    const levels = save.upgrades;
    const gold = save.gold ?? 0;
    this.focus?.dispose();
    this.lastFocus = this.focus?.current() ?? this.lastFocus;
    this.content.removeAll(true);

    const left = Math.round((width - PANEL_W) / 2);
    const top = Math.round((height - PANEL_H) / 2);
    const x0 = left + PAD_X;
    const g = scene.add.graphics();
    const items: Phaser.GameObjects.GameObject[] = [g];
    drawBevel(g, left, top, PANEL_W, PANEL_H, {
      fill: 'menu.surface',
      hi: 'menu.surface-hi',
      lo: 'menu.surface-lo',
    });

    // Kopf: Titel links, Gold rechts
    const headY = top + PAD_Y;
    items.push(kText(scene, x0, headY, 'Upgrades', 3, 'menu.text'));
    const goldText = kText(
      scene,
      left + PANEL_W - PAD_X,
      headY + 3,
      String(gold),
      2,
      'menu.gold',
      1,
      0,
    );
    items.push(goldText);
    if (scene.textures.exists('coin-small')) {
      items.push(
        scene.add
          .image(left + PANEL_W - PAD_X - textWidth(goldText) - 14, headY + 11, 'coin-small', 0)
          .setScale(2),
      );
    }

    const buttons: Button[] = [];
    let y = headY + 21 + 8;
    y = this.addGroup(items, g, x0, y, 'Waffe', WEAPON_TRACKS, levels, gold, buttons, true);
    y = this.addGroup(items, g, x0, y + 4, 'Anzug', SUIT_TRACKS, levels, gold, buttons, false);

    const close = new Button(
      scene,
      left + PANEL_W / 2,
      y + 6 + 16,
      'SCHLIESSEN',
      () => this.onClose(),
      {
        scale: 2,
      },
    );
    buttons.push(close);
    items.push(close);
    this.content.add(items);
    this.focus = attachKeyboardFocus(
      scene,
      buttons,
      this.lastFocus >= 0 ? Math.min(this.lastFocus, buttons.length - 1) : -1,
    );
  }

  /** Eine Gruppe (Aufkleber plus zwei Zeilen); gibt die y-Position unter der Gruppe zurück. */
  private addGroup(
    items: Phaser.GameObjects.GameObject[],
    g: Phaser.GameObjects.Graphics,
    x0: number,
    top: number,
    title: string,
    tracks: readonly UpgradeTrack[],
    levels: Partial<Record<UpgradeTrack, number>> | undefined,
    gold: number,
    buttons: Button[],
    showWeapon: boolean,
  ): number {
    const scene = this.scene;
    const label = kText(scene, x0 + 5, top + 4, title, 1, 'menu.sticker-fg');
    const w = textWidth(label) + 10;
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x0 - 2, top - 2, w + 4, STICKER_H + 4);
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x0, top, w + 4, STICKER_H + 4);
    g.fillStyle(THEME.colors['menu.sticker-bg'].num).fillRect(x0, top, w, STICKER_H);
    items.push(label);
    if (showWeapon) this.addWeaponHint(items, x0 + ROW_W, top, levels);

    let y = top + STICKER_H + 4 + 4;
    for (const track of tracks) {
      this.addRow(items, g, buttons, x0, y, track, levels?.[track] ?? 0, gold);
      y += ROW_H + ROW_GAP;
    }
    return y;
  }

  /** „AUSBAU 2 AB STUFE 7“ mit aktueller und nächster Waffe. */
  private addWeaponHint(
    items: Phaser.GameObjects.GameObject[],
    right: number,
    top: number,
    levels: Partial<Record<UpgradeTrack, number>> | undefined,
  ): void {
    const scene = this.scene;
    const stage = weaponStageForUpgrades({
      weaponFireRate: levels?.weaponFireRate ?? 0,
      weaponDamage: levels?.weaponDamage ?? 0,
    });
    const next = nextWeaponStage(stage, WEAPON_MOUNT.stageMaxUpgrades);
    const hasGun = scene.textures.exists('weapon-raygun');
    const gunW = WEAPON_MOUNT.frame.width;
    let x = right;
    const midY = top + STICKER_H / 2;
    if (next && hasGun) {
      items.push(
        scene.add
          .image(x - gunW / 2, midY, 'weapon-raygun', weaponFrame(stage + 1, 0))
          .setAlpha(0.55),
      );
      x -= gunW + 6;
      items.push(kText(scene, x, midY - 3, '>', 1, 'menu.text-muted', 1, 0));
      x -= 6 + 6;
    }
    if (hasGun) {
      items.push(scene.add.image(x - gunW / 2, midY, 'weapon-raygun', weaponFrame(stage, 0)));
      x -= gunW + 6;
    }
    const caption = next ? `Ausbau ${next.stage} ab Stufe ${next.fromSum}` : 'Voller Ausbau';
    items.push(kText(scene, x, midY - 3, caption, 1, 'menu.text-muted', 1, 0));
  }

  private addRow(
    items: Phaser.GameObjects.GameObject[],
    g: Phaser.GameObjects.Graphics,
    buttons: Button[],
    x0: number,
    y: number,
    track: UpgradeTrack,
    level: number,
    gold: number,
  ): void {
    const scene = this.scene;
    const cost = upgradeCost(track, level);
    const midY = y + ROW_H / 2;
    // eingesenkte Zeile
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x0 - 2, y - 2, ROW_W + 4, ROW_H + 4);
    g.fillStyle(THEME.colors['menu.surface-sunken'].num).fillRect(x0, y, ROW_W, ROW_H);
    g.fillStyle(THEME.colors['menu.surface-lo'].num)
      .fillRect(x0, y, ROW_W, 2)
      .fillRect(x0, y, 2, ROW_H);

    items.push(
      kText(
        scene,
        x0 + 8,
        midY - 3,
        SHORT_LABEL[track] ?? UPGRADES[track].label,
        1,
        'menu.text',
        0,
        0,
      ),
    );
    // Pips: gefüllt = Stufe
    const pipX = x0 + 8 + 120 + 8;
    pipStates(level, MAX_UPGRADE_LEVEL).forEach((on, i) => {
      const px = pipX + i * PIP_STRIDE;
      g.fillStyle(THEME.colors[on ? 'menu.done-bg' : 'menu.outline'].num).fillRect(
        px,
        midY - 4,
        PIP_W,
        8,
      );
      if (on) g.fillStyle(THEME.colors['menu.done-hi'].num).fillRect(px, midY - 4, PIP_W, 2);
    });
    items.push(
      kText(
        scene,
        x0 + 8 + 120 + 8 + PIP_COL_W + 8 + 40,
        midY - 3,
        `${level}/${MAX_UPGRADE_LEVEL}`,
        1,
        'menu.text-muted',
        1,
        0,
      ),
    );

    const caption = buyCaption(cost, gold);
    const colW = ROW_W - 16 - 120 - PIP_COL_W - 40 - 3 * 8;
    const colX = x0 + ROW_W - 8 - colW;
    if (caption.state === 'max') {
      g.fillStyle(THEME.colors['menu.outline'].num).fillRect(colX - 2, midY - 18, colW + 4, 36);
      g.fillStyle(THEME.colors['menu.done-bg'].num).fillRect(colX, midY - 16, colW, 32);
      items.push(kText(scene, colX + colW / 2, midY - 3, caption.text, 1, 'menu.done-fg', 0.5, 0));
      return;
    }
    const btn = new Button(scene, colX + colW / 2, midY, caption.text, () => this.buy(track), {
      variant: 'primary',
      width: colW,
      scale: 1,
      leading: scene.textures.exists('coin-small') ? { key: 'coin-small', frame: 0 } : undefined,
    });
    btn.setEnabled(caption.state === 'buy');
    buttons.push(btn);
    items.push(btn);
  }

  private buy(track: UpgradeTrack): void {
    const next = buyUpgrade(loadSave(), track);
    if (!next) return;
    writeSave(next);
    this.redraw();
    this.onChange();
  }

  override destroy(fromScene?: boolean): void {
    this.escKey?.off('down', this.onEsc);
    this.focus?.dispose();
    this.focus = null;
    super.destroy(fromScene);
  }
}
