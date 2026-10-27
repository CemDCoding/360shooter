import Phaser from 'phaser';
import { PROGRESSION } from '../config';
import { ARENA } from '../config/arena';
import { THEME } from '../config/theme';
import { WEAPON_MOUNT } from '../config/weaponMount';
import type { SaveGame } from '../contracts';
import { levelForXp, xpForLevel } from '../logic/progression';
import { weaponFrame, weaponStageForUpgrades } from '../logic/weaponMount';
import { addMuteButton, getSoundService } from '../platform/audio';
import { prefersReducedMotion } from '../platform/motion';
import { loadSave, resetSave } from '../platform/storage';
import { isValidLevelId } from './debug';
import { Button } from './menu/Button';
import { ConfirmDialog } from './menu/ConfirmDialog';
import { UpgradePanel } from './menu/UpgradePanel';
import { LevelGrid } from './menu/LevelGrid';
import { drawBar, drawBevel, drawDashedRule, kText, textWidth, type KText } from './menu/kassette';
import { isLevelUnlocked, xpFraction } from './menu/levelGroups';
import { centerOffset, isFreshSave } from './menu/menuLogic';

const IDLE_ANIM = 'astronaut-idle';
const MAX_SUM = 20;

// Layout nach docs/design/mockups/hauptmenue.html (logische Pixel 640x360)
const PROFILE = { x: 16, y: 52, w: 184, h: 252, pad: 12 };
const GRID = { x: 216, y: 52 };

/** Alle Waffen- und Anzug-Stufen als Summen für die Porträt-Karte. */
function upgradeSums(save: SaveGame): { weapon: number; suit: number; stage: number } {
  const u = save.upgrades;
  const weapon = (u?.weaponFireRate ?? 0) + (u?.weaponDamage ?? 0);
  const suit = (u?.playerMaxHp ?? 0) + (u?.playerTurnSpeed ?? 0);
  const stage = weaponStageForUpgrades({
    weaponFireRate: u?.weaponFireRate ?? 0,
    weaponDamage: u?.weaponDamage ?? 0,
  });
  return { weapon, suit, stage };
}

export class MenuScene extends Phaser.Scene {
  private dialog: ConfirmDialog | null = null;
  private panel: UpgradePanel | null = null;
  private goldText: KText | null = null;
  private goldLabel: KText | null = null;
  private weaponText: KText | null = null;
  private suitText: KText | null = null;
  private weaponIcon: Phaser.GameObjects.Image | null = null;
  private starting = false;
  /** Horizontal shift that centres the 640 layout (PE-102). */
  private ox = 0;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.dialog = null;
    this.panel = null;
    this.starting = false;
    getSoundService(this.game).reload();
    const save = loadSave();
    this.ox = centerOffset(this.scale.width, ARENA.baseWidth);
    const ox = this.ox;
    const right = ox + ARENA.baseWidth;

    this.drawBackground();
    this.drawLogo();
    this.drawProfile(save);

    new LevelGrid(this, ox + GRID.x, GRID.y, save.highestUnlockedLevel, (id) =>
      this.startLevel(id, save.highestUnlockedLevel),
    );

    new Button(
      this,
      ox + PROFILE.x + PROFILE.w / 2,
      332,
      'Fortschritt zurücksetzen',
      () => this.askReset(),
      {
        variant: 'danger',
        scale: 1,
        width: PROFILE.w,
      },
    );

    const fresh = isFreshSave(save);
    kText(
      this,
      right - 16,
      328,
      fresh ? 'Willkommen! Starte mit Level 0.' : 'Tippe auf ein freies Level.',
      1,
      fresh ? 'menu.text' : 'menu.text-muted',
      1,
      0,
    );

    addMuteButton(this, right - 32, 26, 'menu');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killAll();
      this.dialog = null;
      this.panel?.destroy();
      this.panel = null;
      this.goldText = null;
      this.goldLabel = null;
      this.weaponText = null;
      this.suitText = null;
      this.weaponIcon = null;
    });
  }

  /** Sternenhimmel und Planet (nur Tokens: Planet in Pflaume, Sterne in Creme und Koralle). */
  private drawBackground(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    const planet = { x: this.ox + 600, y: 430, r: 180 };
    g.fillStyle(THEME.colors['plum.600'].num).fillCircle(planet.x, planet.y, planet.r);
    g.fillStyle(THEME.colors['plum.550'].num).fillCircle(planet.x - 72, planet.y - 90, 70);
    const star = (sx: number, sy: number, color: 'cream.50' | 'coral.300'): void => {
      g.fillStyle(THEME.colors[color].num, 0.5).fillRect(sx, sy, 2, 2);
    };
    for (let y = 11; y < height; y += 41)
      for (let x = 7; x < width; x += 53) star(x, y, 'cream.50');
    for (let y = 29; y < height; y += 67)
      for (let x = 31; x < width; x += 89) star(x, y, 'coral.300');
  }

  private drawLogo(): void {
    const shadow = 2;
    const parts: [string, 'menu.action-bg' | 'menu.text'][] = [
      ['360', 'menu.action-bg'],
      ['SHOOTER', 'menu.text'],
    ];
    let x = this.ox + 16;
    for (const [text, color] of parts) {
      kText(this, x + shadow, 14 + shadow, text, 3, 'menu.outline');
      const t = kText(this, x, 14, text, 3, color);
      x += textWidth(t) + 6;
    }
  }

  private drawProfile(save: SaveGame): void {
    const { y, w, h, pad } = PROFILE;
    const x = this.ox + PROFILE.x;
    const g = this.add.graphics();
    drawBevel(g, x, y, w, h, {
      fill: 'menu.surface',
      hi: 'menu.surface-hi',
      lo: 'menu.surface-lo',
    });
    const left = x + pad;
    const right = x + w - pad;
    const innerW = w - 2 * pad;

    // Porträt (eingesenkt) mit Astronautin
    const px = left;
    const py = y + pad;
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(px - 2, py - 2, 68, 68);
    g.fillStyle(THEME.colors['menu.surface-sunken'].num).fillRect(px, py, 64, 64);
    g.fillStyle(THEME.colors['menu.surface-lo'].num)
      .fillRect(px, py, 64, 2)
      .fillRect(px, py, 2, 64);
    if (this.textures.exists('astronaut')) {
      const astronaut = this.add.sprite(px + 32, py + 32, 'astronaut').setScale(2);
      if (this.ensureIdleAnim() && !prefersReducedMotion()) astronaut.play(IDLE_ANIM);
    }

    const level = Math.max(save.playerLevel, levelForXp(save.playerXp, PROGRESSION));
    const base = xpForLevel(level, PROGRESSION);
    const next = xpForLevel(level + 1, PROGRESSION);
    kText(this, px + 64 + 10, py + 10, 'Spielerlevel', 1, 'menu.text-muted');
    kText(this, px + 64 + 10 + 2, py + 25 + 2, String(level), 4, 'menu.outline');
    kText(this, px + 64 + 10, py + 25, String(level), 4, 'menu.text');

    // XP-Balken und Zahlen
    const barY = py + 64 + 10;
    drawBar(g, left, barY, innerW, xpFraction(save.playerXp, base, next));
    kText(this, left, barY + 8 + 6, 'XP', 1, 'menu.text-muted');
    kText(this, right, barY + 8 + 6, `${save.playerXp} / ${next}`, 1, 'menu.text-muted', 1, 0);
    const ruleY = barY + 8 + 6 + 7 + 10;
    drawDashedRule(g, left, ruleY, innerW, 'menu.surface-hi');

    // Gold
    const goldY = ruleY + 2 + 8 + 8;
    if (this.textures.exists('coin-small'))
      this.add.image(left + 8, goldY, 'coin-small', 0).setScale(2);
    this.goldText = kText(this, left + 22, goldY - 7, String(save.gold ?? 0), 2, 'menu.gold');
    this.goldLabel = kText(this, 0, goldY - 3, 'Gold', 1, 'menu.text-muted');

    // Waffe und Anzug
    const sums = upgradeSums(save);
    const weaponY = goldY + 8 + 10 + 8;
    if (this.textures.exists('weapon-raygun')) {
      this.weaponIcon = this.add.image(
        left + WEAPON_MOUNT.frame.width / 2,
        weaponY,
        'weapon-raygun',
        weaponFrame(sums.stage, 0),
      );
    }
    kText(this, left + WEAPON_MOUNT.frame.width + 5, weaponY - 3, 'Waffe', 1, 'menu.text-muted');
    this.weaponText = kText(
      this,
      right,
      weaponY - 3,
      `${sums.weapon} / ${MAX_SUM}`,
      1,
      'menu.text',
      1,
      0,
    );
    const suitY = weaponY + 8 + 6 + 4;
    kText(this, left, suitY - 3, 'Anzug', 1, 'menu.text-muted');
    this.suitText = kText(
      this,
      right,
      suitY - 3,
      `${sums.suit} / ${MAX_SUM}`,
      1,
      'menu.text',
      1,
      0,
    );
    this.placeGoldLabel();

    new Button(this, x + w / 2, y + h - pad - 16, 'Upgrades', () => this.openUpgrades(), {
      variant: 'primary',
      width: innerW,
    });
  }

  /** „GOLD“ steht rechts neben der Zahl, auch wenn die Zahl nach einem Kauf kürzer oder länger wird. */
  private placeGoldLabel(): void {
    if (!this.goldText || !this.goldLabel) return;
    this.goldLabel.setX(Math.round(this.goldText.x + textWidth(this.goldText) + 6));
  }

  /** Nach einem Kauf: Gold, Waffen- und Anzug-Summe und Waffen-Symbol der Ausbaustufe neu setzen. */
  private refreshProfile(): void {
    const save = loadSave();
    const sums = upgradeSums(save);
    this.goldText?.setText(String(save.gold ?? 0));
    this.placeGoldLabel();
    this.weaponText?.setText(`${sums.weapon} / ${MAX_SUM}`);
    this.suitText?.setText(`${sums.suit} / ${MAX_SUM}`);
    this.weaponIcon?.setFrame(weaponFrame(sums.stage, 0));
  }

  private openUpgrades(): void {
    if (this.dialog || this.panel) return;
    this.panel = new UpgradePanel(
      this,
      () => this.refreshProfile(),
      () => {
        this.panel?.destroy();
        this.panel = null;
      },
    );
  }

  private ensureIdleAnim(): boolean {
    if (!this.textures.exists('astronaut')) return false;
    if (!this.anims.exists(IDLE_ANIM)) {
      this.anims.create({
        key: IDLE_ANIM,
        frames: this.anims.generateFrameNumbers('astronaut', { start: 0, end: 1 }),
        frameRate: 3,
        repeat: -1,
      });
    }
    return true;
  }

  private startLevel(levelId: number, highestUnlocked: number): void {
    if (this.starting || this.dialog || this.panel) return;
    if (!isValidLevelId(levelId) || !isLevelUnlocked(levelId, highestUnlocked)) return;
    this.starting = true;
    this.scene.start('GameScene', { levelId });
  }

  private askReset(): void {
    if (this.dialog || this.panel) return;
    this.dialog = new ConfirmDialog(
      this,
      'Wirklich löschen?\nAuch Gold und Upgrades werden gelöscht.',
      () => {
        resetSave();
        this.scene.restart();
      },
      () => {
        this.dialog?.destroy();
        this.dialog = null;
      },
    );
  }
}
