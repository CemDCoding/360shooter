import { describe, expect, it, vi } from 'vitest';
import {
  PHONE_SHORTCUT,
  buildMenuTemplate,
  formatAddress,
  isPhoneShortcut,
  phoneButtons,
  phoneStatusText,
} from '../../desktop/menu';

const actions = { toggleFullScreen: vi.fn(), openPhoneDialog: vi.fn() };

interface Item {
  label?: string;
  accelerator?: string;
  role?: string;
  click?: () => void;
}

function items(isPackaged: boolean) {
  const template = buildMenuTemplate({ isPackaged, actions });
  const game = template[0]!.submenu as Item[];
  return { template, game };
}

describe('buildMenuTemplate', () => {
  it('has phone access, fullscreen and quit with shortcuts', () => {
    const { game } = items(true);
    expect(game[0]).toMatchObject({ label: 'Handy-Zugriff…', accelerator: PHONE_SHORTCUT });
    expect(game[1]).toMatchObject({ label: 'Vollbild umschalten', accelerator: 'F11' });
    expect(game.some((i) => i.role === 'quit' && i.label === 'Beenden')).toBe(true);
  });
  it('wires the click actions', () => {
    const { game } = items(true);
    game[0]!.click!();
    game[1]!.click!();
    expect(actions.openPhoneDialog).toHaveBeenCalledOnce();
    expect(actions.toggleFullScreen).toHaveBeenCalledOnce();
  });
  it('shows the development menu only unpackaged', () => {
    expect(items(true).template).toHaveLength(1);
    expect(items(false).template).toHaveLength(2);
  });
});

describe('isPhoneShortcut', () => {
  const base = {
    type: 'keyDown',
    key: 'h',
    alt: false,
    control: true,
    meta: false,
    shift: false,
    isAutoRepeat: false,
  } as const;
  it('accepts Ctrl+H on Windows and Cmd+H on macOS', () => {
    expect(isPhoneShortcut(base, 'win32')).toBe(true);
    expect(isPhoneShortcut({ ...base, key: 'H' }, 'win32')).toBe(true);
    expect(isPhoneShortcut({ ...base, control: false, meta: true }, 'darwin')).toBe(true);
  });
  it('rejects other combinations', () => {
    expect(isPhoneShortcut({ ...base, control: false }, 'win32')).toBe(false);
    expect(isPhoneShortcut({ ...base, shift: true }, 'win32')).toBe(false);
    expect(isPhoneShortcut({ ...base, alt: true }, 'win32')).toBe(false);
    expect(isPhoneShortcut({ ...base, isAutoRepeat: true }, 'win32')).toBe(false);
    expect(isPhoneShortcut({ ...base, type: 'keyUp' }, 'win32')).toBe(false);
    expect(isPhoneShortcut({ ...base, key: 'j' }, 'win32')).toBe(false);
  });
});

describe('phone dialog texts', () => {
  it('formats addresses', () => {
    expect(formatAddress('192.168.1.5', 8360)).toBe('http://192.168.1.5:8360');
  });
  it('reports off, on with addresses, and on without network', () => {
    expect(phoneStatusText({ running: false, addresses: [] })).toContain('aus');
    const on = phoneStatusText({ running: true, addresses: ['http://192.168.1.5:8360'] });
    expect(on).toContain('ist an');
    expect(on).toContain('http://192.168.1.5:8360');
    expect(phoneStatusText({ running: true, addresses: [] })).toContain('kein privates Netzwerk');
  });
  it('offers start or stop plus close', () => {
    expect(phoneButtons(false)).toEqual(['Starten', 'Schließen']);
    expect(phoneButtons(true)).toEqual(['Stoppen', 'Schließen']);
  });
});
