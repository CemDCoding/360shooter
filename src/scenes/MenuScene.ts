import Phaser from 'phaser';
import { PROGRESSION } from '../config';
import { levelForXp, xpForLevel } from '../logic/progression';
import { addMuteButton, getSoundService } from '../platform/audio';
import { loadSave, resetSave } from '../platform/storage';
import { isValidLevelId } from './debug';
import { Button } from './menu/Button';
import { ConfirmDialog } from './menu/ConfirmDialog';
import { UpgradePanel } from './menu/UpgradePanel';
import { LevelGrid } from './menu/LevelGrid';
import { isLevelUnlocked, xpFraction } from './menu/levelGroups';

const IDLE_ANIM = 'astronaut-idle';

export class MenuScene extends Phaser.Scene {
  private dialog: ConfirmDialog | null = null;
  private panel: UpgradePanel | null = null;
  private goldText: Phaser.GameObjects.Text | null = null;
  private starting = false;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.dialog = null;
    this.panel = null;
    this.starting = false;
    getSoundService(this.game).reload();
    const save = loadSave();
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 24, '360shooter', { color: '#ffffff', fontSize: '32px' })
      .setOrigin(0.5);

    const astronaut = this.add.sprite(width / 2 - 150, 70, 'astronaut').setScale(1.5);
    if (this.ensureIdleAnim()) astronaut.play(IDLE_ANIM);

    const level = Math.max(save.playerLevel, levelForXp(save.playerXp, PROGRESSION));
    const base = xpForLevel(level, PROGRESSION);
    const next = xpForLevel(level + 1, PROGRESSION);
    const barW = 200;
    const barX = width / 2 - 110;
    this.add.text(barX, 50, `Spielerlevel ${level}`, { color: '#ffffff', fontSize: '14px' });
    this.add
      .rectangle(barX, 76, barW, 10, 0x333333)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.6);
    this.add
      .rectangle(barX, 76, Math.max(1, barW * xpFraction(save.playerXp, base, next)), 10, 0x5ad17a)
      .setOrigin(0, 0.5);
    this.add.text(barX, 84, `${save.playerXp} / ${next} XP`, {
      color: '#cfd8e3',
      fontSize: '10px',
    });

    new LevelGrid(this, width / 2, 112, save.highestUnlockedLevel, (id) =>
      this.startLevel(id, save.highestUnlockedLevel),
    );

    this.goldText = this.add.text(barX + barW + 16, 44, `Gold: ${save.gold ?? 0}`, {
      color: '#ffd24a',
      fontSize: '14px',
    });
    new Button(this, barX + barW + 60, 76, 'Upgrade', () => this.openUpgrades(), {
      width: 90,
      height: 32,
      fontSize: 13,
    });

    new Button(this, width / 2, height - 20, 'Fortschritt zurücksetzen', () => this.askReset(), {
      width: 190,
      height: 32,
      fontSize: 12,
      fill: 0x5a2d2d,
      hoverFill: 0x8a3d3d,
    });

    addMuteButton(this, width - 24, 24);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killAll();
      this.dialog = null;
      this.panel?.destroy();
      this.panel = null;
      this.goldText = null;
    });
  }

  private openUpgrades(): void {
    if (this.dialog || this.panel) return;
    this.panel = new UpgradePanel(
      this,
      () => this.goldText?.setText(`Gold: ${loadSave().gold ?? 0}`),
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
