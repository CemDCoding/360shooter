// Phone access dialog (AP-124, PE-147, PE-150). A native message box: no own window, no renderer.
// The server is off after program start, nothing is stored, and it stops on quit.
import { dialog } from 'electron';
import type { BrowserWindow, MessageBoxOptions } from 'electron';
import { PHONE_SERVER_PORT, PhoneServerError, startPhoneServer } from './phoneServer.js';
import type { PhoneServer } from './phoneServer.js';
import {
  PHONE_HINT,
  PORT_IN_USE_TEXT,
  START_FAILED_TEXT,
  phoneButtons,
  phoneStatusText,
} from './menu.js';

let server: PhoneServer | null = null;
let dialogOpen = false;

export async function stopPhoneAccess(): Promise<void> {
  const current = server;
  server = null;
  if (current) await current.stop();
}

export async function showPhoneDialog(parent: BrowserWindow | null, root: string): Promise<void> {
  if (dialogOpen) return;
  dialogOpen = true;
  try {
    let notice = '';
    for (;;) {
      const running = server !== null;
      const detail = [
        phoneStatusText({ running, addresses: server?.addresses ?? [] }),
        notice,
        PHONE_HINT,
      ]
        .filter((part) => part !== '')
        .join('\n\n');
      notice = '';
      const options: MessageBoxOptions = {
        type: 'info',
        title: 'Handy-Zugriff',
        message: 'Auf dem Handy spielen',
        detail,
        buttons: phoneButtons(running),
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      };
      const result = parent
        ? await dialog.showMessageBox(parent, options)
        : await dialog.showMessageBox(options);
      if (result.response !== 0) return;
      if (running) {
        await stopPhoneAccess();
      } else {
        try {
          server = await startPhoneServer({ root, port: PHONE_SERVER_PORT });
        } catch (error) {
          notice =
            error instanceof PhoneServerError && error.code === 'port-in-use'
              ? PORT_IN_USE_TEXT
              : START_FAILED_TEXT;
        }
      }
    }
  } finally {
    dialogOpen = false;
  }
}
