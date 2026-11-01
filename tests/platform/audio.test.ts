import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/config/assets';
import {
  BASE_VOLUME,
  LASER_KEY,
  LASER_THROTTLE_MS,
  PARRY_KEY,
  SoundService,
} from '../../src/platform/audio';
import { loadSave, type StorageLike } from '../../src/platform/storage';

function fakeStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function setup(storage: StorageLike = fakeStorage()) {
  const played: { key: string; volume: number }[] = [];
  const events: { event: string; payload: { muted: boolean } }[] = [];
  let t = 1000;
  const service = new SoundService({
    backend: { play: (key, volume) => played.push({ key, volume }) },
    emitter: { emit: (event, payload) => events.push({ event, payload }) },
    storage,
    now: () => t,
  });
  return { service, played, events, storage, advance: (ms: number) => (t += ms) };
}

describe('SoundService', () => {
  it('plays with the base volume', () => {
    const { service, played } = setup();
    service.play('sfx-hit');
    expect(played).toEqual([{ key: 'sfx-hit', volume: BASE_VOLUME }]);
  });

  it('throttles the laser sound only', () => {
    const { service, played, advance } = setup();
    service.play(LASER_KEY);
    advance(LASER_THROTTLE_MS - 1);
    service.play(LASER_KEY);
    service.play('sfx-hit');
    service.play('sfx-hit');
    expect(played.filter((p) => p.key === LASER_KEY)).toHaveLength(1);
    expect(played.filter((p) => p.key === 'sfx-hit')).toHaveLength(2);
    advance(1);
    service.play(LASER_KEY);
    expect(played.filter((p) => p.key === LASER_KEY)).toHaveLength(2);
  });

  it('has the parry sound in the manifest and plays it unthrottled (AP-133)', () => {
    const asset = ASSETS.find((a) => a.key === PARRY_KEY);
    expect(asset?.kind).toBe('audio');
    expect(asset?.path).toBe('assets/sounds/parry.wav');
    const { service, played } = setup();
    service.play(PARRY_KEY);
    service.play(PARRY_KEY);
    expect(played).toEqual([
      { key: PARRY_KEY, volume: BASE_VOLUME },
      { key: PARRY_KEY, volume: BASE_VOLUME },
    ]);
  });

  it('plays nothing while muted', () => {
    const { service, played } = setup();
    service.setMuted(true);
    service.play('sfx-hit');
    service.play(LASER_KEY);
    expect(played).toHaveLength(0);
  });

  it('persists mute and emits mute-changed once per change', () => {
    const { service, events, storage } = setup();
    service.setMuted(true);
    service.setMuted(true);
    expect(events).toEqual([{ event: 'mute-changed', payload: { muted: true } }]);
    expect(loadSave(storage).muted).toBe(true);
    service.toggleMuted();
    expect(loadSave(storage).muted).toBe(false);
    expect(events).toHaveLength(2);
  });

  it('starts muted when the save says so (reload)', () => {
    const first = setup();
    first.service.setMuted(true);
    const second = setup(first.storage);
    expect(second.service.isMuted()).toBe(true);
    second.service.play('sfx-hit');
    expect(second.played).toHaveLength(0);
  });

  it('reload follows a reset save and notifies', () => {
    const { service, events, storage } = setup();
    service.setMuted(true);
    storage.removeItem('360shooter.save.v1');
    service.reload();
    expect(service.isMuted()).toBe(false);
    expect(events[events.length - 1]?.payload.muted).toBe(false);
  });
});
