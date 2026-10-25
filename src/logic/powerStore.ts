import { STORABLE_POWERS } from '../config/powerStore';
import type { PowerStoreState } from '../contracts/powerStore';

export type SlotStatus = 'empty' | 'ready' | 'blocked';

export function createPowerStore(): PowerStoreState {
  return { stored: [] };
}

export function resetPowerStore(): PowerStoreState {
  return createPowerStore();
}

export function isStorable(id: string): boolean {
  return STORABLE_POWERS.some((p) => p.id === id);
}

/** Stores a power; unknown or already stored ids are rejected and the state stays unchanged. */
export function storePower(
  state: PowerStoreState,
  id: string,
): { state: PowerStoreState; accepted: boolean } {
  if (!isStorable(id) || state.stored.includes(id)) return { state, accepted: false };
  return { state: { stored: [...state.stored, id] }, accepted: true };
}

export function takePower(
  state: PowerStoreState,
  id: string,
): { state: PowerStoreState; taken: boolean } {
  if (!state.stored.includes(id)) return { state, taken: false };
  return { state: { stored: state.stored.filter((s) => s !== id) }, taken: true };
}

/** `blocked` comes from the caller: power already active or on cooldown. */
export function slotStatus(state: PowerStoreState, id: string, blocked: boolean): SlotStatus {
  if (!state.stored.includes(id)) return 'empty';
  return blocked ? 'blocked' : 'ready';
}

export function canActivate(state: PowerStoreState, id: string, blocked: boolean): boolean {
  return slotStatus(state, id, blocked) === 'ready';
}
