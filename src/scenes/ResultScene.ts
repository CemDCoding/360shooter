import Phaser from 'phaser';
import { getSoundService } from '../platform/audio';
import { isValidLevelId, MAX_LEVEL_ID } from './debug';
import type { ResultSceneData } from './GameScene';

const FONT = 'monospace';
const BUTTON_W = 150;
/** Touch target: at least 32 logical pixels high. */
const BUTTON_H = 34;

/** Round result: won/lost, XP, player level and the follow-up buttons. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultSceneData): void {
    const { width, height } = this.scale;
    const levelId = isValidLevelId(data?.levelId) ? data.levelId : 0;
    const won = data?.result === 'won';
    const xp = Number.isFinite(data?.xpGained) ? data.xpGained : 0;
    const playerLevel = Number.isFinite(data?.playerLevel) ? data.playerLevel : 1;
    const leveledUp =
      Number.isFinite(data?.previousPlayerLevel) && playerLevel > data.previousPlayerLevel;
    const cx = width / 2;
    getSoundService(this.game).play(won ? 'sfx-round-won' : 'sfx-round-lost');

    this.add
      .text(cx, 56, won ? 'Gewonnen' : 'Verloren', {
        fontFamily: FONT,
        fontSize: '32px',
        color: won ? '#7bed9f' : '#ff6b6b',
      })
      .setOrigin(0.5)
      .setStroke('#000000', 4);

    const lines = [`Level ${levelId}`, `+${xp} XP`, `Spielerlevel ${playerLevel}`];
    if (leveledUp) lines.push('Levelaufstieg!');
    if (data?.saved === false) lines.push('Fortschritt konnte nicht gespeichert werden.');
    this.add
      .text(cx, 130, lines.join('\n'), {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const buttons: { label: string; action: () => void }[] = [
      { label: 'Nochmal', action: () => this.scene.start('GameScene', { levelId }) },
    ];
    if (won && levelId < MAX_LEVEL_ID) {
      buttons.push({
        label: 'Nächstes Level',
        action: () => this.scene.start('GameScene', { levelId: levelId + 1 }),
      });
    }
    buttons.push({ label: 'Menü', action: () => this.scene.start('MenuScene') });

    const gap = 12;
    const totalW = buttons.length * BUTTON_W + (buttons.length - 1) * gap;
    buttons.forEach((b, i) => {
      const x = cx - totalW / 2 + BUTTON_W / 2 + i * (BUTTON_W + gap);
      this.addButton(x, height - 70, b.label, b.action);
    });
  }

  private addButton(x: number, y: number, label: string, action: () => void): void {
    const bg = this.add
      .rectangle(x, y, BUTTON_W, BUTTON_H, 0x1e2a44)
      .setStrokeStyle(1, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x2f4470));
    bg.on('pointerout', () => bg.setFillStyle(0x1e2a44));
    bg.once('pointerup', action);
  }
}
