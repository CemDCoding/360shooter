/* Final in-game sprites (design source, own work of the project).
 * window.PX_SPRITES[key] = { frameWidth, frameHeight, palette, frames: [rows[]] }
 * - key = asset key in src/config/assets.ts, file = public/assets/sprites/<key>.png
 * - one character = one pixel, '.' = transparent, frames are laid out left to right
 * - palette letters map to color.sprite.* tokens (see docs/design/tokens.json)
 * Plain data plus tiny pure helpers, no DOM, no network: safe to evaluate in an
 * empty vm context (like fonts.js, see scripts/build-fonts.mjs).
 */
(function (root) {
  // ---------- helpers (pure) ----------
  const shift = (row, dx) => (dx < 0 ? row.slice(-dx) + '.'.repeat(-dx) : '.'.repeat(dx) + row.slice(0, row.length - dx));
  const put = (rows, x, y, ch) => rows.map((r, i) => (i === y ? r.slice(0, x) + ch + r.slice(x + ch.length) : r));
  const empty = (w) => '.'.repeat(w);

  // ---------- astronaut 32x32 ----------
  // Front view, upright. Hand point (grip of the raygun) = pixel 26|25 (+10|+9 from centre).
  const ASTRO_0 = [
    '...................oo...........', // 0  antenna ball
    '..................ocao..........',
    '..................oaAo..........',
    '...................oo...........',
    '...........oooooooooo...........', // 4  helmet
    '.........oohhhwwwwwwwoo.........',
    '........ohhwwwwwwwwwwwso........',
    '.......ohwwwwwwwwwwwwwwso.......',
    '......ohwwvvvvvvvvvvvvwwso......', // 8  visor
    '......owwvggvvvvvvvvvvvwso......',
    '.....owwvgvvvvvvvvvvvvvvwso.....',
    '....oowwvgvhevvvvvvhevvvwsoo....', // 11 eyes + ear lugs
    '...oaowwvvveevvvvvveevvvwsoao...',
    '...oaowwvvveevvvvvveevvvwsoao...',
    '...oAowwvvvvvvvvvvvvvvvvwsoAo...',
    '....oowwvvccvvvvvvvvccvvwsoo....', // 15 cheeks
    '.....owwwvvvvvvvvvvvvvvwwso.....',
    '......owwwvvvvvvvvvvvvwsso......',
    '.......owwwwsssssssssssso.......',
    '........ossssssssssnnnno........',
    '.........ooocaaaaaaAooo.........', // 20 collar
    '.......ooowwwwwwwwwwwsooo.......', // 21 torso
    '.......owowwwaawwwewwsowso......',
    '......owsowwwaAwwwwwssowwso.....',
    '......owsowwwwwwwwwwssoscaao....', // 24 right glove
    '......ocaowwwwwwwwwwssooaaAo....', // 25 hand point row
    '.......ooosssssaasssnno.ooo.....', // 26 belt
    '.........owwwwwwwwwwsso.........',
    '..........owwwsoowwsso..........', // 28 legs
    '..........ocaaAooaaAAo..........', // 29 boots
    '..........oooooooooooo..........',
    '................................',
  ];
  // Frame 1 (idle, breathing): head sinks 1 px, visor glint moves right.
  let ASTRO_1 = [empty(32), ...ASTRO_0.slice(0, 19), ...ASTRO_0.slice(20)];
  ASTRO_1 = put(ASTRO_1, 9, 10, 'vv'); // glint was at 10|9, 11|9, 9|10, 9|11 (+1 row)
  ASTRO_1 = put(ASTRO_1, 9, 11, 'v');
  ASTRO_1 = put(ASTRO_1, 9, 12, 'v');
  ASTRO_1 = put(ASTRO_1, 12, 10, 'gg');
  ASTRO_1 = put(ASTRO_1, 11, 11, 'g');
  // Recoil: head and collar lean back 1 px, eyes squint (determined), hand stays.
  const squint = (rows) => {
    let r = rows;
    for (const x of [11, 19]) { r = put(r, x, 11, 'vv'); r = put(r, x, 13, 'vv'); }
    return r;
  };
  const lean = (rows, dx) => rows.map((r, y) => (y <= 20 ? shift(r, dx) : r));
  const ASTRO_2 = lean(squint(ASTRO_0), -1);
  const ASTRO_3 = ASTRO_2.map((r, y) => (y <= 3 ? shift(r, -1) : r)); // antenna wobbles

  // ---------- weapon-raygun 24x16 ----------
  // Points right (0 deg). Grip = origin 7|12, muzzle = grip +15|-5 = 22|7.
  const GUN_1 = [
    '........................',
    '........................',
    '...ooooo................',
    '..ohwwwwo.......oooo....',
    '.ohwwwwwwo.....oawaAo...',
    '.ohwwwwwwwwoooooawaAooo.',
    '.owwcawwwwwwwwwwawaAoxxo', // 6  muzzle glow
    '.owwaAwwwsssssssawaAoxxo',
    '.owwwwwwwssoooooawaAooo.',
    '.owwwwwwssso...oawaAo...',
    '..ossssssso.....oooo....',
    '...oocaaAoo.............', // 11 grip
    '....ocaaAo..............',
    '.....ocaAo..............',
    '.....oaaAo..............',
    '.....ooooo..............',
  ];
  // Stage 2: fin on top, coil on the barrel, power cell turns mint.
  const GUN_2 = [
    '....ooo.................',
    '...ocaAo................',
    ...GUN_1.slice(2, 6),
    '.owwmewwwwwawawaawaAoxxo',
    '.owweEwwwsssssssawaAoxxo',
    ...GUN_1.slice(8),
  ];
  // Stage 3: stage 2 + longer emitter and mint coils.
  const GUN_3 = [
    ...GUN_2.slice(0, 2),
    '...ooooo........oooo....',
    '..ohwwwwo......oawaAo...',
    ...GUN_2.slice(4, 6),
    '.owwmewwwwwewewe' + 'awaAoxxo',
    '.owweEwwwssEsEsE' + 'awaAoxxo',
    ...GUN_2.slice(8, 10),
    '..ossssssso....oawaAo...',
    '...oocaaAoo.....oooo....',
    ...GUN_2.slice(12),
  ];
  // Shot frame: muzzle flashes, emitter rings heat up.
  const fire = (rows) => rows.map((r) => r.slice(0, 16) + r.slice(16).replace(/w/g, 'c').replace(/x/g, 'y'));

  // ---------- laser 16x4 ----------
  // White with a bright head (right), tail fades. Colour comes via tint from the weapon.
  const LASER = [
    '........lllhhh..',
    '..dddllhhhhhhhhh',
    '..dddllhhhhhhhhh',
    '........lllhhh..',
  ];

  const ASTRO_PALETTE = {
    o: '#0b0610', // sprite.outline
    h: '#ffffff', // sprite.highlight
    w: '#fff4e8', // sprite.suit
    s: '#e0c9d6', // sprite.suit-shade
    n: '#ac90b0', // sprite.suit-deep
    v: '#2a1640', // sprite.visor
    g: '#ffa0ae', // sprite.visor-glint
    e: '#5fe0c0', // sprite.eyes
    c: '#ffa0ae', // sprite.cheeks
    a: '#ff6b8a', // sprite.accent
    A: '#bf3458', // sprite.accent-shade
  };
  const GUN_PALETTE = {
    ...ASTRO_PALETTE,
    m: '#b8ffe9', // sprite.eyes-hi (power cell glint)
    E: '#2fb393', // sprite.eyes-shade
    x: '#ff8fae', // sprite.raygun-glow
    y: '#fff3b0', // sprite.muzzle-flash
  };

  root.PX_SPRITES = {
    astronaut: {
      frameWidth: 32, frameHeight: 32, palette: ASTRO_PALETTE,
      anchors: { handPoint: { x: 26, y: 25 } },
      frames: [ASTRO_0, ASTRO_1, ASTRO_2, ASTRO_3],
    },
    'weapon-raygun': {
      frameWidth: 24, frameHeight: 16, palette: GUN_PALETTE,
      anchors: { grip: { x: 7, y: 12 }, muzzle: { x: 22, y: 7 } },
      frames: [GUN_1, fire(GUN_1), GUN_2, fire(GUN_2), GUN_3, fire(GUN_3)],
    },
    laser: {
      frameWidth: 16, frameHeight: 4,
      palette: { h: '#ffffff', l: '#e6e0ee', d: '#b8aec6' },
      frames: [LASER],
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
