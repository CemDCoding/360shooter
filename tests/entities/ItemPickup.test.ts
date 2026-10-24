import { describe, expect, it, vi } from 'vitest';
import type { ItemDef, ItemRules } from '../../src/contracts';

// Minimal Phaser stand-in: ItemPickup only needs a sprite base class.
vi.mock('phaser', () => {
  class Sprite {
    active = true;
    alpha = 1;
    body = { setCircle: () => undefined };
    setAlpha(a: number): this {
      this.alpha = a;
      return this;
    }
    play(): this {
      return this;
    }
    destroy(): void {
      this.active = false;
    }
  }
  return { default: { Physics: { Arcade: { Sprite } } } };
});

const { ItemPickup } = await import('../../src/entities/ItemPickup');

const DEF: ItemDef = {
  id: 'test',
  effect: 'damage',
  perStack: 0.1,
  maxStacks: 5,
  dropWeight: 1,
  spriteKey: 'test-item',
};
const RULES: ItemRules = { dropChance: 1, lifetimeMs: 10_000 };

function fakeScene(now: number) {
  return {
    time: { now },
    add: { existing: () => undefined },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => false },
  } as unknown as ConstructorParameters<typeof ItemPickup>[0];
}

describe('ItemPickup lifetime', () => {
  it('uses scene.time.now by default', () => {
    const item = new ItemPickup(fakeScene(5_000), 0, 0, DEF, RULES);
    expect(item.update(14_999)).toBe(true);
    expect(item.update(15_000)).toBe(false);
  });

  it('does not expire during a pause when driven by a play clock', () => {
    // Raw scene time is far ahead (long pause), the play clock only counts running frames.
    const scene = fakeScene(1_000_000);
    let playTime = 2_000;
    const item = new ItemPickup(scene, 0, 0, DEF, RULES, playTime);
    playTime += 4_000; // 4 s running
    expect(item.update(playTime)).toBe(true);
    // Pause of 60 s: play clock stands still, raw time moves on.
    (scene.time as { now: number }).now += 60_000;
    expect(item.update(playTime)).toBe(true);
    expect(item.active).toBe(true);
    playTime += 5_999;
    expect(item.update(playTime)).toBe(true);
    playTime += 1;
    expect(item.update(playTime)).toBe(false);
  });

  it('collect fires onCollected once', () => {
    const item = new ItemPickup(fakeScene(0), 0, 0, DEF, RULES, 0);
    const spy = vi.fn();
    item.onCollected = spy;
    expect(item.collect()).toBe(true);
    expect(item.collect()).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
