/* Final in-game sprites, part 2: enemies, bosses, projectiles, items, coins, tiles, UI icons.
 * Extends window.PX_SPRITES from sprites.js (load sprites.js first). Same format:
 * { frameWidth, frameHeight, palette, frames: [rows[]] }, one character = one pixel, '.' = transparent.
 * Larger sprites are built with a tiny pixel toolkit (ellipse, rect, line, auto outline) so they
 * stay editable. Pure code, no DOM, no network: safe in an empty vm context.
 * Rules (mockups/sprites.html): enemies face right (the game mirrors them), light from top left,
 * enemy outline night black, player-side things (items, coins) ink outline, all loops run at 4 fps.
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});

  // ---------- pixel toolkit ----------
  function grid(w, h) {
    const a = Array.from({ length: h }, () => Array(w).fill('.'));
    const inE = (x, y, cx, cy, rx, ry) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; };
    const g = {
      set(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < w && y < h) a[y][x] = c; return g; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y][x] : '.'; },
      rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) g.set(x + i, y + j, c); return g; },
      // filled ellipse; hi/lo shade the top-left / bottom-right rim (light from top left)
      ell(cx, cy, rx, ry, c, hi, lo, hiT = -0.8, loT = 0.55) {
        for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++)
          for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++) {
            if (!inE(x, y, cx, cy, rx, ry)) continue;
            const l = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry;
            g.set(x, y, hi && l < hiT ? hi : lo && l > loT ? lo : c);
          }
        return g;
      },
      // recolour only already filled pixels inside an ellipse rim zone (l > t)
      rim(cx, cy, rx, ry, c, t) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
          if (a[y][x] !== '.' && inE(x, y, cx, cy, rx, ry) && (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry > t) a[y][x] = c;
        return g;
      },
      line(x0, y0, x1, y1, c, t = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        const o = Math.floor((t - 1) / 2);
        for (let i = 0; i <= n; i++) g.rect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, t, t, c);
        return g;
      },
      stamp(rows, x, y) { rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') g.set(x + i, y + j, c); })); return g; },
      recolor(from, to, y0 = 0, y1 = h - 1) { for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (from.includes(a[y][x])) a[y][x] = to; return g; },
      outline(c = 'o') {
        const b = a.map((r) => r.slice());
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (b[y][x] !== '.') continue;
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = (b[y + dy] || [])[x + dx]; return v && v !== '.'; })) a[y][x] = c;
        }
        return g;
      },
      rows() { return a.map((r) => r.join('')); },
    };
    return g;
  }
  const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
  const frames = (n, fn) => Array.from({ length: n }, (_, f) => fn(f));

  // ---------- shared palettes ----------
  const NIGHT_BLACK = '#070a14'; // enemy outline
  const INK = '#0b0610'; // player-side outline (items, coins)
  const WOOD = { t: '#7a5638', T: '#5a3c26', b: '#9a7350', d: '#2a1a12', w: '#e8dcc0' };
  const LEAF = { f: '#4f8a3c', F: '#3a6b2c', L: '#7cc455' };
  const RED_EYE = { r: '#ff4a3a', y: '#ffd0b0' };
  const MAGENTA_EYE = { m: '#ff4ad8', M: '#ffd0f5' };

  // ---------- enemy: cursed tree 32x32 (walk) ----------
  function cursedTree(f) {
    const g = grid(32, 32), b = [0, 1, 0, 1][f], step = [0, 1, 0, -1][f], arm = [0, 1, 0, -1][f];
    g.rect(11 + step, 27, 3, 3, 't').set(10 + step, 29, 't');
    g.rect(18 - step, 27, 3, 3, 'T').set(21 - step, 29, 'T');
    g.rect(11, 14 + b, 10, 14 - b, 't').rect(11, 14 + b, 1, 14 - b, 'b').rect(19, 14 + b, 2, 14 - b, 'T');
    g.line(11, 20 + b, 6, 16 + arm + b, 't', 2).line(20, 20 + b, 26, 16 - arm + b, 'T', 2);
    g.ell(5, 14 + arm + b, 3, 2.5, 'f', 'L', 'F').ell(27, 14 - arm + b, 3, 2.5, 'f', 'L', 'F');
    g.ell(16, 10 + b, 12, 5, 'f', 'L', 'F');
    g.ell(10, 7 + b, 6, 4.5, 'f', 'L', 'F').ell(22, 6 + b, 6, 4.5, 'f', 'L', 'F').ell(16, 4 + b, 6, 3.5, 'f', 'L', 'F');
    [[8, 9], [13, 7], [20, 10], [24, 8], [17, 4], [11, 12], [22, 12]].forEach(([x, y]) => g.set(x, y + b, 'F'));
    g.set(14, 16 + b, 'd').set(15, 17 + b, 'd').set(19, 16 + b, 'd').set(18, 17 + b, 'd');
    g.set(14, 18 + b, 'y').set(15, 18 + b, 'r').set(18, 18 + b, 'y').set(19, 18 + b, 'r');
    g.rect(14, 21 + b, 5, 2, 'd').set(14, 21 + b, 'w').set(16, 21 + b, 'w').set(18, 21 + b, 'w').set(15, 22 + b, 'w').set(17, 22 + b, 'w');
    g.set(13, 25, 'T').set(13, 26, 'T').set(17, 25, 'T').set(16, 26, 'T');
    return g.outline().rows();
  }
  S['enemy-cursed-tree'] = { frameWidth: 32, frameHeight: 32, palette: { o: NIGHT_BLACK, ...WOOD, ...LEAF, ...RED_EYE }, frames: frames(4, cursedTree) };

  // ---------- enemy: forest witch 32x32 (hover) ----------
  const WITCH = { H: '#4a2d6b', h: '#6b4596', J: '#2e1a45', K: '#9fd08a', k: '#6fa060', R: '#b83a4a', s: '#e05a64', Q: '#7f2234', Z: '#3a2a50', Y: '#ffd24a', t: '#7a5638', p: '#c86bff', P: '#f4d8ff', ...MAGENTA_EYE };
  function forestWitch(f) {
    const g = grid(32, 32), b = [0, 1, 1, 0][f], sw = [0, 1, 0, -1][f];
    for (let y = 19; y <= 28; y++) {
      const hw = Math.round(3 + (y - 19) * 0.55);
      for (let x = 16 - hw; x <= 15 + hw; x++) g.set(x, y + b, x === 16 - hw ? 's' : x >= 14 + hw ? 'Q' : 'R');
    }
    for (let x = 8; x <= 23; x++) if ((x + sw + 3) % 3 === 0) g.set(x, 28 + b, '.');
    g.rect(10, 12 + b, 3, 7, 'Z');
    g.ell(17, 15 + b, 5, 4.2, 'K', null, 'k');
    g.set(22, 15 + b, 'K').set(23, 16 + b, 'K').set(22, 16 + b, 'k');
    g.set(16, 14 + b, 'm').set(19, 14 + b, 'm').set(16, 13 + b, 'M');
    g.set(17, 17 + b, 'J').set(18, 17 + b, 'J').set(19, 17 + b, 'J');
    for (let y = 2; y <= 10; y++) {
      const hw = Math.max(1, Math.round((y - 1) * 0.6));
      const cx = 16 - Math.round((10 - y) * 0.45) + (y < 5 ? sw : 0);
      for (let x = cx - hw; x <= cx + hw - 1; x++) g.set(x, y + b, x === cx - hw ? 'h' : x === cx + hw - 1 ? 'J' : 'H');
    }
    g.ell(16, 11 + b, 11, 2, 'H', 'h', 'J');
    g.recolor('Hh', 'J', 9 + b, 9 + b).set(15, 9 + b, 'Y').set(16, 9 + b, 'Y');
    g.line(20, 21 + b, 24, 20 + b, 'R', 2).rect(25, 19 + b, 2, 2, 'K');
    g.line(27, 19 + b, 29, 15 + b, 't');
    if (f % 2) g.rect(29, 13 + b, 2, 2, 'P').set(28, 12 + b, 'p'); else g.set(29, 14 + b, 'p').set(30, 14 + b, 'p');
    return g.outline().rows();
  }
  S['enemy-forest-witch'] = { frameWidth: 32, frameHeight: 32, palette: { o: NIGHT_BLACK, ...WITCH }, frames: frames(4, forestWitch) };

  // ---------- enemy: zombie squirrel 24x24 (hop) ----------
  const SQUIRREL = { S: '#8a9a7a', Z: '#6d7d5e', N: '#b0c09a', B: '#c4c8a4', w: '#e8e4d0', d: '#2a2a20', p: '#c07a8a', ...RED_EYE };
  function zombieSquirrel(f) {
    const g = grid(24, 24), yo = [0, 1, -2, 0][f], tl = [0, -1, 0, 1][f];
    g.ell(6, 9 + tl + yo, 4.5, 6.5, 'Z', 'S');
    g.set(4, 6 + tl + yo, 'd').set(5, 7 + tl + yo, 'd'); // bald patch
    g.ell(12, 15 + yo, 6, 4.5, 'S', 'N', 'Z').ell(14, 16 + yo, 3, 2.5, 'B');
    g.ell(17, 10 + yo, 4.5, 4, 'S', 'N', 'Z');
    g.set(15, 5 + yo, 'Z').set(15, 6 + yo, 'S').set(16, 6 + yo, 'p');
    g.set(18, 9 + yo, 'y').set(19, 9 + yo, 'r').set(18, 8 + yo, 'd').set(19, 8 + yo, 'd');
    g.set(21, 10 + yo, 'd').set(19, 12 + yo, 'd').set(20, 12 + yo, 'w').set(21, 12 + yo, 'w');
    g.set(9, 13 + yo, 'd').set(10, 14 + yo, 'd').set(11, 13 + yo, 'd').set(12, 14 + yo, 'd');
    g.line(16, 14 + yo, 20, 15 + yo, 'S').set(21, 15 + yo, 'w');
    const fy = f === 2 ? 17 : 19;
    g.rect(7, fy, 4, 2, 'Z').rect(15, fy, 3, 2, 'Z');
    return g.outline().rows();
  }
  S['enemy-zombie-squirrel'] = { frameWidth: 24, frameHeight: 24, palette: { o: NIGHT_BLACK, ...SQUIRREL }, frames: frames(4, zombieSquirrel) };

  // ---------- enemy: forest spirit 32x32 (float) ----------
  const SPIRIT = { G: '#b9f5ee', g: '#7fd8cf', q: '#4fb0b0', W: '#ffffff', d: '#2a3d4a', f: '#7cc455', F: '#4f8a3c', ...MAGENTA_EYE };
  function forestSpirit(f) {
    const g = grid(32, 32), b = [0, 1, 2, 1][f];
    g.set(16, 3 + b, 'F').set(16, 2 + b, 'F').set(17, 1 + b, 'f').set(18, 1 + b, 'f').set(18, 2 + b, 'F').set(15, 1 + b, 'f');
    g.ell(5, 18 + b + (f % 2), 2.5, 2, 'G', null, 'g').ell(27, 17 + b - (f % 2), 2.5, 2, 'G', null, 'g');
    g.ell(16, 13 + b, 10, 9, 'G', 'W', 'g');
    g.rect(6, 13 + b, 20, 10, 'G').rect(23, 13 + b, 3, 10, 'g').rect(6, 13 + b, 1, 6, 'W');
    for (let x = 6; x <= 25; x++) {
      const len = [3, 2, 1, 0, 1, 2][(x + f) % 6];
      for (let k = 0; k < len; k++) g.set(x, 23 + b + k, k === len - 1 ? 'q' : x >= 23 ? 'g' : 'G');
    }
    g.rect(13, 11 + b, 2, 3, 'm').rect(19, 11 + b, 2, 3, 'm').set(13, 11 + b, 'M').set(19, 11 + b, 'M');
    g.rect(16, 16 + b, 2, 2, 'd');
    return g.outline().rows();
  }
  S['enemy-forest-spirit'] = { frameWidth: 32, frameHeight: 32, palette: { o: NIGHT_BLACK, ...SPIRIT }, frames: frames(4, forestSpirit) };

  // ---------- projectile: witch bolt 8x8 ----------
  S['witch-bolt'] = {
    frameWidth: 8, frameHeight: 8,
    palette: { o: NIGHT_BLACK, p: '#c86bff', P: '#f4d8ff', q: '#7a3ab0' },
    frames: [
      ['..oooo..', '.opPPpo.', 'opPPPppo', 'opPPpppo', 'oppppqpo', 'opppqqpo', '.oqqqqo.', '..oooo..'],
      ['...oo...', '..oPPo..', '.oPPPPo.', 'oPPPPPpo', 'oPPPPppo', '.oPPppo.', '..oppo..', '...oo...'],
    ],
  };

  // ---------- boss: rooted tree monster 64x64 ----------
  function rootMonster(f) {
    const g = grid(64, 64), b = [0, 1, 1, 0][f], w = [0, 1, 0, -1][f];
    [[20, 50, 10, 61], [27, 52, 24, 62], [37, 52, 40, 62], [44, 50, 54, 61]].forEach(([x0, y0, x1, y1], i) => g.line(x0, y0, x1 + (i % 2 ? w : -w), y1, i < 2 ? 't' : 'T', 3));
    g.line(16, 36 + b, 6, 44 + b + w, 't', 4).line(6, 44 + b + w, 8, 52 + b, 't', 3).line(7, 52 + b, 5, 55 + b, 'T').line(9, 52 + b, 11, 55 + b, 'T');
    g.line(48, 36 + b, 58, 44 + b - w, 'T', 4).line(58, 44 + b - w, 56, 52 + b, 'T', 3).line(55, 52 + b, 53, 55 + b, 'T').line(57, 52 + b, 59, 55 + b, 'T');
    g.line(24, 24 + b, 16, 7 + b, 't', 2).line(19, 12 + b, 12, 10 + b, 't');
    g.line(32, 22 + b, 32, 5 + b, 'T', 2);
    g.line(40, 24 + b, 49, 8 + b, 'T', 2).line(46, 12 + b, 53, 12 + b, 'T');
    g.ell(15, 6 + b, 5, 4, 'f', 'L', 'F').ell(33, 4 + b, 4, 3, 'f', 'L', 'F').ell(50, 7 + b, 5, 4, 'f', 'L', 'F').ell(11, 10 + b, 2.5, 2, 'f', 'L', 'F');
    g.ell(32, 30 + b, 19, 12, 't', 'b', 'T');
    g.rect(14, 30 + b, 37, 21 - b, 't').rect(14, 30 + b, 2, 21 - b, 'b').rect(46, 30 + b, 5, 21 - b, 'T');
    [[20, 36, 46], [27, 42, 50], [38, 38, 48], [43, 34, 44]].forEach(([x, y0, y1]) => g.line(x, y0 + b, x, y1, 'T'));
    for (let x = 15; x <= 49; x++) {
      let y = 0;
      while (y < 40 && g.get(x, y) === '.') y++;
      if (!'tbT'.includes(g.get(x, y))) continue;
      g.set(x, y, 'f');
      if (x % 3 === 0) g.set(x, y + 1, 'F');
      if (x % 7 === 2) g.set(x, y + 2, 'F');
    }
    g.ell(24, 32 + b, 5, 4, 'd').ell(40, 32 + b, 5, 4, 'd');
    g.rect(24, 32 + b, 3, 2, 'r').set(24, 32 + b, 'y').rect(40, 32 + b, 3, 2, 'r').set(40, 32 + b, 'y');
    g.line(18, 26 + b, 28, 29 + b, 'T', 2).line(46, 26 + b, 36, 29 + b, 'T', 2);
    g.ell(32, 43 + b, 10, 3.5, 'd');
    [25, 29, 35, 39].forEach((x) => g.set(x, 40 + b, 'w').set(x, 41 + b, 'w'));
    [27, 32, 37].forEach((x) => g.set(x, 45 + b, 'w'));
    return g.outline().rows();
  }
  S['boss-root-monster'] = { frameWidth: 64, frameHeight: 64, palette: { o: NIGHT_BLACK, ...WOOD, ...LEAF, ...RED_EYE }, frames: frames(4, rootMonster) };

  // ---------- boss attack: root spike 16x32 ----------
  function rootSpike(f) {
    const g = grid(16, 32);
    for (let y = 2; y <= 27; y++) {
      const hw = 0.6 + ((y - 2) / 25) * 4;
      const cx = 8 + Math.round(Math.sin((y + f * 3) / 4));
      for (let x = 0; x < 16; x++) {
        const d = x + 0.5 - cx;
        if (Math.abs(d) <= hw) g.set(x, y, d < -hw + 1.2 ? 'b' : d > hw - 1.2 ? 'T' : 't');
      }
      if (y === 9 || y === 21) g.set(Math.round(cx - hw) - 1, y, 'T').set(Math.round(cx - hw) - 2, y - 1, 'T');
      if (y === 15) g.set(Math.round(cx + hw), y, 'T').set(Math.round(cx + hw) + 1, y - 1, 'T');
      if (y === 12 || y === 13 || y === 19) g.set(cx, y, 'r');
    }
    g.ell(8, 29, 7, 2.5, 'd', 'D');
    return g.outline().rows();
  }
  S['boss-root-spike'] = { frameWidth: 16, frameHeight: 32, palette: { o: NIGHT_BLACK, ...WOOD, D: '#4a3020', r: '#ff4a3a' }, frames: frames(3, rootSpike) };

  // ---------- boss: forest ghost 48x48 ----------
  const GHOST = { G: '#d6f0ff', g: '#9ab8e8', q: '#6a86c8', W: '#ffffff', d: '#1a1230', b: '#d8c8a8', B: '#a08a6a', ...MAGENTA_EYE };
  function forestGhost(f) {
    const g = grid(48, 48), b = [0, 1, 2, 1][f];
    [-1, 1].forEach((s) => {
      const x0 = 24 + s * 8;
      g.line(x0, 10 + b, x0 + s * 6, 2 + b, s < 0 ? 'b' : 'B', 2).line(x0 + s * 3, 6 + b, x0 + s * 1, 1 + b, 'b').line(x0 + s * 5, 4 + b, x0 + s * 9, 3 + b, 'B');
    });
    g.ell(8, 26 + b + (f % 2), 5, 3, 'G', null, 'g').ell(40, 26 + b - (f % 2), 5, 3, 'G', null, 'g');
    g.ell(24, 19 + b, 15, 12, 'G', 'W', 'g');
    g.rect(9, 19 + b, 30, 16, 'G').rect(36, 19 + b, 3, 16, 'g').rect(9, 19 + b, 1, 8, 'W').rect(10, 32 + b, 26, 3, 'g');
    for (let x = 9; x <= 38; x++) {
      const len = [4, 3, 2, 1, 2, 3][(x + f) % 6];
      for (let k = 0; k < len; k++) g.set(x, 35 + b + k, k === len - 1 || x >= 35 ? 'q' : 'g');
    }
    g.ell(18, 19 + b, 3.5, 4.5, 'd').ell(30, 19 + b, 3.5, 4.5, 'd');
    g.rect(18, 19 + b, 2, 2, 'm').set(18, 19 + b, 'M').rect(30, 19 + b, 2, 2, 'm').set(30, 19 + b, 'M');
    g.ell(25, 28 + b, 4, 2.5, 'd');
    return g.outline().rows();
  }
  S['boss-forest-ghost'] = { frameWidth: 48, frameHeight: 48, palette: { o: NIGHT_BLACK, ...GHOST }, frames: frames(4, forestGhost) };

  // ---------- boss attack: ghost orb 8x8 (tinted mint in game, so drawn light) ----------
  S['boss-ghost-orb'] = {
    frameWidth: 8, frameHeight: 8,
    palette: { o: NIGHT_BLACK, g: '#b8c8d8', W: '#ffffff' },
    frames: [
      ['..oooo..', '.ogWWgo.', 'ogWWWWgo', 'ogWWWWgo', 'oggWWggo', 'oggggggo', '.oggggo.', '..oooo..'],
      ['..oooo..', '.oWggWo.', 'oWgWWgWo', 'ogWWWWgo', 'ogWWWWgo', 'oWgWWgWo', '.oWggWo.', '..oooo..'],
    ],
  };

  // ---------- boss: giant stone 64x64 (rolls: surface specks travel) ----------
  const STONE = { n: '#8a8aa0', N: '#b4b4c8', k: '#5e5e78', K: '#3e3e56', c: '#9ff5ec', C: '#4fb8b0', f: '#8a6bd0', F: '#6a4fb0', ...MAGENTA_EYE };
  function giantStone(f) {
    const g = grid(64, 64), b = f % 2;
    g.ell(32, 37 + b, 28, 24, 'n', 'N', 'k').rim(32, 37 + b, 28, 24, 'K', 1.05);
    [[14, 30], [22, 50], [30, 24], [44, 53], [50, 34], [38, 45], [18, 42], [55, 44], [27, 56], [46, 24], [9, 38], [34, 18]].forEach(([x, y]) => {
      const xx = 5 + ((x - 5 + f * 3) % 54);
      if (g.get(xx, y + b) !== '.' && g.get(xx + 1, y + b) !== '.') g.set(xx, y + b, 'k').set(xx + 1, y + b, 'k').set(xx, y + b - 1, 'N');
    });
    g.line(10, 34 + b, 16, 38 + b, 'K').line(16, 38 + b, 14, 44 + b, 'K').line(50, 46 + b, 55, 50 + b, 'K').line(46, 20 + b, 49, 25 + b, 'K');
    g.ell(22, 16 + b, 10, 3, 'f', null, 'F');
    [14, 18, 25, 29].forEach((x, i) => g.set(x, 19 + b, 'F').set(x, 20 + b, i % 2 ? 'F' : '.'));
    const crystal = (x, y, hgt, hw) => {
      for (let i = 0; i <= hgt; i++) {
        const half = Math.max(0, Math.round((i / hgt) * hw));
        for (let d = -half; d <= half; d++) g.set(x + d, y + i, d < 0 ? 'c' : d > 0 ? 'C' : i < 2 ? 'c' : 'C');
      }
    };
    crystal(40, 4 + b, 11, 3); crystal(47, 10 + b, 6, 2); crystal(31, 9 + b, 5, 2);
    g.rect(18, 29 + b, 11, 3, 'K').set(28, 32 + b, 'K').rect(36, 29 + b, 11, 3, 'K').set(36, 32 + b, 'K');
    g.rect(20, 33 + b, 7, 2, 'm').set(20, 33 + b, 'M').rect(38, 33 + b, 7, 2, 'm').set(38, 33 + b, 'M');
    [[24, 46], [27, 44], [30, 46], [33, 44], [36, 46], [39, 44], [41, 46]].reduce((p, q) => (g.line(p[0], p[1] + b, q[0], q[1] + b, 'K'), q));
    return g.outline().rows();
  }
  S['boss-giant-stone'] = { frameWidth: 64, frameHeight: 64, palette: { o: NIGHT_BLACK, ...STONE }, frames: frames(4, giantStone) };

  // ---------- items 16x16, 2 frames (the game adds a 1 px cream halo) ----------
  const glint = (rows, pts) => rows.map((r, y) => [...r].map((c, x) => (pts.some(([px, py]) => px === x && py === y) ? 'h' : c)).join(''));
  const HEAL = [
    '................',
    '.....oooooo.....',
    '.....ommeeo.....',
    '.....omeeeo.....',
    '.....oeeeEo.....',
    '.oooooeeeEooooo.',
    '.ommmeeeeeeeeEo.',
    '.omeeeeeeeeeeEo.',
    '.oeeeeeeeeeeEEo.',
    '.oEEEEeeeEEEEEo.',
    '.oooooeeeEooooo.',
    '.....oeeeEo.....',
    '.....oeeEEo.....',
    '.....oEEEEo.....',
    '.....oooooo.....',
    '................',
  ];
  S['item-heal'] = { frameWidth: 16, frameHeight: 16, palette: { o: INK, e: '#5fe0c0', m: '#b8ffe9', E: '#2fb393', h: '#ffffff' }, frames: [glint(HEAL, [[6, 2]]), glint(HEAL, [[3, 6], [2, 7]])] };

  const DOUBLE = [
    '................',
    '................',
    '..ooooooooo.....',
    '.oAaaacchhho....',
    '.oAAaaaachho....',
    '..ooooooooo.....',
    '................',
    '................',
    '.....ooooooooo..',
    '....oAaaacchhho.',
    '....oAAaaaachho.',
    '.....ooooooooo..',
    '................',
    '................',
    '................',
    '................',
  ].map((r) => r.slice(0, 16));
  S['item-double-shot'] = { frameWidth: 16, frameHeight: 16, palette: { o: INK, a: '#ff6b8a', A: '#bf3458', c: '#ffa0ae', h: '#ffffff' }, frames: [DOUBLE, DOUBLE.map((r) => '.' + r.slice(0, 15))] };

  const SHIELD = [
    '................',
    '..oooooooooooo..',
    '.obbbBBBBBBBBQo.',
    '.obBBBBBBBBBBQo.',
    '.obBBBBBBBBBBQo.',
    '.obBBBBhhBBBBQo.',
    '.obBBBhhhhBBBQo.',
    '.oBBBBBhhBBBBQo.',
    '..oBBBBhhBBBQo..',
    '..oBBBBBBBBQQo..',
    '...oBBBBBBQQo...',
    '....oBBBBQQo....',
    '.....oBBQQo.....',
    '......oQQo......',
    '.......oo.......',
    '................',
  ];
  S['item-shield'] = { frameWidth: 16, frameHeight: 16, palette: { o: INK, B: '#5fb8ff', b: '#d6f0ff', Q: '#2f7fd0', h: '#ffffff' }, frames: [SHIELD, glint(SHIELD, [[3, 3], [3, 4], [4, 2]])] };

  const RAPID = [
    '.........oooo...',
    '........oyYYo...',
    '.......oyYYo....',
    '......oyYYo.....',
    '.....oyYYo......',
    '....oyYYYooooo..',
    '...oyYYYYYYYYo..',
    '..oooooYYYYDo...',
    '......oYYYDo....',
    '.....oYYYDo.....',
    '....oYYDDo......',
    '...oYYDo........',
    '..oYDo..........',
    '..oDo...........',
    '..oo............',
    '................',
  ];
  S['item-rapid-fire'] = { frameWidth: 16, frameHeight: 16, palette: { o: INK, Y: '#ffd24a', y: '#fff3b0', D: '#c7922a', h: '#ffffff' }, frames: [RAPID, glint(RAPID, [[9, 1], [8, 2], [5, 6]])] };

  function fireRing(f) {
    const g = grid(16, 16);
    g.ell(8, 9, 6.5, 6, 'F', 'f', 'R').ell(8, 9, 3, 2.6, '.');
    (f ? [[6, 1], [10, 1], [2, 5]] : [[4, 2], [8, 0], [12, 2]]).forEach(([x, y]) => g.set(x, y + 1, 'f').set(x, y + 2, 'F').set(x - 1, y + 2, 'f').set(x + 1, y + 2, 'F'));
    return g.outline().rows();
  }
  S['item-fire-ring'] = { frameWidth: 16, frameHeight: 16, palette: { o: INK, F: '#ff8a3a', f: '#ffd24a', R: '#c8442a' }, frames: frames(2, fireRing) };

  // ---------- coins (spin, 4 frames) ----------
  const COIN_PAL = { o: INK, Y: '#ffcf4a', y: '#ffe2a0', D: '#c7922a' };
  const COIN_S1 = ['..oooo..', '..oyYo..', '.oyYYDo.', '.oyYYDo.', '.oYYYDo.', '.oYYDDo.', '..oDDo..', '..oooo..'];
  S['coin-small'] = {
    frameWidth: 8, frameHeight: 8, palette: COIN_PAL,
    frames: [
      ['..oooo..', '.oyyYYo.', 'oyyYYYDo', 'oyYYYYDo', 'oYYYYYDo', 'oYYYYDDo', '.oDDDDo.', '..oooo..'],
      COIN_S1,
      ['...oo...', '..oyDo..', '..oyDo..', '..oyDo..', '..oYDo..', '..oYDo..', '..oDDo..', '...oo...'],
      mirror(COIN_S1),
    ],
  };
  function coinBig(f) {
    const g = grid(16, 16), rx = [6.5, 4.5, 1.5][f];
    g.ell(8, 8, rx, 6.5, 'Y', 'y', 'D');
    if (f === 0) g.stamp(['..D..', '.DDD.', 'DDyDD', '.DDD.', '.D.D.'], 6, 5);
    if (f === 1) g.stamp(['D', 'D', 'D', 'D'], 8, 6);
    return g.outline().rows();
  }
  const BIG = frames(3, coinBig);
  S['coin-big'] = { frameWidth: 16, frameHeight: 16, palette: COIN_PAL, frames: [...BIG, mirror(BIG[1])] };

  // ---------- map tiles 32x32: frame 0 ground (transparent with calm specks), 1-3 decoration ----------
  // Colours are final per biome, so MapDef.tint must be removed for tiles (see brief).
  const SPECKS = [[3, 4, 'a'], [4, 4, 'a'], [17, 9, 'b'], [25, 2, 'a'], [9, 19, 'b'], [10, 19, 'b'], [22, 24, 'a'], [28, 15, 'b'], [14, 28, 'a'], [5, 27, 'b'], [29, 29, 'a']];
  function tileSet(kind) {
    const ground = () => { const g = grid(32, 32); SPECKS.forEach(([x, y, c]) => g.set(x, y, c)); return g.rows(); };
    const grass = () => {
      const g = grid(32, 32);
      [[14, 24, 12, 17, 'g'], [16, 24, 16, 15, 'G'], [18, 24, 20, 18, 'g'], [15, 24, 14, 19, 'G'], [17, 24, 18, 20, 'G']].forEach(([a, b2, c, d, col]) => g.line(a, b2, c, d, col));
      g.line(13, 25, 19, 25, 'b');
      return g.rows();
    };
    const special = () => {
      const g = grid(32, 32);
      if (kind === 'forest') {
        [[12, 16], [19, 14], [17, 21]].forEach(([x, y]) => { g.line(x, y + 1, x, y + 4, 'g'); g.set(x - 1, y, 'p').set(x + 1, y, 'p').set(x, y - 1, 'p').set(x, y + 1, 'p').set(x, y, 'c'); });
      } else {
        g.rect(15, 19, 2, 4, 's').ell(16, 18, 5, 3, 'm', null, 'M').line(11, 19, 21, 19, 'M');
        g.set(14, 16, 'p').set(18, 17, 'p').set(16, 15, 'p');
        if (kind === 'elf') g.rect(21, 22, 1, 2, 's').ell(21.5, 21.5, 2.5, 1.6, 'm', null, 'M').set(21, 21, 'p');
      }
      return g.rows();
    };
    const stones = () => {
      const g = grid(32, 32);
      if (kind === 'elf') {
        [[14, 13, 9, 2], [18, 17, 6, 1.6], [11, 18, 5, 1.4]].forEach(([x, y, hgt, hw]) => {
          for (let i = 0; i <= hgt; i++) { const half = Math.round((i / hgt) * hw); for (let d = -half; d <= half; d++) g.set(x + d, y + i, d <= 0 ? 'c' : 'C'); }
        });
        g.line(10, 23, 21, 23, 'b');
      } else {
        g.ell(13, 18, 3.5, 2.2, 's', 'q', 'b').ell(19, 21, 2.5, 1.6, 's', 'q', 'b').ell(10, 22, 1.5, 1, 's', null, 'b');
      }
      return g.rows();
    };
    return [ground(), grass(), special(), stones()];
  }
  S['tiles-forest'] = {
    frameWidth: 32, frameHeight: 32,
    palette: { a: '#3a6e3f', b: '#26502b', g: '#47804a', G: '#3c7442', p: '#d8d0a8', c: '#c7922a', s: '#56705a', q: '#6a8468' },
    frames: tileSet('forest'),
  };
  S['tiles-forest-night'] = {
    frameWidth: 32, frameHeight: 32,
    palette: { a: '#1c2d58', b: '#0a142c', g: '#24386a', G: '#1e3262', s: '#3a4a70', m: '#34508a', M: '#26407a', p: '#8fb0e8', q: '#4a5c86' },
    frames: tileSet('night'),
  };
  S['tiles-elf-forest'] = {
    frameWidth: 32, frameHeight: 32,
    palette: { a: '#4a3880', b: '#30215a', g: '#5a46a0', G: '#4e3c90', s: '#6a5a9a', m: '#7a5ac8', M: '#6248b0', p: '#9ff5ec', c: '#6ac8c8', C: '#3a8a98' },
    frames: tileSet('elf'),
  };

  // ---------- UI icons 16x16 (line + fill, coloured by tint in the game) ----------
  function uiIcon(f) {
    const g = grid(16, 16);
    if (f < 2) {
      g.rect(2, 6, 3, 4, 'k');
      for (let i = 0; i < 4; i++) g.rect(5 + i, 5 - i, 1, 6 + 2 * i, 'k');
      if (f === 0) {
        [[10, 5], [11, 6], [11, 7], [11, 8], [11, 9], [10, 10]].forEach(([x, y]) => g.set(x, y, 'k'));
        [[12, 3], [13, 4], [14, 5], [14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [13, 11], [12, 12]].forEach(([x, y]) => g.set(x, y, 'k'));
      } else {
        g.line(10, 5, 14, 9, 'k').line(14, 5, 10, 9, 'k');
      }
    } else if (f === 2) {
      g.rect(3, 2, 3, 12, 'k').rect(10, 2, 3, 12, 'k');
    } else {
      g.rect(4, 1, 8, 7, 'k').rect(6, 3, 4, 5, '.').set(4, 1, '.').set(11, 1, '.');
      g.rect(2, 7, 12, 8, 'k');
      g.rect(7, 9, 2, 2, 'o').set(7, 11, 'o').set(8, 11, 'o').set(7, 12, 'o').set(8, 12, 'o');
    }
    return g.outline().rows();
  }
  S['ui-icons'] = { frameWidth: 16, frameHeight: 16, palette: { o: '#14101c', k: '#e8ecf2' }, frames: frames(4, uiIcon) };
})(typeof window !== 'undefined' ? window : globalThis);
