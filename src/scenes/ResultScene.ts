import Phaser from 'phaser';
import { ARENA } from '../config/arena';
import { getLevel } from '../config/levels';
import { themeColor, type ColorName } from '../config/theme';
import type { BatchId, BossId } from '../contracts';
import { getSoundService } from '../platform/audio';
import { hudScale } from '../platform/layout';
import { isValidLevelId, MAX_LEVEL_ID } from './debug';
import type { ResultSceneData } from './GameScene';
import { FunkButton } from './hud/FunkButton';
import { FUNK_GLYPH_H, FunkPanel, funkScale, funkText, measureFunk } from './hud/FunkPanel';
import { bossDisplayName, bossPercentLeft, formatTime, patternCells, patternWidth, PIXEL_STAR } from './hud/hudMath';
import { BATCH_LABELS } from './menu/levelGroups';
import { centerOffset } from './menu/menuLogic';

const SIDE = 32;
const BAND_H = 6;
/** Same cap as the HUD so labels stay readable on phones without overflowing. */
const MAX_K = 1.4;
const BUTTON_GAP = 12;
const FACT_LABEL_X = SIDE;
const FACT_VALUE_X = 182;
const FACT_TOP = 162;
/** Fact rows: Funk 2x line (16) plus a row gap of 8 (H-14, 6a). */
const FACT_STEP = FUNK_GLYPH_H * 2 + 8;
/** Optional win line per boss (6a); bosses without an entry keep the normal win line. */
const BOSS_WIN_LINES: Partial<Record<BossId, string>> = {
  giantStone: 'DER RIESEN-STEIN IST ZERFALLEN.',
};
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
    const { width: fullWidth, height } = this.scale;
    // PE-102: keep the 640 layout and centre it by shifting the camera; the background covers the full width.
    const ox = centerOffset(fullWidth, ARENA.baseWidth);
    const width = ARENA.baseWidth;
    this.cameras.main.setScroll(-ox, 0);
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

    this.add.rectangle(-ox, 0, fullWidth, height, themeColor('hud.screen').num).setOrigin(0);
    const batch = level?.batch;
    if (batch) {
      this.add.rectangle(-ox, 0, fullWidth, BAND_H, themeColor(BIOME_COLOR[batch]).num).setOrigin(0);
    }

    const biome = batch ? BATCH_LABELS[batch] : '';
    const logParts = ['LOG', `LEVEL ${levelId}`];
    if (biome) logParts.push(biome);
    const logY = 20 + BAND_H;
    const logLeft = funkText(this, SIDE, logY, logParts.join(' · '), this.lab, 'hud.text-muted').setOrigin(0, 0);
    // The survived time is only known for a won round (the full level time).
    let logRightX = width - SIDE;
    if (won && level) {
      const right = funkText(this, width - SIDE, logY, `${formatTime(level.durationSec)} ÜBERLEBT`, this.lab, 'hud.text-muted').setOrigin(1, 0);
      logRightX = right.x - right.width;
    }

    // Boss level only (6a): boss row in the facts, seal in the log head after a boss win.
    const bossId = level?.bossId;
    const bossWon = bossId !== undefined && won && data?.bossDefeated === true;
    if (bossWon) this.createSeal(SIDE + logLeft.width, logRightX, logY);

    this.add.image(SIDE + 48, 96, 'astronaut', 0).setScale(3);
    const heroX = SIDE + 96 + 18;
    funkText(this, heroX, 74, won ? 'GEWONNEN' : 'VERLOREN', 4, won ? 'hud.accent' : 'hud.danger').setOrigin(0, 0.5);
    const winLine = (bossWon && bossId ? BOSS_WIN_LINES[bossId] : undefined) ?? 'DER WALD IST WIEDER STILL.';
    funkText(
      this,
      heroX,
      74 + FUNK_GLYPH_H * 2 + 18,
      won ? winLine : 'DIE ASTRONAUTIN ZIEHT SICH ZURÜCK.',
      this.lab,
      'hud.text-muted',
    ).setOrigin(0, 0.5);

    const boss = bossId
      ? { name: bossDisplayName(bossId), defeated: data?.bossDefeated === true, hpLeft: nonNegative(data?.bossHpLeft) }
      : null;
    this.createFacts(width, data, { levelId, xp, playerLevel, leveledUp, boss });
    this.createButtons(width, height, levelId, won);
  }

  /** Seal "BOSS BESIEGT" (star + Funk 1x, accent frame), centred in the free part of the log head. */
  private createSeal(leftEnd: number, rightStart: number, y: number): void {
    const padX = 6;
    const gap = 5;
    const fits = (scale: number): number =>
      padX * 2 + patternWidth(PIXEL_STAR) * scale + gap + measureFunk(this, 'BOSS BESIEGT', scale);
    const free = rightStart - leftEnd - 2 * BUTTON_GAP;
    const scale = fits(this.lab) <= free ? this.lab : 1;
    const w = fits(scale);
    const h = FUNK_GLYPH_H * scale + 8;
    const x = Math.round((leftEnd + rightStart) / 2 - w / 2);
    const top = Math.round(y + (FUNK_GLYPH_H * this.lab) / 2 - h / 2);
    new FunkPanel(this, x, top, w, h, false, { line: 'hud.accent' });
    const star = this.add.graphics();
    star.fillStyle(themeColor('hud.gold').num, 1);
    const sy = top + Math.round((h - PIXEL_STAR.length * scale) / 2);
    for (const [cx, cy] of patternCells(PIXEL_STAR)) star.fillRect(x + padX + cx * scale, sy + cy * scale, scale, scale);
    funkText(this, x + padX + patternWidth(PIXEL_STAR) * scale + gap, top + h / 2, 'BOSS BESIEGT', scale, 'hud.accent').setOrigin(0, 0.5);
  }

  private createFacts(
    width: number,
    data: ResultSceneData,
    f: {
      levelId: number;
      xp: number;
      playerLevel: number;
      leveledUp: boolean;
      boss: { name: string; defeated: boolean; hpLeft: number } | null;
    },
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

    // Boss level: the boss row comes first (6a), the other rows move down by one.
    let i0 = 0;
    if (f.boss) {
      const by = row(i0++, 'BOSS');
      const maxX = width - SIDE;
      if (f.boss.defeated) {
        const text = `${f.boss.name} · BESIEGT`;
        const starW = patternWidth(PIXEL_STAR) * 2 + 8;
        const scale = FACT_VALUE_X + starW + measureFunk(this, text, 2) <= maxX ? 2 : 1;
        const star = this.add.graphics();
        star.fillStyle(themeColor('hud.gold').num, 1);
        const sy = by - PIXEL_STAR.length;
        for (const [cx, cy] of patternCells(PIXEL_STAR)) star.fillRect(FACT_VALUE_X + cx * 2, sy + cy * 2, 2, 2);
        funkText(this, FACT_VALUE_X + starW, by, text, scale, 'hud.accent').setOrigin(0, 0.5);
      } else {
        const text = `${f.boss.name} · ${bossPercentLeft(f.boss.hpLeft, 1)} % ÜBRIG`;
        const scale = FACT_VALUE_X + measureFunk(this, text, 2) <= maxX ? 2 : 1;
        funkText(this, FACT_VALUE_X, by, text, scale, 'hud.danger').setOrigin(0, 0.5);
      }
    }

    let y = row(i0, 'ERFAHRUNG');
    funkText(this, FACT_VALUE_X, y, `+${f.xp} XP`, 2, 'hud.text').setOrigin(0, 0.5);

    y = row(i0 + 1, 'SPIELERLEVEL');
    const lv = funkText(this, FACT_VALUE_X, y, String(f.playerLevel), 2, 'hud.text').setOrigin(0, 0.5);
    if (f.leveledUp && !debugRound) {
      funkText(this, FACT_VALUE_X + lv.width + 10, y, 'LEVELAUFSTIEG!', 2, 'hud.accent').setOrigin(0, 0.5);
    }

    y = row(i0 + 2, 'MÜNZEN');
    this.add.image(FACT_VALUE_X + 8, y, 'coin-small', 0).setScale(2);
    funkText(this, FACT_VALUE_X + 26, y, `${coins} · ANTEIL ${sharePct} % · +${goldGained} GOLD`, 2, 'hud.gold').setOrigin(0, 0.5);

    y = row(i0 + 3, 'GOLD GESAMT');
    funkText(this, FACT_VALUE_X, y, String(goldTotal), 2, 'hud.gold').setOrigin(0, 0.5);

    const note = debugRound
      ? 'DEBUG-RUNDE: SPIELSTAND WIRD NICHT GESPEICHERT.'
      : data?.saved === false
        ? 'FORTSCHRITT KONNTE NICHT GESPEICHERT WERDEN.'
        : '';
    if (note) {
      funkText(this, FACT_LABEL_X, FACT_TOP + (i0 + 4) * FACT_STEP, note, this.lab, 'hud.danger').setOrigin(0, 0.5);
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
