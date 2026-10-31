import { describe, expect, it, vi } from 'vitest';

const { chips, FakeChip } = vi.hoisted(() => {
  const chips: unknown[] = [];
  class FakeChip {
    visible = true;
    text = '';
    bar = -1;
    style: Record<string, unknown> = {};
    setVisible(v: boolean) {
      this.visible = v;
    }
    setContent(t: string) {
      this.text = t;
    }
    setBar(r: number) {
      this.bar = r;
    }
    setStyle(st: Record<string, unknown>) {
      this.style = st;
    }
    constructor() {
      chips.push(this);
    }
  }
  return { chips: chips as FakeChip[], FakeChip };
});
vi.mock('../../src/scenes/hud/FunkPanel', () => ({ FunkChip: FakeChip }));

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
import { ContactStatus, hitPlayer, Player, type PlayerConfig } from '../../src/entities/Player';
import { resolveHazardHits, type BossHazard } from '../../src/entities/bosses/hazards';
import { StatusIndicator } from '../../src/scenes/hud/StatusIndicator';
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

describe('wiring of the status hits (AP-102)', () => {
  const POISON = { poison: { dps: 2, durationMs: 3000 } };
  const SLOW = { slow: { turnFactor: 0.5, durationMs: 2000 } };

  it('a refresh without a visible change emits no event, idle emits nothing', () => {
    const { p, events } = makePlayer();
    p.update(16, 0);
    expect(events).toHaveLength(0);
    p.applyStatus(POISON);
    for (let i = 0; i < 5; i++) p.applyStatus(POISON);
    expect(events).toHaveLength(1);
  });

  it('contact: at most one applyStatus per kind and frame, flush resets', () => {
    const c = new ContactStatus();
    const apply = vi.fn();
    c.add(POISON);
    c.add(POISON);
    c.add(SLOW);
    c.add(undefined);
    c.flush({ applyStatus: apply });
    expect(apply).toHaveBeenCalledTimes(2);
    c.flush({ applyStatus: apply });
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('witch bolt: damage first, then its onHit', () => {
    const { p } = makePlayer(3);
    hitPlayer(p, 2, SLOW);
    expect(p.powers.shieldLeft).toBeCloseTo(1);
    expect(p.activeStatus.map((e) => e.kind)).toEqual(['slow']);
  });

  it('boss hazard hit passes onHit through resolveHazardHits to the player', () => {
    const { p } = makePlayer();
    const hazard: BossHazard = {
      get active() {
        return true;
      },
      shootable: false,
      damage: 5,
      onHit: POISON,
      shape: { kind: 'circle', x: 0, y: 0, radius: 50 },
      playerHit: () => 5,
      onLaserHit() {},
    } as unknown as BossHazard;
    resolveHazardHits(
      [hazard],
      [],
      { x: 0, y: 0, radius: 10 },
      {
        releaseLaser() {},
        onLaserUsed() {},
        hitPlayer: (d, o) => hitPlayer(p, d, o),
      },
    );
    expect(p.hp).toBe(95);
    expect(p.activeStatus.map((e) => e.kind)).toEqual(['poison']);
  });

  it('round end (clearStatus as called by endRound) tells the HUD and stops the effects', () => {
    const { p, events } = makePlayer();
    p.applyStatus(POISON);
    p.applyStatus(SLOW);
    p.clearStatus();
    expect(events.at(-1)).toEqual([]);
    p.update(1000, 0);
    expect(p.hp).toBe(100);
  });
});

describe('StatusIndicator', () => {
  it('shows label chips per kind with their own frame and hides ended effects', () => {
    chips.length = 0;
    const onChange = vi.fn();
    const ind = new StatusIndicator({} as never, 1, onChange);
    const [poison, slow] = chips;
    expect(poison.visible).toBe(false);
    expect(slow.visible).toBe(false);
    ind.set([
      { kind: 'poison', remainingMs: 3000 },
      { kind: 'slow', remainingMs: 2000 },
    ]);
    expect(poison.text).toBe('GIFT 3s');
    expect(slow.text).toBe('LAHM 2s');
    expect(poison.style).toEqual({ line: 'hud.danger', glow: true });
    expect(slow.style).toEqual({ line: 'hud.accent', dotted: true });
    ind.set([{ kind: 'poison', remainingMs: 1500 }]);
    expect(poison.bar).toBeCloseTo(0.5);
    expect(slow.visible).toBe(false);
    ind.set([]);
    expect(poison.visible).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(4);
  });
});
