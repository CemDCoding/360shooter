import { circlesOverlap } from './geometry';

export interface CircleTarget {
  active: boolean;
  x: number;
  y: number;
  radius: number;
}

/** True if a player laser destroys an enemy projectile: both active and circles overlap (touching counts). */
export function canLaserDestroyBolt(laser: CircleTarget, bolt: CircleTarget): boolean {
  if (!laser.active || !bolt.active) return false;
  return circlesOverlap(laser.x, laser.y, laser.radius, bolt.x, bolt.y, bolt.radius);
}
