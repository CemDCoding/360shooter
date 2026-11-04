// Test sequence of the choreography player (M13, AP-182): plays with the placeholder figures of
// `config/rigs` for the debug start `?finisher=0` as long as the register has no `moment-rootMonster`
// (AP-184 replaces it with the real one). Uses every event kind once, keeps the grid (PE-245), one flash,
// a smear pose and a camera zoom on whole steps. Not part of the game: nothing outside the debug start uses it.
import type { ChoreoDef } from '../../contracts';
import { THEME } from '../../config/theme';
import { SOUND_CHARGE } from './timing';
import { AFTERIMAGE_COPIES, AFTERIMAGE_FADE_MS, AFTERIMAGE_GAP_MS, SLASH_FX } from './trails';

const GROUND = THEME.sizePx['size.rig-ground'];
/** Level whose debug start plays the test sequence. */
export const DEBUG_CHOREO_LEVEL = 0;

/** Placeholder test sequence: about 3.2 s real time (1 s slow motion, 200 ms hit stop). */
export const DEBUG_CHOREO: ChoreoDef = {
  variantId: 'moment-rootMonster',
  actors: [
    { rigId: 'astronaut', x: 170, y: GROUND },
    { rigId: 'rootMonster', x: 470, y: GROUND },
  ],
  durationMs: 2300,
  tracks: [
    {
      target: 'astronaut',
      property: 'y',
      keys: [
        { atMs: 0, value: GROUND, ease: 'hold' },
        { atMs: 500, value: GROUND, ease: 'sine.out' },
        { atMs: 700, value: GROUND - 60, ease: 'hold' },
        { atMs: 900, value: GROUND - 60, ease: 'expo.in' },
        { atMs: 1000, value: GROUND, ease: 'hold' },
      ],
    },
    {
      target: 'astronaut',
      property: 'x',
      keys: [
        { atMs: 0, value: 170, ease: 'hold' },
        { atMs: 900, value: 170, ease: 'expo.in' },
        { atMs: 1000, value: 400, ease: 'hold' },
      ],
    },
    {
      target: 'astronaut.body',
      property: 'angle',
      keys: [
        { atMs: 0, value: 0, ease: 'sine.inOut' },
        { atMs: 700, value: -15, ease: 'hold' },
        { atMs: 900, value: -15, ease: 'expo.out' },
        { atMs: 1000, value: 15, ease: 'hold' },
        { atMs: 1300, value: 15, ease: 'sine.inOut' },
        { atMs: 2300, value: 0, ease: 'hold' },
      ],
    },
    {
      target: 'astronaut.body',
      property: 'pose',
      keys: [
        { atMs: 0, value: 'stand', ease: 'hold' },
        { atMs: 900, value: 'smear', ease: 'hold' },
        { atMs: 933, value: 'stand', ease: 'hold' },
      ],
    },
    {
      target: 'rootMonster.body',
      property: 'scaleY',
      keys: [
        { atMs: 0, value: 1, ease: 'sine.inOut' },
        { atMs: 500, value: 1.1, ease: 'back.out' },
        { atMs: 600, value: 1, ease: 'hold' },
      ],
    },
    {
      target: 'rootMonster.body',
      property: 'alpha',
      keys: [
        { atMs: 1300, value: 1, ease: 'stepped', steps: 3 },
        { atMs: 2300, value: 0, ease: 'hold' },
      ],
    },
    {
      target: 'camera',
      property: 'zoom',
      keys: [
        { atMs: 900, value: 1, ease: 'linear' },
        { atMs: 1000, value: 2, ease: 'hold' },
        { atMs: 1300, value: 2, ease: 'linear' },
        { atMs: 1400, value: 1, ease: 'hold' },
      ],
    },
    {
      target: 'camera',
      property: 'scrollX',
      keys: [
        { atMs: 900, value: 0, ease: 'linear' },
        { atMs: 1000, value: 150, ease: 'hold' },
        { atMs: 1300, value: 150, ease: 'linear' },
        { atMs: 1400, value: 0, ease: 'hold' },
      ],
    },
    {
      target: 'camera',
      property: 'scrollY',
      keys: [
        { atMs: 900, value: 0, ease: 'linear' },
        { atMs: 1000, value: 24, ease: 'hold' },
        { atMs: 1300, value: 24, ease: 'linear' },
        { atMs: 1400, value: 0, ease: 'hold' },
      ],
    },
  ],
  events: [
    { kind: 'sound', atMs: 500, key: SOUND_CHARGE, flash: false },
    {
      kind: 'afterimage',
      atMs: 500,
      durationMs: 200,
      parts: ['astronaut.body'],
      copies: AFTERIMAGE_COPIES,
      spacingMs: AFTERIMAGE_GAP_MS,
      fadeMs: AFTERIMAGE_FADE_MS,
      flash: false,
    },
    { kind: 'timeScale', atMs: 1000, durationMs: 300, factor: 0.3, flash: false },
    {
      kind: 'hitStop',
      atMs: 1000,
      ms: 200,
      axis: 'x',
      targets: ['rootMonster'],
      strength: 1,
      flash: false,
    },
    { kind: 'flash', atMs: 1000, durationMs: 100, color: 'finisher.paper', flash: true },
    { kind: 'hitWhite', atMs: 1000, durationMs: 200, targets: ['rootMonster'], flash: false },
    { kind: 'impact', atMs: 1000, durationMs: 100, texture: 'finisher-hit', flash: false },
    { kind: 'fx', atMs: 1000, durationMs: 1200, name: SLASH_FX, flash: false },
    { kind: 'shake', atMs: 1000, durationMs: 300, strength: 1, flash: false },
    {
      kind: 'particles',
      atMs: 1000,
      texture: 'finisher-shards',
      count: 24,
      follow: 'rootMonster',
      flash: false,
    },
    {
      kind: 'text',
      atMs: 2000,
      text: 'BEZWUNGEN!',
      color: 'finisher.title',
      flash: false,
    },
  ],
  beats: [
    { phase: 'anticipation', atMs: 0, durationMs: 500 },
    { phase: 'action', atMs: 500, durationMs: 100 },
    { phase: 'anticipation', atMs: 700, durationMs: 200 },
    { phase: 'action', atMs: 900, durationMs: 100 },
    { phase: 'hitStop', atMs: 1000, durationMs: 200, final: true },
    { phase: 'reaction', atMs: 1000, durationMs: 300, final: true },
    { phase: 'followThrough', atMs: 1300, durationMs: 1000, final: true },
  ],
};
