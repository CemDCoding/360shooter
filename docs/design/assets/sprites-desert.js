/* Final in-game sprites, part 3 (Ergänzung "Wüste"): 3 desert maps, their enemies and bosses,
 * plus three new forest enemies (boar, bear, fairy). Extends window.PX_SPRITES.
 * Load order: sprites.js, sprites-world.js (provides PX_TOOLKIT), then this file.
 * Same format and rules as sprites-world.js: enemies face right, light from top left,
 * enemy outline night black, loops at 4 fps. Pure code, no DOM, no network.
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const { grid, mirror, frames } = root.PX_TOOLKIT;
  const NIGHT_BLACK = '#070a14';
  const RED_EYE = { r: '#ff4a3a', y: '#ffd0b0' };
  const put = (key, w, h, palette, n, fn) => { S[key] = { frameWidth: w, frameHeight: h, palette: { o: NIGHT_BLACK, ...palette }, frames: frames(n, fn) }; };

  // ======================= DESERT ENEMIES =======================

  // ---------- mummy 32x32: slow shamble, arms forward, one glowing eye, loose wrap ----------
  const MUMMY = { W: '#e8dcc0', w: '#bfae88', h: '#fff6e0', d: '#3a2c20', D: '#7a6a4c', ...RED_EYE };
  function mummy(f) {
    const g = grid(32, 32), b = [0, 1, 0, 1][f], st = [0, 1, 0, -1][f], wv = [0, 1, 2, 1][f];
    g.line(11, 20 + b, 8, 22 + wv, 'w').line(8, 22 + wv, 5, 21 + (2 - wv), 'w').line(5, 21 + (2 - wv), 3, 24, 'D');
    g.rect(17 - st, 25, 4, 5, 'w').rect(11 + st, 25, 4, 5, 'W').rect(11 + st, 29, 5, 1, 'w');
    g.line(18, 18 + b, 26, 19 + b, 'w', 3);
    g.rect(11, 14 + b, 11, 12 - b, 'W').rect(11, 14 + b, 1, 12 - b, 'h').rect(20, 14 + b, 2, 12 - b, 'w');
    g.ell(16.5, 9 + b, 6, 5.5, 'W', 'h', 'w');
    g.line(19, 16 + b, 28, 15 + b + (f % 2), 'W', 3);
    // diagonal wraps
    for (let y = 3; y < 31; y++) for (let x = 0; x < 32; x++) if (g.get(x, y) === 'W' && (y * 2 + x) % 7 === 0) g.set(x, y, 'D');
    g.rect(14, 8 + b, 8, 2, 'd').set(19, 8 + b, 'r').set(20, 8 + b, 'r').set(19, 9 + b, 'y');
    g.set(12, 7 + b, 'D').set(21, 12 + b, 'D').set(29, 15 + b + (f % 2), 'w');
    return g.outline().rows();
  }
  put('enemy-mummy', 32, 32, MUMMY, 4, mummy);

  // ---------- projectile: mummy wrap 16x8 (flying bandage) ----------
  S['mummy-wrap'] = {
    frameWidth: 16, frameHeight: 8,
    palette: { o: NIGHT_BLACK, W: '#e8dcc0', D: '#a8966c' },
    frames: [
      ['................', '..ooo.......ooo.', '.oWWWoo...ooWWWo', 'oWDWWWWoooWWDWWo', 'oWWWDWWWWWWWWDo.', '.ooWWWWDWWWWoo..', '...oooooooooo...', '................'],
      ['................', '.ooo........ooo.', 'oWWWoo....ooWDWo', 'oDWWWWooooWWWWWo', '.oWWDWWWWWDWWWo.', '..ooWWWWWWWWoo..', '....oooooooo....', '................'],
    ],
  };

  // ---------- sand worm 24x24: fast, funny, sandy (googly eyes out of a sand mound) ----------
  const WORM = { s: '#d8a860', S: '#a87438', h: '#f0c888', p: '#e8a070', P: '#b86a48', q: '#ffc8a0', e: '#ffffff', d: '#2a1a12', m: '#7a2a3a' };
  function sandWorm(f) {
    const g = grid(24, 24), up = [0, 1, 2, 1][f], sw = [0, 1, 0, -1][f];
    for (let y = 19; y >= 8 - up; y--) {
      const cx = 11 + Math.round(Math.sin((y + f * 2) / 3) * 1.2);
      for (let x = cx - 3; x <= cx + 2; x++) g.set(x, y, x === cx - 3 ? 'q' : x >= cx + 1 ? 'P' : (y + f) % 3 === 0 ? 'P' : 'p');
    }
    g.ell(13, 7 - up, 5.5, 4.5, 'p', 'q', 'P');
    g.rect(11, 3 - up, 3, 3, 'e').rect(15, 3 - up, 3, 3, 'e');
    g.set(12 + (sw > 0 ? 1 : 0), 4 - up, 'd').set(16 + (sw >= 0 ? 1 : 0), 4 - up + (f === 2 ? 1 : 0), 'd');
    g.rect(15, 8 - up, 4, 2, 'm').set(18, 8 - up, 'e');
    g.ell(11, 20, 9.5, 3.5, 's', 'h', 'S');
    (f % 2 ? [[2, 15], [20, 14], [4, 12]] : [[1, 17], [21, 16], [19, 12]]).forEach(([x, y]) => g.set(x, y, 's'));
    return g.outline().rows();
  }
  put('enemy-sand-worm', 24, 24, WORM, 4, sandWorm);

  // ---------- armadillo 32x32: cute, rolls (bands travel, little face peeks out) ----------
  const DILLO = { a: '#c8a090', A: '#8a6460', h: '#ecd0c0', K: '#5a3e40', p: '#f4a8b0', e: '#1a1020', W: '#ffffff', u: '#c8a878' };
  function armadillo(f) {
    const g = grid(32, 32);
    g.ell(15, 18, 11.5, 10, 'a', 'h', 'A');
    for (let k = 0; k < 5; k++) {
      const x = 5 + ((k * 5 + f * 2) % 22);
      for (let y = 8; y < 29; y++) if ('ahA'.includes(g.get(x, y)) && y > 9) g.set(x, y, 'K');
    }
    g.ell(9, 18, 4, 7, 'a', null, null).rim(15, 18, 11.5, 10, 'A', 0.6);
    g.rect(16, 7, 2, 3, 'p').rect(21, 7, 2, 3, 'p');
    g.ell(25.5, 19, 3.2, 3.6, 'h', null, 'a');
    g.set(25, 18, 'e').set(25, 17, 'e').set(24, 17, 'W');
    g.rect(28, 20, 2, 2, 'p').set(30, 21, 'p').set(26, 21, 'p');
    g.line(4, 24, 2, 27, 'A');
    if (f % 2) g.set(5, 29, 'u').set(7, 30, 'u').set(3, 28, 'u');
    return g.outline().rows();
  }
  put('enemy-armadillo', 32, 32, DILLO, 4, armadillo);

  // ---------- camel 32x32: goofy, two humps, big lips, spits (frame 3 = cheeks full) ----------
  const CAMEL = { c: '#d4a464', C: '#a07040', h: '#ecc488', l: '#c8846c', e: '#ffffff', d: '#2a1a12', r: '#c8464e', t: '#3aa8a0', y: '#ffcf4a' };
  function camel(f) {
    const g = grid(32, 32), st = [0, 1, 0, -1][f], b = [0, 1, 0, 1][f];
    [[8, 'C', st], [11, 'c', -st], [19, 'C', -st], [22, 'c', st]].forEach(([x, c, s]) => g.rect(x + s, 21 + b, 2, 9 - b, c).rect(x + s, 29, 3, 1, 'C'));
    g.ell(15, 17 + b, 10, 5, 'c', 'h', 'C');
    g.ell(10, 11 + b, 3.6, 3.6, 'c', 'h', 'C').ell(18, 11 + b, 3.6, 3.6, 'c', 'h', 'C');
    g.rect(13, 12 + b, 3, 6, 'r').set(14, 13 + b, 't').set(14, 15 + b, 't').set(14, 17 + b, 'y');
    g.line(23, 16 + b, 25, 8 + b, 'c', 3).line(25, 16 + b, 27, 9 + b, 'C');
    g.ell(26.5, 6 + b, 4, 2.6, 'c', 'h', 'C').rect(28, 5 + b, 3, 3, 'c');
    g.rect(29, 8 + b, 3, 2, 'l').set(31, 7 + b, 'l');
    if (f === 3) g.ell(28, 8 + b, 2, 1.6, 'h');
    g.set(25, 5 + b, 'e').set(26, 5 + b, 'd').set(25, 4 + b, 'C').set(26, 4 + b, 'C');
    g.set(23, 3 + b, 'C').set(24, 3 + b, 'c').set(26, 3 + b, 'C').set(27, 3 + b, 'C');
    g.line(5, 15 + b, 3, 20 + b, 'C');
    return g.outline().rows();
  }
  put('enemy-camel', 32, 32, CAMEL, 4, camel);

  // ---------- projectile: camel spit 8x8 ----------
  S['camel-spit'] = {
    frameWidth: 8, frameHeight: 8,
    palette: { o: NIGHT_BLACK, g: '#c8e878', G: '#88b048', W: '#ffffff' },
    frames: [
      ['........', '..ooo...', '.oWggo..', 'oWgggGo.', 'oggggGGo', '.oGGGGo.', '..oooo..', '........'],
      ['........', '...ooo..', '..oWggo.', '.oggggGo', 'oWgggGo.', 'oggGGo..', '.oooo...', '........'],
    ],
  };

  // ---------- snake 24x24: desert horned viper, quick, venom-green eye and drip ----------
  const SNAKE = { g: '#d0b858', G: '#8a7a2a', h: '#f0dc8a', k: '#6a4020', b: '#f4e8b0', v: '#a8ff4a', r: '#ff4a6a', d: '#1a1408' };
  function snake(f) {
    const g = grid(24, 24);
    for (let x = 1; x <= 16; x++) {
      const y = 18 + Math.round(Math.sin((x + f * 2) / 2.4) * 2);
      const th = x < 4 ? 1 : x < 7 ? 2 : 3;
      for (let k = 0; k < th; k++) g.set(x, y - k + 1, k === th - 1 ? 'h' : k === 0 && th === 3 ? 'b' : 'g');
      if (th === 3 && (x + f * 2) % 5 === 0) g.set(x, y, 'k').set(x + 1, y, 'k');
    }
    g.line(16, 18, 18, 10, 'g', 3).line(15, 17, 17, 10, 'h');
    g.ell(19.5, 8, 3.8, 2.5, 'g', 'h', 'G');
    g.set(18, 5, 'G').set(18, 6, 'G').set(19, 5, 'G');
    g.set(20, 7, 'v').set(21, 7, 'd');
    g.line(19, 12, 18, 16, 'k');
    if (f % 2) g.set(23, 9, 'r').set(22, 9, 'r'); else g.set(23, 8, 'r').set(23, 10, 'r').set(22, 9, 'r');
    if (f === 2) g.set(21, 11, 'v');
    return g.outline().rows();
  }
  put('enemy-snake', 24, 24, SNAKE, 4, snake);

  // ---------- archaeologist 32x32: human, pith helmet, round glasses, giant magnifier ----------
  const ARCH = { s: '#f0c098', S: '#c88a68', H: '#e8d8a8', i: '#fff4d0', I: '#a89060', c: '#c8b07a', C: '#8a7448', p: '#6a4a30', P: '#4a3020', k: '#3a2418', m: '#7a4a2a', L: '#bfeaff', l: '#ffffff', R: '#c7922a', w: '#7a5638', d: '#1a1020' };
  function archaeologist(f) {
    const g = grid(32, 32), st = [0, 1, 0, -1][f], b = [0, 1, 0, 1][f];
    g.rect(12 + st, 23, 3, 6, 'p').rect(17 - st, 23, 3, 6, 'P');
    g.rect(11 + st, 28, 5, 2, 'k').rect(17 - st, 28, 5, 2, 'k');
    g.rect(11, 15 + b, 10, 9 - b, 'c').rect(11, 15 + b, 1, 9 - b, 'i').rect(19, 15 + b, 2, 9 - b, 'C');
    g.line(12, 15 + b, 19, 22 + b, 'w').rect(11, 21 + b, 10, 1, 'k');
    g.rect(9, 16 + b, 2, 5, 'C').rect(9, 21 + b, 2, 1, 's');
    g.ell(16.5, 10 + b, 4.6, 4.4, 's', null, 'S');
    g.ell(16.5, 6 + b, 5, 3, 'H', 'i', 'I').line(9, 8 + b, 24, 8 + b, 'I').line(10, 8 + b, 22, 8 + b, 'H');
    g.rect(17, 10 + b, 2, 2, 'd').rect(20, 10 + b, 2, 2, 'd').set(19, 10 + b, 'd').set(17, 10 + b, 'l').set(20, 10 + b, 'l');
    g.rect(18, 13 + b, 4, 1, 'm').set(21, 12 + b, 'S');
    g.line(19, 17 + b, 24, 16 + b, 'c', 2).set(25, 16 + b, 's').set(25, 17 + b, 's');
    g.line(26, 16 + b, 25, 20 + b, 'w', 2);
    g.ell(27.5, 11 + b, 3.6, 3.6, 'R').ell(27.5, 11 + b, 2.4, 2.4, 'L').set(26, 10 + b, 'l').set(27, 9 + b, 'l');
    return g.outline().rows();
  }
  put('enemy-archaeologist', 32, 32, ARCH, 4, archaeologist);

  // ---------- sphinx 48x48: big, powerful, made of sand, glowing eyes, crumbles while walking ----------
  const SPHINX = { s: '#d8b070', S: '#a8804c', h: '#f0d49a', k: '#7a5634', K: '#5a3e26', c: '#5ff5ec', C: '#2fb8c0' };
  function sphinx(f) {
    const g = grid(48, 48), st = [0, 1, 0, -1][f], b = [0, 1, 0, 1][f];
    [[8, 'S', st], [13, 's', -st], [28, 'S', -st], [33, 's', st]].forEach(([x, c, s]) => g.rect(x + s, 34 + b, 5, 10 - b, c).rect(x + s - 1, 42, 7, 2, 'S'));
    g.line(6, 30 + b, 2, 22 + b, 'S', 2).ell(2, 21 + b, 2, 2, 'k');
    g.ell(20, 31 + b, 15, 7, 's', 'h', 'S');
    g.ell(33, 27 + b, 7, 9, 's', 'h', 'S');
    // nemes headdress (striped lappets) behind the face
    for (let y = 8; y <= 30; y++) {
      const hw = y < 13 ? 3 + (y - 8) : y < 22 ? 8 : 8 - Math.round((y - 22) * 0.5);
      for (let x = 37 - hw; x <= 37 + hw - 2; x++) g.set(x, y + b, (y % 3 === 0) ? 'k' : x > 37 + hw - 4 ? 'S' : 's');
    }
    g.ell(38, 15 + b, 5, 6, 's', 'h', 'S');
    g.rect(35, 9 + b, 7, 2, 'k').set(38, 7 + b, 'k').set(38, 8 + b, 'S');
    g.rect(38, 13 + b, 2, 2, 'c').rect(41, 13 + b, 2, 2, 'c').set(38, 13 + b, 'C').set(41, 13 + b, 'C');
    g.rect(42, 15 + b, 2, 3, 'S').rect(39, 19 + b, 4, 1, 'k').rect(39, 21 + b, 3, 4, 'S').rect(39, 24 + b, 3, 1, 'k');
    g.line(12, 28 + b, 17, 32 + b, 'K').line(17, 32 + b, 15, 36 + b, 'K').line(27, 26 + b, 29, 31 + b, 'K');
    (f % 2 ? [[11, 45], [21, 46], [36, 45], [5, 44]] : [[14, 46], [25, 45], [31, 46], [40, 45]]).forEach(([x, y]) => g.set(x, y, 's').set(x + 1, y, 'S'));
    return g.outline().rows();
  }
  put('enemy-sphinx', 48, 48, SPHINX, 4, sphinx);

  // ======================= FOREST ENEMIES =======================

  // ---------- boar 32x32: wild, bristly mane, curved tusks, red eye ----------
  const BOAR = { f: '#7a5440', F: '#4e3428', h: '#9a7058', k: '#2e1e18', n: '#d08a7a', N: '#a06058', w: '#f4ecd8', d: '#1a0e0a', ...RED_EYE };
  function boar(f) {
    const g = grid(32, 32), st = [0, 2, 0, -2][f], b = [0, 1, 0, 1][f];
    [[7, 'F', st], [10, 'f', -st], [19, 'F', -st], [22, 'f', st]].forEach(([x, c, s]) => g.rect(x + s, 22 + b, 3, 6 - b, c).rect(x + s, 27, 3, 1, 'k'));
    g.ell(15, 18 + b, 10.5, 6.5, 'f', 'h', 'F');
    g.ell(24, 18 + b, 5.5, 5, 'f', 'h', 'F').rect(27, 17 + b, 3, 4, 'f');
    g.rect(29, 17 + b, 3, 4, 'n').rect(31, 17 + b, 1, 4, 'N').set(30, 18 + b, 'd').set(30, 20 + b, 'd');
    g.set(29, 21 + b, 'w').set(30, 21 + b, 'w').set(30, 22 + b, 'w').set(31, 16 + b, 'w').set(31, 15 + b, 'w').set(29, 15 + b, 'w').set(28, 16 + b, 'w');
    g.set(25, 15 + b, 'r').set(26, 15 + b, 'y').line(24, 13 + b, 27, 14 + b, 'k');
    g.set(21, 11 + b, 'F').set(21, 10 + b, 'k').set(22, 12 + b, 'F');
    for (let x = 6; x <= 22; x++) {
      let y = 0; while (y < 31 && g.get(x, y) === '.') y++;
      const len = [2, 1, 3, 1][(x + f) % 4];
      for (let k = 1; k <= len; k++) g.set(x, y - k, 'k');
    }
    g.line(4, 15 + b, 2, 13 + b, 'F').set(2, 12 + b, 'k');
    return g.outline().rows();
  }
  put('enemy-boar', 32, 32, BOAR, 4, boar);

  // ---------- bear 32x32: cute brown bear hugging a honey pot ----------
  const BEAR = { b: '#9a6238', B: '#64401e', h: '#b8804e', m: '#e0b88a', n: '#24140c', W: '#ffffff', q: '#c86a3a', Q: '#8a4424', y: '#ffcf4a', Y: '#c7922a' };
  function bear(f) {
    const g = grid(32, 32), st = [0, 1, 0, -1][f], b = [0, 1, 0, 1][f];
    g.ell(11 + st, 28, 3.5, 2.5, 'B').ell(20 - st, 28, 3.5, 2.5, 'b');
    g.ell(15, 20 + b, 9, 8, 'b', 'h', 'B').ell(16, 22 + b, 5, 5, 'm');
    g.ell(17, 10 + b, 7, 6, 'b', 'h', 'B');
    g.ell(12, 5 + b, 2.6, 2.6, 'b', 'h', 'B').ell(22, 5 + b, 2.6, 2.6, 'b', null, 'B').set(12, 5 + b, 'm').set(22, 5 + b, 'm');
    g.ell(22, 12 + b, 3.6, 2.6, 'm').rect(23, 10 + b, 2, 2, 'n');
    g.rect(16, 9 + b, 2, 2, 'n').rect(20, 9 + b, 2, 2, 'n').set(16, 9 + b, 'W').set(20, 9 + b, 'W');
    g.set(22, 14 + b, 'n').set(23, 14 + b, 'n');
    // honey pot
    g.rect(20, 18 + b, 8, 7, 'q').rect(20, 18 + b, 1, 7, 'Q').rect(26, 18 + b, 2, 7, 'Q').rect(19, 17 + b, 10, 2, 'Q');
    g.rect(20, 16 + b, 8, 1, 'y').set(22, 19 + b, 'y').set(22, 20 + b, 'y').set(25, 19 + b, 'y').set(22, 21 + b, 'Y');
    g.ell(19, 21 + b, 2.2, 2, 'b', 'h').ell(28, 21 + b, 2, 2, 'B');
    if (f % 2) g.set(21, 15 + b, 'y').set(19, 18 + b, 'y');
    return g.outline().rows();
  }
  put('enemy-bear', 32, 32, BEAR, 4, bear);

  // ---------- fairy 24x24: very cute, mystic, fluttering wings, sparkles ----------
  const FAIRY = { k: '#ffe4d4', K: '#f0b8a8', h: '#ff8ad8', H: '#c454b0', v: '#b89aff', V: '#7a5ad8', w: '#e0fbff', W: '#8fd8f0', e: '#3a1a5a', p: '#ff9ab8', y: '#fff3b0', Y: '#ffd24a' };
  function fairy(f) {
    const g = grid(24, 24), b = [0, 1, 2, 1][f], flap = [3.6, 2.4, 1.2, 2.4][f];
    g.ell(7, 8 + b, 5, flap + 1.2, 'w', null, 'W').ell(7, 14 + b, 3.8, flap * 0.7 + 0.8, 'w', null, 'W');
    for (let y = 13; y <= 19; y++) { const hw = Math.round((y - 12) * 0.6); for (let x = 12 - hw; x <= 13 + hw; x++) g.set(x, y + b, x > 12 + hw - 1 ? 'V' : 'v'); }
    g.set(11, 20 + b, 'K').set(14, 20 + b, 'K');
    g.ell(13, 8 + b, 4.6, 4.4, 'k', null, 'K');
    g.ell(12, 5 + b, 5, 2.6, 'h', null, 'H').rect(8, 5 + b, 2, 6, 'h').set(9, 11 + b, 'H').set(15, 3 + b, 'H').set(17, 4 + b, 'h');
    g.rect(13, 8 + b, 2, 2, 'e').rect(16, 8 + b, 2, 2, 'e').set(13, 8 + b, 'y').set(16, 8 + b, 'y');
    g.set(12, 10 + b, 'p').set(18, 10 + b, 'p').set(15, 11 + b, 'K');
    g.line(15, 14 + b, 19, 13 + b, 'k').set(20, 12 + b, 'Y').set(21, 11 + b, 'y').set(20, 11 + b, 'y').set(19, 11 + b, 'y').set(20, 10 + b, 'y');
    (f % 2 ? [[2, 2], [22, 17], [3, 20]] : [[21, 4], [1, 16], [17, 21]]).forEach(([x, y]) => g.set(x, y, 'y'));
    return g.outline().rows();
  }
  put('enemy-fairy', 24, 24, FAIRY, 4, fairy);

  // ======================= BOSSES =======================

  // ---------- boss: giant sand worm, head 64x64 (prickly skin, spiked crown, ring mouth) ----------
  const SWORM = { w: '#c88e58', W: '#8a5a32', h: '#e8b47a', x: '#f4e4c4', X: '#9a8060', m: '#5a1a2a', M: '#2a0a14', t: '#fff4e0', e: '#ffb02a', E: '#fff0a0', s: '#d8a860', S: '#a87438', H: '#f0c888' };
  function wormHead(f) {
    const g = grid(64, 64), open = [0, 1, 2, 1][f], b = [0, 1, 1, 0][f];
    [[12, 56, 11], [17, 49, 12], [23, 42, 13]].forEach(([x, y, r]) => g.ell(x, y + b, r, r * 0.9, 'w', 'h', 'W'));
    g.ell(36, 29 + b, 21, 17, 'w', 'h', 'W');
    // segment rings
    [[16, 45], [22, 38], [28, 22]].forEach(([x, y]) => g.line(x - 7, y + 8 + b, x + 6, y - 4 + b, 'W'));
    // spiked crown along the top-left arc
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (1.05 + k * 0.1), bx = 36 + Math.cos(a) * 19, by = 29 + b + Math.sin(a) * 15;
      const tx = 36 + Math.cos(a) * 29, ty = 29 + b + Math.sin(a) * 25;
      g.line(bx, by, tx, ty, 'x', 3).line(bx + 1, by + 1, tx, ty, 'X').set(tx, ty, 'x');
    }
    // prickly skin
    [[30, 34], [24, 28], [40, 40], [33, 42], [18, 52], [10, 58], [14, 44], [44, 18], [27, 18], [37, 22], [21, 58]].forEach(([x, y]) => g.set(x, y + b, 'x').set(x + 1, y + 1 + b, 'X'));
    // mouth, facing right
    const ry = 7 + open * 1.5;
    g.ell(50, 31 + b, 8, ry, 't').ell(50, 31 + b, 6.4, ry - 1.6, 'm').ell(51, 31 + b, 4, ry - 3.5, 'M');
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.set(50 + Math.cos(a) * 6, 31 + b + Math.sin(a) * (ry - 1.5), 't'); }
    [[40, 18], [45, 20], [38, 24]].forEach(([x, y]) => g.rect(x - 1, y - 1 + b, 5, 4, 'M').rect(x, y + b, 3, 2, 'e').set(x, y + b, 'E'));
    g.ell(16, 61, 16, 3.5, 's', 'H', 'S');
    (f % 2 ? [[3, 54], [30, 58], [6, 50]] : [[2, 57], [32, 60], [28, 54]]).forEach(([x, y]) => g.set(x, y, 's'));
    return g.outline().rows();
  }
  put('boss-sand-worm', 64, 64, SWORM, 4, wormHead);

  // ---------- boss: sand worm body 32x32 (frame 0-1 segment with spikes, 2 tail tip); the game chains them ----------
  function wormBody(f) {
    const g = grid(32, 32);
    if (f < 2) {
      g.ell(16, 16, 12, 11, 'w', 'h', 'W');
      g.line(9, 26, 22, 6, 'W').line(10, 26, 23, 7, 'W');
      [[8, 6], [15, 3], [22, 4]].forEach(([x, y], i) => g.line(x + 2, y + 5, x - (f ? 1 : 0), y - (i === 1 ? 1 : 0), 'x', 2).set(x - (f ? 1 : 0), y - 1, 'x'));
      [[12, 14], [19, 19], [16, 10], [22, 13]].forEach(([x, y]) => g.set(x, y, 'x').set(x + 1, y + 1, 'X'));
    } else {
      g.ell(13, 16, 9, 8, 'w', 'h', 'W').line(22, 14, 29, 16, 'w', 3).line(22, 18, 29, 16, 'W').set(30, 16, 'x');
      g.line(8, 22, 16, 8, 'W');
      [[9, 9], [16, 9]].forEach(([x, y]) => g.line(x, y, x - 1, y - 5, 'x', 2));
    }
    return g.outline().rows();
  }
  put('boss-sand-worm-body', 32, 32, SWORM, 3, wormBody);

  // ---------- boss: ancient guardian dog 64x64 (obsidian jackal, gold trims, glowing runes = ward magic) ----------
  const DOG = { k: '#2e2e4c', K: '#1a1a30', h: '#4e4e78', g: '#ffcf4a', G: '#c7922a', c: '#5ff5ec', C: '#2fb8c0', x: '#0c0c18', w: '#e8e4d0' };
  function guardianDog(f) {
    const g = grid(64, 64), b = [0, 1, 1, 0][f], glow = f === 1 || f === 2 ? 'c' : 'C';
    [[14, 'K'], [21, 'k'], [38, 'K'], [45, 'k']].forEach(([x, c]) => { g.rect(x, 42, 6, 18, c).rect(x, 50, 6, 2, 'g').rect(x, 52, 6, 1, 'G').rect(x - 1, 58, 8, 3, c); });
    g.line(10, 36 + b, 3, 48 + b, 'K', 3).set(3, 50 + b, 'g');
    g.ell(30, 38 + b, 19, 9, 'k', 'h', 'K');
    g.ell(46, 30 + b, 9, 12, 'k', 'h', 'K');
    // head + long snout
    g.ell(49, 18 + b, 7, 6, 'k', 'h', 'K').rect(52, 17 + b, 9, 5, 'k').rect(52, 21 + b, 9, 1, 'K').rect(60, 17 + b, 3, 3, 'x');
    // tall ears, gold inner
    [[44, 46, 2], [50, 53, 0]].forEach(([x0, x1, t]) => { for (let y = 1 + t; y <= 14; y++) { const hw = Math.round((y - 1 - t) * 0.28); for (let x = x0 - hw; x <= x0 + hw; x++) g.set(x + Math.round((14 - y) * (x1 - x0) / 14), y + b, Math.abs(x - x0) < hw ? 'g' : 'k'); } });
    g.rect(50, 15 + b, 3, 2, glow).set(52, 15 + b, 'w').line(49, 14 + b, 54, 14 + b, 'g');
    g.line(53, 18 + b, 58, 19 + b, 'g');
    // broad collar
    for (let r = 0; r < 4; r++) g.line(40 + r, 25 + b + r * 2, 54 - r, 27 + b + r, r % 2 ? 'G' : 'g', 2);
    g.set(45, 28 + b, glow).set(48, 29 + b, glow).set(51, 28 + b, glow);
    // rune (ankh) on the flank
    g.ell(28, 33 + b, 2.2, 2.6, glow).ell(28, 33 + b, 1, 1.4, 'k').rect(27, 35 + b, 3, 6, glow).rect(24, 37 + b, 9, 2, glow);
    // ancient cracks
    g.line(15, 34 + b, 19, 38 + b, 'x').line(19, 38 + b, 18, 42 + b, 'x').line(36, 42 + b, 40, 39 + b, 'x').line(43, 33 + b, 45, 37 + b, 'x');
    return g.outline().rows();
  }
  put('boss-guardian-dog', 64, 64, DOG, 4, guardianDog);

  // ---------- boss: pharaoh 64x64 (golden, mystic, hovering, nemes, crook and flail) ----------
  const PHARAOH = { Y: '#ffcf4a', D: '#c7922a', y: '#fff0a0', b: '#3a5ad8', B: '#24348a', t: '#3ac8b8', w: '#ece6d4', W: '#b8b0a0', k: '#1a1020', c: '#5ff5ec', C: '#2fb8c0', r: '#c8464e' };
  function pharaoh(f) {
    const g = grid(64, 64), b = [0, 1, 2, 1][f];
    // robe
    for (let y = 30; y <= 54; y++) { const hw = 9 + Math.round((y - 30) * 0.42); for (let x = 32 - hw; x <= 31 + hw; x++) g.set(x, y + b, x < 34 - hw ? 'w' : x > 28 + hw ? 'W' : 'w'); }
    for (let y = 36; y <= 54; y++) for (let x = 28; x <= 35; x++) g.set(x, y + b, (y % 4 < 2) ? 'Y' : 'b');
    g.rect(22, 35 + b, 20, 2, 'Y').rect(22, 37 + b, 20, 1, 'D');
    // hem dissolves into gold sparks
    for (let x = 18; x <= 45; x++) if ((x + f) % 3 === 0) g.set(x, 55 + b, 'D').set(x, 56 + b + ((x >> 1) % 2), 'Y');
    // nemes flaps
    for (let y = 8; y <= 33; y++) {
      const hw = y < 14 ? 7 + (y - 8) : 13 - Math.max(0, Math.round((y - 24) * 0.5));
      for (let x = 32 - hw; x <= 31 + hw; x++) g.set(x, y + b, (y % 3 === 0) ? 'b' : x < 32 - hw + 1 ? 'y' : 'Y');
    }
    // usekh collar
    [['t', 0], ['Y', 2], ['b', 4], ['Y', 6]].forEach(([c, d]) => g.ell(32, 27 + b, 13 - d * 0.4, 6 - d * 0.5, c));
    g.ell(32, 25 + b, 8, 3, 'Y');
    // golden face
    g.ell(32, 18 + b, 7, 8, 'Y', 'y', 'D');
    g.rect(26, 9 + b, 12, 3, 'b').rect(26, 12 + b, 12, 1, 'Y');
    g.rect(27, 16 + b, 4, 2, 'k').rect(33, 16 + b, 4, 2, 'k').rect(28, 16 + b, 2, 2, 'c').rect(34, 16 + b, 2, 2, 'c').set(26, 17 + b, 'k').set(37, 17 + b, 'k');
    g.rect(31, 19 + b, 2, 3, 'D').rect(30, 23 + b, 4, 1, 'D');
    g.rect(31, 25 + b, 2, 5, 'b').set(31, 26 + b, 'Y').set(31, 28 + b, 'Y');
    // uraeus
    g.rect(31, 5 + b, 2, 5, 'Y').set(30, 5 + b, 'Y').set(33, 5 + b, 'Y').set(31, 6 + b, 'r').set(32, 6 + b, 'r');
    // crook and flail crossed over the chest
    g.line(25, 44 + b, 38, 30 + b, 'Y', 2).line(38, 30 + b, 40, 28 + b, 'b', 2).line(40, 28 + b, 42, 30 + b, 'Y', 2);
    g.line(39, 44 + b, 26, 30 + b, 'b', 2).line(26, 30 + b, 23, 28 + b, 'Y');
    [[22, 29], [21, 31], [23, 32]].forEach(([x, y]) => g.line(x, y + b, x - 3, y + 5 + b, 'Y'));
    g.rect(29, 37 + b, 6, 3, 'Y').rect(30, 38 + b, 4, 1, 'D');
    (f % 2 ? [[10, 20], [54, 30], [14, 44], [50, 10]] : [[8, 32], [55, 18], [49, 46], [13, 8]]).forEach(([x, y]) => g.set(x, y, 'y').set(x - 1, y, 'Y').set(x + 1, y, 'Y').set(x, y - 1, 'Y').set(x, y + 1, 'Y'));
    return g.outline().rows();
  }
  put('boss-pharaoh', 64, 64, PHARAOH, 4, pharaoh);

  // ---------- boss attack: pharaoh orb 8x8 (golden scarab light) ----------
  S['boss-pharaoh-orb'] = {
    frameWidth: 8, frameHeight: 8,
    palette: { o: NIGHT_BLACK, Y: '#ffcf4a', y: '#fff0a0', D: '#c7922a', c: '#5ff5ec' },
    frames: [
      ['..oooo..', '.oyYYDo.', 'oyYccYDo', 'oYcccYDo', 'oYYcYDDo', 'oDYYDDDo', '.oDDDDo.', '..oooo..'],
      ['..oooo..', '.oYyyYo.', 'oYyccyYo', 'oycccyYo', 'oYyccyYo', 'oYYyyYDo', '.oYYYDo.', '..oooo..'],
    ],
  };

  // ======================= MAP TILES 32x32 =======================
  // frame 0 ground (transparent, calm specks a/b), frames 1-3 decoration. Colours are final.
  const SPECKS = [[3, 4, 'a'], [4, 4, 'a'], [17, 9, 'b'], [25, 2, 'a'], [9, 19, 'b'], [10, 19, 'b'], [22, 24, 'a'], [28, 15, 'b'], [14, 28, 'a'], [5, 27, 'b'], [29, 29, 'a']];
  const ground = (extra) => { const g = grid(32, 32); SPECKS.forEach(([x, y, c]) => g.set(x, y, c)); if (extra) extra(g); return g.rows(); };

  // desert: dune ripples, small cactus with flower, bleached bones
  S['tiles-desert'] = {
    frameWidth: 32, frameHeight: 32,
    palette: { a: '#84603a', b: '#664824', r: '#9a7444', R: '#5a3e1e', g: '#6a9a4a', G: '#3e6a34', p: '#ff8fae', w: '#e8dcc0', W: '#a8966c' },
    frames: [
      ground(),
      (() => { const g = grid(32, 32); [[6, 12, 0], [12, 18, 2], [4, 24, 1]].forEach(([x, y, o]) => { for (let i = 0; i < 18; i++) { const yy = y + Math.round(Math.sin((i + o) / 2.8) * 1.2); g.set(x + i, yy, 'r').set(x + i, yy + 1, 'R'); } }); return g.rows(); })(),
      (() => { const g = grid(32, 32); g.rect(15, 12, 3, 13, 'g').rect(17, 12, 1, 13, 'G').rect(11, 16, 2, 5, 'g').rect(11, 20, 4, 2, 'g').rect(20, 14, 2, 5, 'G').rect(18, 18, 4, 2, 'G').set(16, 11, 'p').set(15, 11, 'p').set(17, 11, 'p').set(16, 10, 'p'); g.line(12, 25, 21, 25, 'R'); return g.outline('R').rows(); })(),
      (() => { const g = grid(32, 32); g.ell(12, 17, 3.5, 3, 'w', null, 'W').rect(10, 20, 5, 2, 'w').set(11, 17, 'R').set(13, 17, 'R').set(11, 21, 'W').set(13, 21, 'W'); g.line(17, 22, 24, 19, 'w', 2).set(16, 21, 'w').set(16, 23, 'w').set(25, 18, 'w').set(25, 20, 'w'); g.line(17, 23, 24, 20, 'W'); return g.rows(); })(),
    ],
  };

  // pyramids: sandstone slab seams, broken block, hieroglyph slab, brazier
  S['tiles-pyramids'] = {
    frameWidth: 32, frameHeight: 32,
    palette: { a: '#6c3e2c', b: '#4e2a1c', k: '#c08850', K: '#8a5a34', h: '#dcae74', e: '#3a6ad8', f: '#ffcf4a', F: '#ff8a3a', m: '#5a5a6a', M: '#3a3a48' },
    frames: [
      ground((g) => { for (let x = 0; x < 32; x++) if (x % 5 !== 2) g.set(x, 15, 'b'); for (let y = 0; y < 15; y++) if (y % 6 !== 3) g.set(9, y, 'b'); for (let y = 16; y < 32; y++) if (y % 6 !== 1) g.set(25, y, 'b'); }),
      (() => { const g = grid(32, 32); g.rect(9, 13, 11, 8, 'k').rect(9, 13, 11, 2, 'h').rect(18, 13, 2, 8, 'K').rect(9, 21, 11, 2, 'K'); g.rect(21, 19, 5, 4, 'k').rect(21, 19, 5, 1, 'h').rect(25, 19, 1, 4, 'K'); g.set(12, 17, 'K').set(13, 18, 'K').set(14, 18, 'K'); return g.outline('b').rows(); })(),
      (() => { const g = grid(32, 32); g.rect(9, 7, 14, 18, 'k').rect(9, 7, 14, 2, 'h').rect(21, 7, 2, 18, 'K').rect(9, 25, 14, 2, 'K'); g.ell(14, 13, 3, 1.6, 'K').set(14, 13, 'e').line(13, 15, 12, 17, 'K'); g.rect(17, 11, 2, 6, 'K').rect(16, 11, 4, 1, 'K'); g.ell(13, 21, 2, 1.4, 'K').line(16, 20, 19, 22, 'K').line(19, 20, 16, 22, 'K'); return g.outline('b').rows(); })(),
      (() => { const g = grid(32, 32); g.rect(15, 18, 3, 7, 'm').rect(17, 18, 1, 7, 'M').rect(12, 24, 9, 2, 'M'); g.ell(16, 16, 5, 2.5, 'm', null, 'M'); g.ell(16, 12, 3, 4, 'F').ell(16, 13, 1.6, 2.4, 'f').set(16, 7, 'F').set(14, 9, 'f'); return g.outline('b').rows(); })(),
    ],
  };

  // oasis: pond with lotus, small palm with dates, papyrus reeds
  S['tiles-oasis'] = {
    frameWidth: 32, frameHeight: 32,
    palette: { a: '#245a48', b: '#123a2e', u: '#2a7a9a', U: '#1a5070', i: '#9ff5ec', p: '#ff9ab8', P: '#fff0f4', t: '#9a7448', T: '#6a4a2c', l: '#5ac060', L: '#3a8a40', y: '#ffcf4a', s: '#c8b078' },
    frames: [
      ground(),
      (() => { const g = grid(32, 32); g.ell(16, 18, 10, 6, 'u', null, 'U').rim(16, 18, 10, 6, 's', 1.2); g.line(9, 16, 13, 16, 'i').line(18, 21, 21, 21, 'i'); g.ell(19, 16, 2.4, 1.6, 'L').set(19, 15, 'p').set(18, 15, 'P').set(20, 15, 'p').set(19, 14, 'p'); g.ell(11, 20, 1.6, 1.1, 'L'); return g.rows(); })(),
      (() => { const g = grid(32, 32); for (let y = 12; y <= 26; y++) g.set(16 + Math.round((26 - y) * 0.15), y, y % 2 ? 't' : 'T').set(17 + Math.round((26 - y) * 0.15), y, 'T'); [[-1, 0.4], [1, 0.4], [-1, -0.4], [1, -0.3], [0, -1]].forEach(([dx, dy]) => g.line(18, 11, 18 + dx * 8, 11 + dy * 6 + (dx ? 3 : 0), dy < 0 ? 'l' : 'L', 2)); g.set(17, 12, 'y').set(19, 12, 'y').set(18, 13, 'y'); return g.outline('b').rows(); })(),
      (() => { const g = grid(32, 32); [[12, 24, 10, 12], [15, 25, 15, 10], [18, 24, 20, 13], [21, 25, 22, 16]].forEach(([x0, y0, x1, y1]) => { g.line(x0, y0, x1, y1, 'L'); g.ell(x1, y1 - 1, 1.8, 1.4, 'l').set(x1, y1 - 2, 'y'); }); return g.rows(); })(),
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
