import type Phaser from 'phaser';
import { GameEvents, type GameEventPayloads } from '../contracts';
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

const ICON_ON = 1;
const ICON_OFF = 2;
const MUTE_BUTTON_SIZE = 32;

/** Mute toggle (32x32 touch target) showing ui-icons frame 1 (on) or 2 (off). Cleans up itself. */
export function addMuteButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  // Optik je Welt folgt in AP-52; bis dahin ohne Wirkung.
  world: 'menu' | 'hud' = 'menu',
): void {
  void world;
  const service = getSoundService(scene.game);
  const bg = scene.add
    .rectangle(x, y, MUTE_BUTTON_SIZE, MUTE_BUTTON_SIZE, 0x000000, 0.5)
    .setStrokeStyle(1, 0xffffff, 0.8)
    .setInteractive({ useHandCursor: true });
  const icon = scene.add.image(x, y, 'ui-icons', service.isMuted() ? ICON_OFF : ICON_ON);
  const onChange = (p: GameEventPayloads['mute-changed']): void => {
    icon.setFrame(p.muted ? ICON_OFF : ICON_ON);
  };
  bg.on('pointerup', () => service.toggleMuted());
  scene.game.events.on(GameEvents.MuteChanged, onChange);
  scene.events.once('shutdown', () => scene.game.events.off(GameEvents.MuteChanged, onChange));
}
