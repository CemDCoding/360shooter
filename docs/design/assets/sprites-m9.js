/* Final in-game sprites, part 5 (Ergaenzung H-37 "M9: Maerchen-Quicktimes").
 * Extends window.PX_SPRITES. Load order: sprites.js, sprites-world.js (PX_TOOLKIT), sprites-desert.js, sprites-m8.js, this file.
 * Same format: { frameWidth, frameHeight, palette, frames: [rows[]] }, '.' = transparent.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 *
 * Monochrome sheets (parry-symbols, parry-decoy-edge, parry-riddle, parry-scale, ui-icons-m9) are white 'w'
 * with a dark outline 'o' (= color.hud.screen). The game tints them with setTint (multiply), the outline stays dark.
 * Colour sheet parry-motifs uses its own palette (ink outline like items and coins).
 *
 * parry-symbols frame index (14x14, 12x12 shape + 1 px outline):
 *   0 rose-bud  1 rose-half  2 rose  3 spindle  4 pebble  5 ghost  6 mist  7 sun-low  8 sun-mid  9 sun
 *   10 rope  11 head  12 head-asleep  13 heart  14 feather  15 legs4  16 legs2  17 legs3  18 sand  19 link  20 lane
 * parry-motifs frame index (16x16):
 *   0 rose  1 pebble  2 ghost  3 sun  4 stones  5 rope  6 sleep  7 feather  8 sphinx  9 mirage
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const { grid } = root.PX_TOOLKIT;
  const INK = '#0b0610';
  const SCREEN = '#0a1108'; // color.hud.screen (phos.950)

  // ---------- 12x12 shapes ----------
  const SHAPE = {
    'rose-bud': ['............', '......w.....', '.....www....', '....wwwww...', '....wwwww...', '.....www....', '...ww.w.ww..', '....wwwww...', '......w.....', '....w.w.....', '.....ww.....', '......w.....'],
    'rose-half': ['............', '....w...w...', '...ww.w.ww..', '...wwwwwww..', '....wwwww...', '.....www....', '...ww.w.ww..', '....wwwww...', '......w.....', '....w.w.....', '.....ww.....', '......w.....'],
    rose: ['..ww.ww.ww..', '.wwwwwwwwww.', '.ww..ww..ww.', '.wwww..wwww.', '..ww.ww.ww..', '...wwwwww...', '.....ww.....', '..ww.ww.....', '...wwww.....', '.....ww.ww..', '.....wwww...', '.....ww.....'],
    spindle: ['.....ww.....', '.....ww.....', '.....ww.....', '....wwww....', '...wwwwww...', '..wwwwwwww..', '...wwwwww...', '....wwww....', '.....ww.....', '.....ww.....', '.....ww.....', '.....w......'],
    pebble: ['..........w.', '.........www', '....wwww..w.', '..wwwwwwww..', '.ww..wwwwww.', '.w..wwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '..wwwwwwww..', '....wwww....', '............', '............'],
    ghost: ['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', '.ww..ww..ww.', '.ww..ww..ww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.w.ww..ww.w.'],
    mist: ['....w.w.....', '..w......w..', '.w........w.', '...ww..ww...', 'w..ww..ww..w', '............', '.w........w.', '............', 'w..........w', '............', '.w.w..w..w..', '............'],
    'sun-low': ['............', '............', '............', '............', '............', '............', '............', '............', '....wwww....', '..wwwwwwww..', 'wwwwwwwwwwww', '............'],
    'sun-mid': ['............', '............', '.w...ww...w.', '..w......w..', '....wwww....', '...wwwwww...', 'w.wwwwwwww.w', '..wwwwwwww..', '............', 'wwwwwwwwwwww', '............', '............'],
    sun: ['.....ww.....', '.w...ww...w.', '..w......w..', '....wwww....', '...wwwwww...', 'ww.wwwwww.ww', 'ww.wwwwww.ww', '...wwwwww...', '....wwww....', '..w......w..', '.w...ww...w.', '.....ww.....'],
    rope: ['....wwww....', '..ww....ww..', '.w..wwww..w.', '.w.w....w.w.', '.w.w....w.w.', '.w..wwww..w.', '..ww....ww..', '....wwww.w..', '.........w..', '..........w.', '..........w.', '...........w'],
    head: ['.w........w.', '.ww......ww.', '.www....www.', '.wwwwwwwwww.', '.ww..ww..ww.', '.ww..ww..ww.', '.wwwwwwwwww.', '..wwwwwwww..', '...ww..ww...', '...wwwwwww..', '....wwww....', '.....ww.....'],
    'head-asleep': ['............', '............', 'ww........ww', '.wwwwwwwwww.', '.wwwwwwwwww.', '.w..wwww..w.', '.wwwwwwwwww.', '..wwwwwwww..', '...ww..ww...', '...wwwwwww..', '....wwww....', '.....ww.....'],
    heart: ['............', '..ww....ww..', '.wwww..wwww.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'wwwwwwwwwwww', '.wwwwwwwwww.', '..wwwwwwww..', '...wwwwww...', '....wwww....', '.....ww.....', '............'],
    feather: ['.........ww.', '.......wwww.', '......wwwww.', '.....wwwwww.', '....wwwwww..', '...ww.wwww..', '...wwww.w...', '..ww.www....', '..wwww......', '.w..........', 'w...........', '............'],
    legs4: ['............', '............', '.wwwwwwwwww.', '.wwwwwwwwww.', '.w..w..w..w.', '.w..w..w..w.', '.w..w..w..w.', '.w..w..w..w.', '.w..w..w..w.', '.ww.ww.ww.ww', '............', '............'],
    legs2: ['............', '............', '...wwwwww...', '...wwwwww...', '...w....w...', '...w....w...', '...w....w...', '...w....w...', '...w....w...', '...ww...ww..', '............', '............'],
    legs3: ['............', '.........ww.', '..wwwwww..w.', '..wwwwww..w.', '..w..w....w.', '..w..w....w.', '..w..w....w.', '..w..w....w.', '..w..w....w.', '..ww.ww...w.', '............', '............'],
    sand: ['............', '............', '.ww...ww....', 'w..w.w..w.w.', '....w....w..', '............', '.ww...ww....', 'w..w.w..w.w.', '....w....w..', '............', '............', '............'],
    link: ['............', '............', '...wwwwww...', '..w.w..w.w..', '.w..w..w..w.', '.w..w..w..w.', '.w..w..w..w.', '.w..w..w..w.', '..w.w..w.w..', '...wwwwww...', '............', '............'],
    lane: ['............', '............', '......wwww..', '....wwwwwww.', 'ww..wwwwwww.', '....wwwwwwww', 'ww..wwwwwwww', '....wwwwwww.', 'ww...wwwww..', '............', '............', '............'],
  };
  const SYMBOL_ORDER = ['rose-bud', 'rose-half', 'rose', 'spindle', 'pebble', 'ghost', 'mist', 'sun-low', 'sun-mid', 'sun',
    'rope', 'head', 'head-asleep', 'heart', 'feather', 'legs4', 'legs2', 'legs3', 'sand', 'link', 'lane'];

  const framed = (rows, size) => { const g = grid(size, size); g.stamp(rows, (size - rows[0].length) >> 1, (size - rows.length) >> 1); g.outline('o'); return g.rows(); };

  S['parry-symbols'] = {
    frameWidth: 14, frameHeight: 14, palette: { w: '#ffffff', o: SCREEN },
    frames: SYMBOL_ORDER.map((k) => framed(SHAPE[k], 14)),
  };

  // ---------- decoy edge 44x44: wavy 2 px ring around r 20, 10 waves; frame 1 = broken (TRUG!) ----------
  function decoyEdge(broken) {
    const g = grid(44, 44);
    for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) {
      const dx = x + 0.5 - 22, dy = y + 0.5 - 22, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const R = 18.6 + 1.4 * Math.sin(10 * a);
      if (d >= R - 1 && d < R + 1 && !(broken && Math.sin(5 * a + 0.6) > 0.35)) g.set(x, y, 'w');
    }
    g.outline('o');
    return g.rows();
  }
  S['parry-decoy-edge'] = { frameWidth: 44, frameHeight: 44, palette: { w: '#ffffff', o: SCREEN }, frames: [decoyEdge(false), decoyEdge(true)] };

  // ---------- colour motifs 16x16 for the PARRY! panel ----------
  // Auto shading: pixels with an empty neighbour below/right get the shade (UPPER letter),
  // with an empty neighbour above/left the highlight (digit = index in HI).
  // palette letters: lower = base, UPPER = shade, digit = highlight of the n-th entry in HI
  const MP = {
    o: INK,
    r: '#e0483c', R: '#9a2430', g: '#5aa04a', G: '#2f6a34', // rose, leaf
    p: '#e8eef8', P: '#9aa8c0', // pebble
    q: '#d8fff4', Q: '#7fc8b8', // ghost
    s: '#ffd24a', S: '#e0901e', // sun gold
    k: '#a8a0a0', K: '#6e6468', y: '#fff4b0', Y: '#ffd24a', // stones, spark
    t: '#d8a860', T: '#9a6a30', // rope
    b: '#b07848', B: '#7a4a28', // dog
    f: '#ffffff', F: '#c8d0e0', // feather
    n: '#f0b878', N: '#b07848', u: '#4a7ae0', U: '#2a4aa0', // sphinx face, nemes blue
    m: '#f0c878', M: '#c0904a', // mirage sand
  };
  const HI = { r: '#ff8a70', p: '#ffffff', q: '#ffffff', s: '#fff4b0', k: '#d8d0cc', t: '#f0cc90', b: '#e0a070', n: '#ffd8a0', m: '#fff0c0' };
  const HIK = Object.keys(HI);
  HIK.forEach((k, i) => { MP[String(i)] = HI[k]; });
  function mk(rows, colour) {
    const g = grid(16, 16); g.stamp(rows, 2, 2);
    const src = g.rows().map((r) => [...r]);
    const out = src.map((r) => r.slice());
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (src[y][x] === '.') continue;
      const e = (dx, dy) => ((src[y + dy] || [])[x + dx] || '.') === '.';
      const c = colour(x - 2, y - 2);
      out[y][x] = e(1, 0) || e(0, 1) ? c.toUpperCase() : (e(-1, 0) || e(0, -1)) && HIK.includes(c) ? String(HIK.indexOf(c)) : c;
    }
    const g2 = grid(16, 16); g2.stamp(out.map((r) => r.join('')), 0, 0); g2.outline('o');
    return g2.rows();
  }
  const stones = (() => {
    const g = grid(12, 12);
    g.ell(3, 7, 3.2, 3.2, 'w'); g.ell(9, 7, 3.2, 3.2, 'w');
    g.set(6, 2, 'w'); g.set(5, 3, 'w'); g.set(7, 3, 'w'); g.set(6, 1, 'w');
    return g.rows();
  })();
  const sphinx = ['....wwww....', '...wwwwww...', '..ww....ww..', '.ww.w..w.ww.', '.ww......ww.', '.ww..ww..ww.', '.ww.wwww.ww.', '.www....www.', '.www.ww.www.', '..ww....ww..', '..wwwwwwww..', '............'];
  S['parry-motifs'] = {
    frameWidth: 16, frameHeight: 16, palette: MP,
    frames: [
      mk(SHAPE.rose, (x, y) => (y >= 6 ? 'g' : 'r')),
      mk(SHAPE.pebble, () => 'p'),
      mk(SHAPE.ghost, () => 'q'),
      mk(SHAPE.sun, () => 's'),
      mk(stones, (x, y) => (y <= 3 ? 'y' : 'k')),
      mk(SHAPE.rope, () => 't'),
      mk(SHAPE['head-asleep'], () => 'b'),
      mk(SHAPE.feather, () => 'f'),
      mk(sphinx, (x, y) => (x >= 3 && x <= 8 && y >= 2 && y <= 9 ? 'n' : y % 2 ? 'u' : 's')),
      mk(SHAPE.sand, () => 'm'),
    ],
  };

  // ---------- hint panel images (monochrome) ----------
  function riddle(kind) {
    const g = grid(24, 24);
    g.rect(1, 22, 22, 1, 'w'); // ground line
    if (kind === 'child') {
      g.ell(6, 12, 3, 3, 'w');
      g.rect(8, 12, 11, 4, 'w');
      [8, 11, 14, 17].forEach((x) => g.rect(x, 16, 2, 6, 'w'));
    } else if (kind === 'adult') {
      g.ell(12, 4.5, 3, 3, 'w');
      g.rect(10, 8, 5, 7, 'w');
      g.line(10, 9, 7, 14, 'w'); g.line(14, 9, 17, 14, 'w');
      g.rect(10, 15, 2, 6, 'w'); g.rect(13, 15, 2, 6, 'w');
      g.rect(9, 21, 3, 1, 'w'); g.rect(13, 21, 3, 1, 'w');
    } else {
      g.ell(8.5, 6.5, 3, 3, 'w');
      g.line(10, 9, 13, 15, 'w', 4);
      g.line(13, 11, 17, 11, 'w');
      g.rect(18, 10, 1, 12, 'w'); g.rect(16, 9, 3, 1, 'w'); g.set(16, 10, 'w');
      g.rect(11, 16, 2, 5, 'w'); g.rect(14, 16, 2, 5, 'w');
      g.rect(10, 21, 3, 1, 'w'); g.rect(14, 21, 3, 1, 'w');
    }
    g.outline('o');
    return g.rows();
  }
  S['parry-riddle'] = { frameWidth: 24, frameHeight: 24, palette: { w: '#ffffff', o: SCREEN }, frames: [riddle('child'), riddle('adult'), riddle('elder')] };

  // scale: heart pan left (heavier, sinks), feather pan right (lighter, rises). Frames: level, tilt 1, tilt 2.
  const MINI_HEART = ['.w.w.', 'wwwww', '.www.', '..w..'];
  const MINI_FEATHER = ['...ww', '..ww.', '.ww..', 'w....'];
  function scale(step) {
    const g = grid(32, 24);
    const yl = 7 + 2 * step, yr = 7 - 2 * step;
    const by = (x) => Math.round(yl + ((yr - yl) * x) / 31); // beam height at x
    g.rect(15, 5, 2, 15, 'w'); g.rect(10, 20, 12, 2, 'w'); g.rect(14, 3, 4, 2, 'w');
    g.line(0, yl, 31, yr, 'w');
    // pan: two vertical strings at the outer edges, bowl below, weight sits free inside (1 px gap all round)
    [[0, MINI_HEART], [23, MINI_FEATHER]].forEach(([x0, w]) => {
      const bowl = by(x0 + 4) + 8;
      g.line(x0, by(x0), x0, bowl, 'w'); g.line(x0 + 8, by(x0 + 8), x0 + 8, bowl, 'w');
      g.rect(x0, bowl, 9, 1, 'w'); g.rect(x0 + 1, bowl + 1, 7, 1, 'w');
      g.stamp(w, x0 + 2, bowl - 5);
    });
    g.outline('o');
    return g.rows();
  }
  S['parry-scale'] = { frameWidth: 32, frameHeight: 24, palette: { w: '#ffffff', o: SCREEN }, frames: [scale(0), scale(1), scale(2)] };

  // ---------- small UI icons 8x8: 0 box empty, 1 box filled with a cut-out check (pause toggle on), 2 'z' (head falls asleep) ----------
  S['ui-icons-m9'] = {
    frameWidth: 8, frameHeight: 8, palette: { w: '#ffffff' },
    frames: [
      ['wwwwwww.', 'w.....w.', 'w.....w.', 'w.....w.', 'w.....w.', 'w.....w.', 'wwwwwww.', '........'],
      ['wwwwwww.', 'wwwwwww.', 'wwwww.w.', 'w.ww.ww.', 'ww..www.', 'www.www.', 'wwwwwww.', '........'],
      ['........', '.wwwww..', '....w...', '...w....', '..w.....', '.wwwww..', '........', '........'],
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
