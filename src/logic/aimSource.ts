/** Aim priority rule (no Phaser): a held stick beats tap and mouse. */

export type AimSourceKind = 'stick' | 'pointer' | 'hold';

export interface AimState {
  stickHeld: boolean;
  /** Stick angle in radians, null inside the dead zone. */
  stickAngleRad: number | null;
  /** Angle from tap or mouse in radians, null if there is none. */
  pointerAngleRad: number | null;
  lastAngleRad: number;
}

export interface AimResult {
  angleRad: number;
  source: AimSourceKind;
}

export function resolveAim(state: AimState): AimResult {
  if (state.stickHeld) {
    return { angleRad: state.stickAngleRad ?? state.lastAngleRad, source: 'stick' };
  }
  if (state.pointerAngleRad !== null) {
    return { angleRad: state.pointerAngleRad, source: 'pointer' };
  }
  return { angleRad: state.lastAngleRad, source: 'hold' };
}
