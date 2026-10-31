import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class Sprite {
    x = 0;
    y = 0;
    width = 32;
    height = 32;
    depth = 0;
    body = { setCircle: () => undefined };
    anims = { currentAnim: { key: '' } };
    scene!: unknown;
    constructor(scene: unknown, x: number, y: number) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    setFlipX() {
      return this;
    }
    setTintFill() {
      return this;
    }
    clearTint() {
      return this;
    }
    play() {
      return this;
    }
    destroy() {}
  }
  return {
    default: {
      Physics: { Arcade: { Sprite } },
      Math: {
        RadToDeg: (r: number) => (r * 180) / Math.PI,
        DegToRad: (d: number) => (d * Math.PI) / 180,
      },
    },
  };
});

import type { ActivePlayerStatus } from '../../src/contracts';
import { Player, type PlayerConfig } from '../../src/entities/Player';
import { statusDisplay, STATUS_LABELS } from '../../src/scenes/hud/hudMath';

function chain(): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const n of [
    'setStrokeStyle',
    'setVisible',
    'setOrigin',
    'setPosition',
    'setRotation',
    'setScale',
    'setDepth',
    'setFrame',
    'setTintFill',
    'clearTint',
    'destroy',
  ]) {
    o[n] = () => o;
  }
  return o;
}

function makePlayer(shield = 0) {
  const scene = {
    add: { circle: chain, sprite: chain, existing: () => undefined },
    physics: { add: { existing: () => undefined } },
    anims: { exists: () => true, create: () => undefined, generateFrameNumbers: () => [] },
  };
  const config = {
    maxHp: 100,
    turnSpeedDegPerSec: 100,
    weaponStage: 0,
    damageFactor: 1,
    fireRateFactor: 1,
  } as unknown as PlayerConfig;
  const lasers = { fire: () => undefined };
  const p = new Player(scene as never, 0, 0, lasers as never, config);
  p.powers = { ...p.powers, shieldLeft: shield };
  const events: ActivePlayerStatus[][] = [];
  const hurt = vi.fn();
  p.callbacks.onStatusChange = (e) => events.push(e);
  p.callbacks.onHurt = hurt;
  return { p, events, hurt };
}

describe('Player status effects (AP-102)', () => {
  it('poison deals damage per second, shield first, without a hurt flash each frame', () => {
    const { p, hurt } = makePlayer(5);
    p.applyStatus({ poison: { dps: 4, durationMs: 3000 } });
    p.update(1000, 0);
    expect(p.hp).toBe(100);
    expect(p.powers.shieldLeft).toBeCloseTo(1);
    p.update(1000, 0);
    expect(p.powers.shieldLeft).toBe(0);
    expect(p.hp).toBeCloseTo(97);
    expect(hurt).not.toHaveBeenCalled();
  });

  it('poison does not stack and ends after its duration', () => {
    const { p } = makePlayer();
    p.applyStatus({ poison: { dps: 10, durationMs: 2000 } });
    p.applyStatus({ poison: { dps: 10, durationMs: 2000 } });
    for (let i = 0; i < 10; i++) p.update(500, 0);
    expect(p.hp).toBeCloseTo(80);
    expect(p.activeStatus).toEqual([]);
  });

  it('slow multiplies the turn speed and ends after the duration', () => {
    const { p } = makePlayer();
    p.applyStatus({ slow: { turnFactor: 0.5, durationMs: 2000 } });
    p.update(500, Math.PI);
    expect(p.facingDeg).toBeCloseTo(25);
    p.facingDeg = 0;
    p.update(1500, Math.PI);
    p.update(500, Math.PI);
    p.facingDeg = 0;
    p.update(500, Math.PI);
    expect(p.facingDeg).toBeCloseTo(50);
  });

  it('emits player-status on start, on shown-second change and on end', () => {
    const { p, events } = makePlayer();
    p.applyStatus({ slow: { turnFactor: 0.5, durationMs: 2000 } });
    expect(events).toHaveLength(1);
    p.update(100, 0);
    expect(events).toHaveLength(1);
    p.update(1000, 0);
    expect(events).toHaveLength(2);
    p.update(2000, 0);
    expect(events.at(-1)).toEqual([]);
  });

  it('clearStatus ends the effects (round end) and death clears them', () => {
    const { p, events } = makePlayer();
    p.applyStatus({ poison: { dps: 1, durationMs: 5000 } });
    p.clearStatus();
    expect(p.activeStatus).toEqual([]);
    expect(events.at(-1)).toEqual([]);
    p.applyStatus({ poison: { dps: 1000, durationMs: 5000 } });
    p.update(1000, 0);
    expect(p.isDead).toBe(true);
    expect(p.activeStatus).toEqual([]);
    p.applyStatus({ slow: { turnFactor: 0.5, durationMs: 1000 } });
    expect(p.activeStatus).toEqual([]);
  });

  it('a paused game applies no tick: no update call means no time passes', () => {
    const { p } = makePlayer();
    p.applyStatus({ poison: { dps: 10, durationMs: 2000 } });
    expect(p.activeStatus[0]?.remainingMs).toBe(2000);
    expect(p.hp).toBe(100);
  });
});

describe('statusDisplay (HUD states)', () => {
  it('is hidden without an effect', () => {
    expect(statusDisplay('poison', 0, 3000)).toBeNull();
    expect(statusDisplay('slow', Number.NaN, 0)).toBeNull();
  });

  it('shows label text plus seconds and a remaining-time ratio', () => {
    const d = statusDisplay('poison', 1500, 3000);
    expect(d?.text).toBe('GIFT 2s');
    expect(d?.ratio).toBeCloseTo(0.5);
    expect(statusDisplay('slow', 1000, 1000)?.text).toBe(`${STATUS_LABELS.slow} 1s`);
    expect(statusDisplay('slow', 4000, 1000)?.ratio).toBe(1);
  });
});
