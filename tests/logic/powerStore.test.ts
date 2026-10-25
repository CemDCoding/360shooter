import { describe, expect, it } from 'vitest';
import {
  canActivate,
  createPowerStore,
  isStorable,
  resetPowerStore,
  slotStatus,
  storePower,
  takePower,
} from '../../src/logic/powerStore';

describe('powerStore', () => {
  it('starts empty and knows storable ids', () => {
    expect(createPowerStore().stored).toEqual([]);
    expect(isStorable('rapidFire')).toBe(true);
    expect(isStorable('fire-ring')).toBe(true);
    expect(isStorable('shield')).toBe(false);
  });

  it('stores a power', () => {
    const r = storePower(createPowerStore(), 'rapidFire');
    expect(r.accepted).toBe(true);
    expect(r.state.stored).toEqual(['rapidFire']);
  });

  it('rejects a second pickup of the same id without change', () => {
    const s = storePower(createPowerStore(), 'rapidFire').state;
    const r = storePower(s, 'rapidFire');
    expect(r.accepted).toBe(false);
    expect(r.state).toBe(s);
  });

  it('rejects unknown ids', () => {
    const s = createPowerStore();
    const r = storePower(s, 'nope');
    expect(r.accepted).toBe(false);
    expect(r.state).toBe(s);
  });

  it('keeps pickup order', () => {
    let s = storePower(createPowerStore(), 'fire-ring').state;
    s = storePower(s, 'rapidFire').state;
    expect(s.stored).toEqual(['fire-ring', 'rapidFire']);
  });

  it('takes a power and leaves others', () => {
    let s = storePower(createPowerStore(), 'fire-ring').state;
    s = storePower(s, 'rapidFire').state;
    const r = takePower(s, 'fire-ring');
    expect(r.taken).toBe(true);
    expect(r.state.stored).toEqual(['rapidFire']);
    const again = takePower(r.state, 'fire-ring');
    expect(again.taken).toBe(false);
    expect(again.state).toBe(r.state);
  });

  it('reports slot status in all three states', () => {
    const empty = createPowerStore();
    const full = storePower(empty, 'rapidFire').state;
    expect(slotStatus(empty, 'rapidFire', false)).toBe('empty');
    expect(slotStatus(empty, 'rapidFire', true)).toBe('empty');
    expect(slotStatus(full, 'rapidFire', false)).toBe('ready');
    expect(slotStatus(full, 'rapidFire', true)).toBe('blocked');
  });

  it('activates only when ready; blocked keeps the power', () => {
    const full = storePower(createPowerStore(), 'fire-ring').state;
    expect(canActivate(full, 'fire-ring', false)).toBe(true);
    expect(canActivate(full, 'fire-ring', true)).toBe(false);
    expect(canActivate(createPowerStore(), 'fire-ring', false)).toBe(false);
    expect(full.stored).toEqual(['fire-ring']);
  });

  it('does not mutate inputs', () => {
    const s = Object.freeze({ stored: Object.freeze(['rapidFire']) });
    storePower(s, 'fire-ring');
    takePower(s, 'rapidFire');
    expect(s.stored).toEqual(['rapidFire']);
  });

  it('reset empties the store', () => {
    const s = storePower(createPowerStore(), 'rapidFire').state;
    expect(s.stored.length).toBe(1);
    expect(resetPowerStore().stored).toEqual([]);
  });
});
