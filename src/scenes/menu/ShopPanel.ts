import Phaser from 'phaser';
import { GEAR_SETS, GEAR_SET_LABELS } from '../../config/gear';
import { eggTextureKey, PETS, PET_IDS } from '../../config/pets';
import { gearIconIndex, getShopItem, petGearIconIndex } from '../../config/shop';
import { THEME, type ColorName } from '../../config/theme';
import type { GearSlot } from '../../contracts';
import { buy } from '../../logic/shop';
import { prefersReducedMotion } from '../../platform/motion';
import { loadSave, writeSave } from '../../platform/storage';
import { Button } from './Button';
import { drawBevel, drawRing, kText, motionMs, textWidth } from './kassette';
import {
  countDownValue,
  focusCount,
  HEAD_H,
  infoView,
  moveFocus,
  shopLayout,
  SHOP_PANEL,
  SHOP_TABS,
  tabItemIds,
  TAB_GAP,
  TAB_H,
  tileRects,
  tileView,
  type FocusKey,
  type FocusLayout,
  type Rect,
  type ShopTab,
} from './shopLogic';

/** The menu camera may be lifted a few units: the scrim reaches below the canvas (as in UpgradePanel). */
const BACKDROP_EXTRA = 64;
const SET_COLOR: Record<(typeof GEAR_SETS)[number], ColorName> = {
  diamond: 'sprite.gear-ice',
  hell: 'sprite.gear-lava',
  heaven: 'sprite.gear-gold',
};
const SLOT_HEADS: readonly { slot: GearSlot; label: string }[] = [
  { slot: 'head', label: 'KOPF' },
  { slot: 'body', label: 'OBERTEIL' },
  { slot: 'legs', label: 'HOSE+SCHUHE' },
];
const BUTTON_MIN_W = 112;

interface Focusable {
  rect: Rect;
  activate: () => void;
  button?: Button;
}

/** Modal shop: eggs, gear and pet gear; one tap on KAUFEN buys (no confirmation, F-32). */
export class ShopPanel extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly onClose: () => void;
  private readonly escKey: Phaser.Input.Keyboard.Key | null;
  private readonly onEsc = (): void => this.onClose();
  private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);
  private tabId: ShopTab = 'gear';
  private selectedId: string | null = null;
  private focusIdx = -1;
  private focusables: Focusable[] = [];
  private focusLayout: FocusLayout = { tabs: 3, tiles: 0, tileCols: 3, hasBuy: false };
  private shownDiamonds: number | null = null;
  private diamondText: Phaser.GameObjects.GameObject | null = null;
  private diamondIcon: Phaser.GameObjects.Image | null = null;
  private anim: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain | null = null;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    super(scene, 0, 0);
    this.onClose = onClose;
    this.setDepth(1100);
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

  private handleKey(e: KeyboardEvent): void {
    const key: FocusKey | null =
      e.code === 'Tab'
        ? e.shiftKey
          ? 'ShiftTab'
          : 'Tab'
        : e.code === 'ArrowLeft' ||
            e.code === 'ArrowRight' ||
            e.code === 'ArrowUp' ||
            e.code === 'ArrowDown'
          ? e.code
          : null;
    if (key) {
      e.preventDefault();
      this.focusIdx = moveFocus(this.focusIdx, key, this.focusLayout);
      this.redraw();
    } else if ((e.code === 'Enter' || e.code === 'Space') && this.focusIdx >= 0) {
      e.preventDefault();
      this.focusables[this.focusIdx]?.activate();
    }
  }

  private chooseTab(tab: ShopTab): void {
    if (tab === this.tabId) return;
    this.tabId = tab;
    this.selectedId = null;
    if (this.focusIdx >= 0) this.focusIdx = SHOP_TABS.findIndex((t) => t.id === tab);
    this.redraw();
  }

  private select(itemId: string): void {
    this.selectedId = itemId;
    // Tastaturnutzer: Fokus springt auf KAUFEN, sofern es einen Kauf gibt.
    if (this.focusIdx >= 0) {
      const info = infoView(loadSave(), itemId);
      this.focusIdx =
        info.button.kind === 'buy' ? this.focusLayout.tabs + this.focusLayout.tiles : this.focusIdx;
    }
    this.redraw();
  }

  private redraw(): void {
    const scene = this.scene;
    const save = loadSave();
    const lay = shopLayout();
    this.anim?.stop();
    this.anim = null;
    this.content.removeAll(true);
    this.focusables = [];
    const g = scene.add.graphics();
    const items: Phaser.GameObjects.GameObject[] = [g];
    const { x, y, w, h } = SHOP_PANEL;
    drawBevel(g, x, y, w, h, {
      fill: 'menu.surface',
      hi: 'menu.surface-hi',
      lo: 'menu.surface-lo',
    });

    // Kopfzeile: Reiter links, Diamanten und Schließen rechts
    const head = lay.head;
    const close = new Button(
      scene,
      head.x + head.w - 16,
      head.y + HEAD_H / 2,
      'X',
      () => this.onClose(),
      {
        scale: 2,
        width: 32,
        height: 32,
      },
    );
    items.push(close);
    this.drawDiamonds(items, save.diamonds ?? 0, head.x + head.w - 32 - 10, head.y + HEAD_H / 2);

    let tx = head.x;
    const tabFocus: Focusable[] = [];
    SHOP_TABS.forEach((tab, i) => {
      const on = tab.id === this.tabId;
      const label = kText(
        scene,
        0,
        0,
        tab.label,
        on ? 2 : 1,
        on ? 'menu.text' : 'menu.text-muted',
        0.5,
        0.5,
      );
      const tw = textWidth(label) + 16;
      const th = on ? TAB_H : TAB_H - 4;
      const ty = head.y + (HEAD_H - TAB_H) / 2 + (on ? 0 : 4);
      const rect = { x: tx, y: ty, w: tw, h: th };
      if (on) {
        drawBevel(g, rect.x, rect.y, rect.w, rect.h, {
          fill: 'menu.surface-hi',
          hi: 'menu.surface-hi',
          lo: 'menu.surface-lo',
        });
        g.fillStyle(THEME.colors['menu.focus'].num).fillTriangle(
          tx + tw / 2 - 4,
          ty + th + 2,
          tx + tw / 2 + 4,
          ty + th + 2,
          tx + tw / 2,
          ty + th + 5,
        );
      } else {
        this.sunken(g, rect);
      }
      label.setPosition(Math.round(tx + tw / 2), Math.round(ty + th / 2));
      items.push(label);
      items.push(this.zone(rect, () => this.chooseTab(tab.id)));
      tabFocus.push({ rect, activate: () => this.chooseTab(tab.id) });
      if (this.focusIdx === i) drawRing(g, rect.x, rect.y, rect.w, rect.h, 2, 'menu.focus');
      tx += tw + TAB_GAP;
    });
    this.focusables.push(...tabFocus);

    // Raster
    const ids = tabItemIds(this.tabId);
    const rects = tileRects(this.tabId, lay.grid);
    this.drawHeads(items, lay.grid, rects);
    const tilesStart = this.focusables.length;
    ids.forEach((id, i) => {
      const rect = rects[i];
      if (rect) this.drawTile(items, g, id, rect, save, tilesStart + i);
    });

    // Infozeile
    const info = infoView(save, this.selectedId);
    const ir = lay.info;
    this.sunken(g, ir);
    let nameShift = 0;
    if (info.name) {
      items.push(kText(scene, ir.x + 8, ir.y + 6, info.name, 2, 'menu.text'));
      nameShift = 22;
    }
    info.lines.forEach((line, i) => {
      items.push(
        kText(
          scene,
          ir.x + 8,
          ir.y + (nameShift ? nameShift + 2 : 18) + i * 10,
          line,
          1,
          'menu.text-muted',
        ),
      );
    });
    const hasBuy = info.button.kind === 'buy';
    if (info.button.kind !== 'none') {
      const bw = BUTTON_MIN_W;
      const cx = ir.x + ir.w - 6 - bw / 2;
      const cy = ir.y + ir.h / 2;
      let btn: Button;
      if (info.button.kind === 'buy') {
        btn = new Button(scene, cx, cy, info.button.label, () => this.buyNow(), {
          variant: 'primary',
          width: bw,
          scale: 2,
          leading: scene.textures.exists('diamond') ? { key: 'diamond', frame: 0 } : undefined,
        });
      } else if (info.button.kind === 'short') {
        btn = new Button(scene, cx, cy, info.button.label, () => undefined, {
          variant: 'secondary',
          width: bw,
          scale: 1,
        });
        btn.setEnabled(false);
      } else {
        btn = new Button(scene, cx, cy, info.button.label, () => undefined, {
          variant: 'done',
          width: bw,
          scale: 1,
          leading: scene.textures.exists('ui-icons-m8')
            ? { key: 'ui-icons-m8', frame: 1 }
            : undefined,
        });
      }
      items.push(btn);
      if (hasBuy) this.focusables.push({ rect: ir, activate: () => this.buyNow(), button: btn });
    }
    this.focusables.push({ rect: head, activate: () => this.onClose(), button: close });

    this.focusLayout = { tabs: 3, tiles: ids.length, tileCols: 3, hasBuy };
    if (this.tabId === 'egg') this.focusLayout.tileCols = 1;
    this.focusIdx = Math.min(this.focusIdx, focusCount(this.focusLayout) - 1);
    this.focusables.forEach((f, i) => f.button?.setFocused(i === this.focusIdx));
    this.content.add(items);
  }

  /** Raster-Köpfe: Spaltenköpfe und Zeilenköpfe mit Set-Farbfeld bzw. Pet-Name. */
  private drawHeads(items: Phaser.GameObjects.GameObject[], grid: Rect, rects: Rect[]): void {
    const scene = this.scene;
    if (this.tabId === 'egg') return;
    const cols =
      this.tabId === 'gear'
        ? SLOT_HEADS.map((s) => s.label)
        : GEAR_SETS.map((s) => GEAR_SET_LABELS[s]);
    cols.forEach((label, c) => {
      const r = rects[c];
      if (r) items.push(kText(scene, r.x + r.w / 2, grid.y, label, 1, 'menu.text-muted', 0.5, 0));
    });
    const g = scene.add.graphics();
    items.push(g);
    for (let row = 0; row < 3; row++) {
      const r = rects[row * 3];
      if (!r) continue;
      const midY = r.y + r.h / 2;
      if (this.tabId === 'gear') {
        const set = GEAR_SETS[row];
        if (!set) continue;
        g.fillStyle(THEME.colors['menu.outline'].num).fillRect(grid.x, midY - 7, 12, 14);
        g.fillStyle(THEME.colors[SET_COLOR[set]].num).fillRect(grid.x + 2, midY - 5, 8, 10);
        items.push(kText(scene, grid.x + 16, midY - 3, GEAR_SET_LABELS[set], 1, 'menu.text'));
      } else {
        const pet = PETS.find((p) => p.id === PET_IDS[row]);
        if (pet) items.push(kText(scene, grid.x + 2, midY - 3, pet.label, 1, 'menu.text'));
      }
    }
  }

  private drawTile(
    items: Phaser.GameObjects.GameObject[],
    g: Phaser.GameObjects.Graphics,
    itemId: string,
    r: Rect,
    save: ReturnType<typeof loadSave>,
    focusIndex: number,
  ): void {
    const scene = this.scene;
    const item = getShopItem(itemId);
    if (!item) return;
    const view = tileView(save, itemId, this.selectedId);
    const owned = view === 'owned' || view === 'selected-owned';
    if (owned) {
      drawBevel(
        g,
        r.x,
        r.y,
        r.w,
        r.h,
        { fill: 'menu.owned-bg', hi: 'menu.done-hi', lo: 'menu.done-lo' },
        false,
      );
    } else {
      this.sunken(g, r);
    }
    // Inhalt
    const priceY = this.tabId === 'egg' ? r.y + r.h - 14 : r.y + r.h / 2;
    const priceRight = r.x + r.w - 6;
    if (this.tabId === 'egg' && item.petId) {
      const pet = PETS.find((p) => p.id === item.petId);
      const key = eggTextureKey(item.petId);
      if (scene.textures.exists(key))
        items.push(scene.add.image(r.x + r.w / 2, r.y + 44, key, 0).setScale(4));
      items.push(
        kText(
          scene,
          r.x + r.w / 2,
          r.y + 84,
          pet?.label ?? '',
          2,
          owned ? 'menu.done-fg' : 'menu.text',
          0.5,
          0,
        ),
      );
      const role = infoView(save, itemId).lines[0] ?? '';
      items.push(
        kText(scene, r.x + r.w / 2, r.y + 108, owned ? '' : role, 1, 'menu.text-muted', 0.5, 0),
      );
      this.drawPrice(items, owned, item.price, r.x + r.w / 2 + 12, priceY, true);
    } else {
      const isGear = this.tabId === 'gear' && item.set && item.gearId;
      const key = isGear ? 'gear-icons' : 'petgear-icons';
      let frame = 0;
      let scale = 2;
      if (isGear && item.gearId) {
        const slot = item.gearId.split('-')[2] as GearSlot;
        frame = gearIconIndex(item.set ?? 'diamond', slot);
      } else if (item.petId && item.set) {
        frame = petGearIconIndex(item.petId, item.set);
        scale = 3;
      }
      if (scene.textures.exists(key))
        items.push(scene.add.image(r.x + 2 + 24, r.y + r.h / 2, key, frame).setScale(scale));
      this.drawPrice(items, owned, item.price, priceRight, priceY, false);
    }
    if (view === 'selected' || view === 'selected-owned')
      drawRing(g, r.x, r.y, r.w, r.h, 2, 'menu.selected');
    if (this.focusIdx === focusIndex) drawRing(g, r.x, r.y, r.w, r.h, 4, 'menu.focus');
    const act = (): void => this.select(itemId);
    items.push(this.zone(r, act));
    this.focusables.push({ rect: r, activate: act });
  }

  /** Preis (Diamant 1x + Zahl 2x) oder Haken bei gekauften Artikeln, rechtsbündig bei `x`. */
  private drawPrice(
    items: Phaser.GameObjects.GameObject[],
    owned: boolean,
    price: number,
    x: number,
    y: number,
    centered: boolean,
  ): void {
    const scene = this.scene;
    if (owned) {
      if (scene.textures.exists('ui-icons-m8')) {
        items.push(
          scene.add
            .image(centered ? x - 12 : x - 8, y, 'ui-icons-m8', 1)
            .setScale(2)
            .setTint(THEME.colors['menu.done-fg'].num),
        );
      }
      return;
    }
    const num = kText(scene, x, y - 7, String(price), 2, 'menu.diamond', centered ? 0.5 : 1, 0);
    items.push(num);
    const nw = textWidth(num);
    const right = centered ? x + nw / 2 : x;
    if (scene.textures.exists('diamond')) {
      items.push(scene.add.image(right - nw - 8, y, 'diamond', 0));
    }
  }

  private drawDiamonds(
    items: Phaser.GameObjects.GameObject[],
    diamonds: number,
    right: number,
    midY: number,
  ): void {
    const scene = this.scene;
    const label = kText(scene, right, midY - 7, String(diamonds), 2, 'menu.diamond', 1, 0);
    items.push(label);
    const nw = textWidth(label);
    this.diamondText = label;
    if (scene.textures.exists('diamond')) {
      const icon = scene.add.image(right - nw - 4 - 8, midY, 'diamond', 0).setScale(2);
      this.diamondIcon = icon;
      items.push(icon);
    } else {
      this.diamondIcon = null;
    }
    this.shownDiamonds = diamonds;
  }

  private sunken(g: Phaser.GameObjects.Graphics, r: Rect): void {
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    g.fillStyle(THEME.colors['menu.surface-sunken'].num).fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle(THEME.colors['menu.surface-lo'].num)
      .fillRect(r.x, r.y, r.w, 2)
      .fillRect(r.x, r.y, 2, r.h);
  }

  private zone(r: Rect, onTap: () => void): Phaser.GameObjects.Zone {
    const z = this.scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
    z.setInteractive({ useHandCursor: true });
    z.on('pointerup', onTap);
    return z;
  }

  /** Ein Tipp: kaufen und speichern (ein Schreibvorgang), dann Zahl herunterzählen und Diamant glänzen lassen. */
  private buyNow(): void {
    const id = this.selectedId;
    if (!id) return;
    const before = loadSave();
    const result = buy(before, id);
    if (!result.ok) {
      this.redraw();
      return;
    }
    writeSave(result.save);
    const from = before.diamonds ?? 0;
    const to = result.save.diamonds ?? 0;
    this.redraw();
    const dur = motionMs(prefersReducedMotion(), THEME.motionMs['motion.base']);
    if (dur <= 0) return;
    const text = this.diamondText;
    const icon = this.diamondIcon;
    if (text instanceof Phaser.GameObjects.BitmapText) text.setText(String(from));
    this.anim = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: dur,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        if (text instanceof Phaser.GameObjects.BitmapText && text.active) {
          text.setText(String(countDownValue(from, to, t)));
        }
        if (icon?.active) icon.setFrame(Math.min(3, 1 + Math.floor(t * 3)));
      },
      onComplete: () => {
        if (text instanceof Phaser.GameObjects.BitmapText && text.active) text.setText(String(to));
        if (icon?.active) icon.setFrame(0);
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.escKey?.off('down', this.onEsc);
    this.scene?.input.keyboard?.off('keydown', this.onKey);
    this.anim?.stop();
    super.destroy(fromScene);
  }
}

/** Öffnet das Shop-Fenster; `onClose` schließt es (der Aufrufer zerstört es). */
export function openShopPanel(scene: Phaser.Scene, onClose: () => void): ShopPanel {
  return new ShopPanel(scene, onClose);
}
