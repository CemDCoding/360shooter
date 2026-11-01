/* Final in-game sprites, part 4 (Ergaenzung H-35 "M8"): player gear, pets, pet gear, eggs, diamond, effects.
 * Extends window.PX_SPRITES. Load order: sprites.js, sprites-world.js (PX_TOOLKIT), sprites-desert.js, this file.
 * Same format: { frameWidth, frameHeight, palette, frames: [rows[]] }, '.' = transparent.
 * Player-side outline is ink (#0b0610), like items and coins. Pets face right (the game mirrors them).
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 *
 * Gear overlays (gear-<set>-<slot>, 32x32 x4) lie exactly on the astronaut frames 0-3:
 *   frame 1 = head (rows 0-18) sinks 1 px, frame 2 = rows 0-20 lean 1 px left, frame 3 = frame 2 + antenna wobble.
 *   Draw order: astronaut, legs, body, head (= gearTextureKeys order). Same flipX as the astronaut.
 * Pet gear overlays (petgear-<pet>-<set>, 16x16 x6) lie exactly on the pet frames 0-5.
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const { grid, frames } = root.PX_TOOLKIT;
  const INK = '#0b0610';
  const ASTRO = S.astronaut.frames[0];
  const shift = (row, dx) => (dx < 0 ? row.slice(-dx) + '.'.repeat(-dx) : '.'.repeat(dx) + row.slice(0, row.length - dx));
  const blank = (w) => '.'.repeat(w);
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---------- shared gear palette (tokens color.sprite.gear-*) ----------
  const GEAR = {
    i: '#e8fbff', I: '#9fe6ff', j: '#5ab4e6', J: '#2f6fa8', // Diamant: ice hi, ice, shade, deep
    k: '#5a3450', K: '#3a2036', L: '#ff8a3a', l: '#ffd06a', R: '#e0483c', r: '#ff8a70', // Hoelle: obsidian hi/base, lava, lava hi, horn, horn hi
    W: '#ffffff', w: '#dfe6ff', G: '#ffd24a', g: '#c8901e', // Himmel: white, cloud shade, gold, gold shade
  };

  // ======================= PLAYER GEAR =======================
  const astro = (x, y) => (ASTRO[y] || '')[x] || '.';
  // Build one overlay in frame-0 coordinates. Outline only outside the astronaut silhouette,
  // so a piece never paints dark lines over the suit. `late` draws after the outline (halo ring).
  function overlay(draw, late) {
    const g = grid(32, 32);
    const api = {
      dye(x0, y0, x1, y1, map) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = map[astro(x, y)]; if (c) g.set(x, y, c); } return api; },
      px(list) { list.forEach(([x, y, c]) => g.set(x, y, c)); return api; },
      box(x0, y0, x1, y1, c) { g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, c); return api; },
      get: (x, y) => g.get(x, y),
    };
    draw(api);
    const src = g.rows().map((r) => [...r]);
    const out = src.map((r) => r.slice());
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (src[y][x] !== '.') continue;
      const a = astro(x, y);
      if (a !== '.' && a !== 'o') continue;
      if (N4.some(([dx, dy]) => { const v = (src[y + dy] || [])[x + dx]; return v && v !== '.'; })) out[y][x] = 'o';
    }
    if (late) late((x, y, c) => { out[y][x] = c; });
    return out.map((r) => r.join(''));
  }
  // Same moves as the astronaut frames (see sprites.js: ASTRO_1, lean, antenna wobble).
  function follow(rows) {
    const f1 = [blank(32), ...rows.slice(0, 19), ...rows.slice(20)];
    const f2 = rows.map((r, y) => (y <= 20 ? shift(r, -1) : r));
    const f3 = f2.map((r, y) => (y <= 3 ? shift(r, -1) : r));
    return [rows, f1, f2, f3];
  }
  const mirrorPts = (pts) => pts.map(([x, y, c]) => [31 - x, y, c]);
  const lugs = (api, top, mid, low) => api.px([[4, 12, top], [4, 13, mid], [4, 14, low], [27, 12, top], [27, 13, mid], [27, 14, low]]);
  const crystal = (api, x, top, bottom) => { api.px([[x + 1, top, 'i']]); for (let y = top + 1; y <= bottom; y++) api.px([[x, y, 'i'], [x + 1, y, 'I'], [x + 2, y, 'j']]); };
  const plate = (api, base, left, right, top, bottom) => {
    api.box(10, 21, 21, 25, base).box(10, 21, 10, 25, left).box(20, 21, 21, 25, right);
    if (top) api.box(11, 21, 19, 21, top);
    if (bottom) api.box(11, 25, 20, 25, bottom);
  };
  const pads = (api, l, r) => api.px([...l, ...r]);

  const PIECES = {
    // ---- Diamant: facetted ice, crystal spikes ----
    'diamond-head': overlay((a) => {
      crystal(a, 9, 2, 5); crystal(a, 12, 0, 4); crystal(a, 15, 2, 4);
      a.dye(18, 0, 21, 3, { c: 'i', a: 'I', A: 'j' });
      lugs(a, 'i', 'I', 'j');
    }),
    'diamond-body': overlay((a) => {
      plate(a, 'I', 'i', 'j', 'i', 'j');
      a.px([[15, 22, 'W'], [16, 22, 'W'], [14, 23, 'J'], [15, 23, 'i'], [16, 23, 'i'], [17, 23, 'J'], [15, 24, 'J'], [16, 24, 'J']]);
      pads(a, [[7, 20, 'i'], [8, 20, 'I'], [6, 21, 'i'], [7, 21, 'I'], [8, 21, 'I'], [9, 21, 'j'], [7, 22, 'j'], [8, 22, 'j']],
        [[24, 20, 'I'], [23, 20, 'I'], [25, 21, 'I'], [24, 21, 'I'], [23, 21, 'j'], [22, 21, 'j'], [24, 22, 'J'], [23, 22, 'J']]);
      a.dye(9, 20, 22, 20, { c: 'i', a: 'I', A: 'j' });
    }),
    'diamond-legs': overlay((a) => {
      a.box(10, 26, 21, 26, 'J').px([[15, 26, 'i'], [16, 26, 'i']]);
      a.dye(9, 27, 22, 28, { w: 'I', s: 'j' }).px([[11, 27, 'i'], [17, 27, 'i']]);
      a.dye(10, 29, 21, 29, { c: 'i', a: 'I', A: 'j' });
      a.px([[9, 28, 'i'], [9, 29, 'I'], [22, 28, 'I'], [22, 29, 'j']]);
    }),
    // ---- Hoelle: obsidian with lava seams, little horns ----
    'hell-head': overlay((a) => {
      a.px([[9, 4, 'r'], [10, 4, 'R'], [8, 3, 'r'], [9, 3, 'R'], [7, 2, 'r'], [8, 2, 'R'], [7, 1, 'R'], [6, 0, 'K']]);
      a.px([[21, 4, 'r'], [22, 4, 'R'], [22, 3, 'r'], [23, 3, 'R'], [23, 2, 'r'], [24, 2, 'R'], [24, 1, 'R'], [25, 0, 'K']]);
      a.dye(18, 0, 21, 3, { c: 'l', a: 'L', A: 'R' });
      lugs(a, 'K', 'L', 'K');
    }),
    'hell-body': overlay((a) => {
      plate(a, 'K', 'k', 'K', 'k', null);
      a.px([[11, 22, 'L'], [12, 23, 'L'], [12, 24, 'l'], [19, 22, 'L'], [18, 23, 'L'], [18, 24, 'L'], [19, 25, 'L'], [15, 22, 'L'], [15, 23, 'l'], [16, 23, 'l'], [16, 24, 'L']]);
      pads(a, [[6, 20, 'R'], [7, 20, 'k'], [8, 20, 'K'], [6, 21, 'k'], [7, 21, 'K'], [8, 21, 'L'], [9, 21, 'K'], [7, 22, 'K'], [8, 22, 'K']],
        [[25, 20, 'R'], [24, 20, 'K'], [23, 20, 'K'], [25, 21, 'K'], [24, 21, 'K'], [23, 21, 'L'], [22, 21, 'K'], [24, 22, 'K'], [23, 22, 'K']]);
      a.dye(9, 20, 22, 20, { c: 'l', a: 'L', A: 'R' });
    }),
    'hell-legs': overlay((a) => {
      a.box(10, 26, 21, 26, 'K').px([[15, 26, 'L'], [16, 26, 'l']]);
      a.dye(9, 27, 22, 28, { w: 'k', s: 'K' }).px([[12, 28, 'L'], [18, 28, 'L']]);
      a.dye(10, 29, 21, 29, { c: 'L', a: 'K', A: 'K' });
      a.px([[9, 28, 'l'], [9, 29, 'L'], [22, 28, 'l'], [22, 29, 'L']]);
    }),
    // ---- Himmel: white and gold, wings, halo ----
    'heaven-head': overlay((a) => {
      const wing = [[2, 9, 'W'], [3, 9, 'W'], [1, 10, 'W'], [2, 10, 'W'], [3, 10, 'W'], [0, 11, 'W'], [1, 11, 'W'], [2, 11, 'W'], [3, 11, 'w'], [0, 12, 'w'], [1, 12, 'W'], [2, 12, 'w'], [1, 13, 'w']];
      a.px(wing).px(mirrorPts(wing).map(([x, y, c]) => [x, y, c === 'W' && x > 28 ? 'W' : 'w']));
      a.dye(18, 0, 21, 3, { c: 'l', a: 'G', A: 'g' });
      lugs(a, 'G', 'G', 'g');
    }, (set) => {
      for (let x = 12; x <= 19; x++) { set(x, 0, 'G'); set(x, 2, 'g'); }
      [[10, 1], [11, 1], [20, 1], [21, 1]].forEach(([x, y]) => set(x, y, 'G'));
    }),
    'heaven-body': overlay((a) => {
      plate(a, 'W', 'G', 'w', null, 'g');
      a.box(21, 21, 21, 25, 'G');
      a.px([[15, 22, 'l'], [16, 22, 'G'], [15, 23, 'G'], [16, 23, 'g']]);
      pads(a, [[7, 20, 'W'], [8, 20, 'W'], [6, 21, 'W'], [7, 21, 'W'], [8, 21, 'w'], [9, 21, 'G'], [7, 22, 'w'], [8, 22, 'w']],
        [[24, 20, 'W'], [23, 20, 'W'], [25, 21, 'w'], [24, 21, 'W'], [23, 21, 'w'], [22, 21, 'G'], [24, 22, 'w'], [23, 22, 'w']]);
      a.dye(9, 20, 22, 20, { c: 'l', a: 'G', A: 'g' });
    }),
    'heaven-legs': overlay((a) => {
      a.box(10, 26, 21, 26, 'G').px([[15, 26, 'W'], [16, 26, 'W'], [21, 26, 'g']]);
      a.dye(9, 27, 22, 28, { w: 'W', s: 'w' });
      a.dye(10, 29, 21, 29, { c: 'W', a: 'W', A: 'w' });
      a.px([[9, 29, 'W'], [9, 30, 'w'], [22, 29, 'w'], [22, 30, 'w'], [8, 27, 'W'], [7, 27, 'W'], [8, 28, 'w'], [23, 27, 'W'], [24, 27, 'w'], [23, 28, 'w']]);
    }),
  };
  const SETS = ['diamond', 'hell', 'heaven'];
  const SLOTS = ['head', 'body', 'legs'];
  SETS.forEach((set) => SLOTS.forEach((slot) => {
    S[`gear-${set}-${slot}`] = { frameWidth: 32, frameHeight: 32, palette: { o: INK, ...GEAR }, frames: follow(PIECES[`${set}-${slot}`]) };
  }));

  // Shop icons: astronaut frame 0 wearing one piece, cropped 24x24 (head: rows 0-23, body/legs: rows 8-31).
  // Order = sets x slots (diamond head, body, legs, hell ..., heaven ...).
  // Astronaut letters that collide with gear letters (w = suit, g = visor glint) are renamed for the icon palette.
  const ASTRO_PAL = S.astronaut.palette;
  const ALT = { w: 'u', g: 'q' };
  const collide = Object.keys(ASTRO_PAL).filter((k) => k !== 'o' && k in GEAR);
  const iconPal = { ...GEAR, o: INK };
  Object.entries(ASTRO_PAL).forEach(([k, v]) => { iconPal[collide.includes(k) ? ALT[k] : k] = v; });
  function gearIcon(set, slot) {
    const ov = PIECES[`${set}-${slot}`], y0 = slot === 'head' ? 0 : 8, rows = [];
    for (let y = y0; y < y0 + 24; y++) {
      let r = '';
      for (let x = 4; x < 28; x++) {
        const o = ov[y][x];
        if (o !== '.') { r += o; continue; }
        const c = ASTRO[y][x];
        r += c === '.' ? '.' : collide.includes(c) ? ALT[c] : c;
      }
      rows.push(r);
    }
    return rows;
  }
  S['gear-icons'] = { frameWidth: 24, frameHeight: 24, palette: iconPal, frames: SETS.flatMap((set) => SLOTS.map((slot) => gearIcon(set, slot))) };

  // Diamond set effect: sparkles hop around the astronaut while the block is ready (4 fps loop).
  const sparkle = (rows, x, y, big) => {
    const p = (xx, yy, c) => { if (rows[yy] && xx >= 0 && xx < 32) rows[yy] = rows[yy].slice(0, xx) + c + rows[yy].slice(xx + 1); };
    p(x, y, 'W'); p(x - 1, y, 'i'); p(x + 1, y, 'i'); p(x, y - 1, 'i'); p(x, y + 1, 'i');
    if (big) { p(x - 2, y, 'I'); p(x + 2, y, 'I'); p(x, y - 2, 'I'); p(x, y + 2, 'I'); }
  };
  S['gear-diamond-glint'] = {
    frameWidth: 32, frameHeight: 32, palette: { W: '#ffffff', i: GEAR.i, I: GEAR.I },
    frames: [[5, 8, 1, 26, 22], [26, 4, 1, 4, 24], [28, 18, 1, 9, 2], [3, 20, 1, 24, 10]].map(([x, y, big, x2, y2]) => {
      const r = Array.from({ length: 32 }, () => blank(32)); sparkle(r, x, y, big); sparkle(r, x2, y2, 0); return r;
    }),
  };

  // ======================= PETS (16x16 x6: 0-3 idle loop, 4-5 attack) =======================
  const PET = {
    o: INK, e: '#1a1020', c: '#ffa0ae',
    Y: '#ffd24a', y: '#fff0a0', B: '#c8901e', d: '#2a1a12', // bee
    N: '#34406a', n: '#52628f', a: '#d8e4f0', O: '#ffa040', // penguin (white belly = W)
    C: '#b07a4a', h: '#d49c66', H: '#7a5030', F: '#7cc455', // capybara, leaf
    P: '#cfeeff', p: '#8ccbe8', // penguin egg
    ...GEAR,
  };

  function bee(f, set) {
    const g = grid(16, 16);
    const bob = [0, -1, 0, 1, 0, 0][f], dx = [0, 0, 0, 0, -1, 2][f], cx = 7 + dx, cy = 9 + bob;
    const wc = { diamond: ['I', 'j'], hell: ['k', 'K'], heaven: ['W', 'G'] }[set] || ['W', 'w'];
    if (f % 2 === 0) g.ell(cx - 1, cy - 5, 2.5, 2, wc[0], null, wc[1]).ell(cx + 2, cy - 5.5, 2, 1.8, wc[0], null, wc[1]);
    else g.ell(cx - 2, cy - 3.6, 2.8, 1.6, wc[0], null, wc[1]).ell(cx + 2, cy - 4, 2.2, 1.5, wc[0], null, wc[1]);
    g.ell(cx, cy, 5, 4, 'Y', 'y', 'B');
    [cx - 2, cx + 1].forEach((sx) => { for (let y = 0; y < 16; y++) if ('YyB'.includes(g.get(sx, y))) g.set(sx, y, 'd'); });
    if (f === 4) g.set(cx + 3, cy, 'e').set(cx + 3, cy - 1, 'd');
    else g.set(cx + 3, cy - 1, 'e').set(cx + 3, cy, 'e');
    g.set(cx + 4, cy + 1, 'c');
    const st = { diamond: ['I', 'i'], hell: ['L', 'l'], heaven: ['G', 'l'] }[set];
    if (st) g.set(cx - 5, cy, st[0]).set(cx - 6, cy, st[0]).set(cx - 7, cy, st[1]);
    else g.set(cx - 5, cy, 'd').set(cx - 6, cy, 'd');
    if (set === 'hell') g.set(cx + 2, cy - 5, 'R').set(cx + 4, cy - 5, 'R').set(cx + 4, cy - 6, 'r');
    else g.set(cx + 3, cy - 5, 'd').set(cx + 4, cy - 6, 'd');
    if (set === 'diamond') g.set(cx + 1, cy - 5, 'I').set(cx + 1, cy - 6, 'i');
    if (set === 'heaven') g.rect(cx + 1, cy - 8, 4, 1, 'G');
    return g.outline().rows();
  }

  function penguin(f, set) {
    const g = grid(16, 16);
    const b = [0, 1, 0, 1, 0, 0][f], step = [0, 1, 0, -1, 0, 0][f];
    g.rect(5 + Math.max(0, step), 14, 2, 1, 'O').rect(9 + Math.min(0, step), 14, 2, 1, 'O');
    g.ell(8, 9.5 + b, 5, 5, 'N', 'n', null);
    g.ell(8.5, 11 + b, 3.2, 3.2, 'W', null, 'a');
    g.ell(8.5, 8 + b, 3.5, 2.2, 'W');
    g.set(2, 10 + b, 'n').set(2, 11 + b, 'N');
    if (f === 4) { g.set(13, 6 + b, 'N').set(13, 5 + b, 'N').rect(12, 2 + b, 2, 2, 'W').set(13, 3 + b, 'a'); }
    else if (f === 5) { g.set(14, 8 + b, 'N').set(14, 9 + b, 'N'); }
    else g.set(14, 10 + b, 'N').set(14, 11 + b, 'N');
    g.set(7, 8 + b, 'e').set(10, 8 + b, 'e').set(8, 9 + b, 'O').set(9, 9 + b, 'O').set(6, 9 + b, 'c').set(11, 9 + b, 'c');
    const cap = (c, hi) => { for (let y = 0; y <= 6 + b; y++) for (let x = 0; x < 16; x++) if ('Nn'.includes(g.get(x, y))) g.set(x, y, g.get(x, y) === 'n' ? hi : c); };
    if (set === 'diamond') { cap('I', 'i'); g.set(8, 3 + b, 'i').set(8, 4 + b, 'I').set(9, 4 + b, 'j').set(7, 4 + b, 'i'); }
    if (set === 'hell') { cap('K', 'k'); g.set(4, 5 + b, 'R').set(3, 4 + b, 'r').set(12, 5 + b, 'R').set(13, 4 + b, 'R'); g.set(8, 5 + b, 'L'); }
    if (set === 'heaven') g.rect(6, 2 + b, 5, 1, 'G');
    return g.outline().rows();
  }

  function capybara(f, set) {
    const g = grid(16, 16);
    const b = [0, 0, 1, 0, 0, 0][f], happy = f >= 4;
    g.rect(3, 13, 2, 1, 'H').rect(9, 13, 2, 1, 'H');
    g.ell(6.5, 9.5 + b * 0.5, 5.8, 3.8, 'C', 'h', 'H');
    g.ell(11, 7.5, 3.4, 3, 'C', 'h', 'H');
    g.set(14, 8, 'H').set(14, 7, 'e').set(9, 4, 'H');
    if (happy) g.set(10, 7, 'e').set(11, 6, 'e').set(12, 7, 'e');
    else if (f === 3) g.set(11, 7, 'H').set(12, 7, 'H');
    else g.set(11, 7, 'e');
    g.set(12, 9, 'c');
    if (f === 1) g.set(13, 10, 'H');
    g.set(11, 3, 'O').set(12, 3, 'O').set(12, 2, 'F');
    if (f === 5) g.set(4, 2, 'c').set(6, 2, 'c').set(4, 3, 'c').set(5, 3, 'c').set(6, 3, 'c').set(5, 4, 'c');
    if (set === 'diamond') g.rect(10, 3, 4, 1, 'I').set(13, 3, 'j').set(10, 2, 'i').set(12, 2, 'i').set(13, 2, 'i');
    if (set === 'hell') {
      for (let y = 6; y <= 9; y++) for (let x = 2; x <= 7; x++) if ('ChH'.includes(g.get(x, y))) g.set(x, y, y === 6 ? 'k' : 'K');
      [3, 6].forEach((x) => { for (let y = 7; y <= 9; y++) if (g.get(x, y) !== '.') g.set(x, y, 'L'); });
      for (let x = 2; x <= 7; x++) if (g.get(x, 10) !== '.' && x % 2 === 0) g.set(x, 10, 'R');
    }
    if (set === 'heaven') g.ell(7, 13.2, 6.8, 1.7, 'W', null, 'w').set(1, 12, 'W').set(13, 12, 'w');
    return g.outline().rows();
  }

  const PETS = { bee, penguin, capybara };
  const diff = (a, b) => a.map((r, y) => [...r].map((c, x) => (c === b[y][x] ? '.' : c)).join(''));
  Object.entries(PETS).forEach(([id, fn]) => {
    S[`pet-${id}`] = { frameWidth: 16, frameHeight: 16, palette: PET, frames: frames(6, (f) => fn(f, null)) };
    SETS.forEach((set) => {
      S[`petgear-${id}-${set}`] = { frameWidth: 16, frameHeight: 16, palette: PET, frames: frames(6, (f) => diff(fn(f, set), fn(f, null))) };
    });
  });
  // Shop icons for pet gear: pet frame 0 wearing the gear. Order: bee (diamond, hell, heaven), penguin ..., capybara ...
  S['petgear-icons'] = { frameWidth: 16, frameHeight: 16, palette: PET, frames: Object.values(PETS).flatMap((fn) => SETS.map((set) => fn(0, set))) };

  // ======================= EGGS (16x16 x4: 0 rest, 1 wobble left, 2 wobble right, 3 cracked) =======================
  const HW = [2, 3, 4, 4, 5, 5, 5, 5, 5, 4, 4, 3]; // half widths, rows 3-14
  function egg(kind, f) {
    const g = grid(16, 16);
    const col = { bee: ['Y', 'y', 'B'], penguin: ['p', 'P', 'j'], capybara: ['C', 'h', 'H'] }[kind];
    HW.forEach((hw, i) => {
      const y = 3 + i, lean = f === 1 ? (i < 5 ? -1 : 0) : f === 2 ? (i < 5 ? 1 : 0) : 0;
      for (let x = 8 - hw; x < 8 + hw; x++) {
        const l = (x - 8 + 0.5) / hw + (i - 6) / 6;
        g.set(x + lean, y, l < -0.75 ? col[1] : l > 0.6 ? col[2] : col[0]);
      }
    });
    const L = f === 1 ? -1 : f === 2 ? 1 : 0;
    if (kind === 'bee') [7, 10].forEach((y) => { for (let x = 0; x < 16; x++) if ('YyB'.includes(g.get(x, y))) g.set(x, y, 'd'); });
    if (kind === 'penguin') [[8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [6, 8], [7, 8], [9, 8], [10, 8], [6, 6], [10, 6], [6, 10], [10, 10]].forEach(([x, y]) => g.set(x, y, 'W'));
    if (kind === 'capybara') { g.set(8 + L, 2, 'F').set(9 + L, 1, 'F').set(10 + L, 1, 'F').set(7, 9, 'H').set(10, 11, 'H').set(6, 12, 'H'); }
    if (f === 3) {
      [[4, 8], [5, 9], [6, 8], [7, 9], [8, 8], [9, 9], [10, 8], [11, 9]].forEach(([x, y]) => g.set(x, y, 'o'));
      g.set(5, 8, 'l').set(9, 8, 'l');
    }
    return g.outline().rows();
  }
  ['bee', 'penguin', 'capybara'].forEach((k) => { S[`egg-${k}`] = { frameWidth: 16, frameHeight: 16, palette: PET, frames: frames(4, (f) => egg(k, f)) }; });

  // Hatch burst 24x24 x3 (shell halves fly apart, sparkles), played once over the egg. Neutral colours for every pet.
  function hatch(f) {
    const g = grid(24, 24), d = [0, 3, 6][f];
    if (f < 2) {
      g.ell(12 - d, 9 - d, 4, 2.5, 'W', null, 'a').ell(12 + d, 16 + d * 0.5, 4.5, 2.5, 'W', null, 'a');
      for (let x = 8 - d; x <= 16 - d; x += 2) g.set(x, 11 - d, '.');
    } else { g.set(3, 4, 'a').set(4, 4, 'W').set(19, 19, 'a').set(20, 18, 'W'); }
    g.outline();
    [[4 + d, 3], [20 - d, 5], [5, 18 - d], [19, 20 - d]].forEach(([x, y], n) => {
      if ((n + f) % 2 === 0) g.set(x, y, 'l').set(x - 1, y, 'G').set(x + 1, y, 'G').set(x, y - 1, 'G').set(x, y + 1, 'G');
      else g.set(x, y, 'l');
    });
    return g.rows();
  }
  S['pet-hatch'] = { frameWidth: 24, frameHeight: 24, palette: PET, frames: frames(3, hatch) };

  // ======================= PET ATTACKS =======================
  S['pet-snowball'] = {
    frameWidth: 8, frameHeight: 8, palette: { o: INK, W: '#ffffff', a: '#d8e4f0', p: '#8ccbe8' },
    frames: [
      ['........', '..oooo..', '.oWWWao.', '.oWWaao.', '.oWaapo.', '.oaappo.', '..oooo..', '........'],
      ['........', '..oooo..', '.oaWWWo.', '.oaWWao.', '.opaWao.', '.oppaao.', '..oooo..', '........'],
    ],
  };
  // bee sting hit spark (8x8 x2, plays once on the enemy)
  S['pet-sting'] = {
    frameWidth: 8, frameHeight: 8, palette: { W: '#ffffff', Y: '#ffd24a' },
    frames: [
      ['........', '...Y....', '...W....', '.YWWWY..', '...W....', '...Y....', '........', '........'],
      ['.Y...Y..', '........', '...W....', '..W.W...', '...W....', '........', '.Y...Y..', '........'],
    ],
  };
  // capybara aura steam puff (8x8 x4, rises inside the aura ring; the ring itself is Graphics, token game.pet-aura)
  S['pet-steam'] = {
    frameWidth: 8, frameHeight: 8, palette: { W: '#fff4e8', w: '#f0d9a8' },
    frames: [
      ['........', '........', '........', '........', '..WWw...', '.WWWWw..', '..wWw...', '........'],
      ['........', '........', '........', '..WWw...', '.WWWw...', '..ww....', '........', '........'],
      ['........', '........', '..Ww....', '.WWw....', '..w.....', '........', '........', '........'],
      ['........', '..W.....', '.Ww.....', '........', '........', '........', '........', '........'],
    ],
  };
  // capybara heal: small heart rising from the astronaut (8x8 x4)
  const HEART = ['.oo.oo..', 'occoCco.', 'occcCco.', '.occcco.', '..occo..', '...oo...'];
  S['pet-heal'] = {
    frameWidth: 8, frameHeight: 8, palette: { o: INK, c: '#ff8fae', C: '#ffd0dc' },
    frames: [0, 1, 2, 2].map((up) => { const r = Array.from({ length: 8 }, () => blank(8)); HEART.forEach((row, y) => { if (y + 2 - up >= 0) r[y + 2 - up] = row; }); return r; }),
  };

  // ======================= GEAR EFFECTS IN THE ROUND =======================
  // burn on an enemy (Glutpanzer): small flame 8x8 x4 above the enemy
  S['gear-burn'] = {
    frameWidth: 8, frameHeight: 8, palette: { L: GEAR.L, l: GEAR.l, R: GEAR.R },
    frames: [
      ['........', '...l....', '..lL....', '..LLl...', '.RLlLR..', '.RLllR..', '..RLR...', '........'],
      ['....l...', '...lL...', '..lLL...', '..LlL...', '.RLlLR..', '.RLllR..', '..RLR...', '........'],
      ['........', '..l.....', '..Ll....', '.lLL....', '.RLlLR..', '.RLllR..', '..RLR...', '........'],
      ['...l....', '...Ll...', '..LLl...', '..LlL...', '.RLlLR..', '.RLllR..', '..RLR...', '........'],
    ],
  };
  // small death blast (Lavastiefel): 24x24 x4, plays once
  function blast(f) {
    const g = grid(24, 24), r = [3, 6, 9, 10][f];
    if (f < 3) g.ell(12, 12, r, r, f === 0 ? 'l' : 'L', 'l', 'R');
    if (f >= 1) g.ell(12, 12, r - 2.5, r - 2.5, f === 1 ? 'l' : '.');
    if (f === 3) for (let a = 0; a < 8; a++) g.set(12 + Math.round(Math.cos(a * 0.785) * 9), 12 + Math.round(Math.sin(a * 0.785) * 9), a % 2 ? 'R' : 'L');
    return g.rows();
  }
  S['gear-blast'] = { frameWidth: 24, frameHeight: 24, palette: { L: GEAR.L, l: GEAR.l, R: GEAR.R }, frames: frames(4, blast) };

  // ======================= DIAMOND (currency) =======================
  const GEM = ['........', '.oooooo.', 'oiWiIIjo', 'oIIIIjJo', '.oIIjJo.', '..oIJo..', '...oo...', '........'];
  const glint = (rows, pts) => pts.reduce((r, [x, y, c]) => r.map((row, j) => (j === y ? row.slice(0, x) + c + row.slice(x + 1) : row)), rows);
  S.diamond = {
    frameWidth: 8, frameHeight: 8, palette: { o: INK, W: '#ffffff', i: GEAR.i, I: GEAR.I, j: GEAR.j, J: GEAR.J },
    frames: [GEM, glint(GEM, [[2, 2, 'i'], [4, 2, 'W']]), glint(GEM, [[2, 2, 'i'], [4, 3, 'W'], [3, 3, 'i']]), glint(GEM, [[2, 2, 'W'], [1, 2, 'W']])],
  };
  // level tile marker: 0 = diamond earned (filled), 1 = still to earn (hollow)
  S['diamond-marker'] = {
    frameWidth: 8, frameHeight: 8, palette: { o: INK, W: '#ffffff', i: GEAR.i, I: GEAR.I, j: GEAR.j, J: GEAR.J },
    frames: [GEM, ['........', '.oooooo.', 'oIIIIIIo', 'oIooooIo', '.oIooIo.', '..oIIo..', '...oo...', '........']],
  };
})(typeof window !== 'undefined' ? window : globalThis);
