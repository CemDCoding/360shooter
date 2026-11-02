import Phaser from 'phaser';
import { LEVELS, PROGRESSION } from '../config';
import { ARENA } from '../config/arena';
import { THEME } from '../config/theme';
import type { SaveGame } from '../contracts';
import { levelForXp, xpForLevel } from '../logic/progression';
import { addMuteButton, getSoundService } from '../platform/audio';
import { prefersReducedMotion } from '../platform/motion';
import { loadSave, resetSave } from '../platform/storage';
import { isValidLevelId } from './debug';
import { insetContentOffset, liftForBottom, readSafeInsets } from './safeInsets';
import { Button } from './menu/Button';
import { openGearPanel } from './menu/GearPanel';
import { GearPreview } from './menu/GearPreview';
import { openShopPanel } from './menu/ShopPanel';
import { CARD_FOCUS_ORDER, cardRows, stepCardFocus, suitLine, weaponLine } from './menu/homeLogic';
import { ConfirmDialog } from './menu/ConfirmDialog';
import { UpgradePanel } from './menu/UpgradePanel';
import { GRID_HEIGHT, GRID_WIDTH, LevelGrid } from './menu/LevelGrid';
import { LevelPager } from './menu/LevelPager';
import {
  drawBar,
  drawBevel,
  drawDashedRule,
  drawRing,
  kText,
  textWidth,
  type KText,
} from './menu/kassette';
import { isLevelUnlocked, pageCount, xpFraction } from './menu/levelGroups';
import {
  PAGE_SLIDE_MS,
  PAGE_SLIDE_STEPS,
  clampPage,
  isFreshSave,
  pageLabel,
  pageNote,
  pageRange,
  slideOffsets,
  startPage,
  stepPage,
  swipeDirection,
} from './menu/menuLogic';

// Layout nach docs/design/mockups/hauptmenue.html (logische Pixel 640x360)
const PROFILE = { x: 16, y: 52, w: 184, h: 252, pad: 12 };
const GRID = { x: 216, y: 52 };
/** Pager bar under the panel, same row as the reset button. */
const PAGER_Y = 316;
/** Lowest edge of the menu controls (pager bar y 316 + 32, reset button 332 + 16). */
const MENU_LOWEST = 348;
/** Hint line in the header: right aligned up to x 584 (56 px left of the edge), y 22. */
const NOTE_RIGHT = 56;
const NOTE_Y = 22;

/** Alle Waffen- und Anzug-Stufen als Summen für die Porträt-Karte. */
function upgradeSums(save: SaveGame): { weapon: number; suit: number } {
  const u = save.upgrades;
  const weapon = (u?.weaponFireRate ?? 0) + (u?.weaponDamage ?? 0);
  const suit = (u?.playerMaxHp ?? 0) + (u?.playerTurnSpeed ?? 0);
  return { weapon, suit };
}

export class MenuScene extends Phaser.Scene {
  private dialog: ConfirmDialog | null = null;
  private panel: UpgradePanel | null = null;
  private goldText: KText | null = null;
  private goldLabel: KText | null = null;
  private weaponText: KText | null = null;
  private suitText: KText | null = null;
  private diamondText: KText | null = null;
  private diamondShadow: KText | null = null;
  private diamondIcon: Phaser.GameObjects.Image | null = null;
  private preview: GearPreview | null = null;
  private portraitRing: Phaser.GameObjects.Graphics | null = null;
  private shopButton: Button | null = null;
  private upgradeButton: Button | null = null;
  /** Open shop or gear window (they destroy themselves through their close callback). */
  private modal: Phaser.GameObjects.Container | null = null;
  /** Keyboard focus on the card (index into CARD_FOCUS_ORDER), -1 = none. */
  private cardFocus = -1;
  private won: number[] = [];
  private starting = false;
  private grid: LevelGrid | null = null;
  private pager: LevelPager | null = null;
  private noteText: KText | null = null;
  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private page = 0;
  private pageTotal = 1;
  private highest = 0;
  private fresh = false;
  private sliding = false;
  /** Horizontal shift that centres the 640 layout (PE-102). */
  private ox = 0;
  /** Upward shift of the layout so the lowest row clears the home bar (RS-02). */
  private lift = 0;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.dialog = null;
    this.panel = null;
    this.modal = null;
    this.cardFocus = -1;
    this.starting = false;
    getSoundService(this.game).reload();
    const save = loadSave();
    this.won = [...(save.wonLevels ?? [])];
    // RS-02: centred 640 layout, kept out of the side insets; lifted if the lowest row (pager, reset) would reach the home bar.
    const ins = readSafeInsets(this.registry);
    this.ox = insetContentOffset(this.scale.width, ARENA.baseWidth, ins);
    this.lift = liftForBottom(this.scale.height, MENU_LOWEST, ins.bottom);
    this.cameras.main.setScroll(0, this.lift);
    const ox = this.ox;
    const right = ox + ARENA.baseWidth;

    this.drawBackground();
    this.drawLogo();
    this.drawProfile(save);

    this.highest = save.highestUnlockedLevel;
    this.fresh = isFreshSave(save);
    this.pageTotal = pageCount(LEVELS);
    this.page = clampPage(startPage(LEVELS, this.highest), this.pageTotal);
    this.sliding = false;
    this.grid = this.makeGrid(this.page);
    this.pager = new LevelPager(
      this,
      ox + GRID.x,
      PAGER_Y,
      Array.from({ length: this.pageTotal }, (_, p) => ({
        label: pageLabel(p),
        range: pageRange(LEVELS, p),
      })),
      this.page,
      (p) => this.goToPage(p),
    );
    this.setupPageInput();

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

    this.noteText = kText(this, right - NOTE_RIGHT, NOTE_Y, '', 1, 'menu.text-muted', 1, 0);
    this.updateNote();

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
      this.diamondText = null;
      this.diamondShadow = null;
      this.diamondIcon = null;
      this.preview = null;
      this.portraitRing = null;
      this.shopButton = null;
      this.upgradeButton = null;
      this.modal?.destroy();
      this.modal = null;
      this.grid = null;
      this.pager = null;
      this.maskShape?.destroy();
      this.maskShape = null;
      this.noteText = null;
      this.input.off('pointerup', this.onPointerUp, this);
      this.input.keyboard?.off('keydown', this.onKeyDown, this);
    });
  }

  private makeGrid(page: number): LevelGrid {
    return new LevelGrid(
      this,
      this.ox + GRID.x,
      GRID.y,
      this.highest,
      (id) => this.pickLevel(id),
      page,
      this.won,
    );
  }

  /** A dialog, the upgrade panel, the shop or the gear window is open. */
  private blocked(): boolean {
    return Boolean(this.dialog || this.panel || this.modal);
  }

  /** A tile tap only counts if the pointer did not travel like a swipe. */
  private pickLevel(id: number): void {
    const p = this.input.activePointer;
    if (swipeDirection(p.x - p.downX) !== 0) return;
    this.startLevel(id, this.highest);
  }

  private setupPageInput(): void {
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.keyboard?.on('keydown', this.onKeyDown, this);
  }

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    const x = this.ox + GRID.x;
    const inside =
      pointer.downX >= x &&
      pointer.downX <= x + GRID_WIDTH &&
      pointer.downY + this.lift >= GRID.y &&
      pointer.downY + this.lift <= GRID.y + GRID_HEIGHT;
    if (!inside || this.blocked()) return;
    const dir = swipeDirection(pointer.upX - pointer.downX);
    if (dir !== 0) this.goToPage(stepPage(this.page, dir, this.pageTotal));
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.blocked()) return;
    if (e.code === 'Tab') {
      e.preventDefault();
      this.cardFocus = stepCardFocus(this.cardFocus, e.shiftKey ? -1 : 1);
      this.applyCardFocus();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'Space') && this.cardFocus >= 0) {
      e.preventDefault();
      this.activateCard(CARD_FOCUS_ORDER[this.cardFocus]);
      return;
    }
    if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return;
    this.pager?.showFocus();
    this.goToPage(stepPage(this.page, e.code === 'ArrowLeft' ? -1 : 1, this.pageTotal));
  };

  /** Shows the hint line for the current page (locked page note, welcome or tap hint). */
  private updateNote(): void {
    const note = pageNote(LEVELS, this.page, this.highest, this.fresh);
    this.noteText?.setText(note.text.toUpperCase());
    if (this.noteText instanceof Phaser.GameObjects.BitmapText) {
      this.noteText.setTint(THEME.colors[note.strong ? 'menu.text' : 'menu.text-muted'].num);
    }
    this.noteText?.setX(this.ox + ARENA.baseWidth - NOTE_RIGHT);
  }

  /** Turns to a page: 4 steps over 200 ms, instantly with reduced motion. */
  private goToPage(target: number): void {
    const next = clampPage(target, this.pageTotal);
    if (this.sliding || next === this.page || this.blocked() || !this.grid) return;
    const dir: 1 | -1 = next > this.page ? 1 : -1;
    const old = this.grid;
    const baseX = this.ox + GRID.x;
    this.page = next;
    this.pager?.setPage(next);
    this.updateNote();
    this.grid = this.makeGrid(next);
    const fresh = this.grid;
    const distance = GRID_WIDTH + 16;
    const offsets = slideOffsets(distance, dir, prefersReducedMotion());
    if (offsets.length <= 1) {
      old.destroy();
      return;
    }
    this.sliding = true;
    // panel plus its 4 px shadow and 2 px outline: 6 px margin
    const shape = this.make.graphics({}, false);
    this.maskShape = shape;
    shape
      .fillStyle(THEME.colors['menu.text'].num)
      .fillRect(baseX - 6, GRID.y - 6, GRID_WIDTH + 12, GRID_HEIGHT + 12);
    const mask = shape.createGeometryMask();
    old.setMask(mask);
    fresh.setMask(mask);
    const stepMs = PAGE_SLIDE_MS / PAGE_SLIDE_STEPS;
    const place = (offset: number): void => {
      fresh.setX(baseX + offset);
      old.setX(baseX + offset - dir * distance);
    };
    place(dir * distance);
    offsets.forEach((offset, i) => {
      this.time.delayedCall(stepMs * (i + 1), () => {
        place(offset);
        if (i === offsets.length - 1) {
          old.destroy();
          fresh.clearMask();
          mask.destroy();
          shape.destroy();
          this.maskShape = null;
          this.sliding = false;
        }
      });
    });
  }

  /** Sternenhimmel und Planet (nur Tokens: Planet in Pflaume, Sterne in Creme und Koralle). */
  private drawBackground(): void {
    const { width, height } = this.scale;
    // Full-screen backdrop: does not move with the lifted camera.
    const g = this.add.graphics().setScrollFactor(0);
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
    this.buildPreview(save, px + 32, py + 32);
    this.makePortraitButton(px, py);

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
    const { goldY, weaponY, shopY, upgradesY: upY } = cardRows(y, h, pad);
    if (this.textures.exists('coin-small'))
      this.add.image(left + 8, goldY, 'coin-small', 0).setScale(2);
    this.goldText = kText(this, left + 22, goldY - 7, String(save.gold ?? 0), 2, 'menu.gold');
    this.goldLabel = kText(this, 0, goldY - 3, 'Gold', 1, 'menu.text-muted');
    // Diamanten rechts in derselben Zeile: Raute 2x, Zahl 2x mit Schatten
    this.diamondShadow = kText(this, right + 2, goldY - 7 + 2, '0', 2, 'menu.outline', 1, 0);
    this.diamondText = kText(this, right, goldY - 7, '0', 2, 'menu.diamond', 1, 0);
    if (this.textures.exists('diamond'))
      this.diamondIcon = this.add.image(0, goldY, 'diamond', 0).setScale(2);

    // Waffe und Anzug in einer Zeile
    const sums = upgradeSums(save);
    this.weaponText = kText(this, left, weaponY - 3, weaponLine(sums.weapon), 1, 'menu.text-muted');
    this.suitText = kText(
      this,
      right,
      weaponY - 3,
      suitLine(sums.suit),
      1,
      'menu.text-muted',
      1,
      0,
    );

    // SHOP (sekundär) über UPGRADES (primär), 12 Abstand, Tab-Reihenfolge: Porträt, SHOP, UPGRADES
    const leading = this.textures.exists('diamond') ? { key: 'diamond', frame: 0 } : undefined;
    this.shopButton = new Button(this, x + w / 2, shopY, 'Shop', () => this.openShop(), {
      variant: 'secondary',
      width: innerW,
      leading,
    });
    this.upgradeButton = new Button(this, x + w / 2, upY, 'Upgrades', () => this.openUpgrades(), {
      variant: 'primary',
      width: innerW,
    });
    this.setDiamonds(save.diamonds ?? 0);
  }

  /** Porträt der Karte: Astronautin mit Rüstung und aktivem Pet (Ruhe-Animation steckt in GearPreview). */
  private buildPreview(save: SaveGame, cx: number, cy: number): void {
    this.preview?.destroy();
    const pet = save.activePet ?? null;
    this.preview = new GearPreview(this, cx, cy, {
      scale: 2,
      fit: { w: 64, h: 64 },
      equipped: save.equippedGear,
      pet,
      petGear: pet ? (save.petGear?.[pet] ?? null) : null,
    });
    this.preview.setSize(64, 64);
  }

  /** Das ganze Porträt (64x64) ist der einzige Knopf für das Ausrüstungsfenster. */
  private makePortraitButton(px: number, py: number): void {
    this.add
      .zone(px + 32, py + 32, 64, 64)
      .setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.openGear());
    this.portraitRing = this.add.graphics().setDepth(3);
    this.portraitRing.setData('rect', { x: px, y: py });
  }

  /** Fokus-Ringe (Porträt in eigener Ebene, Gap 0) und Knopf-Fokus nach der Tab-Reihenfolge. */
  private applyCardFocus(): void {
    const ring = this.portraitRing;
    const at = ring?.getData('rect') as { x: number; y: number } | undefined;
    if (ring && at) {
      ring.clear();
      if (CARD_FOCUS_ORDER[this.cardFocus] === 'portrait')
        drawRing(ring, at.x, at.y, 64, 64, 0, 'menu.focus');
    }
    this.shopButton?.setFocused(CARD_FOCUS_ORDER[this.cardFocus] === 'shop');
    this.upgradeButton?.setFocused(CARD_FOCUS_ORDER[this.cardFocus] === 'upgrades');
  }

  private activateCard(target: (typeof CARD_FOCUS_ORDER)[number] | undefined): void {
    if (target === 'portrait') this.openGear();
    else if (target === 'shop') this.openShop();
    else if (target === 'upgrades') this.openUpgrades();
  }

  /** Diamanten-Zähler rechts in der Goldzeile, rechtsbündig; „GOLD“ weicht, wenn es eng wird. */
  private setDiamonds(n: number): void {
    const text = String(Math.max(0, Math.floor(n)));
    this.diamondText?.setText(text);
    this.diamondShadow?.setText(text);
    if (this.diamondText && this.diamondIcon) {
      const left = this.diamondText.x - textWidth(this.diamondText) - 4;
      this.diamondIcon.setX(Math.round(left - this.diamondIcon.displayWidth / 2));
    }
    this.placeGoldLabel();
  }

  /** „GOLD“ steht rechts neben der Zahl, auch wenn die Zahl nach einem Kauf kürzer oder länger wird. */
  private placeGoldLabel(): void {
    if (!this.goldText || !this.goldLabel) return;
    const x = Math.round(this.goldText.x + textWidth(this.goldText) + 6);
    this.goldLabel.setX(x);
    const limit = this.diamondIcon
      ? this.diamondIcon.x - this.diamondIcon.displayWidth / 2 - 4
      : Infinity;
    this.goldLabel.setVisible(x + textWidth(this.goldLabel) <= limit);
  }

  /** Nach einem Kauf oder einer Änderung: Gold, Diamanten, Summen, Waffen-Symbol und Porträt neu setzen. */
  private refreshProfile(): void {
    const save = loadSave();
    const sums = upgradeSums(save);
    this.goldText?.setText(String(save.gold ?? 0));
    this.setDiamonds(save.diamonds ?? 0);
    this.weaponText?.setText(weaponLine(sums.weapon));
    this.suitText?.setText(suitLine(sums.suit));
    const p = this.preview;
    if (p) this.buildPreview(save, p.x, p.y);
  }

  private openShop(): void {
    if (this.blocked()) return;
    this.modal = openShopPanel(this, () => this.closeModal());
  }

  private openGear(): void {
    if (this.blocked()) return;
    this.modal = openGearPanel(this, () => this.closeModal());
  }

  /** Schließt Shop oder Ausrüstung (zerstört das Fenster, hebt seine Tastatur-Listener auf) und zeichnet die Karte neu. */
  private closeModal(): void {
    this.modal?.destroy();
    this.modal = null;
    this.refreshProfile();
  }

  private openUpgrades(): void {
    if (this.blocked()) return;
    this.panel = new UpgradePanel(
      this,
      () => this.refreshProfile(),
      () => {
        this.panel?.destroy();
        this.panel = null;
      },
    );
  }

  private startLevel(levelId: number, highestUnlocked: number): void {
    if (this.starting || this.blocked()) return;
    if (!isValidLevelId(levelId) || !isLevelUnlocked(levelId, highestUnlocked)) return;
    this.starting = true;
    this.scene.start('GameScene', { levelId });
  }

  private askReset(): void {
    if (this.blocked()) return;
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
