import type Phaser from 'phaser';
import { GameEvents, type GameEventPayloads } from '../contracts';
import { THEME } from '../config/theme';
import { defaultSave, loadSave, writeSave, type StorageLike } from './storage';

/** Base volume for all effects (0..1). One place to change it. */
export const BASE_VOLUME = 0.5;
/** Laser fires very often: at most one laser sound per this many ms. */
export const LASER_THROTTLE_MS = 80;
/** Manifest key of the laser sound (see src/config/assets.ts). */
export const LASER_KEY = 'sfx-laser';

/** Minimal sound backend (Phaser sound manager in the game, a fake in tests). */
export interface SoundBackend {
  play(key: string, volume: number): void;
}

export interface MuteEmitter {
  emit(event: string, payload: GameEventPayloads['mute-changed']): void;
}

export interface SoundServiceDeps {
  backend: SoundBackend;
  emitter?: MuteEmitter;
  storage?: StorageLike | null;
  now?: () => number;
}

export class SoundService {
  private muted: boolean;
  private lastLaserMs = Number.NEGATIVE_INFINITY;
  private readonly backend: SoundBackend;
  private readonly emitter?: MuteEmitter;
  private readonly storage?: StorageLike | null;
  private readonly now: () => number;

  constructor(deps: SoundServiceDeps) {
    this.backend = deps.backend;
    this.emitter = deps.emitter;
    this.storage = deps.storage;
    this.now = deps.now ?? (() => Date.now());
    this.muted = this.readSaved();
  }

  private readSaved(): boolean {
    return (this.storage === undefined ? loadSave() : loadSave(this.storage)).muted;
  }

  /** Re-reads the saved flag (e.g. after the save was reset). */
  reload(): void {
    const m = this.readSaved();
    if (m === this.muted) return;
    this.muted = m;
    this.emitter?.emit(GameEvents.MuteChanged, { muted: m });
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(key: string): void {
    if (this.muted) return;
    if (key === LASER_KEY) {
      const t = this.now();
      if (t - this.lastLaserMs < LASER_THROTTLE_MS) return;
      this.lastLaserMs = t;
    }
    this.backend.play(key, BASE_VOLUME);
  }

  setMuted(muted: boolean): void {
    if (muted === this.muted) return;
    this.muted = muted;
    const save = this.storage === undefined ? loadSave() : loadSave(this.storage);
    const next = { ...(save ?? defaultSave()), muted };
    if (this.storage === undefined) writeSave(next);
    else writeSave(next, this.storage);
    this.emitter?.emit(GameEvents.MuteChanged, { muted });
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }
}

const services = new WeakMap<Phaser.Game, SoundService>();

/** One SoundService per game; unlocks WebAudio on the first tap (iOS). */
export function getSoundService(game: Phaser.Game): SoundService {
  const existing = services.get(game);
  if (existing) return existing;
  const service = new SoundService({
    backend: {
      play: (key, volume) => {
        if (!game.cache.audio.exists(key)) return;
        game.sound.play(key, { volume });
      },
    },
    emitter: game.events,
  });
  services.set(game, service);
  if (typeof window !== 'undefined') {
    // iOS only allows audio inside a user gesture (touchend counts, touchstart does not).
    const events = ['touchend', 'pointerup', 'mouseup', 'keydown'] as const;
    const unlock = (): void => {
      for (const e of events) window.removeEventListener(e, unlock);
      const sm = game.sound as { context?: AudioContext; unlock?: () => void };
      sm.unlock?.();
      if (sm.context && sm.context.state === 'suspended') void sm.context.resume();
    };
    for (const e of events) window.addEventListener(e, unlock);
  }
  return service;
}

const ICON_ON = 0;
const ICON_OFF = 1;
const MUTE_BUTTON_SIZE = THEME.sizePx['size.target'];

/**
 * Mute toggle (32x32 touch target) showing ui-icons frame 0 (sound on) or 1 (sound off). Cleans up itself.
 * 'menu': cartridge icon button (bevel, outline, drop shadow); 'hud': radio variant with THEME.hud colors.
 * Hover and press show the focus ring; the button is not part of the keyboard focus order.
 */
export function addMuteButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  world: 'menu' | 'hud' = 'menu',
): void {
  const service = getSoundService(scene.game);
  const frame = (muted: boolean): number => (muted ? ICON_OFF : ICON_ON);
  const g = scene.add.graphics();
  const icon = scene.add.image(x, y, 'ui-icons', frame(service.isMuted()));
  const state = { hover: false, pressed: false };
  const draw = (): void => {
    g.clear();
    if (world === 'menu') drawMenuButton(g, x, y, state);
    else drawRadioButton(g, x, y, state.hover || state.pressed);
    const off = world === 'menu' && state.pressed ? THEME.spacePx['space.half'] : 0;
    icon
      .setPosition(x + off, y + off)
      .setTint(THEME.colors[world === 'menu' ? 'menu.text' : 'hud.text'].num);
  };
  draw();
  const zone = scene.add
    .zone(x, y, MUTE_BUTTON_SIZE, MUTE_BUTTON_SIZE)
    .setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => {
    state.hover = true;
    draw();
  });
  zone.on('pointerout', () => {
    state.hover = false;
    state.pressed = false;
    draw();
  });
  zone.on('pointerdown', () => {
    state.pressed = true;
    draw();
  });
  zone.on('pointerup', () => {
    const was = state.pressed;
    state.pressed = false;
    draw();
    if (was) service.toggleMuted();
  });
  const onChange = (p: GameEventPayloads['mute-changed']): void => {
    icon.setFrame(frame(p.muted));
  };
  scene.game.events.on(GameEvents.MuteChanged, onChange);
  scene.events.once('shutdown', () => scene.game.events.off(GameEvents.MuteChanged, onChange));
}

function rect(
  g: Phaser.GameObjects.Graphics,
  color: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(color, 1).fillRect(x, y, w, h);
}

function drawRing(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
  const t = THEME.borderPx['border.focus'];
  const half =
    MUTE_BUTTON_SIZE / 2 + THEME.borderPx['border.menu'] + THEME.spacePx['space.half'] + t;
  g.lineStyle(t, color, 1).strokeRect(
    x - half + t / 2,
    y - half + t / 2,
    half * 2 - t,
    half * 2 - t,
  );
}

/** Kassetten-Icon-Knopf: 2-px-Fase, 2-px-Umriss, 4-px-Schatten; gedrückt 2 px versetzt. */
function drawMenuButton(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  state: { hover: boolean; pressed: boolean },
): void {
  const c = THEME.colors;
  const s = MUTE_BUTTON_SIZE;
  const b = THEME.borderPx['border.menu'];
  const off = state.pressed ? THEME.spacePx['space.half'] : 0;
  const x = cx - s / 2 + off;
  const y = cy - s / 2 + off;
  const face = state.hover && !state.pressed ? c['menu.surface-hi'].num : c['menu.surface'].num;
  const drop = state.pressed ? off : THEME.spacePx['space.1'];
  rect(
    g,
    c['menu.outline'].num,
    cx - s / 2 + drop - b,
    cy - s / 2 + drop - b,
    s + 2 * b,
    s + 2 * b,
  );
  rect(g, c['menu.outline'].num, x - b, y - b, s + 2 * b, s + 2 * b);
  rect(g, face, x, y, s, s);
  rect(g, c['menu.surface-lo'].num, x, y + s - b, s, b);
  rect(g, c['menu.surface-lo'].num, x + s - b, y, b, s);
  if (!state.pressed) {
    rect(g, c['menu.surface-hi'].num, x, y, s, b);
    rect(g, c['menu.surface-hi'].num, x, y, b, s);
  }
  if (state.hover || state.pressed) drawRing(g, cx, cy, c['menu.focus'].num);
}

/** Funk-Knopf: dunkles Glas, 1-px-Linie in hud.line (hover: hud.accent plus Fokus-Ring). */
function drawRadioButton(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  active: boolean,
): void {
  const c = THEME.colors;
  const s = MUTE_BUTTON_SIZE;
  const line = THEME.borderPx['border.hud'];
  const glass = c['hud.glass'];
  g.fillStyle(glass.num, glass.alpha ?? 1).fillRect(cx - s / 2, cy - s / 2, s, s);
  g.lineStyle(line, c[active ? 'hud.accent' : 'hud.line'].num, 1).strokeRect(
    cx - s / 2 + line / 2,
    cy - s / 2 + line / 2,
    s - line,
    s - line,
  );
  if (active) drawRing(g, cx, cy, c['hud.focus'].num);
}
