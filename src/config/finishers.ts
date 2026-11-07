// Rules of the boss finisher sequences (M10 skip lock, M13 choreographies, AP-191 cleanup, PE-241).
// The numbers of the choreographies live in config/choreo/**; the flash window exists only here.
import type { ChoreoRules, FinisherRules } from '../contracts';

/** Skip lock (hand test H-40, PE-234). */
export const FINISHER_RULES: FinisherRules = {
  skipLockMs: 400,
  skipFirstViewMs: 3000,
};

/** Rules of the choreographies (M13, AP-181, RS-06.2, RS-06.4, RS-06.5, PE-245, PE-247, PE-248). */
export const CHOREO_RULES: ChoreoRules = {
  anticipationMinMs: 150,
  bossAnticipationMaxMs: 600,
  actionMaxMs: 120,
  hitStopMinMs: 100,
  hitStopMaxMs: 200,
  finalHitStopMaxMs: 300,
  followThroughMinMs: 200,
  flashMinGapMs: 350,
  momentMaxExtraFlashes: 1,
  flashMaxPerWindow: 3,
  flashWindowMs: 1000,
  maxPartsPerRig: 10,
  maxAfterimagesPerPart: 4,
  maxParticles: 150,
  maxRigDepth: 2,
  maxFineRotationDeg: 20,
  zoomTransitionMaxMs: 200,
  momentRealMs: { minMs: 3000, maxMs: 4000 },
  cinematicRealMs: { minMs: 14500, maxMs: 15500 },
  finalCinematicRealMs: { minMs: 19500, maxMs: 20500 },
  cinematicShots: 5,
  finalCinematicShots: 6,
  reduceDropKinds: ['flash', 'impact', 'shake', 'hitWhite'],
};
