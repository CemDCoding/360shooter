/* Pixel renderer for design mockups only (no external requests).
 * - <span class="px" data-t="TEXT" data-s="2" data-c="--var|#hex" [data-b] [data-sh="--var|#hex"]>
 *   renders TEXT in a 5x7 bitmap font (stand-in for the chosen OFL pixel font).
 * - <span class="spr" data-n="astronaut" data-s="3">  renders a sprite; colours come from
 *   CSS variables --px-<letter> on the element or its ancestors.
 * - .stage-wrap > .stage (640x360 logical px) is scaled to the available width.
 */
(function () {
  const G = {
    A: '.###. #...# #...# ##### #...# #...# #...#',
    B: '####. #...# #...# ####. #...# #...# ####.',
    C: '.###. #...# #.... #.... #.... #...# .###.',
    D: '####. #...# #...# #...# #...# #...# ####.',
    E: '##### #.... #.... ####. #.... #.... #####',
    F: '##### #.... #.... ####. #.... #.... #....',
    G: '.###. #...# #.... #.### #...# #...# .####',
    H: '#...# #...# #...# ##### #...# #...# #...#',
    I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
    J: '..### ...#. ...#. ...#. #..#. #..#. .##..',
    K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
    L: '#.... #.... #.... #.... #.... #.... #####',
    M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
    N: '#...# ##..# #.#.# #..## #...# #...# #...#',
    O: '.###. #...# #...# #...# #...# #...# .###.',
    P: '####. #...# #...# ####. #.... #.... #....',
    Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
    R: '####. #...# #...# ####. #.#.. #..#. #...#',
    S: '.#### #.... #.... .###. ....# ....# ####.',
    T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    U: '#...# #...# #...# #...# #...# #...# .###.',
    V: '#...# #...# #...# #...# #...# .#.#. ..#..',
    W: '#...# #...# #...# #.#.# #.#.# ##.## #...#',
    X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
    Z: '##### ....# ...#. ..#.. .#... #.... #####',
    'Ä': '.#.#. ..... .###. #...# ##### #...# #...#',
    'Ö': '.#.#. ..... .###. #...# #...# #...# .###.',
    'Ü': '.#.#. ..... #...# #...# #...# #...# .###.',
    0: '.###. #...# #..## #.#.# ##..# #...# .###.',
    1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
    2: '.###. #...# ....# ...#. ..#.. .#... #####',
    3: '####. ....# ....# .###. ....# ....# ####.',
    4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
    5: '##### #.... ####. ....# ....# #...# .###.',
    6: '.###. #.... #.... ####. #...# #...# .###.',
    7: '##### ....# ...#. ..#.. .#... .#... .#...',
    8: '.###. #...# #...# .###. #...# #...# .###.',
    9: '.###. #...# #...# .#### ....# ....# .###.',
    ' ': '..... ..... ..... ..... ..... ..... .....',
    ':': '..... ..#.. ..#.. ..... ..#.. ..#.. .....',
    '.': '..... ..... ..... ..... ..... ..#.. ..#..',
    ',': '..... ..... ..... ..... ..#.. ..#.. .#...',
    '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
    '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
    '-': '..... ..... ..... .###. ..... ..... .....',
    '–': '..... ..... ..... ##### ..... ..... .....',
    '—': '..... ..... ..... ##### ..... ..... .....',
    '·': '..... ..... ..... ..#.. ..... ..... .....',
    '_': '..... ..... ..... ..... ..... ..... #####',
    '+':'..... ..#.. ..#.. ##### ..#.. ..#.. .....',
    '/': '....# ....# ...#. ..#.. .#... #.... #....',
    '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
    '×': '..... #...# .#.#. ..#.. .#.#. #...# .....',
    '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
    ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
    "'": '..#.. ..#.. ..... ..... ..... ..... .....',
    '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
    '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
    '#': '.#.#. ##### .#.#. .#.#. .#.#. ##### .#.#.',
  };
  const P = {};
  for (const k of Object.keys(G)) {
    const rows = G[k].split(' ');
    let min = 5, max = -1;
    rows.forEach((r) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') { min = Math.min(min, i); max = Math.max(max, i); } });
    if (max < 0) { min = 0; max = 2; }
    P[k] = { rows, min, max };
  }

  const S = {
    astronaut: [
      '.....oooooo.....',
      '...oowwwwwwoo...',
      '..owwwwwwwwwwo..',
      '.owwvvvvvvvvwwo.',
      '.owvgvvvvvvvvwo.',
      '.owvvevvvvevvwo.',
      '.owvvevvvvevvwo.',
      '.owvcvvvvvvcvwo.',
      '.owwvvvvvvvvwwo.',
      '..owwwwwwwwwwo..',
      '...oooaaaaooo...',
      '..owwwwaawwwwo..',
      '.owlowwwwwwolwo.',
      '..oo.owllwo.oo..',
      '....owo..owo....',
      '....ooo..ooo....',
    ],
    tree: [
      '....oooooooo....',
      '..ooffffffffoo..',
      '.offfFffffFfffo.',
      'offFffffffffFffo',
      'offfffFffffffffo',
      '.offFffffffFffo.',
      '..oooottttoooo..',
      '.....orttro.....',
      '.....otddto.....',
      '.....otttto.....',
      '....otttttto....',
      '..ott.otto.tto..',
      '..oo..o..o..oo..',
    ],
    squirrel: [
      '..........oo....',
      '.........oZZo...',
      '........oZZZZo..',
      '..oo....oZZZZo..',
      '.oSSo...oZZZo...',
      'oSRSSo..oZZo....',
      'oSSSSSoooZo.....',
      '.oSSSSSSSo......',
      '..oSSSSSSo......',
      '..oSo..oSo......',
      '..oo...oo.......',
    ],
    spirit: [
      '....oooo....',
      '..ooGGGGoo..',
      '.oGGGGGGGGo.',
      'oGGeGGGGeGGo',
      'oGGeGGGGeGGo',
      'oGGGGGGGGGGo',
      'oGGGGmmGGGGo',
      '.oGGGGGGGGo.',
      '.oGGoGGoGGo.',
      '..oo.oo.oo..',
    ],
    witch: [
      '......oo......',
      '.....oHHo.....',
      '....oHHHo.....',
      '....oHHHHo....',
      '..ooHHHHHHoo..',
      '.oHHHHHHHHHHo.',
      '..ooKKKKKKoo..',
      '...oKeKKeKo...',
      '...oKKKKKKo...',
      '....oKKKKo....',
      '...oRRRRRRo...',
      '..oRRRRRRRRo..',
      '..oRRRRRRRRo..',
      '...oooooooo...',
    ],
    coin: [
      '..oooo..',
      '.oYYYYo.',
      'oYyYYYYo',
      'oYyYYYDo',
      'oYYYYYDo',
      'oYYYYDDo',
      '.oDDDDo.',
      '..oooo..',
    ],
    shield: [
      '.oooooooo.',
      'oBBBBBBBBo',
      'oBbBBBBBBo',
      'oBbBBBBBBo',
      'oBBBBBBBBo',
      '.oBBBBBBo.',
      '.oBBBBBBo.',
      '..oBBBBo..',
      '...oBBo...',
      '....oo....',
    ],
    rapid: [
      '.....ooo..',
      '....oYYo..',
      '...oYYo...',
      '..oYYYooo.',
      '.oYYYYYYo.',
      '.oooYYYo..',
      '...oYYo...',
      '..oYYo....',
      '..oYo.....',
      '..oo......',
    ],
    double: [
      '..........',
      'oooooooo..',
      'oLLLLLLLo.',
      'oooooooo..',
      '..........',
      '.oooooooo.',
      '.oLLLLLLLo',
      '.oooooooo.',
      '..........',
      '..........',
    ],
    heal: [
      '...oooo...',
      '...oHHo...',
      'ooooHHoooo',
      'oHHHHHHHHo',
      'oHHHHHHHHo',
      'ooooHHoooo',
      '...oHHo...',
      '...oooo...',
    ],
    ring: [
      '...oooo...',
      '.ooFFFFoo.',
      'oFFo..oFFo',
      'oFo....oFo',
      'oFo....oFo',
      'oFFo..oFFo',
      '.ooFFFFoo.',
      '...oooo...',
    ],
    lock: [
      '..oooo..',
      '.o....o.',
      '.o....o.',
      'oooooooo',
      'okkkkkko',
      'okkookko',
      'okkkkkko',
      'oooooooo',
    ],
    star: [
      '...oo...',
      '..osso..',
      'oossssoo',
      'osssssso',
      '.osssso.',
      '.osooso.',
      'oso..oso',
      'oo....oo',
    ],
    speaker: [
      '....o...',
      '...oo..o',
      'oooko.o.',
      'okkko.o.',
      'okkko.o.',
      'oooko.o.',
      '...oo..o',
      '....o...',
    ],
    pause: [
      'ooo..ooo',
      'oko..oko',
      'oko..oko',
      'oko..oko',
      'oko..oko',
      'oko..oko',
      'oko..oko',
      'ooo..ooo',
    ],
    raygun1: [
      '.ooo........',
      'owwwo.......',
      'owwwoooooo..',
      'owlwwwwwwoxo',
      'owwwoooooo..',
      '.owwo.......',
      '..owo.......',
      '..ooo.......',
    ],
    raygun2: [
      '.oaao.......',
      'owwwo.......',
      'owwwoooooo..',
      'owlwawawaoxo',
      'owwwoooooo..',
      '.owwo.......',
      '..owo.......',
      '..ooo.......',
    ],
    raygun3: [
      '.oaao.......',
      'owxwo.......',
      'owxwooooooxo',
      'owlwawawaoxo',
      'owwwooooooxo',
      '.owwo.......',
      '..owo.......',
      '..ooo.......',
    ],
    bolt: [
      '.oo.',
      'oPPo',
      'oPPo',
      '.oo.',
    ],
  };
  const DEF = {
    o: '#14101c', w: '#f4f1f8', l: '#c9c2d6', v: '#1d2a4a', g: '#9fe8ff', e: '#7ff0e0', c: '#ff8fae', a: '#ff6b8a',
    f: '#4f8a3c', F: '#3a6b2c', t: '#6b4a32', d: '#2a1a12', r: '#ff4a3a',
    S: '#8a9a7a', Z: '#6d7d5e', R: '#ff4a3a', G: '#b9f5ee', m: '#2a3d4a',
    H: '#4a2d6b', K: '#9fd08a', Y: '#ffd24a', y: '#fff3b0', D: '#c7922a', B: '#5fb8ff', b: '#d6f0ff',
    L: '#ff6b8a', P: '#c86bff', k: '#e8ecf2', s: '#ffd24a', x: '#ff8fae',
  };
  function col(c, el) {
    if (!c) return '#ffffff';
    if (c.startsWith('--')) return getComputedStyle(el).getPropertyValue(c).trim() || '#ffffff';
    return c;
  }
  function measure(t, bold) {
    let w = 0;
    for (const ch of t) { const g = P[ch] || P['?']; w += g.max - g.min + 1 + (bold ? 1 : 0) + 1; }
    return Math.max(0, w - 1);
  }
  function drawFontText(el, font) {
    const raw = el.dataset.t || '';
    const t = raw.toUpperCase();
    const s = +el.dataset.s || 1;
    const sh = el.dataset.sh;
    const glyph = (ch) => {
      if (ch === ' ') return { w: font.space, rows: null };
      const src = font.g[ch] || font.g['?'];
      const rows = src.split('/');
      return { w: rows[0].length, rows };
    };
    const gs = [...t].map(glyph);
    const w = Math.max(1, gs.reduce((a, g) => a + g.w + 1, 0) - 1) + (sh ? 1 : 0);
    const h = font.h + (sh ? 1 : 0);
    const cv = document.createElement('canvas');
    cv.width = w * s; cv.height = h * s;
    cv.style.width = w * s + 'px'; cv.style.height = h * s + 'px';
    const ctx = cv.getContext('2d');
    const pass = (c, ox, oy) => {
      ctx.fillStyle = c;
      let x = 0;
      for (const g of gs) {
        if (g.rows) g.rows.forEach((r, ry) => { for (let cx = 0; cx < r.length; cx++) if (r[cx] === '#') ctx.fillRect((x + cx + ox) * s, (ry + oy) * s, s, s); });
        x += g.w + 1;
      }
    };
    if (sh) pass(col(sh, el), 1, 1);
    pass(col(el.dataset.c, el), 0, 0);
    el.textContent = '';
    el.appendChild(cv);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', raw);
  }
  function drawText(el) {
    const f = el.dataset.f || (el.closest('[data-font]') && el.closest('[data-font]').dataset.font);
    if (f && window.PX_FONTS && window.PX_FONTS[f]) return drawFontText(el, window.PX_FONTS[f]);
    const raw = el.dataset.t || '';
    const t = raw.toUpperCase();
    const s = +el.dataset.s || 1;
    const bold = 'b' in el.dataset;
    const sh = el.dataset.sh;
    const w = measure(t, bold) + (sh ? 1 : 0);
    const h = 7 + (sh ? 1 : 0);
    const cv = document.createElement('canvas');
    cv.width = w * s; cv.height = h * s;
    cv.style.width = w * s + 'px'; cv.style.height = h * s + 'px';
    const ctx = cv.getContext('2d');
    const pass = (c, ox, oy) => {
      ctx.fillStyle = c;
      let x = 0;
      for (const ch of t) {
        const g = P[ch] || P['?'];
        for (let r = 0; r < 7; r++)
          for (let cc = g.min; cc <= g.max; cc++)
            if (g.rows[r][cc] === '#') ctx.fillRect((x + cc - g.min + ox) * s, (r + oy) * s, s * (bold ? 2 : 1), s);
        x += g.max - g.min + 1 + (bold ? 1 : 0) + 1;
      }
    };
    if (sh) pass(col(sh, el), 1, 1);
    pass(col(el.dataset.c, el), 0, 0);
    el.textContent = '';
    el.appendChild(cv);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', raw);
  }
  function drawSprite(el) {
    const map = S[el.dataset.n];
    if (!map) return;
    const s = +el.dataset.s || 1;
    const w = map[0].length, h = map.length;
    const cv = document.createElement('canvas');
    cv.width = w * s; cv.height = h * s;
    cv.style.width = w * s + 'px'; cv.style.height = h * s + 'px';
    const ctx = cv.getContext('2d');
    const cs = getComputedStyle(el);
    const cache = {};
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = map[y][x];
        if (k === '.') continue;
        if (!(k in cache)) cache[k] = cs.getPropertyValue('--px-' + k).trim() || DEF[k] || '#ff00ff';
        ctx.fillStyle = cache[k];
        ctx.fillRect(x * s, y * s, s, s);
      }
    el.textContent = '';
    el.appendChild(cv);
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-hidden', 'true');
  }
  function fit() {
    document.querySelectorAll('.stage-wrap').forEach((w) => {
      const st = w.querySelector('.stage');
      const k = Math.min(2, w.clientWidth / 640);
      st.style.transform = 'scale(' + k + ')';
      w.style.height = 360 * k + 'px';
    });
  }
  function run() {
    document.querySelectorAll('.px').forEach(drawText);
    document.querySelectorAll('.spr').forEach(drawSprite);
    fit();
  }
  window.addEventListener('resize', fit);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
