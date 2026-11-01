// Window options of the desktop shell (AP-121, PE-146, PE-149). Pure functions, no Electron
// runtime import, so the security options are unit-testable.
import type { BrowserWindowConstructorOptions, Input } from 'electron';

export const WINDOW_WIDTH = 1280;
export const WINDOW_HEIGHT = 720;
export const WINDOW_MIN_WIDTH = 960;
export const WINDOW_MIN_HEIGHT = 540;

/** Menu background (--color-menu-bg / plum-900). Constant on purpose: desktop/ imports nothing from src/. */
export const WINDOW_BACKGROUND = '#1a0f24';

export const WINDOW_TITLE = '360shooter';

export interface WindowOptionsInput {
  /** app.isPackaged: DevTools only in development. */
  readonly isPackaged: boolean;
}

export function createWindowOptions(input: WindowOptionsInput): BrowserWindowConstructorOptions {
  return {
    title: WINDOW_TITLE,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    resizable: true,
    fullscreen: true,
    fullscreenable: true,
    autoHideMenuBar: false,
    backgroundColor: WINDOW_BACKGROUND,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      navigateOnDragDrop: false,
      spellcheck: false,
      devTools: !input.isPackaged,
    },
  };
}

/** F11 toggles between full screen and window (PE-146). Only the key down, no modifiers, no repeat. */
export function isFullscreenToggle(
  input: Pick<Input, 'type' | 'key' | 'alt' | 'control' | 'meta' | 'shift' | 'isAutoRepeat'>,
): boolean {
  return (
    input.type === 'keyDown' &&
    input.key === 'F11' &&
    !input.isAutoRepeat &&
    !input.alt &&
    !input.control &&
    !input.meta &&
    !input.shift
  );
}

/** Menu bar visible in the window, hidden in full screen (PE-146). */
export function menuBarVisible(isFullScreen: boolean): boolean {
  return !isFullScreen;
}
