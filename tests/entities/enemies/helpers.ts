import type { Enemy } from '../../../src/entities/enemies/Enemy';
import type { StubBody, StubScene } from './phaserStub';

export const CENTER = { x: 320, y: 180 } as const;

export function bodyOf(e: object): StubBody {
  return (e as unknown as { body: StubBody }).body;
}

export function sceneOf(s: StubScene): never {
  return s as never;
}

/**
 * Runs `ms` of game time in steps of `dt`: update, then moves the sprite by its body velocity like the
 * arcade physics would (only with an enabled body). `each` runs after every step.
 */
export function simulate(e: Enemy, ms: number, dt = 16, each?: (stepMs: number) => void): void {
  for (let t = 0; t < ms; t += dt) {
    e.update(t, dt);
    const body = bodyOf(e);
    if (e.active && body.enable) {
      e.x += (body.velocity.x * dt) / 1000;
      e.y += (body.velocity.y * dt) / 1000;
    }
    each?.(dt);
  }
}

/** Runs until `done` is true or `maxMs` passed; returns the elapsed time. */
export function runUntil(e: Enemy, done: () => boolean, maxMs = 60_000, dt = 16): number {
  let elapsed = 0;
  while (!done() && elapsed < maxMs) {
    simulate(e, dt, dt);
    elapsed += dt;
  }
  return elapsed;
}
