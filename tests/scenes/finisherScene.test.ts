// Wiring of the finisher scene (AP-160). The scene needs Phaser and a browser, so the source is
// checked as text; the logic it uses is tested in finisherLayout.test.ts.
import { describe, expect, it } from 'vitest';
import scene from '../../src/scenes/FinisherScene.ts?raw';
import main from '../../src/main.ts?raw';
import preload from '../../src/scenes/PreloadScene.ts?raw';
import overlays from '../../src/scenes/finisher/overlays.ts?raw';
import pictures from '../../src/scenes/finisher/pictures.ts?raw';
import particles from '../../src/scenes/finisher/particles.ts?raw';
import camera from '../../src/scenes/finisher/camera.ts?raw';
import { createRequire } from 'node:module';
import type { FinisherBlock } from '../../src/contracts';
import { releaseTimeline } from '../../src/scenes/finisher/shutdown';

/** All 15 blocks of the contract; `satisfies` keeps the list in step with the type. */
const ALL_BLOCKS = {
  hitstop: 1,
  slowmo: 1,
  zoom: 1,
  shake: 1,
  letterbox: 1,
  speedlines: 1,
  bgColor: 1,
  impactFrame: 1,
  flash: 1,
  cutIn: 1,
  panels: 1,
  particles: 1,
  shatter: 1,
  title: 1,
  frames: 1,
} satisfies Record<FinisherBlock, 1>;
const FINISHER_BLOCKS = Object.keys(ALL_BLOCKS);

/** Body of a method `name(` ... up to the next method at class indentation. */
function method(src: string, name: string): string {
  const start = src.indexOf(`  private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  const next = rest.search(/\n {2}(private |update\(|init\(|create\()/);
  return next < 0 ? rest : rest.slice(0, next);
}

describe('FinisherScene wiring', () => {
  it('is registered in main.ts after the HUD and ResultScene', () => {
    expect(main).toMatch(/import \{ FinisherScene \} from '\.\/scenes\/FinisherScene'/);
    expect(main).toMatch(/HudScene, ResultScene, FinisherScene\]/);
  });

  it('uses the contract key and validates the start data', () => {
    expect(scene).toMatch(/super\(FINISHER_SCENE_KEY\)/);
    expect(scene).toMatch(/isFinisherStartData\(data\)/);
  });

  it('plays plan.steps on a Phaser timeline and ends at plan.totalMs', () => {
    expect(scene).toMatch(/this\.add\.timeline\(this\.timelineEvents\(plan\)\)/);
    expect(scene).toMatch(/for \(const step of plan\.steps\)/);
    expect(scene).toMatch(/at: plan\.totalMs, run: \(\) => this\.finish\(\)/);
  });

  it('has a building block for every block of the contract', () => {
    for (const b of FINISHER_BLOCKS) expect(scene).toContain(`case '${b}':`);
    const all = overlays + pictures + particles + camera;
    for (const fn of ['letterbox', 'speedlines', 'bgColor', 'impactFrame', 'flash', 'beam']) {
      expect(overlays).toMatch(new RegExp(`export function ${fn}\\(`));
    }
    for (const fn of ['cutIn', 'panels', 'frames', 'title', 'createSkipHint']) {
      expect(pictures).toMatch(new RegExp(`export function ${fn}\\(`));
    }
    for (const fn of ['hitstop', 'slowmo', 'zoom', 'shake', 'particles', 'shatter']) {
      expect(all).toMatch(new RegExp(`export function ${fn}\\(`));
    }
  });

  it('skips only through canSkip and shows the hint after the skip lock', () => {
    expect(scene).toMatch(/canSkip\(plan, this\.timeline\.elapsed\)/);
    expect(scene).toMatch(/plan\.skippable && seq >= FINISHER_RULES\.skipLockMs/);
  });

  it('after end or skip stops GameScene and the HUD and starts ResultScene with data.result', () => {
    const finish = method(scene, 'finish');
    expect(finish).toMatch(/if \(this\.result !== undefined && this\.result !== null\)/);
    expect(finish).toMatch(/for \(const key of \[GAME_KEY, HUD_KEY\]\)/);
    expect(finish).toMatch(/this\.scene\.stop\(key\)/);
    expect(finish).toMatch(/this\.scene\.start\(RESULT_KEY, this\.result/);
    expect(finish.indexOf('this.scene.stop(key)')).toBeLessThan(finish.indexOf('RESULT_KEY'));
    expect(scene).toMatch(/const GAME_KEY = 'GameScene'/);
    expect(scene).toMatch(/const RESULT_KEY = 'ResultScene'/);
    // Both ends lead here: the timeline end event and the skip.
    expect(scene).toMatch(/canSkip\([^)]*\)\) this\.finish\(\)/);
    // result is kept even if the rest of the data is broken, so a boss win never hangs.
    expect(method(scene, 'finish')).not.toMatch(/startData/);
    expect(scene).toMatch(/\(data as \{ result\?: unknown \}\)\.result/);
  });

  it('ends without GameScene data (debug ?finisher=n) in the menu', () => {
    expect(method(scene, 'finish')).toMatch(/this\.scene\.start\(MENU_KEY\)/);
    expect(scene).toMatch(/const MENU_KEY = 'MenuScene'/);
    expect(preload).toMatch(/debugFinisherData\(target\.levelId/);
    expect(preload).toMatch(/this\.scene\.start\(\s*FINISHER_SCENE_KEY/);
  });

  it('cleans up timeline, blocks, input listeners and generated textures on SHUTDOWN', () => {
    expect(scene).toMatch(/events\.once\(Phaser\.Scenes\.Events\.SHUTDOWN, this\.cleanup, this\)/);
    const cleanup = method(scene, 'cleanup');
    for (const part of [
      'this.unbindInput()',
      'r.effect.destroy()',
      'this.particleSystem?.destroy()',
      'this.timeline = releaseTimeline(this.timeline)',
      'this.ctx.textures.destroy()',
      'this.tweens.timeScale = 1',
    ]) {
      expect(cleanup).toContain(part);
    }
    // Phaser destroys the timeline itself; a second destroy() throws (review round 2).
    expect(scene).not.toMatch(/timeline\??\.destroy\(/);
  });

  it('runs the hit image speedlines onto the picture centre and grows the beam at the astronaut', () => {
    expect(pictures).toMatch(/addBackSpeedlines\(ctx, center, lines\.color/);
    expect(overlays).toMatch(/g\.setVisible\(!hitImageAt\(ctx\.plan, step\.atMs \+ seqMs\)\)/);
    expect(overlays).toMatch(/const y = ctx\.actors\.playerScreen\(\)\.y/);
    expect(overlays).toMatch(/beamProgress\(seqMs\)/);
  });

  it('plays the four finisher sounds only through the sound service', () => {
    expect(scene).toMatch(/for \(const cue of soundCues\(plan\)\)/);
    expect(scene).toMatch(/sound\.play\(cue\.key\)/);
  });
});

describe('FinisherScene shutdown with the real Phaser Timeline', () => {
  // Phaser's Timeline and its emitter run in Node; the scene itself needs a browser.
  const req = createRequire(import.meta.url);
  const EventEmitter = req('eventemitter3') as new () => {
    once(e: string, fn: () => void): void;
    emit(e: string): boolean;
  };
  const Timeline = req('phaser/src/time/Timeline.js') as new (scene: unknown) => {
    stop(): unknown;
    destroy(): void;
    systems: unknown;
  };
  const SHUTDOWN = (req('phaser/src/scene/events/index.js') as { SHUTDOWN: string }).SHUTDOWN;

  /** Same order as the scene: cleanup is registered in create() before the timeline exists. */
  function shutdownWith(cleanupTimeline: (tl: InstanceType<typeof Timeline>) => void) {
    const events = new EventEmitter();
    const fakeScene = { sys: { events } };
    let tl: InstanceType<typeof Timeline> | null = null;
    events.once(SHUTDOWN, () => {
      if (tl) cleanupTimeline(tl);
    });
    tl = new Timeline(fakeScene);
    const created = tl;
    return { run: () => events.emit(SHUTDOWN), created };
  }

  it('ends without throwing; Phaser destroys the timeline exactly once', () => {
    const { run, created } = shutdownWith((tl) => releaseTimeline(tl));
    expect(run).not.toThrow();
    expect(created.systems).toBeNull();
  });

  it('would throw with a second destroy() in cleanup (the bug of round 1)', () => {
    const { run } = shutdownWith((tl) => tl.destroy());
    expect(run).toThrow(TypeError);
  });
});
