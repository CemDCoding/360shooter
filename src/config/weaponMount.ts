// Waffen-Geometrie der Strahlenpistole (AP-50), Werte aus docs/design/design-brief.md und mockups/sprites.html.
// Alle Maße in Pixeln, Waffe zeigt im Sprite nach rechts (0°), y wächst nach unten.

export const WEAPON_MOUNT = {
  /** Framegröße von weapon-raygun.png */
  frame: { width: 24, height: 16 },
  /** Griff = Drehpunkt (Origin) im Frame */
  grip: { x: 7, y: 12 },
  /** Handpunkt relativ zur Mitte der Spielerin (32x32); gespiegelt wird x negiert */
  hand: { x: 10, y: 9 },
  /** Mündung relativ zum Griff bei 0° ohne flipY */
  muzzle: { x: 15, y: -5 },
  /** Obergrenze der Summe der Waffen-Upgrades je Ausbaustufe (0–6, 7–13, 14–20) */
  stageMaxUpgrades: [6, 13, 20],
  /** Waffe liegt hinter der Figur bei Zielwinkeln von -160° bis -20° (inklusive) */
  behindFigureDeg: { from: -160, to: -20 },
  /** Dauer in ms, in der die Waffe vollständig die Seite wechselt (Weg -1 bis +1), Startwert PE-67 */
  mirrorMs: 120,
  /** Frames je Ausbaustufe: 0 = Ruhe, 1 = Schuss (Frames 0–1, 2–3, 4–5) */
  framesPerStage: 2,
} as const;
