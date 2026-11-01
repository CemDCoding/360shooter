// Application menu template of the desktop shell (AP-124, PE-146, PE-147).
// Pure functions where possible, so they can be tested without Electron running.
import type { Input, MenuItemConstructorOptions } from 'electron';

export const PHONE_SHORTCUT = 'CmdOrCtrl+H';

export interface MenuActions {
  readonly toggleFullScreen: () => void;
  readonly openPhoneDialog: () => void;
}

export interface MenuInput {
  readonly isPackaged: boolean;
  readonly actions: MenuActions;
}

export function buildMenuTemplate(input: MenuInput): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Spiel',
      submenu: [
        {
          label: 'Handy-Zugriff…',
          accelerator: PHONE_SHORTCUT,
          click: () => input.actions.openPhoneDialog(),
        },
        {
          label: 'Vollbild umschalten',
          accelerator: 'F11',
          click: () => input.actions.toggleFullScreen(),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Beenden' },
      ],
    },
  ];
  if (!input.isPackaged) {
    template.push({
      label: 'Entwicklung',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }],
    });
  }
  return template;
}

/** Ctrl+H (Cmd+H on macOS) opens the phone dialog, also in full screen where the menu bar is hidden. */
export function isPhoneShortcut(
  input: Pick<Input, 'type' | 'key' | 'alt' | 'control' | 'meta' | 'shift' | 'isAutoRepeat'>,
  platform: string = process.platform,
): boolean {
  const modifier = platform === 'darwin' ? input.meta : input.control;
  const otherModifier = platform === 'darwin' ? input.control : input.meta;
  return (
    input.type === 'keyDown' &&
    input.key.toLowerCase() === 'h' &&
    !input.isAutoRepeat &&
    modifier &&
    !otherModifier &&
    !input.alt &&
    !input.shift
  );
}

export function formatAddress(ip: string, port: number): string {
  return `http://${ip}:${port}`;
}

export interface PhoneDialogState {
  readonly running: boolean;
  readonly addresses: readonly string[];
}

export function phoneStatusText(state: PhoneDialogState): string {
  if (!state.running) return 'Handy-Zugriff ist aus.';
  if (state.addresses.length === 0) {
    return 'Handy-Zugriff ist an, aber es wurde kein privates Netzwerk (WLAN/LAN) gefunden. Verbinde den PC mit deinem WLAN und starte den Zugriff neu.';
  }
  return `Handy-Zugriff ist an. Öffne am Handy eine dieser Adressen:\n${state.addresses.join('\n')}`;
}

export const PHONE_HINT = 'Nur im selben WLAN. Keine Portfreigabe im Router einrichten.';

export const PORT_IN_USE_TEXT =
  'Der Port ist schon belegt. Vermutlich läuft das Spiel bereits ein zweites Mal oder ein anderes Programm nutzt ihn. Schließe es und versuche es erneut.';

export const START_FAILED_TEXT = 'Der Handy-Zugriff konnte nicht gestartet werden.';

export function phoneButtons(running: boolean): string[] {
  return [running ? 'Stoppen' : 'Starten', 'Schließen'];
}
