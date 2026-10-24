// Balancing (AP-15), Erklaerung in docs/balancing.md.
import type { ProgressionRules } from '../contracts';

export const PROGRESSION: ProgressionRules = {
  xpCurveBase: 100,
  xpCurveExponent: 1.5,
  lossXpFactor: 0.5,
};
