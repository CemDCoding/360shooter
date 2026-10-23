export function applyDamage(hp: number, damage: number): number {
  return Math.max(0, hp - Math.max(0, damage));
}

export function applyHeal(hp: number, amount: number, maxHp: number): number {
  return Math.min(maxHp, hp + Math.max(0, amount));
}

export function isDead(hp: number): boolean {
  return hp <= 0;
}

/** Damage dealt by an aura with `dps` during a step of dtMs. */
export function auraDamage(dps: number, dtMs: number): number {
  return (Math.max(0, dps) * Math.max(0, dtMs)) / 1000;
}
