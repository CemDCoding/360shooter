/** Contact damage budget of an enemy (AP-60). Pure logic, no Phaser. */

/** Adds amount to the dealt sum; non finite or negative amounts count as 0. */
export function addContact(dealt: number, amount: number): number {
  const base = Number.isFinite(dealt) && dealt > 0 ? dealt : 0;
  const add = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return base + add;
}

/** True once dealt reaches the limit; without a valid limit always false. */
export function isContactSpent(dealt: number, limit: number | undefined): boolean {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) return false;
  return dealt >= limit;
}
