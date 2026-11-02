// Shutdown helper of the finisher scene (AP-160); no Phaser import, so it is testable in Node.

/** The part of Phaser.Time.Timeline the scene needs on shutdown. */
export interface StoppableTimeline {
  stop(): unknown;
}

/**
 * Releases the scene's timeline on SHUTDOWN: only stops it and drops the reference.
 * Phaser's Timeline registers `events.once(SHUTDOWN, destroy)` itself. Calling destroy() here as well
 * would run it twice (the emitter still calls the removed once-listener of the running emit) and
 * throw "Cannot read properties of null (reading 'events')", leaving the game before ResultScene.
 */
export function releaseTimeline(timeline: StoppableTimeline | null): null {
  timeline?.stop();
  return null;
}
