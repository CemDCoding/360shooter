import { describe, expect, it, vi } from 'vitest';
import type { ItemDef, ItemRules } from '../../src/contracts';

// Minimal Phaser stand-in: ItemPickup only needs a sprite base class.
vi.mock('phaser', () => {
  class Sprite {
    scene: unknown;
    constructor(scene: unknown) {
      this.scene = scene;
    }
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
    x = 0;
    y = 0;
    depth = 0;
    texture = { key: 'tex' };
    frame = { name: 0 };
    destroy(): void {
      this.active = false;
    }
  }
  return { default: { Physics: { Arcade: { Sprite } } } };
});

const { ItemPickup } = await import('../../src/entities/ItemPickup');

const DEF: ItemDef = {
  id: 'test',
  effect: 'rapidFire',
  perStack: 0.1,
  maxStacks: 5,
  dropWeight: 1,
  spriteKey: 'test-item',
};
const RULES: ItemRules = { dropChance: 1, lifetimeMs: 10_000 };

const copies: { destroyed: boolean }[] = [];
function makeCopy() {
  const c = {
    destroyed: false,
    setTintFill: () => c,
    setDepth: () => c,
    setFrame: () => c,
    destroy: () => {
      c.destroyed = true;
    },
  };
  copies.push(c);
  return c;
}

function fakeScene(now: number) {
  return {
    time: { now },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => false },
    add: { existing: () => undefined, sprite: () => makeCopy() },
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

describe('ItemPickup reduced motion', () => {
  it('does not blink but shows a static outline in the last seconds', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      const item = new ItemPickup(fakeScene(0), 0, 0, DEF, RULES, 0);
      expect(item.update(8_000)).toBe(true);
      expect(item.update(8_300)).toBe(true);
      expect((item as unknown as { alpha: number }).alpha).toBe(1);
      expect(copies).toHaveLength(4);
      item.collect();
      expect(copies.every((c) => c.destroyed)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('still blinks without the preference', () => {
    const item = new ItemPickup(fakeScene(0), 0, 0, DEF, RULES, 0);
    item.update(8_000);
    expect((item as unknown as { alpha: number }).alpha).not.toBe(1);
  });
});

describe('ArmourPickup reduced motion', () => {
  it('shows a static outline instead of blinking and cleans it up', async () => {
    const { ArmourPickup } = await import('../../src/entities/ArmourPickup');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    copies.length = 0;
    try {
      const def = { id: 'fire-ring' } as unknown as ConstructorParameters<typeof ArmourPickup>[3];
      const pickup = new ArmourPickup(fakeScene(0), 0, 0, def, RULES, 0);
      expect(pickup.update(8_000)).toBe(true);
      expect((pickup as unknown as { alpha: number }).alpha).toBe(1);
      expect(copies).toHaveLength(4);
      pickup.destroy();
      expect(copies.every((c) => c.destroyed)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
