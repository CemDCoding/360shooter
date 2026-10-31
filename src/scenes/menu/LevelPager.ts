import Phaser from 'phaser';
import { THEME, type ColorName } from '../../config/theme';
import { drawBevel, drawRing, kText, textWidth, type KText } from './kassette';
import { arrowStates, pageIndicator, pagerShowsKeys } from './menuLogic';

/** Size of the pager bar (x 216..624, y 316, height 32 in the 640x360 layout). */
export const PAGER_WIDTH = 408;
export const PAGER_HEIGHT = 32;
const ARROW = THEME.sizePx['size.target'];
const GAP = 8;
const SPOOL = 8;
const PART_GAP = 6;

export interface PagerPage {
  /** e.g. "SEITE A" */
  label: string;
  /** e.g. "0-20" */
  range: string;
}

type KeyKind = 'prev' | 'next' | 'page';

/** One key of the pager: arrow or page key. Raised like `k-btn`, sunken when inactive. */
class PagerKey extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly texts: KText[] = [];
  private enabled = true;
  private lit = false;
  private hover = false;
  private pressed = false;
  private focused = false;
  private layout = { left: 0, right: 0, labelX: 0, rangeX: 0 };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly keyW: number,
    private readonly kind: KeyKind,
    private readonly page: PagerPage | null,
    onClick: () => void,
  ) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.add(this.g);
    if (page) {
      const label = kText(scene, 0, 0, page.label, 2, 'menu.text', 0, 0.5);
      const range = kText(scene, 0, 1, page.range, 1, 'menu.text-muted', 0, 0.5);
      // group (spool, label, range, spool) centred in the key, parts 6 px apart
      const lw = textWidth(label);
      const rw = textWidth(range);
      const total = 2 * SPOOL + 3 * PART_GAP + lw + rw;
      const start = Math.round(-total / 2);
      const labelX = start + SPOOL + PART_GAP;
      const rangeX = labelX + lw + PART_GAP;
      this.layout = { left: start, right: rangeX + rw + PART_GAP, labelX, rangeX };
      this.texts.push(label, range);
      this.add([label, range]);
    }
    this.setSize(keyW, PAGER_HEIGHT);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.set({ hover: true }));
    this.on('pointerout', () => this.set({ hover: false, pressed: false }));
    this.on('pointerdown', () => this.set({ pressed: true }));
    this.on('pointerup', () => {
      const was = this.pressed;
      this.set({ pressed: false });
      if (this.enabled && was) onClick();
    });
    this.render();
    scene.add.existing(this);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get isLit(): boolean {
    return this.lit;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.hover = false;
      this.pressed = false;
    }
    // no hand cursor on a disabled key
    if (this.input) this.input.cursor = enabled ? 'pointer' : '';
    this.render();
  }

  /** Focus ring (2 px, gap 2) around the key. */
  setFocused(focused: boolean): void {
    this.focused = focused;
    this.render();
  }

  setLit(lit: boolean): void {
    this.lit = lit;
    this.render();
  }

  private set(next: { hover?: boolean; pressed?: boolean }): void {
    if (!this.enabled) return;
    this.hover = next.hover ?? this.hover;
    this.pressed = next.pressed ?? this.pressed;
    this.render();
  }

  private render(): void {
    const g = this.g.clear();
    const w = this.keyW;
    const h = PAGER_HEIGHT;
    const sunken = this.kind === 'page' && !this.lit;
    const press = this.enabled && this.pressed ? THEME.spacePx['space.half'] : 0;
    const x = -w / 2 + press;
    const y = -h / 2 + press;
    if (!this.enabled) {
      drawBevel(
        g,
        x,
        y,
        w,
        h,
        { fill: 'menu.locked-bg', hi: 'menu.locked-bg', lo: 'menu.locked-bg' },
        false,
      );
    } else if (sunken) {
      const fill: ColorName = this.hover ? 'menu.surface-sunken-hi' : 'menu.surface-sunken';
      drawBevel(
        g,
        x,
        y,
        w,
        h,
        { fill, hi: 'menu.surface-sunken-hi', lo: 'menu.surface-lo' },
        false,
      );
    } else if (press) {
      drawBevel(
        g,
        x,
        y,
        w,
        h,
        { fill: 'menu.surface', hi: 'menu.surface-lo', lo: 'menu.surface-lo' },
        false,
      );
    } else {
      const fill: ColorName = this.hover ? 'menu.surface-hi' : 'menu.surface';
      drawBevel(g, x, y, w, h, { fill, hi: 'menu.surface-hi', lo: 'menu.surface-lo' });
    }
    if (this.focused && this.enabled) {
      drawRing(g, -w / 2, -h / 2, w, h, THEME.spacePx['space.half'], 'menu.focus');
    }
    if (this.kind === 'page') {
      this.renderPage(g, x, y, press);
    } else {
      const color: ColorName = this.enabled ? 'menu.text' : 'menu.text-disabled';
      drawArrowAt(g, press, press, this.kind === 'prev' ? -1 : 1, color);
    }
  }

  private renderPage(g: Phaser.GameObjects.Graphics, x: number, y: number, press: number): void {
    const cy = y + PAGER_HEIGHT / 2;
    const cx = x + this.keyW / 2;
    const fill: ColorName = this.lit ? 'menu.action-bg' : 'menu.surface-sunken';
    const spool = (sx: number): void => {
      g.fillStyle(THEME.colors['menu.outline'].num).fillRect(sx, cy - SPOOL / 2, SPOOL, SPOOL);
      g.fillStyle(THEME.colors[fill].num).fillRect(
        sx + 1,
        cy - SPOOL / 2 + 1,
        SPOOL - 2,
        SPOOL - 2,
      );
    };
    spool(cx + this.layout.left);
    spool(cx + this.layout.right);
    const color: ColorName = this.lit ? 'menu.text' : 'menu.text-muted';
    this.texts[0]?.setPosition(this.layout.labelX + press, press);
    this.texts[1]?.setPosition(this.layout.rangeX + press, press + 1);
    for (const t of this.texts) {
      if (t instanceof Phaser.GameObjects.BitmapText) {
        t.setTint(THEME.colors[t === this.texts[0] ? color : 'menu.text-muted'].num);
      }
    }
    if (this.lit) {
      // small triangle above the key points up at the panel (second cue besides colour)
      // 5 rows end at y 309, 1 px above the focus ring (y 310)
      const top = -PAGER_HEIGHT / 2 - 11;
      for (let row = 0; row < 5; row++) {
        const half = row;
        g.fillStyle(THEME.colors['menu.focus'].num).fillRect(-half, top + row, half * 2 + 1, 1);
      }
    }
  }
}

function drawArrowAt(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  dir: -1 | 1,
  color: ColorName,
): void {
  g.fillStyle(THEME.colors[color].num);
  for (let i = 0; i < 5; i++) {
    const h = 2 * i + 1;
    const x = dir === -1 ? -3 + i : 2 - i;
    g.fillRect(ox + x, oy - Math.floor(h / 2), 1, h);
  }
}

/**
 * Pager bar below the level panel: arrow, one key per page, arrow. From 10 pages on, the keys
 * give way to the text "SEITE x / n". x, y is the top left corner of the bar.
 */
export class LevelPager extends Phaser.GameObjects.Container {
  private readonly total: number;
  private readonly keys: PagerKey[] = [];
  private prevKey: PagerKey;
  private nextKey: PagerKey;
  private indicator: KText | null = null;
  private page: number;
  private focusVisible = false;
  private readonly onSelect: (page: number) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pages: readonly PagerPage[],
    page: number,
    onSelect: (page: number) => void,
  ) {
    super(scene, x, y);
    this.total = Math.max(1, pages.length);
    this.page = page;
    this.onSelect = onSelect;
    const cy = PAGER_HEIGHT / 2;
    this.prevKey = new PagerKey(scene, ARROW / 2, cy, ARROW, 'prev', null, () =>
      this.onSelect(this.page - 1),
    );
    this.nextKey = new PagerKey(scene, PAGER_WIDTH - ARROW / 2, cy, ARROW, 'next', null, () =>
      this.onSelect(this.page + 1),
    );
    this.add([this.prevKey, this.nextKey]);
    const innerLeft = ARROW + GAP;
    const innerW = PAGER_WIDTH - 2 * (ARROW + GAP);
    if (pagerShowsKeys(this.total)) {
      const keyW = Math.floor((innerW - (this.total - 1) * GAP) / this.total);
      pages.forEach((p, i) => {
        const key = new PagerKey(
          scene,
          innerLeft + i * (keyW + GAP) + keyW / 2,
          cy,
          keyW,
          'page',
          p,
          () => this.onSelect(i),
        );
        this.keys.push(key);
        this.add(key);
      });
    } else {
      this.indicator = kText(scene, innerLeft + innerW / 2, cy, '', 2, 'menu.text', 0.5, 0.5);
      this.add(this.indicator);
    }
    this.setPage(page);
    scene.add.existing(this);
  }

  /** Shows the page: active key, arrows disabled on the first and last page. */
  setPage(page: number): void {
    this.page = page;
    const arrows = arrowStates(page, this.total);
    this.prevKey.setEnabled(arrows.prev);
    this.nextKey.setEnabled(arrows.next);
    this.keys.forEach((k, i) => {
      k.setLit(i === page);
      k.setFocused(this.focusVisible && i === page);
    });
    if (this.indicator) {
      this.indicator.setText(pageIndicator(page, this.total).toUpperCase());
    }
  }

  /** Shows the focus ring on the active page key (after the first keyboard use). */
  showFocus(): void {
    this.focusVisible = true;
    this.setPage(this.page);
  }

  /** State per key for tests and checks: 'active' | 'inactive'. */
  keyStates(): ('active' | 'inactive')[] {
    return this.keys.map((k) => (k.isLit ? 'active' : 'inactive'));
  }

  get arrowEnabled(): { prev: boolean; next: boolean } {
    return { prev: this.prevKey.isEnabled, next: this.nextKey.isEnabled };
  }
}
