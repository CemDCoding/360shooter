/* Final in-game sprites, part 9 (Ergaenzung H-41/H-43 "M11 Quicktime-Fokus, M12 Rand-Marker und Eliten").
 * Extends window.PX_SPRITES. Load order: sprites.js, sprites-world.js, sprites-desert.js, sprites-m8.js, sprites-m9.js, this file.
 * Same format: { frameWidth, frameHeight, palette, frames: [rows[]] }, '.' = transparent.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 *
 *   elite-crown    9x7  x1  colour sprite (ice + ink outline), NOT tinted, drawn 1x above an elite
 *   event-markers  24x24 x2 monochrome white 'w' + dark outline 'o'; the game tints with color.game.event-marker
 *                  (setTint, multiply), the outline stays dark. Drawn for the TOP edge (pointing down = inward);
 *                  other edges rotate by 90 deg steps only (crisp pixels).
 *                  frame 0 = SCHWARM wedge (3 chevrons, 18/12/6 px wide, narrowing inward)
 *                  frame 1 = ZANGE double arrow (shaft + 2 equal arrowheads); the pincer shows one on each of 2 opposite edges
 * The RING marker has no sprite: 2x2 dots (Graphics) along the whole marker frame plus the word tag.
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const INK = '#0b0610';

  function blank(w, h) { return Array.from({ length: h }, () => Array(w).fill('.')); }
  // 8-neighbour outline in 'o' around every non-transparent pixel
  function outline(g) {
    const h = g.length, w = g[0].length, out = g.map((r) => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] !== '.') continue;
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && g[yy][xx] !== '.' && g[yy][xx] !== 'o') near = true;
      }
      if (near) out[y][x] = 'o';
    }
    return out;
  }
  const rows = (g) => g.map((r) => r.join(''));

  // ---------- elite crown: 7x5 shape, 1 px outline -> 9x7 ----------
  const CROWN = ['w..w..w', 'ww.w.ww', 'wwwwwww', 'wbwbwbw', 'wwwwwww'];
  const cg = blank(9, 7);
  CROWN.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') cg[y + 1][x + 1] = c; }));
  S['elite-crown'] = { frameWidth: 9, frameHeight: 7, palette: { o: INK, w: '#e8fbff', b: '#5ab4e6' }, frames: [rows(outline(cg))] };

  // ---------- event markers, 24x24, top edge, pointing down ----------
  // chevron: centre cx, top y0, half width hw, 2 px thick stair (1 px down per 2 px in)
  function chevron(g, cx, y0, hw) {
    for (let i = 0; i < hw; i++) {
      const y = y0 + (i >> 1);
      [cx - hw + i, cx + hw - 1 - i].forEach((x) => { g[y][x] = 'w'; g[y + 1][x] = 'w'; });
    }
  }
  const swarm = blank(24, 24);
  chevron(swarm, 12, 2, 9);   // 18 wide
  chevron(swarm, 12, 9, 6);   // 12 wide
  chevron(swarm, 12, 16, 3);  // 6 wide
  const pincer = blank(24, 24);
  for (let y = 1; y < 9; y++) { pincer[y][11] = 'w'; pincer[y][12] = 'w'; } // shaft
  chevron(pincer, 12, 7, 8);
  chevron(pincer, 12, 13, 8);
  S['event-markers'] = { frameWidth: 24, frameHeight: 24, palette: { o: '#0a1108', w: '#ffffff' }, frames: [rows(outline(swarm)), rows(outline(pincer))] };
})(typeof window !== 'undefined' ? window : globalThis);
