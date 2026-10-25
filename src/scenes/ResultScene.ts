import Phaser from 'phaser';
import { getLevel } from '../config/levels';
import { themeColor, type ColorName } from '../config/theme';
import type { BatchId } from '../contracts';
import { getSoundService } from '../platform/audio';
import { hudScale } from '../platform/layout';
import { isValidLevelId, MAX_LEVEL_ID } from './debug';
import type { ResultSceneData } from './GameScene';
import { FunkButton } from './hud/FunkButton';
import { FUNK_GLYPH_H, funkScale, funkText } from './hud/FunkPanel';
import { formatTime } from './hud/hudMath';
import { BATCH_LABELS } from './menu/levelGroups';

const SIDE = 32;
const BAND_H = 6;
/** Same cap as the HUD so labels stay readable on phones without overflowing. */
const MAX_K = 1.4;
const BUTTON_GAP = 12;
const FACT_LABEL_X = SIDE;
const FACT_VALUE_X = 182;
const FACT_TOP = 162;
const FACT_STEP = 25;
const BIOME_COLOR: Record<BatchId, ColorName> = {
  forest: 'biome.forest',
  forestNight: 'biome.night',
  elfForest: 'biome.elf',
};

/** Finite, non-negative number from scene data, else 0. */
function nonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Round result in the radio style: log head, big verdict, fact list, buttons bottom right. */
export class ResultScene extends Phaser.Scene {
  private done = false;
  private lab = 1;

  constructor() {
    super('ResultScene');
  }

  create(data: ResultSceneData): void {
    const { width, height } = this.scale;
    this.done = false;
    this.lab = funkScale(1, Math.min(MAX_K, hudScale(this.game.canvas.getBoundingClientRect().height || window.innerHeight)));
    const levelId = isValidLevelId(data?.levelId) ? data.levelId : 0;
    const level = getLevel(levelId);
    const won = data?.result === 'won';
    const xp = Number.isFinite(data?.xpGained) ? data.xpGained : 0;
    const playerLevel = Number.isFinite(data?.playerLevel) ? data.playerLevel : 1;
    const leveledUp =
      Number.isFinite(data?.previousPlayerLevel) && playerLevel > data.previousPlayerLevel;
    getSoundService(this.game).play(won ? 'sfx-round-won' : 'sfx-round-lost');

    this.add.rectangle(0, 0, width, height, themeColor('hud.screen').num).setOrigin(0);
    const batch = level?.batch;
    if (batch) {
      this.add.rectangle(0, 0, width, BAND_H, themeColor(BIOME_COLOR[batch]).num).setOrigin(0);
    }

    const biome = batch ? BATCH_LABELS[batch] : '';
    const logParts = ['LOG', `LEVEL ${levelId}`];
    if (biome) logParts.push(biome);
    funkText(this, SIDE, 20 + BAND_H, logParts.join(' · '), this.lab, 'hud.text-muted').setOrigin(0, 0);
    // The survived time is only known for a won round (the full level time).
    if (won && level) {
      funkText(this, width - SIDE, 20 + BAND_H, `${formatTime(level.durationSec)} ÜBERLEBT`, this.lab, 'hud.text-muted').setOrigin(1, 0);
    }

    this.add.image(SIDE + 48, 96, 'astronaut', 0).setScale(3);
    const heroX = SIDE + 96 + 18;
    funkText(this, heroX, 74, won ? 'GEWONNEN' : 'VERLOREN', 4, won ? 'hud.accent' : 'hud.danger').setOrigin(0, 0.5);
    funkText(
      this,
      heroX,
      74 + FUNK_GLYPH_H * 2 + 18,
      won ? 'DER WALD IST WIEDER STILL.' : 'DIE ASTRONAUTIN ZIEHT SICH ZURÜCK.',
      this.lab,
      'hud.text-muted',
    ).setOrigin(0, 0.5);

    this.createFacts(width, data, { levelId, xp, playerLevel, leveledUp });
    this.createButtons(width, height, levelId, won);
  }

  private createFacts(
    width: number,
    data: ResultSceneData,
    f: { levelId: number; xp: number; playerLevel: number; leveledUp: boolean },
  ): void {
    const g = this.add.graphics();
    g.fillStyle(themeColor('hud.line').num, 1);
    for (let x = SIDE; x < width - SIDE; x += 2) g.fillRect(x, 150, 1, 1);

    const debugRound = data?.debugRound === true;
    const coins = nonNegative(data?.roundCoins);
    const sharePct = Math.round(Math.min(1, nonNegative(data?.goldShare)) * 100);
    const goldGained = nonNegative(data?.goldGained);
    const goldTotal = nonNegative(data?.goldTotal);
    const row = (i: number, label: string): number => {
      const y = FACT_TOP + i * FACT_STEP;
      funkText(this, FACT_LABEL_X, y, label, this.lab, 'hud.text-muted').setOrigin(0, 0.5);
      return y;
    };

    let y = row(0, 'ERFAHRUNG');
    funkText(this, FACT_VALUE_X, y, `+${f.xp} XP`, 2, 'hud.text').setOrigin(0, 0.5);

    y = row(1, 'SPIELERLEVEL');
    const lv = funkText(this, FACT_VALUE_X, y, String(f.playerLevel), 2, 'hud.text').setOrigin(0, 0.5);
    if (f.leveledUp && !debugRound) {
      funkText(this, FACT_VALUE_X + lv.width + 10, y, 'LEVELAUFSTIEG!', 2, 'hud.accent').setOrigin(0, 0.5);
    }

    y = row(2, 'MÜNZEN');
    this.add.image(FACT_VALUE_X + 8, y, 'coin-small', 0).setScale(2);
    funkText(this, FACT_VALUE_X + 26, y, `${coins} · ANTEIL ${sharePct} % · +${goldGained} GOLD`, 2, 'hud.gold').setOrigin(0, 0.5);

    y = row(3, 'GOLD GESAMT');
    funkText(this, FACT_VALUE_X, y, String(goldTotal), 2, 'hud.gold').setOrigin(0, 0.5);

    const note = debugRound
      ? 'DEBUG-RUNDE: SPIELSTAND WIRD NICHT GESPEICHERT.'
      : data?.saved === false
        ? 'FORTSCHRITT KONNTE NICHT GESPEICHERT WERDEN.'
        : '';
    if (note) {
      funkText(this, FACT_LABEL_X, FACT_TOP + 4 * FACT_STEP, note, this.lab, 'hud.danger').setOrigin(0, 0.5);
    }
  }

  private createButtons(width: number, height: number, levelId: number, won: boolean): void {
    const buttons: { label: string; action: () => void; primary?: boolean }[] = [
      { label: 'Nochmal', action: () => this.scene.start('GameScene', { levelId }) },
    ];
    if (won && levelId < MAX_LEVEL_ID) {
      buttons.push({
        label: 'Nächstes Level',
        action: () => this.scene.start('GameScene', { levelId: levelId + 1 }),
      });
    }
    buttons.push({ label: 'Menü', action: () => this.scene.start('MenuScene') });
    // Main action: "Nächstes Level" after a win, otherwise "Nochmal".
    const mainIndex = buttons.length === 3 ? 1 : 0;
    buttons[mainIndex].primary = true;

    const y = height - 44;
    let right = width - SIDE;
    const created: FunkButton[] = [];
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      const once = (): void => {
        if (this.done) return;
        this.done = true;
        b.action();
      };
      const btn = new FunkButton(this, 0, y, { label: b.label, primary: b.primary, onClick: once });
      btn.x = right - btn.width / 2;
      right -= btn.width + BUTTON_GAP;
      created[i] = btn;
    }
    created[mainIndex].setFocused(true);
    const main = buttons[mainIndex];
    const onKey = (): void => {
      if (this.done) return;
      this.done = true;
      main.action();
    };
    this.input.keyboard?.on('keydown-ENTER', onKey);
    this.input.keyboard?.on('keydown-SPACE', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ENTER', onKey);
      this.input.keyboard?.off('keydown-SPACE', onKey);
    });
  }
}
