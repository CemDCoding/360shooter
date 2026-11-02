import { ARENA } from '../../src/config/arena';
import { ASSETS } from '../../src/config/assets';
import { rimRadii } from '../../src/entities/bosses/rim';
import { describe, expect, it } from 'vitest';
import { BATCH_STARTS, LEVEL_COUNT } from '../../src/config/levels';
import {
  BOSS_HP_BY_LEVEL,
  BOSS_SPAWN_REMAINING_MS,
  BOSS_TUNING,
  BOSS_WARNING_REMAINING_MS,
  BOSSES,
  MIN_REACTION_MS,
  MIN_TELEGRAPH_MS,
} from '../../src/config/bosses';
import { PARRY_RULES } from '../../src/config/parry';
import { WEAPON_MOUNT } from '../../src/config/weaponMount';
import { flightTimeMs } from '../../src/entities/bosses/bossGeometry';

function numbers(o: unknown, path = ''): [string, number][] {
  if (typeof o === 'number') return [[path, o]];
  if (o && typeof o === 'object') {
    return Object.entries(o).flatMap(([k, v]) => numbers(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe('boss timing (PE-76)', () => {
  it('spawns the boss at 30 s remaining and warns 3 s earlier', () => {
    expect(BOSS_SPAWN_REMAINING_MS).toBe(30_000);
    expect(BOSS_WARNING_REMAINING_MS - BOSS_SPAWN_REMAINING_MS).toBe(3000);
  });
});

describe('boss config (PE-75)', () => {
  it('announces every attack at least MIN_TELEGRAPH_MS and keeps the cooldown above it', () => {
    for (const def of Object.values(BOSSES)) {
      for (const a of def.attacks) {
        expect(a.telegraphMs, `${def.id}.${a.id}`).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
        expect(a.cooldownMs, `${def.id}.${a.id}`).toBeGreaterThan(a.telegraphMs);
      }
    }
  });

  it('announces fade for 1 s', () => {
    const fade = BOSSES.forestGhost.attacks.find((a) => a.id === 'fade');
    expect(fade?.telegraphMs).toBe(1000);
  });

  it('announces rootThrust at least MIN_REACTION_MS', () => {
    const a = BOSSES.rootMonster.attacks.find((x) => x.id === 'rootThrust');
    expect(a?.telegraphMs).toBeGreaterThanOrEqual(MIN_REACTION_MS);
  });

  it('lets lasers hit the bud from every aim direction', () => {
    const m = WEAPON_MOUNT;
    const hand = Math.hypot(m.hand.x, m.hand.y);
    const muzzle = Math.hypot(m.muzzle.x, m.muzzle.y);
    expect(BOSS_TUNING.rootMonster.sprout.hitRadius).toBeGreaterThanOrEqual(hand + muzzle);
  });

  it('gives the player MIN_REACTION_MS against ghost orbs', () => {
    const g = BOSS_TUNING.forestGhost;
    const ms = flightTimeMs(
      g.orbitRadius - BOSS_TUNING.playerHitRadius - g.orbRadius,
      g.orbSpeedPxPerSec,
    );
    expect(ms).toBeGreaterThanOrEqual(MIN_REACTION_MS);
  });

  it('gives the player MIN_REACTION_MS against ring roots', () => {
    const r = BOSS_TUNING.rootMonster.ring;
    const ms = flightTimeMs(
      r.radius - BOSS_TUNING.playerHitRadius - r.spikeRadius,
      r.speedPxPerSec,
    );
    expect(ms).toBeGreaterThanOrEqual(MIN_REACTION_MS);
  });

  it('warns the stone roll at least MIN_REACTION_MS, whatever the arena width (PE-75, PE-101)', () => {
    // The warning time is fixed; a longer roll (800 wide) only lengthens the roll after the warning.
    const roll = BOSSES.giantStone.attacks.find((x) => x.id === 'roll');
    expect(roll?.telegraphMs).toBeGreaterThanOrEqual(MIN_REACTION_MS);
    for (const w of [ARENA.baseWidth, ARENA.maxWidth]) {
      const rim = rimRadii(BOSS_TUNING.giantStone.rim, {
        width: w,
        height: ARENA.height,
        margin: 0,
      });
      expect(rim.rx).toBeLessThan(w / 2);
    }
  });

  it('announces the sand worm attacks fairly (AP-100)', () => {
    const at = (id: string) => BOSSES.giantSandWorm.attacks.find((x) => x.id === id);
    // The break-out circle shows for the whole dive: at least MIN_REACTION_MS before it hurts.
    expect(at('burrow')?.telegraphMs).toBeGreaterThanOrEqual(MIN_REACTION_MS);
    expect(at('spikeVolley')?.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    expect(at('coil')?.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    expect(at('coil')?.extraOnly).toBe(true);
    // The worm moves on the same rim as the boss appears on, so it never starts inside its path.
    expect(BOSS_TUNING.giantSandWorm.orbit).toEqual(BOSS_TUNING.giantStone.rim);
  });

  it('announces the guardian dog attacks fairly and never shields it endlessly (AP-103)', () => {
    const at = (id: string) => BOSSES.guardianDog.attacks.find((x) => x.id === id);
    for (const id of ['runeShield', 'guardBark', 'summonMummies']) {
      expect(at(id)?.telegraphMs, id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    }
    expect(at('summonMummies')?.extraOnly).toBe(true);
    // The shield ends before the next one can come (the cooldown starts when the shield goes up).
    const dog = BOSS_TUNING.guardianDog;
    expect(dog.runeShield.maxMs).toBeLessThan(at('runeShield')?.cooldownMs ?? 0);
    expect(dog.runeShield.runeCount).toBe(3);
    expect(dog.summonMummies.count).toBe(3);
    expect(dog.orbit).toEqual(BOSS_TUNING.giantStone.rim);
  });

  it('caps the ring damage without counterplay at 3 times the attack damage', () => {
    const r = BOSS_TUNING.rootMonster.ring;
    expect(r.damageShare * r.spikeCount).toBeLessThanOrEqual(3);
  });

  it('has only finite numbers above 0', () => {
    for (const [path, v] of numbers(BOSS_TUNING)) {
      expect(Number.isFinite(v), path).toBe(true);
      expect(v, path).toBeGreaterThan(0);
    }
    expect(Number.isFinite(MIN_REACTION_MS) && MIN_REACTION_MS > 0).toBe(true);
  });
});

describe('boss display names', () => {
  it('has the display names of the bosses', () => {
    expect(BOSSES.rootMonster.name).toBe('Verwurzeltes Baummonster');
    expect(BOSSES.forestGhost.name).toBe('Waldgeist');
    expect(BOSSES.giantStone.name).toBe('Riesen-Stein');
    expect(BOSSES.giantSandWorm.name).toBe('Riesen-Sand-Wurm');
    expect(BOSSES.guardianDog.name).toBe('Antiker Wächter-Hund');
    expect(BOSSES.pharaoh.name).toBe('Pharao');
  });
});

describe('M5 bosses (AP-97, PE-128)', () => {
  const expected = {
    giantSandWorm: { sprite: 'boss-sand-worm', base: ['burrow', 'spikeVolley'], extra: ['coil'] },
    guardianDog: {
      sprite: 'boss-guardian-dog',
      base: ['runeShield', 'guardBark'],
      extra: ['summonMummies', 'heartScale'],
    },
    pharaoh: { sprite: 'boss-pharaoh', base: ['goldCurse', 'sarcophagus'], extra: ['sandstorm'] },
  } as const;

  it('has six bosses, each keyed by its own id', () => {
    expect(Object.keys(BOSSES).sort()).toEqual([
      'forestGhost',
      'giantSandWorm',
      'giantStone',
      'guardianDog',
      'pharaoh',
      'rootMonster',
    ]);
    for (const [id, def] of Object.entries(BOSSES)) expect(def.id).toBe(id);
  });

  it.each(Object.entries(expected))('%s has the attacks of PE-128', (id, e) => {
    const def = BOSSES[id as keyof typeof expected];
    expect(def.spriteKey).toBe(e.sprite);
    expect(def.attacks.filter((a) => !a.extraOnly).map((a) => a.id)).toEqual(e.base);
    expect(def.attacks.filter((a) => a.extraOnly).map((a) => a.id)).toEqual(e.extra);
  });

  it('starts in the range of the old bosses and grows from batch to batch', () => {
    expect(BOSSES.giantSandWorm.baseHp).toBeGreaterThan(BOSSES.giantStone.baseHp);
    expect(BOSSES.guardianDog.baseHp).toBeGreaterThan(BOSSES.giantSandWorm.baseHp);
    expect(BOSSES.pharaoh.baseHp).toBeGreaterThan(BOSSES.guardianDog.baseHp);
    for (const id of Object.keys(expected) as (keyof typeof expected)[]) {
      expect(BOSSES[id].baseDamage, id).toBeGreaterThan(0);
      expect(BOSSES[id].baseDamage, id).toBeLessThanOrEqual(20);
    }
  });

  it('has a sprite in the asset manifest for every boss and the extra boss sprites', () => {
    const keys = [
      ...Object.values(BOSSES).map((b) => b.spriteKey),
      'boss-sand-worm-body',
      'boss-pharaoh-orb',
    ];
    for (const key of keys) {
      expect(ASSETS.find((a) => a.key === key)?.kind, key).toBe('spritesheet');
    }
  });
});

describe('M7 boss data (AP-126, PE-154, PE-157)', () => {
  it('sets the base HP to the HP of the first level of the boss (AP-170)', () => {
    const hp = Object.fromEntries(Object.values(BOSSES).map((b) => [b.id, b.baseHp]));
    expect(hp).toEqual({
      rootMonster: BOSS_HP_BY_LEVEL[0],
      forestGhost: BOSS_HP_BY_LEVEL[5],
      giantStone: BOSS_HP_BY_LEVEL[10],
      giantSandWorm: BOSS_HP_BY_LEVEL[21],
      guardianDog: BOSS_HP_BY_LEVEL[26],
      pharaoh: BOSS_HP_BY_LEVEL[31],
    });
  });

  it('has one HP per level, positive and rising inside a batch (AP-170)', () => {
    expect(BOSS_HP_BY_LEVEL).toHaveLength(LEVEL_COUNT);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      expect(BOSS_HP_BY_LEVEL[i], `level ${i}`).toBeGreaterThan(0);
      if (i > 0 && !BATCH_STARTS.some((b) => b.first === i)) {
        expect(BOSS_HP_BY_LEVEL[i], `level ${i}`).toBeGreaterThan(BOSS_HP_BY_LEVEL[i - 1]);
      }
    }
  });

  it('keeps telegraph times, damage and circles of AP-170 unchanged', () => {
    // [telegraphMs, damage, parryCircles] je Angriff, Stand vor AP-170 (nur Abklingzeiten wurden verlaengert).
    const want: Record<string, [number, number, number]> = {
      'rootMonster.rootThrust': [1200, 15, 2],
      'rootMonster.forestCall': [1200, 0, 0],
      'rootMonster.rootRing': [1500, 15, 2],
      'forestGhost.orbFan': [1800, 10, 2],
      'forestGhost.fade': [1000, 0, 0],
      'forestGhost.decoys': [1200, 8, 1],
      'giantStone.roll': [1200, 20, 3],
      'giantStone.quarrel': [1400, 15, 2],
      'giantSandWorm.burrow': [1200, 18, 3],
      'giantSandWorm.spikeVolley': [1200, 10, 1],
      'giantSandWorm.coil': [1500, 15, 2],
      'guardianDog.runeShield': [1000, 0, 0],
      'guardianDog.guardBark': [1200, 15, 3],
      'guardianDog.summonMummies': [1200, 0, 0],
      'guardianDog.heartScale': [1800, 15, 2],
      'pharaoh.goldCurse': [1800, 10, 1],
      'pharaoh.sarcophagus': [1200, 0, 0],
      'pharaoh.sandstorm': [1500, 8, 1],
    };
    const got = Object.fromEntries(
      Object.values(BOSSES).flatMap((b) =>
        b.attacks.map((a) => [`${b.id}.${a.id}`, [a.telegraphMs, a.damage, a.parryCircles]]),
      ),
    );
    expect(got).toEqual(want);
  });

  it('announces damaging attacks at least 1200 ms and sets the circles by damage', () => {
    for (const def of Object.values(BOSSES)) {
      for (const a of def.attacks) {
        const id = `${def.id}.${a.id}`;
        if (a.damage === 0) {
          expect(a.parryCircles, id).toBe(0);
        } else {
          expect(a.telegraphMs, id).toBeGreaterThanOrEqual(1200);
          // M9 (PE-190) raised orbFan to 2 and guardBark to 3 circles; decoys deals 8 with 1.
          const m9: Record<string, number> = {
            'forestGhost.orbFan': 2,
            'guardianDog.guardBark': 3,
          };
          expect(a.parryCircles, id).toBe(m9[id] ?? (a.damage >= 18 ? 3 : a.damage >= 13 ? 2 : 1));
        }
      }
    }
  });
});

describe('M9 boss data (AP-148, PE-188 to PE-190)', () => {
  const all = Object.values(BOSSES).flatMap((b) => b.attacks.map((a) => ({ b, a })));
  const get = (boss: keyof typeof BOSSES, id: string) =>
    BOSSES[boss].attacks.find((a) => a.id === id)!;

  it('real step count equals parryCircles (decoys excluded, one right choice per group)', () => {
    for (const { b, a } of all) {
      if (!a.parryPattern) continue;
      const steps = a.parryPattern.steps;
      const real = steps.filter((s) => s.kind !== 'decoy' && s.kind !== 'choice').length;
      const groups = new Set(steps.filter((s) => s.kind === 'choice').map((s) => s.group ?? 0));
      for (const g of groups) {
        const ch = steps.filter((s) => s.kind === 'choice' && (s.group ?? 0) === g);
        expect(ch.filter((s) => s.correct).length, `${b.id}.${a.id} group ${g}`).toBe(1);
      }
      expect(real + groups.size, `${b.id}.${a.id}`).toBe(a.parryCircles);
    }
  });

  it('keeps the announcement long enough', () => {
    for (const { b, a } of all) {
      if (a.damage > 0) expect(a.telegraphMs, `${b.id}.${a.id}`).toBeGreaterThanOrEqual(1200);
      const kinds = a.parryPattern?.steps.map((s) => s.kind) ?? [];
      if (kinds.includes('sequence') || kinds.includes('choice')) {
        expect(a.telegraphMs, `${b.id}.${a.id}`).toBeGreaterThanOrEqual(
          PARRY_RULES.seqTelegraphMinMs,
        );
      }
    }
  });

  it('keeps hold times inside the allowed range', () => {
    for (const { a } of all) {
      for (const s of a.parryPattern?.steps ?? []) {
        if (s.kind === 'hold') {
          expect(s.holdMs).toBeGreaterThanOrEqual(PARRY_RULES.holdMinMs);
          expect(s.holdMs).toBeLessThanOrEqual(PARRY_RULES.holdMaxMs);
        }
      }
    }
  });

  it('follows PE-190 for the changed attacks', () => {
    expect(get('forestGhost', 'orbFan').parryCircles).toBe(2);
    expect(get('guardianDog', 'guardBark').parryCircles).toBe(3);
    expect(get('forestGhost', 'decoys').damage).toBe(8);
    expect(get('forestGhost', 'decoys').parryCircles).toBe(1);
    expect(get('rootMonster', 'rootThrust').parryPattern!.steps.map((s) => s.kind)).toEqual([
      'hold',
      'tap',
    ]);
    expect(get('giantSandWorm', 'coil').parryPattern!.steps.map((s) => s.kind)).toEqual([
      'drag',
      'drag',
    ]);
    expect(get('giantSandWorm', 'burrow').parryPattern).toBeUndefined();
    expect(get('giantSandWorm', 'spikeVolley').parryPattern).toBeUndefined();
  });

  it('adds quarrel and heartScale as optIn extra attacks with 15 damage', () => {
    for (const [boss, id] of [
      ['giantStone', 'quarrel'],
      ['guardianDog', 'heartScale'],
    ] as const) {
      const a = get(boss, id);
      expect(a.optIn).toBe(true);
      expect(a.extraOnly).toBe(true);
      expect(a.damage).toBe(15);
      expect(a.parryCircles).toBe(2);
    }
    expect(all.filter(({ a }) => a.optIn).length).toBe(2);
  });
});
