// Camera of the choreography player (M13, AP-182, §4, RS-06.4): shots cut the camera to their start
// state, `camera` tracks move `scrollX`, `scrollY` and `zoom` (Phaser semantics: zoom around the view
// centre). Values are in stage coordinates; the stage is centred in a wider arena by the figures, so
// scroll 0 shows the whole arena. Pure, no Phaser import.
import type { ChoreoCamera, ChoreoDef, ChoreoShot, ChoreoTrack } from '../../contracts';
import { sampleTrack } from '../../logic/choreo';

/** Camera without shots and tracks. */
export const DEFAULT_CAMERA: Readonly<ChoreoCamera> = { scrollX: 0, scrollY: 0, zoom: 1 };

/** Last shot that started at or before `choreoMs`, null before the first one. */
export function shotAt(
  shots: readonly ChoreoShot[] | undefined,
  choreoMs: number,
): ChoreoShot | null {
  let found: ChoreoShot | null = null;
  if (!shots) return null;
  for (const s of shots) if (s.atMs <= choreoMs && (!found || s.atMs >= found.atMs)) found = s;
  return found;
}

/**
 * True when a camera track sets the value at `choreoMs`: it is between two keys, or its last passed key
 * lies at or after the start of the current shot (a later cut wins over a track that already ended).
 */
export function trackApplies(track: ChoreoTrack, choreoMs: number, shotStartMs: number): boolean {
  const keys = track.keys;
  if (keys.length === 0 || choreoMs < keys[0].atMs) return false;
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].atMs <= choreoMs) i++;
  if (i + 1 < keys.length) return true;
  return keys[i].atMs >= shotStartMs;
}

/** Camera state at `choreoMs`: the current shot, overridden by camera tracks. Writes into `out`. */
export function cameraAt(def: ChoreoDef, choreoMs: number, out: ChoreoCamera): ChoreoCamera {
  const shot = shotAt(def.shots, choreoMs);
  const base = shot ? shot.camera : DEFAULT_CAMERA;
  out.scrollX = base.scrollX;
  out.scrollY = base.scrollY;
  out.zoom = base.zoom;
  const shotStart = shot ? shot.atMs : -Infinity;
  for (const track of def.tracks) {
    if (track.target !== 'camera' || !trackApplies(track, choreoMs, shotStart)) continue;
    const v = sampleTrack(track, choreoMs);
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (track.property === 'scrollX') out.scrollX = v;
    else if (track.property === 'scrollY') out.scrollY = v;
    else if (track.property === 'zoom' && v > 0) out.zoom = v;
  }
  return out;
}

/** The camera methods the player uses (Phaser `Cameras.Scene2D.Camera`). */
export interface CameraLike {
  setScroll(x: number, y?: number): unknown;
  setZoom(x?: number, y?: number): unknown;
}

const SHAKE_STEP_MS = 20;
const SHAKE_HALF_MS = 80;
const SHAKE_DIRS_X = [1, -1, 0, -1];
const SHAKE_DIRS_Y = [0, 1, -1, 0];

/** Whole-pixel screen shake like the M10 shake (halves every 80 ms), written into `out`. */
export function shakeInto(tMs: number, amplitude: number, out: { x: number; y: number }): void {
  out.x = 0;
  out.y = 0;
  if (tMs < 0) return;
  const a = Math.round(amplitude * 0.5 ** Math.floor(tMs / SHAKE_HALF_MS));
  if (a <= 0) return;
  const d = Math.floor(tMs / SHAKE_STEP_MS) % SHAKE_DIRS_X.length;
  out.x = SHAKE_DIRS_X[d] * a;
  out.y = SHAKE_DIRS_Y[d] * a;
}
