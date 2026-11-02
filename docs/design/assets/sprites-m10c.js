/* Final sprites, part 8 (Ergaenzung H-39 "M10: Boss-Finisher"), delivery part 2, Level 40.
 * Builds the Level 40 sheets with finale40() from sprites-m10b.js (window.PX_FINISHER).
 * Load order: sprites.js, sprites-world.js, sprites-desert.js, sprites-m8.js, sprites-m9.js, sprites-m10.js, sprites-m10b.js, this file.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs). Own file = own build time slot.
 *
 *   finisher-finale-40a  320x180 x9  Level 40, Pharao, LETZTER STERN, frames 0-8; drawn x2
 *   finisher-finale-40b  320x180 x9  frames 9-17 (two sheets: one sheet of 18 would be 5760 px wide, over the 4096 px texture limit)
 * Frames: 0-1 memory panels, 2 establish, 3 charge, 4 aim, 5 leap, 6 roar, 7 beam, 8 impact light (sheet a) |
 *         9 impact dark, 10 rears up, 11 charge 2, 12 beam 2, 13 impact light 2, 14 mask cracks, 15 sand in the wind,
 *         16 sand and first light, 17 sunrise, astronaut from behind (sheet b). Impact frames: 8, 9, 13.
 */
(function (root) {
  const S = root.PX_SPRITES;
  const { sheet, finale40 } = root.PX_FINISHER;
  const F40 = finale40();
  S['finisher-finale-40a'] = sheet(F40.slice(0, 9));
  S['finisher-finale-40b'] = sheet(F40.slice(9));
})(typeof window !== 'undefined' ? window : globalThis);
