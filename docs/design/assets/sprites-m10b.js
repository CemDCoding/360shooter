/* Final sprites, part 7 (Ergaenzung H-39 "M10: Boss-Finisher"), delivery part 2.
 * Extends window.PX_SPRITES and uses window.PX_FINISHER from sprites-m10.js (load that file first).
 * Load order: sprites.js, sprites-world.js, sprites-desert.js, sprites-m8.js, sprites-m9.js, sprites-m10.js, this file.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 *
 *   finisher-finale-20   320x180 x11  Level 20, Riesen-Stein, STERNENHAMMER; drawn x2
 *   finisher-finale-25   320x180 x11  Level 25, Sand-Wurm, SONNENSPEER
 *   finisher-finale-30   320x180 x11  Level 30, Waechter-Hund, GRABESLICHT
 * Level 40 (finisher-finale-40a/b) is drawn by finale40() here and built in sprites-m10c.js (own build time slot).
 * Frame index of 20/25/30 as in sprites-m10.js (0 establish ... 6/7 impact ... 10 aftermath).
 * Level 40: 0-1 memory panels, 2 establish, 3 charge, 4 aim, 5 leap, 6 roar, 7 beam, 8 impact light (sheet a) |
 *           9 impact dark, 10 rears up, 11 charge 2, 12 beam 2, 13 impact light 2, 14 mask cracks, 15 sand in the wind,
 *           16 sand and first light, 17 sunrise, astronaut from behind (sheet b). Impact frames: 8, 9, 13.
 */
(function (root) {
  const S = root.PX_SPRITES;
  const { C, rng, on, mix, cv, spr, sheet, crack, crackIn, astro, radial, hlines, glow, sparks, beam, shatter, fray, finale } = root.PX_FINISHER;
  const W = 320, H = 180;

  // move every pixel along (vx,vy) by an amount that grows with t; noise per row (horizontal) or column (vertical)
  function drift(src, t, r, col, vx, vy) {
    const d = cv(src.w, src.h), n = [];
    const len = vx ? src.h : src.w;
    for (let i = 0; i < len; i++) n.push(8 + r() * 34);
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const v = src.a[y * src.w + x];
      if (!v || on(x, y, t * 0.8)) continue;
      const k = t * n[vx ? y : x];
      d.px(x + vx * k, y + vy * k, t > 0.45 && on(x + 2, y, 0.5) ? col : mix(v, col, t * 0.7));
    }
    return d;
  }
  // paint layer src into c only inside polygon pts
  function clip(c, src, pts) {
    const m = cv(c.w, c.h).poly(pts, '#000000');
    for (let i = 0; i < c.a.length; i++) if (m.a[i] && src.a[i]) c.a[i] = src.a[i];
    return c;
  }
  const edge = (c, pts, col, t = 2) => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; c.line(a[0], a[1], b[0], b[1], col, t); } return c; };

  // ---------- backgrounds (m: 0 normal, 1 darker, 2 dim, 3 calm after) ----------
  const dk = (m) => [0, 0.3, 0.45, 0][m];
  function bgElf(c, r, m) {
    const T = (x) => mix(x, C.ink, dk(m));
    c.fill(T('#2a1c5a')).dith(0, 0, 320, 50, T('#34236e'), 0.5);
    for (let i = 0; i < 30; i++) c.px(r() * 320, r() * 100, T('#9ff5ec'));
    for (let i = 0; i < 8; i++) { const x = i * 42 + r() * 16; c.rect(x, 56, 5, 92, T('#170f36')).ell(x + 2, 58, 18, 15, T('#170f36')); }
    c.rect(0, 140, 320, 40, T('#1a1238')).dith(0, 140, 320, 4, T('#2e2060'), 0.5);
    for (let i = 0; i < 9; i++) { const x = 8 + r() * 304, h = 6 + r() * 10; c.poly([[x - 3, 150], [x, 150 - h], [x + 3, 150]], T('#9ff5ec')).poly([[x, 150 - h], [x + 3, 150], [x, 150]], T('#4fb8b0')); }
    for (let i = 0; i < 6; i++) { const x = 20 + r() * 280; c.rect(x, 146, 2, 5, T('#d8c8f0')).ell(x + 1, 145, 5, 3, T('#8a6bd0')); }
    c.rect(0, 0, 14, 180, T('#0f0a24')).rect(306, 0, 14, 180, T('#0f0a24'));
    return c;
  }
  function bgDesert(c, r, m) {
    const T = (x) => mix(x, C.ink, dk(m));
    c.fill(T('#e0874a')).dith(0, 0, 320, 40, T('#c8642a'), 0.5).rect(0, 0, 320, 14, T('#b0521e')).dith(0, 14, 320, 6, T('#b0521e'), 0.5);
    c.ell(70, 92, 30, 30, T('#f0b070'), 0.5).ell(70, 92, 20, 20, T('#ffe0a0'));
    c.poly([[0, 108], [60, 92], [140, 104], [220, 88], [320, 100], [320, 140], [0, 140]], T('#a85a24'));
    c.poly([[0, 124], [90, 110], [180, 122], [260, 108], [320, 118], [320, 180], [0, 180]], T('#c88e58'));
    c.dith(0, 124, 320, 4, T('#e8b47a'), 0.25);
    for (let i = 0; i < 14; i++) { const y = 134 + i * 3 + r() * 2, x = r() * 320; c.line(x, y, x + 14 + r() * 20, y, T('#a87438')); }
    for (let i = 0; i < 3; i++) { const x = 30 + i * 120 + r() * 40; c.rect(x, 126, 3, 12, T('#3a6a3a')).rect(x - 3, 129, 3, 2, T('#3a6a3a')).rect(x + 3, 131, 3, 2, T('#3a6a3a')); }
    return c;
  }
  function bgPyramid(c, r, m) {
    const T = (x) => mix(x, C.ink, dk(m));
    c.fill(T('#4a2a1c'));
    for (let y = 0; y < 150; y += 8) { c.rect(0, y, 320, 1, T('#331c12')); for (let x = (y / 8) % 2 ? 0 : 12; x < 320; x += 24) c.rect(x, y, 1, 8, T('#331c12')); }
    [[96, 30], [192, 36]].forEach(([x, y]) => {
      c.rect(x, y, 40, 56, T('#6a3e28')).rect(x + 2, y + 2, 36, 52, T('#5a3420'));
      const G = T('#c7922a');
      const glyph = [
        (gx, gy) => c.ell(gx + 3, gy + 2, 2.5, 2.5, G).ell(gx + 3, gy + 2, 1.2, 1.2, T('#5a3420')).rect(gx + 2, gy + 4, 2, 4, G).rect(gx, gy + 5, 6, 1, G), // ankh
        (gx, gy) => c.ell(gx + 3, gy + 3, 3.5, 2, G).px(gx + 3, gy + 3, T('#2a160e')).line(gx + 2, gy + 5, gx, gy + 8, G), // eye
        (gx, gy) => c.line(gx, gy + 4, gx + 2, gy + 2, G).line(gx + 2, gy + 2, gx + 4, gy + 4, G).line(gx + 4, gy + 4, gx + 6, gy + 2, G), // water
        (gx, gy) => c.ell(gx + 2, gy + 2, 2, 2, G).rect(gx + 1, gy + 3, 4, 3, G).line(gx + 4, gy + 4, gx + 6, gy + 6, G).rect(gx + 1, gy + 6, 1, 2, G), // bird
      ];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) glyph[(i + j * 2 + (x >> 4)) % 4](x + 5 + i * 11, y + 5 + j * 12);
    });
    [[40, 60], [280, 60]].forEach(([x, y]) => {
      c.rect(x - 2, y, 4, 14, T('#2a160e')).ell(x, y - 6, 18, 18, T('#7a4a24'), 0.25);
      c.ell(x, y - 3, 4, 6, '#ffb02a').ell(x, y - 2, 2, 3, '#fff0a0');
    });
    c.rect(0, 148, 320, 32, T('#2a160e')).dith(0, 148, 320, 3, T('#5a3420'), 0.5);
    for (let i = 0; i < 20; i++) c.px(r() * 320, 20 + r() * 120, T('#ffb02a'));
    return c;
  }
  function bgOasis(c, r, m, dawn) {
    const T = (x) => mix(x, C.ink, dk(m));
    if (dawn) {
      c.fill('#f0a050').rect(0, 0, 320, 30, '#7a3e5a').dith(0, 30, 320, 14, '#7a3e5a', 0.5).dith(0, 44, 320, 18, '#c8644a', 0.5).rect(0, 62, 320, 24, '#e0844a').dith(0, 62, 320, 8, '#c8644a', 0.25);
      c.ell(160, 104, 52, 52, '#ffd08a', 0.5).ell(160, 104, 34, 34, '#fff0c0');
    } else {
      c.fill(T('#0f3a3a')).dith(0, 0, 320, 50, T('#0a2a2c'), 0.5);
      for (let i = 0; i < 40; i++) c.px(r() * 320, r() * 80, T('#c8f0e8'));
    }
    const sil = dawn ? '#5a2e2a' : T('#0c2424');
    c.poly([[200, 104], [236, 64], [272, 104]], sil).poly([[250, 104], [276, 76], [302, 104]], dawn ? '#6a3a30' : T('#0f2c2c'));
    c.rect(0, 104, 320, 76, dawn ? '#c88e58' : T('#1c4a3c')).dith(0, 104, 320, 4, dawn ? '#e8b47a' : T('#2a6a54'), 0.5);
    c.ell(110, 140, 70, 14, dawn ? '#ffd08a' : T('#1c6a6a')).ell(110, 140, 62, 10, dawn ? '#f0a050' : T('#2a8a8a'), 0.25);
    [[22, 132], [298, 128], [190, 138]].forEach(([x, y], i) => {
      const tr = dawn ? '#3a1e1a' : T('#082020');
      for (let k = 0; k < 40; k++) c.rect(x + Math.round(Math.sin(k / 12) * 4) - 1, y - k, 3, 1, tr);
      const tx = x + Math.round(Math.sin(40 / 12) * 4), ty = y - 40;
      [[-20, 6], [-14, -6], [16, -6], [22, 6], [0, -12]].forEach(([dx, dy]) => c.line(tx, ty, tx + dx, ty + dy, tr, 3).line(tx + dx, ty + dy, tx + dx * 1.2, ty + dy + 5, tr, 2));
    });
    return c;
  }

  const boss2 = (B, f, tone, x = B.bx, y = B.by) => { const c = cv(W, H); spr(c, B.key, f, x, y, { s: 2, flip: B.flip, fn: tone ? (col) => mix(col, C.ink, tone) : null }); return c; };
  const astroDark = (rim, x = 54) => astro({ x, y: 152, pose: 'stand', tone: 2, rim, rimDir: 1 }).c;

  // ---------- Level 20: Riesen-Stein, STERNENHAMMER ----------
  const STONE = {
    key: 'boss-giant-stone', size: 64, bx: 176, by: 24, seed: 2020,
    bg: bgElf, dark: '#0f0a24', darkLine: '#2e2060', flat: '#1c3470', flatLine: '#2a4a90', wind: '#4a3a8a', rim: '#9ff5ec',
    mouth: [32, 40], backX: 120, backRim: '#d8f8ff', backGlow: '#4fb8b0',
    drift(c, r) { for (let i = 0; i < 20; i++) c.px(r() * 320, 40 + r() * 100, '#9ff5ec'); },
    roar(c, r, x, y) { // crystals flare, rocks fall
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.25; c.line(x + 64, y + 30, x + 64 + Math.cos(a) * 120, y + 30 + Math.sin(a) * 120, '#4fb8b0', 2); }
      for (let i = 0; i < 14; i++) { const rx = r() * 320, ry = r() * 60; c.ell(rx, ry, 3, 2.5, '#5e5e78').px(rx - 1, ry - 1, '#b4b4c8'); }
    },
    breakFrames(F, k) {
      const { r, bossL, cx, cy } = k;
      let c = cv(W, H); bgElf(c, r, 2);
      const b8 = cv(W, H).comp(bossL).map((v) => mix(v, C.ink, 0.3));
      for (let i = 0; i < 8; i++) crackIn(b8, cx, cy, (i / 8) * Math.PI * 2 + 0.3, 14, r, '#ffffff', '#4fb8b0', 1);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; c.poly([[cx, cy], [cx + Math.cos(a - 0.06) * 220, cy + Math.sin(a - 0.06) * 220], [cx + Math.cos(a + 0.06) * 220, cy + Math.sin(a + 0.06) * 220]], '#4fb8b0', 0.25); }
      c.comp(b8).ell(cx, cy, 6, 6, C.white);
      c.comp(astroDark('#9ff5ec'));
      F.push(c);
      c = cv(W, H); bgElf(c, r, 1);
      c.ell(cx, cy, 44, 44, '#4fb8b0', 0.25).ell(cx, cy, 18, 18, '#9ff5ec', 0.5).ell(cx, cy, 8, 8, C.white);
      c.comp(shatter(b8, cx, cy, 0.75, r, ['#9ff5ec', '#4fb8b0', C.coral]));
      c.comp(astroDark('#9ff5ec'));
      F.push(c);
    },
    after(c, r, cx) { // rubble with crystals still glowing
      const g = cv(W, H);
      [[-24, 140, 10], [-8, 136, 12], [10, 140, 11], [24, 142, 8], [0, 130, 9]].forEach(([dx, y, s]) => g.ell(cx + dx, y, s, s * 0.7, '#8a8aa0').ell(cx + dx - 2, y - 2, s * 0.6, s * 0.4, '#b4b4c8'));
      [[-14, 128, 10], [6, 122, 14], [18, 130, 8]].forEach(([dx, y, h]) => g.poly([[cx + dx - 3, y + 6], [cx + dx, y - h], [cx + dx + 3, y + 6]], '#9ff5ec'));
      c.comp(g.outline(C.ink));
      for (let i = 0; i < 16; i++) c.px(cx - 40 + r() * 80, 90 + r() * 40, '#9ff5ec');
    },
  };

  // ---------- Level 25: Sand-Wurm, SONNENSPEER ----------
  const WORM = {
    key: 'boss-sand-worm', size: 64, bx: 180, by: 24, seed: 2525, flip: true,
    bg: bgDesert, dark: '#2a1206', darkLine: '#5a2a0e', flat: '#6a3a0e', flatLine: '#8a4e1a', wind: '#e8b47a', rim: '#ffe0a0',
    mouth: [14, 30], backX: 120, backRim: '#fff0c0', backGlow: '#f0b070',
    drift(c, r) { for (let i = 0; i < 26; i++) { const x = r() * 320, y = 80 + r() * 90; c.line(x, y, x + 4, y, '#e8b47a'); } },
    roar(c, r, x, y) { // sand spray from the maw
      for (let i = 0; i < 60; i++) { const a = Math.PI + (r() - 0.5) * 1.4, d = 20 + r() * 120; c.rect(x + 28 + Math.cos(a) * d, y + 60 + Math.sin(a) * d, 2, 2, r() < 0.5 ? '#e8b47a' : '#c88e58'); }
    },
    breakFrames(F, k) {
      const { r, bossL, cx, cy } = k;
      let c = cv(W, H); bgDesert(c, r, 2);
      const b8 = cv(W, H).comp(bossL);
      for (let i = 0; i < 6; i++) crackIn(b8, cx, cy, (i / 6) * Math.PI * 2, 12, r, '#fff4e0', '#ffb02a', 1);
      c.comp(drift(b8, 0.25, r, '#e8b47a', 0, 1));
      c.comp(astroDark('#ffe0a0'));
      F.push(c);
      c = cv(W, H); bgDesert(c, r, 1);
      const f9 = drift(b8, 0.7, r, '#e8b47a', 0, 1);
      c.comp(f9);
      c.poly([[cx - 70, 150], [cx, 118], [cx + 70, 150]], '#c88e58').dith(cx - 50, 124, 100, 20, '#e8b47a', 0.25);
      c.comp(astroDark('#ffe0a0'));
      F.push(c);
    },
    after(c, r, cx) { // a sand mound with the last spikes sinking, sun on the horizon
      c.poly([[cx - 60, 150], [cx - 10, 124], [cx + 20, 126], [cx + 64, 150]], '#e8b47a').dith(cx - 40, 128, 90, 8, '#f0c888', 0.5);
      [[-14, 126], [-4, 122], [8, 124]].forEach(([dx, y]) => c.line(cx + dx, y, cx + dx + 4, y - 9, '#8a5a32', 3));
      for (let i = 0; i < 20; i++) { const x = r() * 320, y = 90 + r() * 60; c.line(x, y, x + 6, y, '#f0c888'); }
    },
  };

  // ---------- Level 30: Waechter-Hund, GRABESLICHT ----------
  const DOG = {
    key: 'boss-guardian-dog', size: 64, bx: 176, by: 24, seed: 3030, flip: true,
    bg: bgPyramid, dark: '#140a06', darkLine: '#3a1e14', flat: '#0c4a4c', flatLine: '#14686a', wind: '#ffb02a', rim: '#ffcf4a',
    mouth: [14, 18], backX: 120, backRim: '#ffe2a0', backGlow: '#c7922a',
    drift(c, r) { for (let i = 0; i < 18; i++) c.px(r() * 320, 20 + r() * 130, '#ffb02a'); },
    roar(c, r, x, y) { // the ward circle flares up
      c.ell(x + 64, y + 64, 74, 70, '#5ff5ec', 0.25).ell(x + 64, y + 64, 70, 66, '#140a06');
      for (let k = 0; k < 160; k++) { const a = (k / 160) * Math.PI * 2; c.px(x + 64 + Math.cos(a) * 72, y + 64 + Math.sin(a) * 68, '#5ff5ec'); }
    },
    breakFrames(F, k) {
      const { r, bossL, cx, cy } = k;
      let c = cv(W, H); bgPyramid(c, r, 2);
      const b8 = cv(W, H).comp(bossL);
      for (let i = 0; i < 7; i++) crackIn(b8, cx, cy, (i / 7) * Math.PI * 2 + 0.5, 12, r, '#fff0a0', '#ffcf4a', 1);
      c.comp(drift(b8, 0.28, r, '#c7922a', 0, -1));
      c.comp(astroDark('#ffcf4a'));
      F.push(c);
      c = cv(W, H); bgPyramid(c, r, 1);
      const f9 = drift(b8, 0.72, r, '#c7922a', 0, -1);
      c.comp(f9.sil('#7a4a24', 0.5), 0, -6).comp(f9);
      for (let i = 0; i < 40; i++) c.px(cx - 50 + r() * 100, 10 + r() * 120, r() < 0.4 ? '#fff0a0' : '#ffcf4a');
      c.comp(astroDark('#ffcf4a'));
      F.push(c);
    },
    after(c, r, cx) { // only the golden collar is left, dust settles
      const g = cv(W, H);
      g.ell(cx, 144, 18, 5, '#ffcf4a').ell(cx, 143, 13, 3, '#2a160e').rect(cx - 2, 146, 4, 4, '#5ff5ec');
      c.comp(g.outline(C.ink));
      c.dith(cx - 50, 120, 100, 26, '#7a4a24', 0.25);
      for (let i = 0; i < 24; i++) c.px(cx - 60 + r() * 120, 60 + r() * 80, '#ffcf4a');
    },
  };

  S['finisher-finale-20'] = sheet(finale(STONE));
  S['finisher-finale-25'] = sheet(finale(WORM));
  S['finisher-finale-30'] = sheet(finale(DOG));

  // ---------- Level 40: Pharao, LETZTER STERN (18 frames, two sheets) ----------
  function finale40() {
    const r = rng(4040), F = [];
    const P = { key: 'boss-pharaoh', size: 64, bx: 176, by: 24 };
    const boss = (f, tone, x = P.bx, y = P.by) => boss2(P, f, tone, x, y);
    const cx = P.bx + 64, cy = P.by + 64;
    let c;
    const BGC = ['#1d4a17', '#2a1458', '#1c3470', '#6a3a0e', '#0c4a4c'];
    const PREV = [['boss-root-monster', 64], ['boss-forest-ghost', 48], ['boss-giant-stone', 64], ['boss-sand-worm', 64], ['boss-guardian-dog', 64]];
    const panel = (c, pts, i, x, y) => {
      const l = cv(W, H).poly(pts, mix(BGC[i], C.ink, 0.35));
      radial(l, x + PREV[i][1] / 2, y + PREV[i][1] / 2, 14, BGC[i], r, 30);
      spr(l, PREV[i][0], 0, x, y, { flip: i >= 3, fn: (v) => mix(v, C.ink, 0.25) });
      clip(c, l, pts); edge(c, pts, C.ink, 2);
    };

    // 0-1 memory: the five defeated bosses flash by as panels
    c = cv(W, H).fill(C.ink);
    panel(c, [[4, 4], [112, 4], [96, 176], [4, 176]], 0, 22, 58);
    panel(c, [[118, 4], [220, 4], [204, 176], [102, 176]], 1, 138, 66);
    panel(c, [[226, 4], [316, 4], [316, 176], [210, 176]], 2, 232, 58);
    F.push(c);
    c = cv(W, H).fill(C.ink);
    panel(c, [[4, 4], [150, 4], [130, 86], [4, 86]], 3, 40, 12);
    panel(c, [[4, 94], [128, 94], [112, 176], [4, 176]], 4, 30, 102);
    const pl = cv(W, H).fill('#5c4206');
    radial(pl, 240, 90, 30, '#8a6410', r, 34);
    spr(pl, 'boss-pharaoh', 0, 176, 26, { s: 2 });
    const ppts = [[158, 4], [316, 4], [316, 176], [138, 176]];
    clip(c, pl, ppts); edge(c, ppts, C.ink, 2);
    c.ell(222, 66, 3, 2, '#5ff5ec').ell(258, 66, 3, 2, '#5ff5ec');
    F.push(c);

    // 2 establish at the oasis
    c = cv(W, H); bgOasis(c, r, 0);
    c.comp(boss(0, 0.1));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.ell(cx + Math.cos(a) * 80, cy + Math.sin(a) * 60, 4, 4, '#ffcf4a').px(cx + Math.cos(a) * 80 - 1, cy + Math.sin(a) * 60 - 1, '#fff0a0'); }
    c.comp(astro({ x: 62, y: 150, pose: 'stand', tone: 1, rim: '#c8f0e8' }).c);
    F.push(c);

    // 3 charge
    c = cv(W, H).fill('#071a1a');
    const a3 = astro({ x: 150, y: 152, pose: 'stand', tone: 1, rim: C.coral, rimDir: 1 });
    radial(c, a3.muzzle[0], a3.muzzle[1], 30, '#123a3a', r, 30);
    c.comp(a3.c); glow(c, a3.muzzle, 1.2); sparks(c, a3.muzzle, r, 40);
    F.push(c);

    // 4 aim
    c = cv(W, H); bgOasis(c, r, 1);
    c.comp(boss(1, 0.4), 70, 0);
    hlines(c, 18, '#2a6a54', r, 30, 160);
    const a4 = astro({ x: 84, y: 150, pose: 'aim', tone: 1, rim: C.coral, rimDir: 1 });
    c.comp(a4.c); glow(c, a4.muzzle, 1.4); sparks(c, a4.muzzle, r, 20);
    F.push(c);

    // 5 leap
    c = cv(W, H).fill('#5c4206');
    hlines(c, 30, '#7a5a10', r, 10, 170); hlines(c, 24, C.cream, r, 20, 160);
    const l5 = astro({ x: 150, y: 128, pose: 'leap', tone: 0, rim: C.coral }).c.shear(-0.35, 128);
    c.comp(l5.sil('#7a5a10', 0.5), -30, 0).comp(l5.sil(C.coralD), -14, 0).comp(l5);
    F.push(c);

    // 6 roar: golden orbs circle the pharaoh
    c = cv(W, H).fill('#140e02');
    radial(c, 160, 52, 30, '#3a2a06', r, 30);
    c.comp(boss(2, 0, 96, 26));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; c.ell(160 + Math.cos(a) * 96, 90 + Math.sin(a) * 70, 6, 6, '#ffcf4a').ell(158 + Math.cos(a) * 96, 88 + Math.sin(a) * 70, 2, 2, '#fff0a0'); }
    F.push(c);

    // 7 beam 1
    c = cv(W, H); bgOasis(c, r, 2);
    const bossL = boss(3, 0.1);
    c.comp(bossL);
    const a7 = astro({ x: 58, y: cy + 24, pose: 'leap', tone: 0, rim: C.coral, rimDir: 1 });
    const astroL = a7.c.shear(-0.2, cy + 24);
    const beamL = beam(cv(W, H), a7.muzzle[0] + Math.round((a7.muzzle[1] - (cy + 24)) * -0.2) + 1, cy, cx);
    c.comp(beamL).comp(astroL);
    F.push(c);

    // 8 impact light (end of sheet a)
    c = cv(W, H).fill(C.white);
    radial(c, cx, cy, 30, C.ink, r, 46, 2.5);
    c.comp(bossL.sil(C.ink)).comp(beamL.sil(C.ink)).comp(astroL.sil(C.ink)).ell(cx, cy, 10, 14, C.white);
    F.push(c);

    // 9 impact dark
    c = cv(W, H).fill(C.ink);
    radial(c, cx, cy, 14, C.white, r, 60, 1);
    c.comp(bossL.sil(C.white));
    for (let i = 0; i < 6; i++) crack(c, cx, cy, (i / 6) * Math.PI * 2 + 0.4, 12 + i * 2, r, C.ink, C.ink);
    c.comp(astroL.sil(C.white));
    F.push(c);

    // 10 the pharaoh rears up once more: cracked mask, gold light, bigger
    c = cv(W, H).fill('#140e02');
    radial(c, 160, 60, 34, '#5c4206', r, 40);
    const rear = boss(1, 0, 96, 6);
    for (let i = 0; i < 6; i++) crackIn(rear, 160, 52, (i / 6) * Math.PI * 2 + 0.2, 12, r, '#fff0a0', '#ffcf4a', 1);
    c.ell(160, 70, 80, 74, '#ffcf4a', 0.25).comp(rear);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.ell(160 + Math.cos(a) * 120, 80 + Math.sin(a) * 80, 5, 5, '#ffcf4a'); }
    c.comp(astroDark(C.coral, 40));
    F.push(c);

    // 11 charge 2: she rises, the gun burns brighter
    c = cv(W, H).fill('#071a1a');
    const a11 = astro({ x: 120, y: 156, pose: 'aim', tone: 1, rim: C.coral, rimDir: 1 });
    radial(c, a11.muzzle[0], a11.muzzle[1], 36, '#7a1f3a', r, 24);
    c.comp(a11.c); glow(c, a11.muzzle, 2); sparks(c, a11.muzzle, r, 60);
    F.push(c);

    // 12 beam 2: wider beam, straight into the mask
    c = cv(W, H); bgOasis(c, r, 2);
    const boss12 = boss(3, 0.2);
    c.comp(boss12);
    const a12 = astro({ x: 50, y: cy + 24, pose: 'aim', tone: 0, rim: C.coral, rimDir: 1 });
    beam(c, a12.muzzle[0] + 1, cy, cx, 12);
    c.comp(a12.c);
    F.push(c);

    // 13 impact light 2
    c = cv(W, H).fill(C.white);
    radial(c, cx, cy, 36, C.ink, r, 40, 3);
    c.comp(boss12.sil(C.ink)).comp(a12.c.sil(C.ink)).ell(cx, cy, 16, 20, C.white);
    F.push(c);

    // 14 the mask cracks, light pours out
    c = cv(W, H); bgOasis(c, r, 1);
    const b14 = cv(W, H).comp(bossL).map((v) => mix(v, C.ink, 0.25));
    for (let i = 0; i < 9; i++) crackIn(b14, cx, cy - 20, (i / 9) * Math.PI * 2, 16, r, C.white, '#ffcf4a', 1);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; c.poly([[cx, cy - 20], [cx + Math.cos(a - 0.05) * 240, cy - 20 + Math.sin(a - 0.05) * 240], [cx + Math.cos(a + 0.05) * 240, cy - 20 + Math.sin(a + 0.05) * 240]], '#ffcf4a', 0.25); }
    c.comp(b14).ell(cx, cy - 20, 6, 8, C.white);
    c.comp(astroDark(C.coral));
    F.push(c);

    // 15 + 16 sand in the wind, first light
    c = cv(W, H); bgOasis(c, r, 1);
    c.comp(drift(b14, 0.4, r, '#e8c890', 1, -0.15));
    c.comp(astroDark(C.coral));
    F.push(c);
    c = cv(W, H); bgOasis(c, r, 0, true);
    const f16 = drift(b14, 0.85, r, '#f0d8a8', 1, -0.2);
    c.comp(f16.sil('#c88e58', 0.5), 6, 4).comp(f16);
    c.comp(astroDark('#fff0c0'));
    F.push(c);

    // 17 sunrise over the oasis, the astronaut from behind
    c = cv(W, H); bgOasis(c, r, 0, true);
    for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; c.poly([[160, 104], [160 + Math.cos(a - 0.04) * 300, 104 + Math.sin(a - 0.04) * 300], [160 + Math.cos(a + 0.04) * 300, 104 + Math.sin(a + 0.04) * 300]], '#ffe0a0', 0.25); }
    // the golden mask, half buried in the sand, eye towards the sky
    const mk = cv(W, H);
    mk.poly([[200, 146], [204, 132], [224, 132], [228, 146]], '#ffcf4a').map((v, x, y) => (y % 3 === 0 ? '#3a5ad8' : v));
    mk.ell(214, 140, 6, 7, '#ffcf4a').rect(211, 139, 3, 1, '#1a1020').px(212, 139, '#5ff5ec').line(214, 133, 214, 129, '#3ac8b8', 2);
    mk.rect(198, 145, 32, 2, '#c88e58').outline(C.ink);
    c.comp(mk).dith(196, 144, 36, 4, '#e8b47a', 0.5);
    c.comp(astro({ x: 160, y: 158, pose: 'back', tone: 2, rim: '#fff0c0', rimDir: 1 }).c);
    F.push(c);
    return F;
  }
  // Level 40 is drawn by finale40() but built in sprites-m10c.js, so it gets its own build time slot
  Object.assign(root.PX_FINISHER, { drift, clip, edge, bgOasis, boss2, astroDark, finale40 });
})(typeof window !== 'undefined' ? window : globalThis);
