// Referenzspielerin und Ziel-Baender des Balancing-Updates (M11, AP-167, PE-208, RS-05.1).
// Startwerte RS-05.1, nach H-42 nachjustieren. Reine Annahmen und Zielwerte fuer `logic/balanceModel.ts` und die Tests
// `tests/logic/balance{Model,Boss,Pets}.test.ts`; sie aendern das Spiel nicht.
// Erklaerung und Tabelle der 41 Level: docs/balancing.md, Abschnitt "Referenzspielerin und Ziel-Baender (M11)".

/** Annahmen der Referenzspielerin (RS-05 Abschnitt 0). Geschaetzt, im Handtest zu pruefen. */
export const REFERENCE_PLAYER = {
  /** Ab diesem Level kommt zu jedem Sieg eine Niederlage (halbes Gold, `GOLD_KEEP_ON_LOSS`). */
  lossesFromLevel: 10,
  /** Anteil des Goldes je Schadens-Spur (Feuerrate und Schaden je). */
  damageTrackGoldShare: 0.35,
  /** Anteil des Goldes fuer Leben und Drehtempo zusammen (je Spur die Haelfte). */
  otherTracksGoldShare: 0.3,
  /** Trefferquote der Laser-Schuesse gegen den (grossen) Boss. */
  bossHitRate: 0.9,
  /** Doppelschuss im Mittel ueber den Boss-Kampf (Stufe 0 = 1, Stufe 1 = 2, Stufe 2 = 3). */
  doubleShotMeanFactor: 1.5,
  /** Power-ups des Pets im Boss-Kampf (Maximum, die Leiste ist kurz vor dem Boss voll). */
  petPowerUps: 3,
  /** Gegner starten so weit vom Zentrum (Diagonale/2 plus Rand der 640x360-Arena), px. */
  spawnRadiusPx: 380,
  /** Anteil der Kampfzeit, in dem sich die Spielerin zum naechsten Ziel dreht (Wickel der Mumie, AP-105). */
  aimShare: 0.5,
  /** Anteil der Abtauchzeit eines Eingraben-Gegners, die der Spielerin an Schusszeit verloren geht (AP-105). */
  burrowLossShare: 0.5,
} as const;

export interface Band {
  min: number;
  max: number;
}

/** Ziel-Baender (RS-05.1 bis RS-05.4). Alle Zeiten in Sekunden. */
export const BALANCE_BANDS = {
  /** Referenz-Druck jedes Levels. */
  pressure: { min: 0.75, max: 1.8 } as Band,
  /** Level 40 ist das Maximum und liegt in diesem Band. */
  finalLevelPressure: { min: 1.7, max: 1.8 } as Band,
  /**
   * Groesster Schritt des Referenz-Drucks von einem Level zum naechsten innerhalb eines Batches, je Abschnitt (AP-168,
   * PE-225, Q-81 (a)): Level 0 bis 4 +22 % (Zielzahlen RS-05.2), Level 21 bis 30 +15 % (bleiben unveraendert, Q-78 (a)),
   * alle uebrigen Level +12 %. Der erste passende Eintrag gilt, `maxStepForLevel` liest ihn.
   */
  maxStepBySection: [
    { first: 0, last: 4, max: 1.22 },
    { first: 21, last: 30, max: 1.15 },
    { first: 0, last: 40, max: 1.12 },
  ] as readonly { first: number; last: number; max: number }[],
  /** Gold je Minute weicht hoechstens so viel (Anteil) vom Nachbarlevel ab. */
  goldPerMinuteTolerance: 0.1,
  /** Boss-Dauer der Referenzspielerin ohne Pet, erstes Level eines Batches. */
  bossDurationBatchStart: { min: 20, max: 28 } as Band,
  /** Boss-Dauer, letztes Level eines Batches (dazwischen linear nach Index im Batch). */
  bossDurationBatchEnd: { min: 30, max: 38 } as Band,
  /** Boss-Dauer, letztes Level des Spiels. */
  bossDurationFinal: { min: 40, max: 50 } as Band,
  /** Anteil der Ankuendigungen an der Kampfdauer je Boss. */
  announceShareMax: 0.4,
  /** Anteil des Pets am Schaden gegen den Boss (Pet mit allen Power-ups). */
  petShare: { min: 0.2, max: 0.4 } as Band,
} as const;

/** Groesster erlaubter Druck-Schritt zum Vorgaenger fuer ein Level (Faktor, z. B. 1,22), nach `BALANCE_BANDS.maxStepBySection`. */
export function maxStepForLevel(levelId: number): number {
  const s = BALANCE_BANDS.maxStepBySection.find((x) => levelId >= x.first && levelId <= x.last);
  return s ? s.max : 1.12;
}
