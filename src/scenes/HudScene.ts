import Phaser from 'phaser';
import { ITEMS } from '../config';
import { GameEvents, type GameEventPayloads, type WeaponStacks } from '../contracts';
import { parseDebugFps } from './debug';
import type { HudInitData } from './GameScene';

const GAME_KEY = 'GameScene';
const FONT = 'monospace';
const HP_BAR_W = 100;
const HP_BAR_H = 8;
/** Touch target: at least 32x32 logical pixels. */
const BUTTON_SIZE = 32;

/** Formats seconds as m:ss. */
export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.ceil(Number.isFinite(totalSec) ? totalSec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Overlay for timer, HP, weapon stacks and the pause button. Listens to GameScene events. */
export class HudScene extends Phaser.Scene {
  private timerText!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private stackTexts = new Map<keyof WeaponStacks, Phaser.GameObjects.Text>();
  private pauseOverlay!: Phaser.GameObjects.Container;
  private fpsText?: Phaser.GameObjects.Text;
  private gameEvents?: Phaser.Events.EventEmitter;

  constructor() {
    super('HudScene');
  }

  create(data: HudInitData): void {
    const { width, height } = this.scale;
    this.stackTexts = new Map();
    this.fpsText = undefined;

    this.add.image(14, 14, 'ui-icons', 0);
    this.add
      .rectangle(26, 14, HP_BAR_W + 2, HP_BAR_H + 2, 0x000000, 0.6)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.8);
    this.hpFill = this.add.rectangle(27, 14, HP_BAR_W, HP_BAR_H, 0xe74c3c).setOrigin(0, 0.5);

    this.timerText = this.add
      .text(width / 2, 14, '', { fontFamily: FONT, fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#000000', 3);

    // Weapon stacks: one small icon per weapon item from config, with a number 0..maxStacks.
    ITEMS.filter((d) => d.effect !== 'heal').forEach((def, i) => {
      const x = 14 + i * 36;
      this.add.image(x, 36, def.spriteKey, 0);
      const t = this.add
        .text(x + 10, 36, '0', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' })
        .setOrigin(0, 0.5)
        .setStroke('#000000', 2);
      this.stackTexts.set(def.effect as keyof WeaponStacks, t);
    });

    this.createPauseButton(width);
    this.pauseOverlay = this.createPauseOverlay(width, height);

    if (parseDebugFps(window.location.search)) {
      this.fpsText = this.add
        .text(width - 4, height - 4, '', { fontFamily: FONT, fontSize: '10px', color: '#00ff00' })
        .setOrigin(1, 1);
    }

    this.setHp(data?.hp ?? 0, data?.maxHp ?? 1);
    this.setTimer(data?.remainingSec ?? 0);
    if (data?.stacks) this.setStacks(data.stacks);

    this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
    this.input.keyboard?.on('keydown-P', this.togglePause, this);

    const game = this.scene.get(GAME_KEY);
    this.gameEvents = game.events;
    this.gameEvents.on(GameEvents.HpChanged, this.onHp, this);
    this.gameEvents.on(GameEvents.TimerTick, this.onTimer, this);
    this.gameEvents.on(GameEvents.WeaponChanged, this.onWeapon, this);
    this.gameEvents.on(Phaser.Scenes.Events.PAUSE, this.onGamePaused, this);
    this.gameEvents.on(Phaser.Scenes.Events.RESUME, this.onGameResumed, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(): void {
    this.fpsText?.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }

  private createPauseButton(width: number): void {
    const x = width - BUTTON_SIZE / 2 - 4;
    const y = BUTTON_SIZE / 2 + 4;
    const bg = this.add
      .rectangle(x, y, BUTTON_SIZE, BUTTON_SIZE, 0x000000, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, 'II', { fontFamily: FONT, fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x333333, 0.7));
    bg.on('pointerout', () => bg.setFillStyle(0x000000, 0.5));
    bg.on('pointerup', this.togglePause, this);
  }

  private createPauseOverlay(width: number, height: number): Phaser.GameObjects.Container {
    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();
    dim.on('pointerup', this.togglePause, this);
    const title = this.add
      .text(width / 2, height / 2 - 12, 'Pause', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(width / 2, height / 2 + 16, 'Tippen, Esc oder P zum Weiterspielen', {
        fontFamily: FONT,
        fontSize: '10px',
        color: '#cccccc',
      })
      .setOrigin(0.5);
    return this.add.container(0, 0, [dim, title, hint]).setDepth(100).setVisible(false);
  }

  private togglePause(): void {
    if (this.scene.isPaused(GAME_KEY)) this.scene.resume(GAME_KEY);
    else if (this.scene.isActive(GAME_KEY)) this.scene.pause(GAME_KEY);
  }

  private onGamePaused(): void {
    this.pauseOverlay.setVisible(true);
  }

  private onGameResumed(): void {
    this.pauseOverlay.setVisible(false);
  }

  private onHp(p: GameEventPayloads['hp-changed']): void {
    this.setHp(p.hp, p.maxHp);
  }

  private onTimer(p: GameEventPayloads['timer-tick']): void {
    this.setTimer(p.remainingSec);
  }

  private onWeapon(p: GameEventPayloads['weapon-changed']): void {
    this.setStacks(p.stacks);
  }

  private setHp(hp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? Phaser.Math.Clamp(hp / maxHp, 0, 1) : 0;
    this.hpFill.width = HP_BAR_W * ratio;
  }

  private setTimer(sec: number): void {
    this.timerText.setText(formatTime(sec));
  }

  private setStacks(stacks: WeaponStacks): void {
    for (const [effect, text] of this.stackTexts) text.setText(String(stacks[effect] ?? 0));
  }

  private cleanup(): void {
    this.input.keyboard?.off('keydown-ESC', this.togglePause, this);
    this.input.keyboard?.off('keydown-P', this.togglePause, this);
    if (this.gameEvents) {
      this.gameEvents.off(GameEvents.HpChanged, this.onHp, this);
      this.gameEvents.off(GameEvents.TimerTick, this.onTimer, this);
      this.gameEvents.off(GameEvents.WeaponChanged, this.onWeapon, this);
      this.gameEvents.off(Phaser.Scenes.Events.PAUSE, this.onGamePaused, this);
      this.gameEvents.off(Phaser.Scenes.Events.RESUME, this.onGameResumed, this);
      this.gameEvents = undefined;
    }
  }
}
