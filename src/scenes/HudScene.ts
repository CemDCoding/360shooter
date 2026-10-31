import Phaser from 'phaser';
import { getLevel } from '../config/levels';
import { OPACITY, THEME, themeColor, type ColorName } from '../config/theme';
import { GameEvents, type GameEventPayloads } from '../contracts';
import { addMuteButton } from '../platform/audio';
import { hudScale } from '../platform/layout';
import { prefersReducedMotion } from '../platform/motion';
import { parseDebugFps } from './debug';
import type { HudInitData } from './GameScene';
import { ArmourIndicator } from './hud/ArmourIndicator';
import { CoinCounter } from './hud/CoinCounter';
import { FunkButton } from './hud/FunkButton';
import {
  drawDottedLine,
  FUNK_GLYPH_H,
  FunkPanel,
  funkScale,
  funkText,
  measureFunk,
  setFunk,
  type FunkChip,
} from './hud/FunkPanel';
import {
  bannerBlink,
  bossBarLook,
  bossBarRect,
  bossBarState,
  bossDisplayName,
  bossTrailTop,
  energyRatio,
  energySegments,
  formatTime,
  isEnergyLow,
  isTimerWarning,
  layoutRow,
  patternCells,
  patternWidth,
  PIXEL_LOCK,
} from './hud/hudMath';
import { PowerIndicators } from './hud/PowerIndicators';
import { POWER_SLOT_PRESSED, PowerSlots } from './hud/PowerSlots';
import { StatusIndicator } from './hud/StatusIndicator';
import { BATCH_LABELS } from './menu/levelGroups';

export { formatTime };

const GAME_KEY = 'GameScene';
/** Outer margin and chip gap in arena units at k = 1 (candidates for the config). */
const MARGIN = 8;
const CHIP_GAP = 4;
/** The HUD factor is capped so energy, timer and buttons never collide on small screens. */
const MAX_K = 1.4;
/** Glyph scale of the energy and timer numbers: desktop step 3, independent of k (PE-94, funkScale would jump to 4 on phones). */
const HUD_NUMBER_SCALE = 3;
const PAUSE_DEPTH = 100;
/** Boss bar width in arena units at k = 1 (runde.html 3: 200 px, bottom centre). */
const BOSS_BAR_W = 200;
const BOSS_BAR_H = 8;
/** Banner top as a share of the arena height (mockup lagerplatz-und-boss.html: top 92 of 360). */
const BANNER_TOP = 92 / 360;

/** Overlay for energy, timer, chips, pause and mute buttons. Listens to GameScene events. */
export class HudScene extends Phaser.Scene {
  private coinCounter!: CoinCounter;
  private powers!: PowerIndicators;
  private armour!: ArmourIndicator;
  private status!: StatusIndicator;
  private slots?: PowerSlots;
  private chipRow: FunkChip[] = [];
  private statusRow: FunkChip[] = [];
  private rowY = 0;
  private k = 1;

  private energyPanel!: FunkPanel;
  private energyNum!: Phaser.GameObjects.BitmapText;
  private energyLabel!: Phaser.GameObjects.BitmapText;
  private segGfx!: Phaser.GameObjects.Graphics;
  private segW = 8;
  private segH = 6;
  private segGap = 2;
  private segX = 0;
  private segY = 0;
  private energyLow = false;

  private timerPanel!: FunkPanel;
  private timerText!: Phaser.GameObjects.BitmapText;
  private timerSec = 0;
  private overtime = false;

  private bossBar: {
    panel: FunkPanel;
    fill: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.BitmapText;
    tag: Phaser.GameObjects.BitmapText;
    lock: Phaser.GameObjects.Graphics;
    tagScale: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null = null;
  private bossBanner: {
    panel: FunkPanel;
    head: Phaser.GameObjects.BitmapText;
    title: Phaser.GameObjects.BitmapText;
    rule: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.BitmapText;
  } | null = null;
  private bannerTween?: Phaser.Tweens.Tween;
  private bossAlive = false;
  /** Boss bar state: fill ratio, invulnerable flag, trail top (null: none) and the hit flash. */
  private bossRatio = 1;
  private bossInvulnerable = false;
  private bossTrail: number | null = null;
  private bossFlash = false;
  private bossTrailTimer?: Phaser.Time.TimerEvent;
  private bossFlashTimer?: Phaser.Time.TimerEvent;

  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseInfo!: Phaser.GameObjects.BitmapText;
  private levelId = 0;

  private blinks = new Map<string, Phaser.Tweens.Tween>();
  private fpsText?: Phaser.GameObjects.BitmapText;
  private gameEvents?: Phaser.Events.EventEmitter;

  constructor() {
    super('HudScene');
  }

  create(data: HudInitData): void {
    const { width, height } = this.scale;
    this.fpsText = undefined;
    this.chipRow = [];
    this.statusRow = [];
    this.blinks = new Map();
    this.timerSec = 0;
    this.overtime = false;
    this.bossAlive = false;
    this.bossBar = null;
    this.bossBanner = null;
    this.bannerTween = undefined;
    this.resetBossBarState(1);
    this.energyLow = false;
    this.levelId = Number.isFinite(data?.levelId) ? data.levelId : 0;

    const k = Math.min(
      MAX_K,
      hudScale(this.game.canvas.getBoundingClientRect().height || window.innerHeight),
    );
    this.k = k;
    const m = Math.round(MARGIN * k);

    this.createEnergy(m, k);
    this.createTimer(width, m, k);
    const btn = Math.round(THEME.sizePx['size.target'] * Math.max(1, k));
    this.createButtons(width, m, btn);
    this.createChips(m, k);
    this.createBossUi(width, height, k);
    this.slots = new PowerSlots(this, height, m, this.onSlotPressed);
    this.pauseOverlay = this.createPauseOverlay(width, height, k);

    if (parseDebugFps(window.location.search)) {
      this.fpsText = funkText(this, width - 4, height - 4, '', 1, 'hud.accent').setOrigin(1, 1);
    }

    this.setHp(data?.hp ?? 0, data?.maxHp ?? 1);
    this.setTimer(data?.remainingSec ?? 0);

    this.input.keyboard?.on('keydown-ESC', this.togglePause, this);
    this.input.keyboard?.on('keydown-P', this.togglePause, this);

    const game = this.scene.get(GAME_KEY);
    this.gameEvents = game.events;
    this.gameEvents.on(GameEvents.HpChanged, this.onHp, this);
    this.gameEvents.on(GameEvents.TimerTick, this.onTimer, this);
    this.gameEvents.on(GameEvents.CoinsChanged, this.onCoins, this);
    this.gameEvents.on(GameEvents.PowersChanged, this.onPowers, this);
    this.gameEvents.on(GameEvents.ArmourChanged, this.onArmour, this);
    this.gameEvents.on(GameEvents.PowerStoreChanged, this.onPowerStore, this);
    this.gameEvents.on(GameEvents.PlayerStatus, this.onPlayerStatus, this);
    this.gameEvents.on(GameEvents.BossWarning, this.onBossWarning, this);
    this.gameEvents.on(GameEvents.BossSpawned, this.onBossSpawned, this);
    this.gameEvents.on(GameEvents.BossHpChanged, this.onBossHp, this);
    this.gameEvents.on(GameEvents.BossDefeated, this.onBossDefeated, this);
    this.gameEvents.on(Phaser.Scenes.Events.PAUSE, this.onGamePaused, this);
    this.gameEvents.on(Phaser.Scenes.Events.RESUME, this.onGameResumed, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(): void {
    if (this.fpsText)
      setFunk(this.fpsText, `${Math.round(this.game.loop.actualFps)} FPS`, 'hud.accent');
  }

  /** Boss overtime: the timer shows "BOSS!" (on while the timer is over and the boss lives, AP-20). */
  setOvertime(on: boolean): void {
    this.overtime = on === true;
    this.refreshTimer();
  }

  /** Energy panel: number (3x), label and ten segments. */
  private createEnergy(m: number, k: number): void {
    const numScale = HUD_NUMBER_SCALE;
    const labScale = funkScale(1, k);
    const pad = Math.round(8 * k);
    const numW = measureFunk(this, '100', numScale);
    this.segW = Math.round(8 * k);
    this.segH = Math.round(6 * k);
    this.segGap = Math.max(2, Math.round(2 * k));
    const count = THEME.sizeCount['size.energy-segments'];
    const segsW = count * this.segW + (count - 1) * this.segGap;
    const labW = measureFunk(this, 'ENERGIE!', labScale);
    const gap = Math.round(8 * k);
    const w = pad * 2 + numW + gap + Math.max(segsW, labW);
    const h = FUNK_GLYPH_H * numScale + pad * 2;
    this.energyPanel = new FunkPanel(this, m, m, w, h, true);
    this.energyNum = funkText(this, m + pad, m + h / 2, '0', numScale, 'hud.text').setOrigin(
      0,
      0.5,
    );
    const blockH = FUNK_GLYPH_H * labScale + Math.round(4 * k) + this.segH;
    const top = m + (h - blockH) / 2;
    const bx = m + pad + numW + gap;
    this.energyLabel = funkText(this, bx, top, 'ENERGIE', labScale, 'hud.text-muted');
    this.segX = bx;
    this.segY = top + FUNK_GLYPH_H * labScale + Math.round(4 * k);
    this.segGfx = this.add.graphics();
    this.rowY = m + h + Math.round(CHIP_GAP * k);
  }

  private createTimer(width: number, m: number, k: number): void {
    const scale = HUD_NUMBER_SCALE;
    const pad = Math.round(8 * k);
    const w =
      Math.max(measureFunk(this, '10:00', scale), measureFunk(this, 'BOSS!', scale)) + pad * 2;
    const h = FUNK_GLYPH_H * scale + pad * 2;
    this.timerPanel = new FunkPanel(this, Math.round(width / 2 - w / 2), m, w, h);
    this.timerText = funkText(this, width / 2, m + h / 2, '0:00', scale, 'hud.text').setOrigin(0.5);
  }

  /** Boss bar at the bottom centre and the "Boss kommt!" banner, both hidden until needed (runde.html 3). */
  private createBossUi(width: number, height: number, k: number): void {
    const lab = funkScale(1, k);
    const { x, y, w, h } = bossBarRect(width, height, k, BOSS_BAR_W, BOSS_BAR_H, MARGIN);
    const panel = new FunkPanel(this, x, y, w, h, false, { line: 'hud.danger' });
    const fill = this.add.graphics();
    const name = funkText(this, x, y - 3, '', lab, 'hud.text').setOrigin(0, 1);
    const tag = funkText(this, x + w, y - 3, 'BOSS', lab, 'hud.danger').setOrigin(1, 1);
    const lock = this.add.graphics();
    this.bossBar = { panel, fill, name, tag, lock, tagScale: lab, x, y, w, h };
    this.showBossBar(false);

    // Banner as a radio message (H-14, 5a): head line, title, dotted rule, boss name.
    const bannerPanel = new FunkPanel(this, 0, 0, 10, 10, true, { line: 'hud.danger', glow: true });
    const head = funkText(this, 0, 0, 'FUNK · WARNUNG', lab, 'hud.text-muted').setOrigin(0.5, 0);
    const title = funkText(this, 0, 0, 'BOSS KOMMT!', funkScale(3, k), 'hud.danger').setOrigin(
      0.5,
      0,
    );
    const rule = this.add.graphics();
    const bannerName = funkText(this, 0, 0, '', lab, 'hud.text').setOrigin(0.5, 0);
    this.bossBanner = { panel: bannerPanel, head, title, rule, name: bannerName };
    this.layoutBanner(width, height, '');
    this.showBanner(false);
  }

  /** Sizes and places the banner around its three lines (mockup lagerplatz-und-boss.html 2, 5). */
  private layoutBanner(width: number, height: number, name: string): void {
    const b = this.bossBanner;
    if (!b) return;
    const k = this.k;
    const lab = funkScale(1, k);
    const big = funkScale(3, k);
    const padX = Math.round(10 * k);
    const padTop = Math.round(7 * k);
    const padBottom = Math.round(8 * k);
    const gap = Math.round(6 * k);
    setFunk(b.name, name, 'hud.text');
    const innerW = Math.max(
      measureFunk(this, 'FUNK · WARNUNG', lab),
      measureFunk(this, 'BOSS KOMMT!', big),
      measureFunk(this, name, lab),
    );
    const bw = innerW + padX * 2;
    const bh =
      padTop +
      FUNK_GLYPH_H * lab +
      gap +
      FUNK_GLYPH_H * big +
      gap +
      1 +
      gap +
      FUNK_GLYPH_H * lab +
      padBottom;
    const bx = Math.round(width / 2 - bw / 2);
    const by = Math.round(height * BANNER_TOP);
    const cx = Math.round(width / 2);
    b.panel.setSize(bw, bh).setPosition(bx, by);
    let cy = by + padTop;
    b.head.setPosition(cx, cy);
    cy += FUNK_GLYPH_H * lab + gap;
    b.title.setPosition(cx, cy);
    cy += FUNK_GLYPH_H * big + gap;
    b.rule.clear();
    drawDottedLine(b.rule, bx + padX, cy, bx + bw - padX, cy, themeColor('hud.line').num);
    cy += 1 + gap;
    b.name.setPosition(cx, cy);
  }

  private showBossBar(on: boolean): void {
    const b = this.bossBar;
    if (!b) return;
    b.panel.setVisible(on);
    b.fill.setVisible(on);
    b.name.setVisible(on);
    b.tag.setVisible(on);
    b.lock.setVisible(on);
  }

  /** Shows the banner; it blinks motion.banner-blinks times, then stays calm (none with reduced motion). */
  private showBanner(on: boolean): void {
    const b = this.bossBanner;
    if (!b) return;
    const parts = [b.panel.gfx, b.head, b.title, b.rule, b.name];
    this.bannerTween?.stop();
    this.bannerTween = undefined;
    for (const p of parts) p.setVisible(on).setAlpha(1);
    if (!on) return;
    const plan = bannerBlink(
      THEME.motionCount['motion.banner-blinks'],
      THEME.motionMs['motion.blink'],
      prefersReducedMotion(),
    );
    if (!plan) return;
    this.bannerTween = this.tweens.add({
      targets: parts,
      alpha: OPACITY.blink,
      duration: plan.durationMs,
      yoyo: true,
      repeat: plan.repeat,
      onComplete: () => {
        for (const p of parts) p.setAlpha(1);
        this.bannerTween = undefined;
      },
    });
  }

  /** Width of the widest tag at a font scale ("SCHWACH!" or lock + "IMMUN"), so the name never overlaps it. */
  private bossTagWidth(scale: number): number {
    const lockW = (patternWidth(PIXEL_LOCK) + 3) * scale;
    return Math.max(
      measureFunk(this, 'BOSS', scale),
      measureFunk(this, 'SCHWACH!', scale),
      lockW + measureFunk(this, 'IMMUN', scale),
    );
  }

  /** Boss bar (H-14, 7a): fill, trail piece, hit flash, tag per state (normal, critical, immune). */
  private drawBossBar(): void {
    const b = this.bossBar;
    if (!b) return;
    const look = bossBarLook(bossBarState(this.bossRatio, 1, this.bossInvulnerable));
    b.panel.setStyle({ line: 'hud.danger', dotted: look.dotted });
    const inner = b.w - 2;
    const fillW = Math.round(inner * this.bossRatio);
    b.fill.clear();
    b.fill.fillStyle(themeColor(this.bossFlash ? 'game.hit-flash' : look.fill).num, 1);
    b.fill.fillRect(b.x + 1, b.y + 1, fillW, b.h - 2);
    if (this.bossTrail !== null) {
      const trailW = Math.round(inner * this.bossTrail) - fillW;
      if (trailW > 0) {
        b.fill.fillStyle(themeColor('hud.trail').num, 1);
        b.fill.fillRect(b.x + 1 + fillW, b.y + 1, trailW, b.h - 2);
      }
    }

    setFunk(b.tag, look.tag, look.tagColor);
    b.lock.clear();
    if (look.lock) {
      const s = b.tagScale;
      const tagW = measureFunk(this, look.tag, s);
      const lx = b.x + b.w - tagW - (patternWidth(PIXEL_LOCK) + 3) * s;
      const ly =
        b.y - 3 - FUNK_GLYPH_H * s + Math.round(((FUNK_GLYPH_H - PIXEL_LOCK.length) * s) / 2);
      b.lock.fillStyle(themeColor(look.tagColor).num, 1);
      for (const [cx, cy] of patternCells(PIXEL_LOCK))
        b.lock.fillRect(lx + cx * s, ly + cy * s, s, s);
    }
  }

  private resetBossBarState(ratio: number): void {
    this.bossTrailTimer?.remove(false);
    this.bossFlashTimer?.remove(false);
    this.bossTrailTimer = undefined;
    this.bossFlashTimer = undefined;
    this.bossRatio = ratio;
    this.bossInvulnerable = false;
    this.bossTrail = null;
    this.bossFlash = false;
  }

  private onBossWarning(p: GameEventPayloads['boss-warning']): void {
    // boss-warning only carries the id: the name comes from the boss name table (AP-72).
    const { width, height } = this.scale;
    this.layoutBanner(width, height, bossDisplayName(p?.bossId));
    this.showBanner(true);
  }

  private onBossSpawned(p: GameEventPayloads['boss-spawned']): void {
    this.showBanner(false);
    this.bossAlive = true;
    this.resetBossBarState(energyRatio(p.hp, p.maxHp));
    if (this.bossBar) {
      const bar = this.bossBar;
      const label = bossDisplayName(p.bossId);
      setFunk(bar.name, label, 'hud.text');
      // Name and tag must never overlap: fall back to scale 1 when the name is too wide.
      const lab = funkScale(1, this.k);
      const gap = Math.round(8 * this.k);
      const fits = measureFunk(this, label, lab) + this.bossTagWidth(lab) + gap <= bar.w;
      const nameScale = fits ? lab : 1;
      bar.name.setFontSize(FUNK_GLYPH_H * nameScale);
      bar.tagScale =
        !fits && measureFunk(this, label, 1) + this.bossTagWidth(1) + gap > bar.w ? 1 : lab;
      bar.tag.setFontSize(FUNK_GLYPH_H * bar.tagScale);
    }
    this.drawBossBar();
    this.showBossBar(true);
    this.updateOvertime();
  }

  private onBossHp(p: GameEventPayloads['boss-hp-changed']): void {
    const next = energyRatio(p.hp, p.maxHp);
    const top = bossTrailTop(this.bossRatio, next, this.bossTrail);
    this.bossRatio = next;
    this.bossInvulnerable = p.invulnerable === true;
    if (top !== null) {
      // Hit: the lost piece stays as a trail; the fill flashes white (not with reduced motion).
      this.bossTrail = top;
      this.bossTrailTimer?.remove(false);
      this.bossTrailTimer = this.time.delayedCall(THEME.motionMs['motion.trail'], () => {
        this.bossTrail = null;
        this.bossTrailTimer = undefined;
        this.drawBossBar();
      });
      if (!prefersReducedMotion()) {
        this.bossFlash = true;
        this.bossFlashTimer?.remove(false);
        this.bossFlashTimer = this.time.delayedCall(THEME.motionMs['motion.hit'], () => {
          this.bossFlash = false;
          this.bossFlashTimer = undefined;
          this.drawBossBar();
        });
      }
    }
    this.drawBossBar();
  }

  private onBossDefeated(): void {
    this.showBanner(false);
    this.bossAlive = false;
    this.resetBossBarState(0);
    this.showBossBar(false);
    this.updateOvertime();
  }

  private updateOvertime(): void {
    this.setOvertime(this.bossAlive && this.timerSec <= 0);
  }

  private createButtons(width: number, m: number, size: number): void {
    const px = width - m - size / 2;
    const y = m + size / 2;
    new FunkButton(this, px, y, {
      icon: { key: 'ui-icons', frame: 2 },
      width: size,
      height: size,
      onClick: () => this.togglePause(),
    });
    addMuteButton(this, px - size - m, y, 'hud');
  }

  /** Chip row: coins always, power chips and the fire ring only while active. */
  private createChips(m: number, k: number): void {
    const relayout = (): void => this.relayoutChips(m);
    this.coinCounter = new CoinCounter(this, k, relayout);
    this.powers = new PowerIndicators(this, k, relayout);
    this.armour = new ArmourIndicator(this, k, relayout);
    this.status = new StatusIndicator(this, k, relayout);
    this.chipRow = [this.coinCounter.chip, ...this.powers.chips, this.armour.chip];
    // Status chips sit in their own second row: the first row never grows into the arena edge (H-23).
    this.statusRow = [...this.status.chips];
    this.relayoutChips(m);
  }

  private relayoutChips(m: number): void {
    if (this.chipRow.length === 0) return;
    const gap = Math.round(CHIP_GAP * this.k);
    const rowH = Math.max(0, ...this.chipRow.map((c) => c.height));
    const rows: [FunkChip[], number][] = [
      [this.chipRow, this.rowY],
      [this.statusRow, this.rowY + rowH + gap],
    ];
    for (const [row, y] of rows) {
      const xs = layoutRow(
        row.map((c) => (c.visible ? c.width : null)),
        gap,
        m,
      );
      row.forEach((c, i) => {
        const x = xs[i];
        if (x !== null) c.setPosition(x, y);
      });
    }
  }

  private createPauseOverlay(
    width: number,
    height: number,
    k: number,
  ): Phaser.GameObjects.Container {
    const scrim = themeColor('hud.scrim');
    const dim = this.add
      .rectangle(0, 0, width, height, scrim.num, scrim.alpha ?? 1)
      .setOrigin(0)
      .setInteractive();
    dim.on('pointerup', this.togglePause, this);
    const cy = Math.round(height * 0.33);
    const title = funkText(this, width / 2, cy, '— PAUSE —', funkScale(4, k), 'hud.text').setOrigin(
      0.5,
    );
    const lab = funkScale(1, k);
    this.pauseInfo = funkText(
      this,
      width / 2,
      cy + Math.round(36 * k),
      '',
      lab,
      'hud.text-muted',
    ).setOrigin(0.5);
    const hint = funkText(
      this,
      width / 2,
      cy + Math.round(52 * k),
      'TIPPEN, ESC ODER P ZUM WEITERSPIELEN',
      lab,
      'hud.accent',
    ).setOrigin(0.5);
    return this.add
      .container(0, 0, [dim, title, this.pauseInfo, hint])
      .setDepth(PAUSE_DEPTH)
      .setVisible(false);
  }

  private togglePause(): void {
    if (this.scene.isPaused(GAME_KEY)) this.scene.resume(GAME_KEY);
    else if (this.scene.isActive(GAME_KEY)) this.scene.pause(GAME_KEY);
  }

  private onGamePaused(): void {
    const level = getLevel(this.levelId);
    const biome = level ? BATCH_LABELS[level.batch] : '';
    const parts = [`LEVEL ${this.levelId}`];
    if (biome) parts.push(biome);
    parts.push(`${formatTime(this.timerSec)} ÜBRIG`);
    setFunk(this.pauseInfo, parts.join(' · '), 'hud.text-muted');
    this.pauseOverlay.setVisible(true);
    this.slots?.setPaused(true);
  }

  private onGameResumed(): void {
    this.pauseOverlay.setVisible(false);
    this.slots?.setPaused(false);
  }

  private onHp(p: GameEventPayloads['hp-changed']): void {
    this.setHp(p.hp, p.maxHp);
  }

  private onTimer(p: GameEventPayloads['timer-tick']): void {
    this.setTimer(p.remainingSec);
    this.updateOvertime();
  }

  private onCoins(p: GameEventPayloads['coins-changed']): void {
    this.coinCounter.set(p.roundCoins);
  }

  private onPowers(p: GameEventPayloads['powers-changed']): void {
    this.powers.set(p);
    this.slots?.setPowers(p);
  }

  private onArmour(p: GameEventPayloads['armour-changed']): void {
    this.armour.set(p);
    this.slots?.setArmour(p);
  }

  private onPlayerStatus(p: GameEventPayloads['player-status']): void {
    this.status.set(p.effects);
  }

  private onPowerStore(p: GameEventPayloads['power-store-changed']): void {
    this.slots?.setStore(p);
  }

  /** A ready slot was tapped: report it to the GameScene, but never while paused or after the end. */
  private readonly onSlotPressed = (id: string): void => {
    if (!this.scene.isActive(GAME_KEY) || this.scene.isPaused(GAME_KEY)) return;
    this.events.emit(POWER_SLOT_PRESSED, id);
  };

  private setHp(hp: number, maxHp: number): void {
    const ratio = energyRatio(hp, maxHp);
    const low = isEnergyLow(ratio);
    this.energyLow = low;
    const color: ColorName = low ? 'hud.energy-low' : 'hud.text';
    const shown = Number.isFinite(hp) ? Math.max(0, Math.ceil(hp)) : 0;
    setFunk(this.energyNum, String(shown), color);
    setFunk(
      this.energyLabel,
      low ? 'ENERGIE!' : 'ENERGIE',
      low ? 'hud.energy-low' : 'hud.text-muted',
    );
    this.energyPanel.setStyle({ line: low ? 'hud.energy-low' : 'hud.line' });
    this.drawSegments(ratio, low);
    this.setBlink('energy', low, [
      this.energyPanel.gfx,
      this.energyNum,
      this.energyLabel,
      this.segGfx,
    ]);
  }

  private drawSegments(ratio: number, low: boolean): void {
    const g = this.segGfx;
    const fill = themeColor(low ? 'hud.energy-low' : 'hud.energy').num;
    const outline = themeColor(low ? 'red.700' : 'hud.line').num;
    g.clear();
    energySegments(ratio, THEME.sizeCount['size.energy-segments']).forEach((s, i) => {
      const x = this.segX + i * (this.segW + this.segGap);
      if (s === 'full') {
        g.fillStyle(fill, 1);
        g.fillRect(x, this.segY, this.segW, this.segH);
      } else {
        if (s === 'half') {
          g.fillStyle(fill, 1);
          g.fillRect(x, this.segY, Math.floor(this.segW / 2), this.segH);
        }
        g.lineStyle(1, outline, 1);
        g.strokeRect(x + 0.5, this.segY + 0.5, this.segW - 1, this.segH - 1);
      }
    });
  }

  private setTimer(sec: number): void {
    this.timerSec = Number.isFinite(sec) ? Math.max(0, sec) : 0;
    this.refreshTimer();
  }

  /** Timer text: "BOSS!" in overtime, else m:ss; warning below 10 s (colour and outline). */
  private refreshTimer(): void {
    const warn = this.overtime || isTimerWarning(this.timerSec);
    const color: ColorName = warn ? 'hud.danger' : 'hud.text';
    setFunk(this.timerText, this.overtime ? 'BOSS!' : formatTime(this.timerSec), color);
    this.timerPanel.setStyle({ line: warn ? 'hud.danger' : 'hud.line' });
    this.setBlink('timer', warn && !this.overtime, [this.timerPanel.gfx, this.timerText]);
  }

  /** Blinking is only a hint on top of text and outline; not with reduced motion. */
  private setBlink(id: string, on: boolean, targets: Phaser.GameObjects.GameObject[]): void {
    const active = on && !prefersReducedMotion();
    const existing = this.blinks.get(id);
    if (active && existing) return;
    if (existing) {
      existing.stop();
      this.blinks.delete(id);
    }
    for (const t of targets) (t as unknown as { setAlpha(a: number): void }).setAlpha(1);
    if (!active) return;
    this.blinks.set(
      id,
      this.tweens.add({
        targets,
        alpha: OPACITY.blink,
        duration: THEME.motionMs['motion.blink'],
        yoyo: true,
        repeat: -1,
      }),
    );
  }

  private cleanup(): void {
    this.input.keyboard?.off('keydown-ESC', this.togglePause, this);
    this.input.keyboard?.off('keydown-P', this.togglePause, this);
    for (const t of this.blinks.values()) t.stop();
    this.blinks.clear();
    this.bannerTween?.stop();
    this.bannerTween = undefined;
    this.resetBossBarState(1);
    this.chipRow = [];
    this.statusRow = [];
    this.slots?.destroy();
    this.slots = undefined;
    if (this.gameEvents) {
      this.gameEvents.off(GameEvents.HpChanged, this.onHp, this);
      this.gameEvents.off(GameEvents.TimerTick, this.onTimer, this);
      this.gameEvents.off(GameEvents.CoinsChanged, this.onCoins, this);
      this.gameEvents.off(GameEvents.PowersChanged, this.onPowers, this);
      this.gameEvents.off(GameEvents.ArmourChanged, this.onArmour, this);
      this.gameEvents.off(GameEvents.PowerStoreChanged, this.onPowerStore, this);
      this.gameEvents.off(GameEvents.PlayerStatus, this.onPlayerStatus, this);
      this.gameEvents.off(GameEvents.BossWarning, this.onBossWarning, this);
      this.gameEvents.off(GameEvents.BossSpawned, this.onBossSpawned, this);
      this.gameEvents.off(GameEvents.BossHpChanged, this.onBossHp, this);
      this.gameEvents.off(GameEvents.BossDefeated, this.onBossDefeated, this);
      this.gameEvents.off(Phaser.Scenes.Events.PAUSE, this.onGamePaused, this);
      this.gameEvents.off(Phaser.Scenes.Events.RESUME, this.onGameResumed, this);
      this.gameEvents = undefined;
    }
  }
}
