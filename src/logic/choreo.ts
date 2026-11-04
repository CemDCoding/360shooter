// Pure logic of the finisher choreographies (M13, AP-181, RS-06.1, RS-06.2, RS-06.4, RS-06.5).
// No Phaser, no wall clock: all times are in ms. Choreography time (`atMs`) is mapped to real time
// through `timeScale` events (slower clock) and `hitStop` events (clock stands still).
import { CHOREO_RULES } from '../config/finishers';
import {
  CHOREO_VARIANT_IDS,
  type ChoreoDef,
  type ChoreoEase,
  type ChoreoEvent,
  type ChoreoKey,
  type ChoreoRules,
  type ChoreoTrack,
  type ChoreoVariantId,
  type ChoreoViolation,
  type RigDef,
  type RigId,
} from '../contracts';

export function isChoreoVariantId(value: unknown): value is ChoreoVariantId {
  return typeof value === 'string' && (CHOREO_VARIANT_IDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Easing (formulas as in Phaser, v = progress 0..1)
// ---------------------------------------------------------------------------

/** Phaser `Stepped`: `steps` levels, reaches 1 at v >= 1. */
function stepped(v: number, steps: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  const n = Math.max(1, Math.floor(steps));
  return (Math.floor(n * v) + 1) * (1 / n);
}

function elasticOut(v: number): number {
  if (v === 0) return 0;
  if (v === 1) return 1;
  const period = 0.1;
  const s = period / 4; // amplitude 0.1 < 1 is raised to 1 as in Phaser
  return Math.pow(2, -10 * v) * Math.sin(((v - s) * (2 * Math.PI)) / period) + 1;
}

/** Eased progress for a linear progress `v` (0..1). `hold` returns 0: the start value stays. */
export function applyEase(ease: ChoreoEase, v: number, steps = 1): number {
  const p = Math.min(1, Math.max(0, v));
  switch (ease) {
    case 'linear':
      return p;
    case 'sine.inOut':
      return 0.5 * (1 - Math.cos(Math.PI * p));
    case 'sine.out':
      return Math.sin((p * Math.PI) / 2);
    case 'expo.in':
      return p === 0 ? 0 : Math.pow(2, 10 * (p - 1));
    case 'expo.out':
      return p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    case 'back.out': {
      const q = p - 1;
      return q * q * ((1.70158 + 1) * q + 1.70158) + 1;
    }
    case 'elastic.out':
      return elasticOut(p);
    case 'stepped':
      return stepped(p, steps);
    case 'hold':
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

const DISCRETE: readonly string[] = ['pose', 'order'];

/**
 * Value of a track at choreography time `tMs`. Before the first key the first value, after the last key the last
 * value. Between two keys the ease of the earlier key applies; `hold`, strings and the discrete properties
 * `pose` and `order` keep the earlier value. An empty track has no value.
 */
export function sampleTrack(track: ChoreoTrack, tMs: number): number | string | undefined {
  const keys = track.keys;
  if (keys.length === 0) return undefined;
  if (tMs <= keys[0].atMs) return keys[0].value;
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].atMs <= tMs) i++;
  const a: ChoreoKey = keys[i];
  const b: ChoreoKey | undefined = keys[i + 1];
  if (!b) return a.value;
  if (
    a.ease === 'hold' ||
    DISCRETE.includes(track.property) ||
    typeof a.value !== 'number' ||
    typeof b.value !== 'number'
  ) {
    return a.value;
  }
  const p = (tMs - a.atMs) / (b.atMs - a.atMs);
  return a.value + (b.value - a.value) * applyEase(a.ease, p, a.steps);
}

/** One piece of the real-time clock: a hit stop or a stretch with constant speed. */
export interface Segment {
  realStart: number;
  realEnd: number;
  choreoStart: number;
  choreoEnd: number;
  /** True for a hit stop: the choreography clock stands still. */
  stop: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Real-time segments of a choreography (hit stops and speed changes applied). */
function timeline(def: ChoreoDef): Segment[] {
  const dur = Math.max(0, def.durationMs);
  const scales = def.events.filter(
    (e): e is Extract<ChoreoEvent, { kind: 'timeScale' }> => e.kind === 'timeScale',
  );
  const stops = def.events.filter(
    (e): e is Extract<ChoreoEvent, { kind: 'hitStop' }> => e.kind === 'hitStop',
  );
  const points = new Set<number>([0, dur]);
  for (const s of scales) {
    points.add(clamp(s.atMs, 0, dur));
    points.add(clamp(s.atMs + (s.durationMs ?? 0), 0, dur));
  }
  for (const h of stops) points.add(clamp(h.atMs, 0, dur));
  const sorted = [...points].sort((a, b) => a - b);

  const out: Segment[] = [];
  let real = 0;
  sorted.forEach((c, i) => {
    const stopMs = stops
      .filter((h) => clamp(h.atMs, 0, dur) === c)
      .reduce((sum, h) => sum + Math.max(0, h.ms), 0);
    if (stopMs > 0) {
      out.push({
        realStart: real,
        realEnd: real + stopMs,
        choreoStart: c,
        choreoEnd: c,
        stop: true,
      });
      real += stopMs;
    }
    const next = sorted[i + 1];
    if (next === undefined) return;
    const mid = (c + next) / 2;
    let speed = 1;
    for (const s of scales) {
      if (s.factor > 0 && mid >= s.atMs && mid < s.atMs + (s.durationMs ?? 0)) speed *= s.factor;
    }
    const len = (next - c) / speed;
    out.push({
      realStart: real,
      realEnd: real + len,
      choreoStart: c,
      choreoEnd: next,
      stop: false,
    });
    real += len;
  });
  return out;
}

/** Real length (ms) of a choreography with `timeScale` and `hitStop`. */
export function realDurationMs(def: ChoreoDef): number {
  const t = timeline(def);
  return t.length === 0 ? 0 : t[t.length - 1].realEnd;
}

/** Choreography time at a real time, and whether the clock stands still (hit stop). */
function toChoreoTime(
  segments: readonly Segment[],
  realMs: number,
): { choreoMs: number; frozen: boolean } {
  if (segments.length === 0) return { choreoMs: 0, frozen: false };
  if (realMs <= 0) return { choreoMs: 0, frozen: segments[0].stop };
  for (const s of segments) {
    if (realMs >= s.realStart && realMs < s.realEnd) {
      if (s.stop) return { choreoMs: s.choreoStart, frozen: true };
      const f = (realMs - s.realStart) / (s.realEnd - s.realStart);
      return { choreoMs: s.choreoStart + f * (s.choreoEnd - s.choreoStart), frozen: false };
    }
  }
  return { choreoMs: segments[segments.length - 1].choreoEnd, frozen: false };
}

/** Real time at which the choreography clock reaches `choreoMs` (start of a hit stop at that time). */
function toRealTime(segments: readonly Segment[], choreoMs: number): number {
  for (const s of segments) {
    if (s.stop && s.choreoStart === choreoMs) return s.realStart;
    if (!s.stop && choreoMs >= s.choreoStart && choreoMs < s.choreoEnd) {
      return (
        s.realStart +
        ((choreoMs - s.choreoStart) / (s.choreoEnd - s.choreoStart)) * (s.realEnd - s.realStart)
      );
    }
  }
  return segments.length === 0 ? 0 : segments[segments.length - 1].realEnd;
}

/** Value of one track at a sample time. */
export interface ChoreoSampleValue {
  target: string;
  property: ChoreoTrack['property'];
  value: number | string;
}

export interface ChoreoSample {
  /** Choreography time (ms) at the sampled real time. */
  choreoMs: number;
  /** True while a hit stop holds the clock. */
  frozen: boolean;
  /** True from the real end on. */
  done: boolean;
  /** One entry per non-empty track, in track order. */
  values: ChoreoSampleValue[];
}

/** Real-time clock of a choreography, built once (`prepareChoreo`) and sampled without allocation. */
export interface ChoreoClock {
  readonly segments: readonly Segment[];
  /** Real length (ms), same as `realDurationMs`. */
  readonly realMs: number;
}

/** Clock state at a real time; `sampleClock` writes into it. */
export interface ChoreoClockSample {
  choreoMs: number;
  frozen: boolean;
  done: boolean;
}

/** Builds the real-time segments of a choreography once (for a player that samples every frame). */
export function prepareChoreo(def: ChoreoDef): ChoreoClock {
  const segments = timeline(def);
  return { segments, realMs: segments.length === 0 ? 0 : segments[segments.length - 1].realEnd };
}

/**
 * Clock of `sampleChoreo` without allocation: choreography time, hit stop and end at `realMs`,
 * written into `out` (same values as `sampleChoreo(def, realMs)`).
 */
export function sampleClock(
  clock: ChoreoClock,
  realMs: number,
  out: ChoreoClockSample,
): ChoreoClockSample {
  const segs = clock.segments;
  out.done = realMs >= clock.realMs;
  if (segs.length === 0) {
    out.choreoMs = 0;
    out.frozen = false;
    return out;
  }
  if (realMs <= 0) {
    out.choreoMs = 0;
    out.frozen = segs[0].stop;
    return out;
  }
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (realMs >= s.realStart && realMs < s.realEnd) {
      out.frozen = s.stop;
      out.choreoMs = s.stop
        ? s.choreoStart
        : s.choreoStart +
          ((realMs - s.realStart) / (s.realEnd - s.realStart)) * (s.choreoEnd - s.choreoStart);
      return out;
    }
  }
  out.choreoMs = segs[segs.length - 1].choreoEnd;
  out.frozen = false;
  return out;
}

/** All track values at a real time since the start (maps real to choreography time first). */
export function sampleChoreo(def: ChoreoDef, realMs: number): ChoreoSample {
  const segments = timeline(def);
  const total = segments.length === 0 ? 0 : segments[segments.length - 1].realEnd;
  const { choreoMs, frozen } = toChoreoTime(segments, realMs);
  const values: ChoreoSampleValue[] = [];
  for (const track of def.tracks) {
    const value = sampleTrack(track, choreoMs);
    if (value !== undefined) values.push({ target: track.target, property: track.property, value });
  }
  return { choreoMs, frozen, done: realMs >= total, values };
}

// ---------------------------------------------------------------------------
// Flashes and "reduce effects"
// ---------------------------------------------------------------------------

/** Real start times (ms) of all flash events, sorted. */
function flashTimes(def: ChoreoDef): number[] {
  const segments = timeline(def);
  return def.events
    .filter((e) => e.flash)
    .map((e) => toRealTime(segments, e.atMs))
    .sort((a, b) => a - b);
}

/** Highest number of flash events (real time) that start inside one sliding window [t, t + windowMs). */
export function countFlashes(
  def: ChoreoDef,
  windowMs: number = CHOREO_RULES.flashWindowMs,
): number {
  const times = flashTimes(def);
  let max = 0;
  for (let i = 0; i < times.length; i++) {
    let n = 0;
    for (let j = i; j < times.length && times[j] < times[i] + windowMs; j++) n++;
    max = Math.max(max, n);
  }
  return max;
}

/** True when "reduce effects" removes the event (explicit `reduce`, else flash events and the default kinds). */
export function dropsWhenReduced(
  event: ChoreoEvent,
  dropKinds: readonly string[] = CHOREO_RULES.reduceDropKinds,
): boolean {
  if (event.reduce) return event.reduce === 'drop';
  return event.flash || dropKinds.includes(event.kind);
}

/** "Reduce effects": the choreography without its `drop` events; tracks (movement) and beats stay. */
export function reduceChoreo(def: ChoreoDef, rules: ChoreoRules = CHOREO_RULES): ChoreoDef {
  return { ...def, events: def.events.filter((e) => !dropsWhenReduced(e, rules.reduceDropKinds)) };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type RigRegistry = Readonly<Partial<Record<RigId, RigDef>>>;

function splitTarget(target: string): { rigId: string; partId?: string } {
  const dot = target.indexOf('.');
  return dot < 0
    ? { rigId: target }
    : { rigId: target.slice(0, dot), partId: target.slice(dot + 1) };
}

function checkBeats(def: ChoreoDef, rules: ChoreoRules, out: ChoreoViolation[]): void {
  for (const b of def.beats) {
    const at = `beat ${b.phase} at ${b.atMs} ms`;
    switch (b.phase) {
      case 'anticipation':
        if (b.durationMs < rules.anticipationMinMs || b.durationMs > rules.bossAnticipationMaxMs) {
          out.push({
            rule: 'anticipation',
            message: `${at}: ${b.durationMs} ms outside ${rules.anticipationMinMs}..${rules.bossAnticipationMaxMs}`,
          });
        }
        break;
      case 'action':
        if (b.durationMs > rules.actionMaxMs) {
          out.push({
            rule: 'action',
            message: `${at}: ${b.durationMs} ms above ${rules.actionMaxMs}`,
          });
        }
        break;
      case 'hitStop': {
        const max = b.final ? rules.finalHitStopMaxMs : rules.hitStopMaxMs;
        if (b.durationMs < rules.hitStopMinMs || b.durationMs > max) {
          out.push({
            rule: 'hitStop',
            message: `${at}: ${b.durationMs} ms outside ${rules.hitStopMinMs}..${max}`,
          });
        }
        break;
      }
      case 'followThrough':
        if (b.durationMs < rules.followThroughMinMs) {
          out.push({
            rule: 'followThrough',
            message: `${at}: ${b.durationMs} ms below ${rules.followThroughMinMs}`,
          });
        }
        break;
      case 'reaction':
        break;
    }
  }
}

function checkFlashes(def: ChoreoDef, rules: ChoreoRules, out: ChoreoViolation[]): void {
  const times = flashTimes(def);
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < rules.flashMinGapMs) {
      out.push({
        rule: 'flashGap',
        message: `flash events ${Math.round(times[i] - times[i - 1])} ms apart, minimum ${rules.flashMinGapMs}`,
      });
    }
  }
  const n = countFlashes(def, rules.flashWindowMs);
  if (n > rules.flashMaxPerWindow) {
    out.push({
      rule: 'flashCount',
      message: `${n} flash events in ${rules.flashWindowMs} ms, maximum ${rules.flashMaxPerWindow}`,
    });
  }
  if (def.variantId.startsWith('moment-')) {
    const mainWindows = def.beats.filter((b) => b.phase === 'hitStop' && b.final);
    const flashes = def.events.filter((e) => e.flash);
    const hasMain = flashes.some((e) =>
      mainWindows.some((b) => e.atMs >= b.atMs && e.atMs <= b.atMs + b.durationMs),
    );
    const extra = flashes.length - (hasMain ? 1 : 0);
    if (extra > rules.momentMaxExtraFlashes) {
      out.push({
        rule: 'momentFlashes',
        message: `${extra} flash events besides the main hit, maximum ${rules.momentMaxExtraFlashes}`,
      });
    }
  }
}

function checkBudget(
  def: ChoreoDef,
  rigs: RigRegistry,
  rules: ChoreoRules,
  out: ChoreoViolation[],
): void {
  for (const actor of def.actors) {
    const rig = rigs[actor.rigId];
    if (!rig) {
      out.push({ rule: 'rig', message: `rig ${actor.rigId} is not registered` });
      continue;
    }
    if (rig.parts.length > rules.maxPartsPerRig) {
      out.push({
        rule: 'parts',
        message: `rig ${rig.id} has ${rig.parts.length} parts, maximum ${rules.maxPartsPerRig}`,
      });
    }
    for (const part of rig.parts) {
      let depth = 1;
      let cur = part;
      const seen = new Set<string>([part.id]);
      while (cur.parent !== undefined) {
        const next = rig.parts.find((p) => p.id === cur.parent);
        if (!next || seen.has(next.id)) {
          out.push({
            rule: 'rig',
            message: `rig ${rig.id} part ${part.id}: parent ${cur.parent} missing or circular`,
          });
          break;
        }
        seen.add(next.id);
        cur = next;
        depth++;
      }
      if (depth > rules.maxRigDepth) {
        out.push({
          rule: 'rigDepth',
          message: `rig ${rig.id} part ${part.id} is ${depth} levels deep, maximum ${rules.maxRigDepth}`,
        });
      }
    }
  }
  for (const e of def.events) {
    if (e.kind === 'afterimage' && e.copies > rules.maxAfterimagesPerPart) {
      out.push({
        rule: 'afterimages',
        message: `afterimage at ${e.atMs} ms: ${e.copies} copies, maximum ${rules.maxAfterimagesPerPart}`,
      });
    }
  }
  // Particles alive at the same time (an event without duration counts at its own start only).
  const emitters = def.events.filter(
    (e): e is Extract<ChoreoEvent, { kind: 'particles' }> => e.kind === 'particles',
  );
  for (const a of emitters) {
    const alive = emitters
      .filter((b) => b.atMs <= a.atMs && a.atMs < b.atMs + Math.max(b.durationMs ?? 0, 1))
      .reduce((sum, b) => sum + b.count, 0);
    if (alive > rules.maxParticles) {
      out.push({
        rule: 'particles',
        message: `${alive} particles at ${a.atMs} ms, maximum ${rules.maxParticles}`,
      });
    }
  }
}

function checkTracks(
  def: ChoreoDef,
  rigs: RigRegistry,
  rules: ChoreoRules,
  out: ChoreoViolation[],
): void {
  for (const track of def.tracks) {
    if (track.target === 'camera') {
      if (track.property !== 'zoom') continue;
      track.keys.forEach((k, i) => {
        if (typeof k.value !== 'number' || !Number.isInteger(k.value)) {
          out.push({
            rule: 'zoom',
            message: `camera zoom ${String(k.value)} at ${k.atMs} ms is not a whole step`,
          });
        }
        const next = track.keys[i + 1];
        if (
          next &&
          next.value !== k.value &&
          k.ease !== 'hold' &&
          next.atMs - k.atMs > rules.zoomTransitionMaxMs
        ) {
          out.push({
            rule: 'zoom',
            message: `camera zoom change at ${k.atMs} ms takes ${next.atMs - k.atMs} ms, maximum ${rules.zoomTransitionMaxMs}`,
          });
        }
      });
      continue;
    }
    const { rigId, partId } = splitTarget(track.target);
    const rig = rigs[rigId as RigId];
    if (!rig || !def.actors.some((a) => a.rigId === rigId)) {
      out.push({
        rule: 'rig',
        message: `track target ${track.target}: rig not used by this choreography`,
      });
      continue;
    }
    const part = partId === undefined ? undefined : rig.parts.find((p) => p.id === partId);
    if (partId !== undefined && !part) {
      out.push({ rule: 'rig', message: `track target ${track.target}: unknown part` });
      continue;
    }
    if (track.property === 'angle' && !part?.freeRotate) {
      for (const k of track.keys) {
        if (typeof k.value !== 'number' || Math.abs(k.value) > rules.maxFineRotationDeg) {
          out.push({
            rule: 'rotation',
            message: `${track.target} angle ${String(k.value)} at ${k.atMs} ms exceeds +-${rules.maxFineRotationDeg} degrees without freeRotate`,
          });
        }
      }
    }
  }
}

function checkLengthAndShots(def: ChoreoDef, rules: ChoreoRules, out: ChoreoViolation[]): void {
  const real = realDurationMs(def);
  const isMoment = def.variantId.startsWith('moment-');
  const isFinal = def.variantId === 'cinematic-40';
  const range = isMoment
    ? rules.momentRealMs
    : isFinal
      ? rules.finalCinematicRealMs
      : rules.cinematicRealMs;
  if (real < range.minMs || real > range.maxMs) {
    out.push({
      rule: 'length',
      message: `real length ${Math.round(real)} ms outside ${range.minMs}..${range.maxMs}`,
    });
  }
  if (!isMoment) {
    const want = isFinal ? rules.finalCinematicShots : rules.cinematicShots;
    const have = def.shots?.length ?? 0;
    if (have !== want) out.push({ rule: 'shots', message: `${have} shots, expected ${want}` });
  }
  const flips = (def.shots ?? []).filter((s) => s.axisFlip).length;
  if (flips > 1) out.push({ rule: 'axisFlip', message: `${flips} axis flips, maximum 1` });
}

/** Rule breaks of a choreography; an empty list means it passes (RS-06.2, RS-06.4, RS-06.5). */
export function validateChoreo(
  def: ChoreoDef,
  rigs: RigRegistry,
  rules: ChoreoRules = CHOREO_RULES,
): ChoreoViolation[] {
  const out: ChoreoViolation[] = [];
  checkBeats(def, rules, out);
  checkFlashes(def, rules, out);
  checkBudget(def, rigs, rules, out);
  checkTracks(def, rigs, rules, out);
  checkLengthAndShots(def, rules, out);
  return out;
}
