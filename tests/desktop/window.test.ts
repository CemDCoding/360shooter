import { describe, expect, it } from 'vitest';
import {
  WINDOW_BACKGROUND,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  createWindowOptions,
  isFullscreenToggle,
  menuBarVisible,
} from '../../desktop/window';

const key = {
  type: 'keyDown',
  key: 'F11',
  alt: false,
  control: false,
  meta: false,
  shift: false,
  isAutoRepeat: false,
} as const;

describe('createWindowOptions (AP-121)', () => {
  it('enables the §5 hardening options', () => {
    for (const isPackaged of [true, false]) {
      const wp = createWindowOptions({ isPackaged }).webPreferences;
      expect(wp).toBeDefined();
      expect(wp?.contextIsolation).toBe(true);
      expect(wp?.nodeIntegration).toBe(false);
      expect(wp?.nodeIntegrationInWorker).toBe(false);
      expect(wp?.nodeIntegrationInSubFrames).toBe(false);
      expect(wp?.sandbox).toBe(true);
      expect(wp?.webSecurity).toBe(true);
      expect(wp?.allowRunningInsecureContent).toBe(false);
      expect(wp?.webviewTag).toBe(false);
      expect(wp?.navigateOnDragDrop).toBe(false);
      expect(wp && 'preload' in wp).toBe(false);
    }
  });

  it('allows DevTools only when not packaged', () => {
    expect(createWindowOptions({ isPackaged: true }).webPreferences?.devTools).toBe(false);
    expect(createWindowOptions({ isPackaged: false }).webPreferences?.devTools).toBe(true);
  });

  it('starts in full screen with a 1280x720 resizable window behind it (PE-146)', () => {
    const o = createWindowOptions({ isPackaged: true });
    expect(o.fullscreen).toBe(true);
    expect(o.fullscreenable).toBe(true);
    expect(o.width).toBe(WINDOW_WIDTH);
    expect(o.height).toBe(WINDOW_HEIGHT);
    expect([o.width, o.height]).toEqual([1280, 720]);
    expect(o.resizable).toBe(true);
    expect(o.minWidth).toBeGreaterThan(0);
    expect(o.minHeight).toBeGreaterThan(0);
    expect(o.minWidth).toBeLessThanOrEqual(1280);
    expect(o.minHeight).toBeLessThanOrEqual(720);
  });

  it('uses the menu background colour', () => {
    expect(createWindowOptions({ isPackaged: true }).backgroundColor).toBe(WINDOW_BACKGROUND);
    expect(WINDOW_BACKGROUND).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('isFullscreenToggle', () => {
  it('reacts to a plain F11 key down', () => {
    expect(isFullscreenToggle(key)).toBe(true);
  });

  it('ignores key up, repeats, modifiers and other keys', () => {
    expect(isFullscreenToggle({ ...key, type: 'keyUp' })).toBe(false);
    expect(isFullscreenToggle({ ...key, isAutoRepeat: true })).toBe(false);
    expect(isFullscreenToggle({ ...key, alt: true })).toBe(false);
    expect(isFullscreenToggle({ ...key, control: true })).toBe(false);
    expect(isFullscreenToggle({ ...key, shift: true })).toBe(false);
    expect(isFullscreenToggle({ ...key, meta: true })).toBe(false);
    expect(isFullscreenToggle({ ...key, key: 'F12' })).toBe(false);
  });
});

describe('menuBarVisible', () => {
  it('shows the menu bar in the window and hides it in full screen', () => {
    expect(menuBarVisible(false)).toBe(true);
    expect(menuBarVisible(true)).toBe(false);
  });
});
