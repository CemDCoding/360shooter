// Wiring of the finisher scene (AP-160, AP-191). The scene needs Phaser and a browser, so the source is
// checked as text; the logic it uses is tested in finisherLayout.test.ts and finisherPlayer.test.ts.
import { describe, expect, it } from 'vitest';
import sceneRaw from '../../src/scenes/FinisherScene.ts?raw';
import mainRaw from '../../src/main.ts?raw';
import preloadRaw from '../../src/scenes/PreloadScene.ts?raw';
import picturesRaw from '../../src/scenes/finisher/pictures.ts?raw';
import overlaysRaw from '../../src/scenes/finisher/overlays.ts?raw';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const norm = (s: string): string => s.replace(/\r\n/g, '\n');
const scene = norm(sceneRaw);
const main = norm(mainRaw);
const preload = norm(preloadRaw);
const pictures = norm(picturesRaw);
const overlays = norm(overlaysRaw);

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

  it('plays only the choreography; the M10 block timeline is gone (AP-191)', () => {
    expect(scene).toMatch(/new ChoreoPlayer\(/);
    expect(scene).not.toMatch(/this.timeline|add.timeline/);
    expect(scene).not.toMatch(/plan\.steps|plan\.skippable|FinisherStep|makeBlock|ParticleSystem/);
    for (const gone of ['camera', 'particles', 'shutdown']) {
      expect(existsSync(join(__dirname, `../../src/scenes/finisher/${gone}.ts`)), gone).toBe(false);
    }
    // What is left of the old picture and overlay modules is used by the choreographies.
    expect(pictures).toMatch(/export function createSkipHint\(/);
    expect(pictures).not.toMatch(/export function (cutIn|panels|frames|title)\(/);
    expect(overlays).toMatch(/export function drawSpeedlines\(/);
    expect(overlays).not.toMatch(/export function (letterbox|bgColor|speedlines|beam|flash)\(/);
  });

  it('skips only through canSkip and shows the hint from skipFromMs', () => {
    expect(scene).toMatch(/canSkip\(plan, this\.player\.elapsedMs\)/);
    expect(scene).toMatch(
      /this\.hint\?\.setVisible\(!!plan && canSkip\(plan, player\.elapsedMs\)\)/,
    );
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
    // Both ends lead here: the end of the player and the skip.
    expect(scene).toMatch(/if \(player\.done\) this\.finish\(\)/);
    expect(scene).toMatch(/canSkip\([^)]*\)\) this\.finish\(\)/);
    // result is kept even if the rest of the data is broken, so a boss win never hangs.
    expect(finish).not.toMatch(/startData/);
    expect(scene).toMatch(/\(data as \{ result\?: unknown \}\)\.result/);
  });

  it('ends without usable data or without GameScene data (debug ?finisher=n) in the menu', () => {
    expect(method(scene, 'finish')).toMatch(/this\.scene\.start\(MENU_KEY\)/);
    expect(scene).toMatch(/const MENU_KEY = 'MenuScene'/);
    expect(scene).toMatch(/if \(!data \|\| !choreo\) \{\s*this\.finish\(\);/);
    expect(preload).toMatch(/debugFinisherData\(target\.levelId/);
    expect(preload).toMatch(/this\.scene\.start\(\s*FINISHER_SCENE_KEY/);
  });

  it('cleans up player, input listeners and generated textures on SHUTDOWN', () => {
    expect(scene).toMatch(/events\.once\(Phaser\.Scenes\.Events\.SHUTDOWN, this\.cleanup, this\)/);
    const cleanup = method(scene, 'cleanup');
    for (const part of [
      'this.unbindInput()',
      'this.hint?.destroy()',
      'this.player?.destroy()',
      'this.choreoCtx?.textures.destroy()',
      'this.tweens.timeScale = 1',
    ]) {
      expect(cleanup).toContain(part);
    }
  });
});
