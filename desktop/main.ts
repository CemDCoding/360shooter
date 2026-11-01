// Electron main process of the desktop shell (AP-121, PE-145, PE-146, PE-149).
// Loads the unchanged Vite build (dist/) via app://game/, starts in full screen, F11 toggles.
// Hardening (§5): context isolation, sandbox, no Node in the renderer, no preload, no
// navigation, no new windows, no requests outside the own scheme, CSP, DevTools only unpacked.
import { app, BrowserWindow, Menu, protocol, session } from 'electron';
import {
  APP_SCHEME,
  APP_SCHEME_PRIVILEGES,
  APP_START_URL,
  handleAppRequest,
  isAllowedRequestUrl,
} from './appProtocol.js';
import { buildMenuTemplate, isPhoneShortcut } from './menu.js';
import { distDir } from './paths.js';
import { showPhoneDialog, stopPhoneAccess } from './phoneDialog.js';
import { createWindowOptions, isFullscreenToggle, menuBarVisible } from './window.js';

const APP_NAME = '360shooter';

app.setName(APP_NAME);

protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: APP_SCHEME_PRIVILEGES }]);

let mainWindow: BrowserWindow | null = null;

function toggleFullScreen(win: BrowserWindow): void {
  win.setFullScreen(!win.isFullScreen());
}

function openPhone(): void {
  void showPhoneDialog(mainWindow, distDir(app.getAppPath()));
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate(
    buildMenuTemplate({
      isPackaged: app.isPackaged,
      actions: {
        toggleFullScreen: () => {
          if (mainWindow) toggleFullScreen(mainWindow);
        },
        openPhoneDialog: openPhone,
      },
    }),
  );
}

function hardenSession(): void {
  const ses = session.defaultSession;
  const allowDevtools = !app.isPackaged;
  ses.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedRequestUrl(details.url, allowDevtools) });
  });
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'fullscreen');
  });
  ses.setPermissionCheckHandler((_wc, permission) => permission === 'fullscreen');
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow(createWindowOptions({ isPackaged: app.isPackaged }));
  win.setMenuBarVisibility(menuBarVisible(true));

  win.on('enter-full-screen', () => win.setMenuBarVisibility(menuBarVisible(true)));
  win.on('leave-full-screen', () => win.setMenuBarVisibility(menuBarVisible(false)));
  win.webContents.on('before-input-event', (event, input) => {
    if (isFullscreenToggle(input)) {
      event.preventDefault();
      toggleFullScreen(win);
    } else if (isPhoneShortcut(input)) {
      event.preventDefault();
      openPhone();
    }
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    mainWindow = null;
  });

  void win.loadURL(APP_START_URL);
  return win;
}

// Applies to every web contents, also ones we never create on purpose.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.on('will-redirect', (event) => event.preventDefault());
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => {
    void stopPhoneAccess();
  });

  void app.whenReady().then(() => {
    const root = distDir(app.getAppPath());
    protocol.handle(APP_SCHEME, (request) => handleAppRequest(request, root));
    hardenSession();
    Menu.setApplicationMenu(buildMenu());
    mainWindow = createMainWindow();
  });
}
