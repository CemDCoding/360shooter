/* Final sprites, part 11 (Ergaenzung H-48 "M13 Teil 2: Waldgeist, Riesen-Stein, Sand-Wurm, Waechter-Hund, Pharao").
 * Extends window.PX_SPRITES and window.PX_RIGS. Load order: ... sprites-m13.js, this file.
 * Needs from earlier files: PX_SPRITES['rig-astro-blade'] and ['rig-astro-blade-arc'] plus PX_RIGS.astronaut (sprites-m13.js).
 * Same format as sprites-m13.js: { frameWidth, frameHeight, palette, frames: [rows[]] }, '.' = transparent.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 *
 * The five bosses are redrawn from their game code (sprites-world.js, sprites-desert.js), frame 0, and mirrored:
 * in the finisher the boss stands right and faces left towards the astronaut. Sizes as in game (decision 3a):
 *   forestGhost    48 px,  7 parts    giantStone     64 px, 9 parts (two floating fists, decision 5a)
 *   giantSandWorm  64 px, 10 parts (head, jaw, seg-1..7 share one sheet, tail; decision 11a)
 *   guardianDog    64 px, 10 parts (one head, three shadow heads share one sheet; decision 6a)
 *   pharaoh        64 px,  6 parts (no arms in the game sprite: crook and flail instead, see brief)
 * Every part: rig-<rig>-<part> (frames = poses), -sil (all white, hit-white), -ink (all ink, bright impact frame, Q-92).
 * Generic poses made from the drawn ones: trug (ghost decoys, 10a), gilded (pharaoh, 9a), stone (dog statue).
 * Astronaut (decision 7a): blade gets pose 'spear' (SONNENSPEER), blade-arc gets pose 'hammer' (STERNENHAMMER).
 * Both sheets are rebuilt here with a larger frame; old pose indices stay, originX/Y and size change (AP-185 regenerates).
 * Pivots: originX/originY = pivot / frame size (0..1); x/y = pivot offset in px (unscaled) to the parent pivot,
 * or for root parts to the figure origin (bottom centre of the boss box).
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const RIGS = root.PX_RIGS || (root.PX_RIGS = {});
  const NB = '#070a14'; // enemy outline (sprites-world.js NIGHT_BLACK)
  const INK = '#0b0610'; // finisher.ink
  const WHITE = '#ffffff';
  const AC = { coral: '#ff6b8a', coralD: '#bf3458', coralL: '#ffa0ae', white: '#ffffff', ink: '#0b0610' };

  // ---------- helpers (pure, same as sprites-m13.js) ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const on = (x, y, lv) => BAYER[(y & 3) * 4 + (x & 3)] < lv * 16;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

  function cv(w, h) {
    const a = new Array(w * h).fill(null);
    const c = {
      w, h, a,
      px(x, y, col) { x = Math.round(x); y = Math.round(y); if (col && x >= 0 && y >= 0 && x < w && y < h) a[y * w + x] = col; return c; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y * w + x] : null; },
      rect(x, y, rw, rh, col, lv) {
        x = Math.round(x); y = Math.round(y);
        for (let j = Math.max(0, y); j < Math.min(h, y + rh); j++) for (let i = Math.max(0, x); i < Math.min(w, x + rw); i++) if (lv == null || on(i, j, lv)) a[j * w + i] = col;
        return c;
      },
      ell(cx, cy, rx, ry, col, lv) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1 && (lv == null || on(x, y, lv))) c.px(x, y, col);
        }
        return c;
      },
      ells(cx, cy, rx, ry, cols, hiT = -0.75, loT = 0.55) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy > 1) continue;
          const l = dx + dy;
          c.px(x, y, l < hiT ? cols[0] : l > loT ? cols[2] : cols[1]);
        }
        return c;
      },
      line(x0, y0, x1, y1, col, t = 1, lv) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor((t - 1) / 2);
        for (let i = 0; i <= n; i++) c.rect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, t, t, col, lv);
        return c;
      },
      poly(pts, col, lv) {
        let y0 = Infinity, y1 = -Infinity;
        pts.forEach((p) => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
        for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(h - 1, Math.ceil(y1)); y++) {
          const yc = y + 0.5, xs = [];
          for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
            if ((ay <= yc) !== (by <= yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
          }
          xs.sort((p, q) => p - q);
          for (let k = 0; k + 1 < xs.length; k += 2)
            for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(w, Math.round(xs[k + 1])); x++) if (lv == null || on(x, y, lv)) a[y * w + x] = col;
        }
        return c;
      },
      outline(col, skip) {
        const b = a.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (b[y * w + x]) continue;
          if ((x > 0 && b[y * w + x - 1]) || (x < w - 1 && b[y * w + x + 1]) || (y > 0 && b[(y - 1) * w + x]) || (y < h - 1 && b[(y + 1) * w + x])) {
            if (!skip || !skip(x, y)) a[y * w + x] = col;
          }
        }
        return c;
      },
      map(fn) { for (let i = 0; i < a.length; i++) if (a[i]) a[i] = fn(a[i], i % w, (i / w) | 0); return c; },
      sil(col) { const d = cv(w, h); for (let i = 0; i < a.length; i++) if (a[i]) d.a[i] = col; return d; },
      comp(src, dx = 0, dy = 0, lv) {
        for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.a[y * src.w + x]; if (v && (lv == null || on(x + dx, y + dy, lv))) c.px(x + dx, y + dy, v); }
        return c;
      },
      keep(fn) { for (let i = 0; i < a.length; i++) if (a[i] && !fn(i % w, (i / w) | 0)) a[i] = null; return c; },
    };
    return c;
  }
  const clone = (src) => { const d = cv(src.w, src.h); d.a.splice(0, d.a.length, ...src.a); return d; };
  function scale(src, sx, sy, cx, cy) {
    const d = cv(src.w, src.h);
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) d.a[y * d.w + x] = src.get(Math.floor((x + 0.5 - cx) / sx + cx), Math.floor((y + 0.5 - cy) / sy + cy));
    return d;
  }
  // rotation with 3x3 supersampling and majority vote (drawn pose source only; the game fine-rotates <= +-20 deg)
  function rotate(src, deg, cx, cy) {
    const d = cv(src.w, src.h), ra = (-deg * Math.PI) / 180, co = Math.cos(ra), si = Math.sin(ra);
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const cnt = new Map(); let n = 0;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const ux = x + (i + 0.5) / 3 - cx, uy = y + (j + 0.5) / 3 - cy;
        const v = src.get(Math.floor(ux * co - uy * si + cx), Math.floor(ux * si + uy * co + cy));
        if (v) { n++; cnt.set(v, (cnt.get(v) || 0) + 1); }
      }
      if (n >= 5) { let best = null, bn = 0; cnt.forEach((k, v) => { if (k > bn) { bn = k; best = v; } }); d.a[y * d.w + x] = best; }
    }
    return d;
  }

  const POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-=?@^~:;<>()[]{}|/_,'
    + Array.from({ length: 320 }, (_, i) => String.fromCharCode(0xc0 + i)).join('');
  function sheet(canvases) {
    const fw = canvases[0].w, fh = canvases[0].h, m = new Map(), palette = {};
    const frames = canvases.map((c) => {
      const rows = [];
      for (let y = 0; y < fh; y++) {
        let s = '';
        for (let x = 0; x < fw; x++) {
          const v = c.a[y * fw + x];
          if (!v) { s += '.'; continue; }
          let ch = m.get(v);
          if (ch === undefined) { ch = POOL[m.size]; if (!ch) throw new Error('sprites-m13b: palette full'); m.set(v, ch); palette[ch] = v; }
          s += ch;
        }
        rows.push(s);
      }
      return rows;
    });
    return { frameWidth: fw, frameHeight: fh, palette, frames };
  }
  const recolorSheet = (sh, col) => ({ frameWidth: sh.frameWidth, frameHeight: sh.frameHeight, palette: Object.fromEntries(Object.keys(sh.palette).map((k) => [k, col])), frames: sh.frames });
  function crop(c, x0, y0, w, h) {
    const d = cv(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) d.a[j * w + i] = c.get(x0 + i, y0 + j);
    return d;
  }
  function decode(sh, i) {
    const c = cv(sh.frameWidth, sh.frameHeight);
    sh.frames[i].forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') c.a[y * c.w + x] = sh.palette[row[x]]; });
    return c;
  }

  // Crop all pose canvases to their common box around the pivot, write sheet + -sil (+ -ink later), return geometry.
  function build(key, poses, pivot) {
    const names = Object.keys(poses), list = names.map((k) => poses[k]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((c) => { for (let i = 0; i < c.a.length; i++) if (c.a[i]) { const x = i % c.w, y = (i / c.w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
    x0 = Math.min(x0, Math.floor(pivot[0]) - 1); y0 = Math.min(y0, Math.floor(pivot[1]) - 1);
    x1 = Math.max(x1, Math.ceil(pivot[0])); y1 = Math.max(y1, Math.ceil(pivot[1]));
    const w = x1 - x0 + 1, h = y1 - y0 + 1, cropped = list.map((c) => crop(c, x0, y0, w, h));
    S[key] = sheet(cropped);
    S[key + '-sil'] = sheet(cropped.map((c) => c.sil(WHITE)));
    return {
      size: [w, h], poses: Object.fromEntries(names.map((n, i) => [n, i])),
      originX: r3((pivot[0] - x0) / w), originY: r3((pivot[1] - y0) / h), pivotPx: [pivot[0] - x0, pivot[1] - y0],
    };
  }
  // o.sheet: shared sheet key (identical parts like worm segments); o.at: fixed x/y instead of pivot - ref
  function part(rig, id, poses, pivot, ref, o = {}) {
    const key = o.sheet || 'rig-' + rig + '-' + id;
    const geo = build(key, poses, pivot);
    const rec = { id, frame: key, silhouette: key + '-sil', size: geo.size, poses: geo.poses, originX: geo.originX, originY: geo.originY, pivotPx: geo.pivotPx };
    rec.x = o.at ? o.at[0] : pivot[0] - ref[0]; rec.y = o.at ? o.at[1] : pivot[1] - ref[1];
    rec.order = o.order;
    if (o.parent) rec.parent = o.parent;
    if (o.freeRotate) rec.freeRotate = true;
    return rec;
  }

  // ---------- boss drawing space: game coordinates (facing right), mirrored into a larger canvas ----------
  // sp = { S: sprite size, BX, BY: top-left of the sprite box in the canvas, W, H: canvas, pal: letter -> colour }
  function mk(sp) {
    const c = cv(sp.W, sp.H);
    const X = (x) => sp.BX + (sp.S - 1 - Math.round(x)), Y = (y) => sp.BY + Math.round(y);
    const col = (k) => (k && k !== '.' ? sp.pal[k] || k : null);
    const inE = (x, y, cx, cy, rx, ry) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; };
    const g = {
      c,
      set(x, y, k) { if (k === '.') { const xx = X(x), yy = Y(y); if (xx >= 0 && yy >= 0 && xx < sp.W && yy < sp.H) c.a[yy * sp.W + xx] = null; } else c.px(X(x), Y(y), col(k)); return g; },
      get(x, y) { return c.get(X(x), Y(y)); },
      rect(x, y, w, h, k) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, k); return g; },
      ell(cx, cy, rx, ry, k, hi, lo, hiT = -0.8, loT = 0.55) {
        for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++)
          for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++) {
            if (!inE(x, y, cx, cy, rx, ry)) continue;
            const l = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry;
            g.set(x, y, hi && l < hiT ? hi : lo && l > loT ? lo : k);
          }
        return g;
      },
      rim(cx, cy, rx, ry, k, t) {
        for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++)
          for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++)
            if (g.get(x, y) && inE(x, y, cx, cy, rx, ry) && (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry > t) g.set(x, y, k);
        return g;
      },
      line(x0, y0, x1, y1, k, t = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor((t - 1) / 2);
        for (let i = 0; i <= n; i++) g.rect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, t, t, k);
        return g;
      },
    };
    return g;
  }
  const pv = (sp, x, y) => [sp.BX + sp.S - x, sp.BY + y]; // pivot (pixel edge) from game coordinates
  const toGame = (sp, X, Y) => [sp.BX + sp.S - 1 - X, Y - sp.BY];

  // ---------- generic poses ----------
  const GH = { G: '#d6f0ff', q: '#6a86c8' };
  // trug (10a): outline turns pale, inside only a sparse dot raster; eye colours stay
  const trug = (c, keepCols = []) => clone(c).map((v, x, y) => (v === NB ? GH.G : keepCols.includes(v) ? v : on(x, y, 0.25) ? GH.q : null));
  // gilded (9a): two hard gold tones by brightness, a diagonal glint band, ink outline stays; fromY = only rows >= fromY
  const GOLD = { y: '#fff0a0', Y: '#ffcf4a', D: '#c7922a' };
  const gilded = (c, fromY = -1) => clone(c).map((v, x, y) => {
    if (v === NB || y < fromY) return v;
    if ((((x - y) % 14) + 14) % 14 < 2 && lum(v) > 0.12) return GOLD.y;
    return lum(v) > 0.42 ? GOLD.Y : GOLD.D;
  });
  // stone: the dog turns into a statue (cinematic 30, shot 5)
  const ST = { N: '#b4b4c8', n: '#8a8aa0', k: '#5e5e78' };
  const stone = (c) => clone(c).map((v) => (v === NB ? v : lum(v) > 0.28 ? ST.N : lum(v) > 0.15 ? ST.n : ST.k));
  // crumble: keep a dither share, the rest falls away as a few grains of `grain`
  const crumble = (c, lv, grain) => clone(c).map((v, x, y) => (on(x, y, lv) ? v : on(x + 1, y + 2, 0.18) ? grain : null));

  // =====================================================================================
  // FOREST GHOST (boss-forest-ghost 48x48 frame 0). Figure origin = bottom centre of the 48 px box.
  // =====================================================================================
  const GHOST = { G: '#d6f0ff', g: '#9ab8e8', q: '#6a86c8', W: '#ffffff', d: '#1a1230', b: '#d8c8a8', B: '#a08a6a', m: '#ff4ad8', M: '#ffd0f5' };
  const MOON = { l: '#fff6d8', m: '#e8e0b0', d: '#b8c4e0' };
  const spG = { S: 48, BX: 31, BY: 34, W: 110, H: 100, pal: GHOST };
  const GO = pv(spG, 24, 48), EYES = [GHOST.m, GHOST.M, GHOST.d];
  const ghostBodyRaw = () => {
    const g = mk(spG);
    g.ell(24, 19, 15, 12, 'G', 'W', 'g');
    g.rect(9, 19, 30, 16, 'G').rect(36, 19, 3, 16, 'g').rect(9, 19, 1, 8, 'W').rect(10, 32, 26, 3, 'g');
    return g.c;
  };
  const GBP = pv(spG, 24, 35); // body pivot: bottom centre of the body
  function ghostDissolve(amount) {
    // the body flows away into moonlight from the bottom up (overlapping, 'echo' in the moment)
    const c = ghostBodyRaw().outline(NB), top = spG.BY + 6, bot = spG.BY + 35;
    return c.map((v, x, y) => {
      const t = (bot - y) / (bot - top);
      if (t > amount) return v;
      return on(x, y, 0.3) ? (lum(v) > 0.6 ? MOON.l : MOON.m) : on(x + 2, y + 1, 0.12) ? MOON.d : null;
    });
  }
  const ghostBody = {
    rest: ghostBodyRaw().outline(NB),
    stretch: scale(ghostBodyRaw(), 0.8, 1.4, GBP[0], GBP[1]).outline(NB),
    dissolve1: ghostDissolve(0.45),
    dissolve2: ghostDissolve(1.01),
  };
  ghostBody.trug = trug(ghostBody.rest);
  function ghostFace(p) {
    const g = mk(spG);
    if (p === 'wail') {
      g.ell(18, 19, 3.5, 3, 'd').ell(30, 19, 3.5, 3, 'd').rect(18, 19, 2, 1, 'm').rect(30, 19, 2, 1, 'm').set(18, 19, 'M').set(30, 19, 'M');
      g.ell(25, 29, 5, 4, 'd');
    } else {
      g.ell(18, 19, 3.5, 4.5, 'd').ell(30, 19, 3.5, 4.5, 'd');
      g.rect(18, 19, 2, 2, 'm').set(18, 19, 'M').rect(30, 19, 2, 2, 'm').set(30, 19, 'M');
      g.ell(25, 28, 4, 2.5, 'd');
    }
    return g.c; // inside the body: no outline
  }
  const faceRest = ghostFace('rest');
  const ghostFaceP = { rest: faceRest, wail: ghostFace('wail'), trug: clone(faceRest).map((v) => (v === GHOST.d ? null : v)) };
  function antenna(s) {
    const g = mk(spG), x0 = 24 + s * 8;
    g.line(x0, 10, x0 + s * 6, 2, s < 0 ? 'b' : 'B', 2).line(x0 + s * 3, 6, x0 + s * 1, 1, 'b').line(x0 + s * 5, 4, x0 + s * 9, 3, 'B');
    return g.c;
  }
  function antennaP(s) { // s = +1: game right = screen left
    const piv = pv(spG, 24 + s * 8, 10), rest = antenna(s).outline(NB);
    return { poses: { rest, swept: rotate(antenna(s), s > 0 ? -32 : 32, piv[0], piv[1]).outline(NB), trug: trug(rest) }, piv };
  }
  function ghostArm(s, p) {
    const g = mk(spG), cx = s > 0 ? 40 : 8;
    if (p === 'reach') g.ell(cx + s * 5, 20, 5, 3, 'G', null, 'g'); else g.ell(cx, 26, 5, 3, 'G', null, 'g');
    return g.c.outline(NB);
  }
  const ghostArmP = (s) => { const rest = ghostArm(s, 'rest'); return { rest, reach: ghostArm(s, 'reach'), trug: trug(rest) }; };
  function ghostTail(f, k) {
    const g = mk(spG);
    for (let x = 9; x <= 38; x++) {
      const len = [4, 3, 2, 1, 2, 3][(x + f) % 6] * k;
      for (let j = 0; j < len; j++) g.set(x, 35 + j, j === len - 1 || x >= 35 ? 'q' : 'g');
    }
    return g.c.outline(NB);
  }
  const tailRest = ghostTail(0, 1);
  const rigG = [];
  const gBody = part('ghost', 'body', ghostBody, GBP, GO, { order: 5 });
  const antL = antennaP(1), antR = antennaP(-1);
  rigG.push(part('ghost', 'tail-wisp', { rest: tailRest, flow: ghostTail(3, 1), stretch: ghostTail(1, 2), trug: trug(tailRest) }, pv(spG, 24, 35), GBP, { order: 0, parent: 'body' }));
  rigG.push(part('ghost', 'antenna-right', antR.poses, antR.piv, GBP, { order: 1, parent: 'body' }));
  rigG.push(part('ghost', 'antenna-left', antL.poses, antL.piv, GBP, { order: 2, parent: 'body' }));
  rigG.push(part('ghost', 'arm-right', ghostArmP(-1), pv(spG, 13, 26), GBP, { order: 3, parent: 'body' }));
  rigG.push(part('ghost', 'arm-left', ghostArmP(1), pv(spG, 35, 26), GBP, { order: 4, parent: 'body' }));
  rigG.push(gBody);
  rigG.push(part('ghost', 'face', ghostFaceP, pv(spG, 24, 24), GBP, { order: 6, parent: 'body' }));
  // body pose 'stretch' scales 0.8 x 1.4 around the body pivot: children follow with these hold offsets
  const stretchAnchors = {};
  rigG.forEach((p) => { if (p.parent === 'body') stretchAnchors[p.id] = [Math.round(p.x * -0.2), Math.round(p.y * 0.4)]; });
  RIGS.forestGhost = { id: 'forestGhost', drawnHeight: 48, scale: { moment: 3, cinematic: 4 }, parts: rigG.sort((p, q) => p.order - q.order), anchors: { stretch: stretchAnchors } };

  // =====================================================================================
  // GIANT STONE (boss-giant-stone 64x64 frame 0) plus two floating rock fists (5a)
  // =====================================================================================
  const DAWN = { L: '#fff2c0', A: '#ffd27a', Z: '#e09a3a' }; // morning light (Morgenlicht)
  const STONE = { n: '#8a8aa0', N: '#b4b4c8', k: '#5e5e78', K: '#3e3e56', c: '#9ff5ec', C: '#4fb8b0', f: '#8a6bd0', F: '#6a4fb0', m: '#ff4ad8', M: '#ffd0f5', ...DAWN };
  const spS = { S: 64, BX: 43, BY: 40, W: 150, H: 120, pal: STONE };
  const SO = pv(spS, 32, 64);
  const CRACKS = [
    [[40, 20], [37, 28], [41, 36], [38, 42]],
    [[14, 36], [21, 42], [19, 49], [24, 55]],
    [[50, 40], [46, 47], [52, 53], [48, 58]],
  ];
  function stoneBody(level) {
    const g = mk(spS);
    g.ell(32, 37, 28, 24, 'n', 'N', 'k').rim(32, 37, 28, 24, 'K', 1.05);
    [[14, 30], [22, 50], [30, 24], [44, 53], [50, 34], [38, 45], [18, 42], [55, 44], [27, 56], [46, 24], [9, 38], [34, 18]].forEach(([x, y]) => {
      if (g.get(x, y) && g.get(x + 1, y)) g.set(x, y, 'k').set(x + 1, y, 'k').set(x, y - 1, 'N');
    });
    g.line(10, 34, 16, 38, 'K').line(16, 38, 14, 44, 'K').line(50, 46, 55, 50, 'K').line(46, 20, 49, 25, 'K');
    g.ell(22, 16, 10, 3, 'f', null, 'F');
    [14, 18, 25, 29].forEach((x, i) => g.set(x, 19, 'F').set(x, 20, i % 2 ? 'F' : '.'));
    // glowing cracks, one more per level (the morning light runs through him)
    CRACKS.slice(0, level).forEach((pts) => {
      for (let i = 0; i + 1 < pts.length; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'A', 2);
      for (let i = 0; i + 1 < pts.length; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'L');
    });
    return g.c.outline(NB);
  }
  function stoneFace(p) {
    const g = mk(spS);
    if (p === 'strain') {
      g.line(18, 28, 28, 31, 'K', 3).line(46, 28, 36, 31, 'K', 3);
      g.rect(21, 34, 6, 1, 'm').rect(38, 34, 6, 1, 'm');
      g.ell(33, 46, 7, 3, 'K').ell(33, 46, 5, 1.5, 'k');
    } else {
      g.rect(18, 29, 11, 3, 'K').set(28, 32, 'K').rect(36, 29, 11, 3, 'K').set(36, 32, 'K');
      if (p === 'frozen') g.rect(20, 33, 7, 2, 'K').rect(38, 33, 7, 2, 'K');
      else g.rect(20, 33, 7, 2, 'm').set(20, 33, 'M').rect(38, 33, 7, 2, 'm').set(38, 33, 'M');
      [[24, 46], [27, 44], [30, 46], [33, 44], [36, 46], [39, 44], [41, 46]].reduce((a, b) => (g.line(a[0], a[1], b[0], b[1], 'K'), b));
    }
    return g.c;
  }
  function crystals(lit) {
    const g = mk(spS), c1 = lit ? 'L' : 'c', c2 = lit ? 'A' : 'C';
    const crystal = (x, y, hgt, hw) => {
      for (let i = 0; i <= hgt; i++) {
        const half = Math.max(0, Math.round((i / hgt) * hw));
        for (let d = -half; d <= half; d++) g.set(x + d, y + i, d < 0 ? c1 : d > 0 ? c2 : i < 2 ? c1 : c2);
      }
    };
    crystal(40, 4, 11, 3); crystal(47, 10, 6, 2); crystal(31, 9, 5, 2);
    return g.c.outline(NB);
  }
  // fists float beside him: front fist (game right = screen left, towards her) lit, back fist in shade
  function fist(front, p) {
    const g = mk(spS), cx = front ? 68 : -4, cy = 46, k = front ? ['n', 'N', 'k'] : ['k', 'n', 'K'];
    if (p === 'punch') for (let i = 0; i < 4; i++) g.line(cx - 22, cy - 5 + i * 3, cx - 8, cy - 5 + i * 3, i % 2 ? 'k' : 'K'); // speed streaks behind it
    g.ell(cx, cy, p === 'punch' ? 11 : 9, p === 'punch' ? 7 : 8, k[0], k[1], k[2]);
    if (p === 'raised') { for (let i = 0; i < 4; i++) g.set(cx - 5 + i * 3, cy - 6, 'K').set(cx - 4 + i * 3, cy - 6, 'K'); g.line(cx + 2, cy + 3, cx + 6, cy - 1, 'K'); }
    else { for (let i = 0; i < 4; i++) g.set(cx + 5, cy - 5 + i * 3, 'K').set(cx + 6, cy - 5 + i * 3, 'K'); g.line(cx - 3, cy + 3, cx + 3, cy + 4, 'K'); }
    if (p === 'frozen') g.line(cx - 4, cy - 6, cx + 1, cy, 'A', 2).line(cx + 1, cy, cx - 2, cy + 6, 'A', 2).line(cx - 3, cy - 5, cx + 1, cy, 'L');
    return g.c.outline(NB);
  }
  const rigS = [];
  const SBP = pv(spS, 32, 61);
  rigS.push(part('stone', 'fist-right', { rest: fist(false, 'rest'), raised: fist(false, 'raised'), frozen: fist(false, 'frozen') }, pv(spS, -4, 46), SO, { order: 0 }));
  rigS.push(part('stone', 'body', { rest: stoneBody(0), cracked1: stoneBody(1), cracked2: stoneBody(2), cracked3: stoneBody(3) }, SBP, SO, { order: 1 }));
  rigS.push(part('stone', 'crystals', { rest: crystals(false), lit: crystals(true) }, pv(spS, 40, 16), SBP, { order: 2, parent: 'body' }));
  rigS.push(part('stone', 'face', { rest: stoneFace('rest'), strain: stoneFace('strain'), frozen: stoneFace('frozen') }, pv(spS, 32, 37), SBP, { order: 3, parent: 'body' }));
  // chunks: the frozen, fully cracked stone split into 4 uneven pieces along jagged lines (shown only at the collapse)
  (function () {
    const all = stoneBody(3).comp(crystals(true)).comp(stoneFace('frozen'));
    const cen = [spS.BX + spS.S - 32, spS.BY + 37], cuts = [-100, -12, 78, 168], r = rng(9);
    const jit = Array.from({ length: 80 }, () => (r() - 0.5) * 16);
    const sector = (x, y) => {
      const d = Math.hypot(x - cen[0], y - cen[1]);
      const a = (Math.atan2(y - cen[1], x - cen[0]) * 180) / Math.PI + jit[Math.min(79, Math.round(d))] * 0.6;
      const aa = ((a - cuts[0]) % 360 + 360) % 360;
      return aa < cuts[1] - cuts[0] ? 0 : aa < cuts[2] - cuts[0] ? 1 : aa < cuts[3] - cuts[0] ? 2 : 3;
    };
    for (let k = 0; k < 4; k++) {
      const c = clone(all).keep((x, y) => sector(x, y) === k && all.get(x, y) !== NB);
      let sx = 0, sy = 0, n = 0;
      c.a.forEach((v, i) => { if (v) { sx += i % c.w; sy += (i / c.w) | 0; n++; } });
      c.outline(NB);
      rigS.push(part('stone', 'chunk-' + (k + 1), { rest: c }, [Math.round(sx / n), Math.round(sy / n)], SO, { order: 4 + k }));
    }
  })();
  rigS.push(part('stone', 'fist-left', { rest: fist(true, 'rest'), raised: fist(true, 'raised'), punch: fist(true, 'punch'), frozen: fist(true, 'frozen') }, pv(spS, 68, 46), SO, { order: 8 }));
  RIGS.giantStone = { id: 'giantStone', drawnHeight: 64, scale: { moment: 3, cinematic: 4 }, parts: rigS.sort((p, q) => p.order - q.order) };

  // =====================================================================================
  // GIANT SAND WORM (boss-sand-worm 64x64 head + boss-sand-worm-body 32x32): head, jaw, 7 segments, tail (11a)
  // =====================================================================================
  const SWORM = { w: '#c88e58', W: '#8a5a32', h: '#e8b47a', x: '#f4e4c4', X: '#9a8060', m: '#5a1a2a', M: '#2a0a14', t: '#fff4e0', e: '#ffb02a', E: '#fff0a0', s: '#d8a860', S: '#a87438', H: '#f0c888' };
  const spW = { S: 64, BX: 48, BY: 40, W: 160, H: 120, pal: SWORM };
  const WO = pv(spW, 32, 64);
  const inHead = (x, y) => ((x + 0.5 - 36) / 21) ** 2 + ((y + 0.5 - 29) / 17) ** 2 <= 1;
  function wormHeadRaw() {
    const g = mk(spW);
    g.ell(36, 29, 21, 17, 'w', 'h', 'W');
    g.line(21, 30, 34, 18, 'W');
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (1.05 + k * 0.1), bx = 36 + Math.cos(a) * 19, by = 29 + Math.sin(a) * 15, tx = 36 + Math.cos(a) * 29, ty = 29 + Math.sin(a) * 25;
      g.line(bx, by, tx, ty, 'x', 3).line(bx + 1, by + 1, tx, ty, 'X').set(tx, ty, 'x');
    }
    [[30, 34], [24, 28], [40, 40], [33, 42], [44, 18], [27, 18], [37, 22]].filter(([x, y]) => inHead(x, y)).forEach(([x, y]) => g.set(x, y, 'x').set(x + 1, y + 1, 'X'));
    [[40, 18], [45, 20], [38, 24]].forEach(([x, y]) => g.rect(x - 1, y - 1, 5, 4, 'M').rect(x, y, 3, 2, 'e').set(x, y, 'E'));
    return g.c.outline(NB);
  }
  function wormJaw(p) {
    const g = mk(spW), open = p === 'closed' ? 0 : 2, rx = p === 'roar' ? 10 : 8, ry = 7 + open * 1.5 + (p === 'roar' ? 3 : 0);
    g.ell(50, 31, rx, ry, 't').ell(50, 31, rx - 1.6, ry - 1.6, 'm').ell(51, 31, Math.max(1, rx - 4), Math.max(1, ry - 3.5), 'M');
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.set(50 + Math.cos(a) * (rx - 2), 31 + Math.sin(a) * (ry - 1.5), 't'); }
    return g.c.outline(NB);
  }
  const spSeg = { S: 32, BX: 20, BY: 20, W: 72, H: 72, pal: SWORM };
  function wormSeg(tail) {
    const g = mk(spSeg);
    if (!tail) {
      g.ell(16, 16, 12, 11, 'w', 'h', 'W');
      g.line(9, 26, 22, 6, 'W').line(10, 26, 23, 7, 'W');
      [[8, 6], [15, 3], [22, 4]].forEach(([x, y], i) => g.line(x + 2, y + 5, x, y - (i === 1 ? 1 : 0), 'x', 2).set(x, y - 1, 'x'));
      [[12, 14], [19, 19], [16, 10], [22, 13]].forEach(([x, y]) => g.set(x, y, 'x').set(x + 1, y + 1, 'X'));
    } else {
      g.ell(13, 16, 9, 8, 'w', 'h', 'W').line(22, 14, 29, 16, 'w', 3).line(22, 18, 29, 16, 'W').set(30, 16, 'x');
      g.line(8, 22, 16, 8, 'W');
      [[9, 9], [16, 9]].forEach(([x, y]) => g.line(x, y, x - 1, y - 5, 'x', 2));
    }
    return g.c.outline(NB);
  }
  const crumbleSet = (c) => ({ crumble1: crumble(c, 0.55, SWORM.s), crumble2: crumble(c, 0.22, SWORM.H) });
  const rigW = [];
  const headC = wormHeadRaw(), HP = pv(spW, 22, 40);
  const segC = wormSeg(false), tailC = wormSeg(true);
  // default chain (screen px from the figure origin): behind the head, down and to the right into the sand
  const headAt = [HP[0] - WO[0], HP[1] - WO[1]];
  rigW.push(part('worm', 'tail', { rest: tailC, ...crumbleSet(tailC) }, pv(spSeg, 20, 16), null, { order: 0, at: [headAt[0] + 14 * 8, headAt[1] + 9 * 8] }));
  for (let k = 7; k >= 1; k--) {
    rigW.push(part('worm', 'seg-' + k, { rest: segC, ...crumbleSet(segC) }, pv(spSeg, 16, 16), null, { order: 8 - k, sheet: 'rig-worm-seg', at: [headAt[0] + 14 * k, headAt[1] + 9 * k] }));
  }
  rigW.push(part('worm', 'head', { rest: headC, ...crumbleSet(headC) }, HP, WO, { order: 8 }));
  const jawC = wormJaw('closed');
  rigW.push(part('worm', 'jaw', { closed: jawC, open: wormJaw('open'), roar: wormJaw('roar'), ...crumbleSet(jawC) }, pv(spW, 50, 31), HP, { order: 9, parent: 'head' }));
  RIGS.giantSandWorm = { id: 'giantSandWorm', drawnHeight: 64, scale: { moment: 3, cinematic: 4 }, parts: rigW.sort((p, q) => p.order - q.order), crumbleStepMs: 120 };

  // =====================================================================================
  // GUARDIAN DOG (boss-guardian-dog 64x64 frame 0): one head, three shadow heads from the collar (6a)
  // =====================================================================================
  const DOG = { k: '#2e2e4c', K: '#1a1a30', h: '#4e4e78', g: '#ffcf4a', G: '#c7922a', c: '#5ff5ec', C: '#2fb8c0', x: '#0c0c18', w: '#e8e4d0' };
  const spD = { S: 64, BX: 43, BY: 40, W: 150, H: 115, pal: DOG };
  const DO = pv(spD, 32, 64), DBP = pv(spD, 30, 46);
  function dogLegs(front, p) {
    const g = mk(spD), list = front ? [[38, 'K'], [45, 'k']] : [[14, 'K'], [21, 'k']];
    list.forEach(([x, c]) => {
      if (p === 'lie') { g.rect(x, 52, 6, 6, c).rect(x, 54, 6, 1, 'g').rect(x - 1, 58, front ? 11 : 8, 3, c); }
      else { g.rect(x, 42, 6, 18, c).rect(x, 50, 6, 2, 'g').rect(x, 52, 6, 1, 'G').rect(x - 1, 58, 8, 3, c); }
    });
    return g.c.outline(NB);
  }
  function dogTail(p) {
    const g = mk(spD);
    if (p === 'down') g.line(10, 38, 8, 52, 'K', 3).set(8, 54, 'g'); else g.line(10, 36, 3, 48, 'K', 3).set(3, 50, 'g');
    return g.c.outline(NB);
  }
  function dogBody(p) {
    const g = mk(spD), glow = p === 'dark' ? 'K' : 'c';
    g.ell(30, 38, 19, 9, 'k', 'h', 'K');
    g.ell(46, 30, 9, 12, 'k', 'h', 'K');
    g.ell(28, 33, 2.2, 2.6, glow).ell(28, 33, 1, 1.4, 'k').rect(27, 35, 3, 6, glow).rect(24, 37, 9, 2, glow);
    g.line(15, 34, 19, 38, 'x').line(19, 38, 18, 42, 'x').line(36, 42, 40, 39, 'x').line(43, 33, 45, 37, 'x');
    return g.c.outline(NB);
  }
  const NECK = pv(spD, 46, 24);
  function dogHeadRaw(p, withJaw) {
    const g = mk(spD);
    g.ell(49, 18, 7, 6, 'k', 'h', 'K').rect(52, 17, 9, 3, 'k').rect(60, 17, 3, 3, 'x');
    if (withJaw) g.rect(52, 20, 9, 2, 'k').rect(52, 21, 9, 1, 'K');
    [[44, 46, 2], [50, 53, 0]].forEach(([x0, x1, t]) => {
      for (let y = 1 + t; y <= 14; y++) { const hw = Math.round((y - 1 - t) * 0.28); for (let x = x0 - hw; x <= x0 + hw; x++) g.set(x + Math.round(((14 - y) * (x1 - x0)) / 14), y, Math.abs(x - x0) < hw ? 'g' : 'k'); }
    });
    if (p === 'sleep') g.rect(50, 16, 3, 1, 'G'); else g.rect(50, 15, 3, 2, 'c').set(52, 15, 'w');
    g.line(49, 14, 54, 14, 'g');
    g.line(53, 18, 58, 19, 'g');
    return g.c;
  }
  // low/sleep: head hangs by 30 deg; the lower jaw is drawn into these poses, the choreography hides 'jaw'
  const dogHeadP = {
    rest: dogHeadRaw('rest', false).outline(NB),
    low: rotate(dogHeadRaw('rest', true), -30, NECK[0], NECK[1]).outline(NB),
    sleep: rotate(dogHeadRaw('sleep', true), -30, NECK[0], NECK[1]).outline(NB),
  };
  dogHeadP.stone = stone(dogHeadP.rest);
  const JP = pv(spD, 52, 20);
  function dogJaw(p) {
    const g = mk(spD);
    g.rect(52, 20, 9, 2, 'k').rect(52, 21, 9, 1, 'K');
    if (p === 'snap') { g.set(54, 20, 'w').set(57, 20, 'w').set(60, 20, 'w'); return rotate(g.c, -25, JP[0], JP[1]).outline(NB); }
    return g.c.outline(NB);
  }
  function dogCollar(p) {
    const g = mk(spD);
    for (let r = 0; r < 4; r++) g.line(40 + r, 25 + r * 2, 54 - r, 27 + r, r % 2 ? 'G' : 'g', 2);
    const glow = p === 'rest' ? 'c' : 'K';
    g.set(45, 28, glow).set(48, 29, glow).set(51, 28, glow);
    if (p === 'broken') { for (let y = 22; y < 36; y++) g.set(47, y, '.').set(48, y, '.'); g.set(46, 30, 'c').set(49, 27, 'w'); }
    return g.c.outline(NB);
  }
  // shadow head: a ghostly jackal head in near-black with a teal rim and eye, trailing a wisp down to the collar
  const spSh = { S: 24, BX: 8, BY: 6, W: 40, H: 40, pal: DOG };
  function shade(p) {
    const g = mk(spSh);
    // one tapering wisp down to the collar
    for (let i = 0; i <= 10; i++) { const t = i / 10; g.rect(Math.round(8 - 3 * t * t), 16 + i, t < 0.5 ? 3 : t < 0.8 ? 2 : 1, 1, 'K'); }
    g.ell(9, 12, 5.5, 4.5, 'K');
    // short pointed jackal ears, long narrow snout
    for (let y = 0; y < 5; y++) { g.rect(6 - (y > 2 ? 1 : 0), 4 + y, 1 + (y > 1 ? 1 : 0) + (y > 3 ? 1 : 0), 1, 'K'); g.rect(10, 4 + y, 1 + (y > 1 ? 1 : 0) + (y > 3 ? 1 : 0), 1, 'K'); }
    g.rect(13, 10, 7, 2, 'K').rect(20, 10, 2, 1, 'K').rect(13, 12, 5, 1, 'K');
    if (p === 'snap') { g.line(13, 13, 20, 17, 'K', 2); g.set(15, 12, 'w').set(18, 12, 'w').set(16, 14, 'w'); }
    for (let y = 0; y < 30; y++) for (let x = 0; x < 24; x++) if (g.get(x, y) && (x + y) % 3 === 0) g.set(x, y, 'k');
    g.rect(11, 9, 2, 1, 'c');
    const c = g.c.outline(DOG.C);
    return p === 'fade' ? c.keep((x, y) => on(x, y, 0.45)) : c;
  }
  const rigD = [];
  rigD.push(part('dog', 'legs-back', { stand: dogLegs(false, 'stand'), lie: dogLegs(false, 'lie'), stone: stone(dogLegs(false, 'stand')) }, pv(spD, 20, 42), DBP, { order: 0, parent: 'body' }));
  rigD.push(part('dog', 'legs-front', { stand: dogLegs(true, 'stand'), lie: dogLegs(true, 'lie'), stone: stone(dogLegs(true, 'stand')) }, pv(spD, 44, 42), DBP, { order: 1, parent: 'body' }));
  rigD.push(part('dog', 'tail', { rest: dogTail('rest'), down: dogTail('down'), stone: stone(dogTail('rest')) }, pv(spD, 10, 36), DBP, { order: 2, parent: 'body' }));
  rigD.push(part('dog', 'body', { rest: dogBody('rest'), dark: dogBody('dark'), stone: stone(dogBody('dark')) }, DBP, DO, { order: 3 }));
  rigD.push(part('dog', 'head', dogHeadP, NECK, DO, { order: 4 }));
  rigD.push(part('dog', 'jaw', { closed: dogJaw('closed'), snap: dogJaw('snap'), stone: stone(dogJaw('closed')) }, JP, NECK, { order: 5, parent: 'head' }));
  rigD.push(part('dog', 'collar', { rest: dogCollar('rest'), dark: dogCollar('dark'), broken: dogCollar('broken'), stone: stone(dogCollar('dark')) }, pv(spD, 47, 28), DBP, { order: 6, parent: 'body' }));
  const shP = { rest: shade('rest'), snap: shade('snap'), fade: shade('fade') }, shPiv = pv(spSh, 6, 27);
  [[-30, -46], [-8, -62], [14, -48]].forEach((at, i) => rigD.push(part('dog', 'shade-' + (i + 1), shP, shPiv, null, { order: 7 + i, sheet: 'rig-dog-shade', at })));
  RIGS.guardianDog = { id: 'guardianDog', drawnHeight: 64, scale: { moment: 3, cinematic: 4 }, parts: rigD.sort((p, q) => p.order - q.order), anchors: { lie: { body: [0, 8], head: [0, 8] } } };

  // =====================================================================================
  // PHARAOH (boss-pharaoh 64x64 frame 0): robe, collar (with the lower nemes flaps), head, crook, flail, orb ring
  // =====================================================================================
  const PH = { Y: '#ffcf4a', D: '#c7922a', y: '#fff0a0', b: '#3a5ad8', B: '#24348a', t: '#3ac8b8', w: '#ece6d4', W: '#b8b0a0', k: '#1a1020', c: '#5ff5ec', C: '#2fb8c0', r: '#c8464e' };
  const spP = { S: 64, BX: 43, BY: 40, W: 150, H: 120, pal: PH };
  const PO = pv(spP, 32, 64), RP = pv(spP, 32, 55);
  function phRobe() {
    const g = mk(spP);
    for (let y = 30; y <= 54; y++) { const hw = 9 + Math.round((y - 30) * 0.42); for (let x = 32 - hw; x <= 31 + hw; x++) g.set(x, y, x < 34 - hw ? 'w' : x > 28 + hw ? 'W' : 'w'); }
    for (let y = 36; y <= 54; y++) for (let x = 28; x <= 35; x++) g.set(x, y, y % 4 < 2 ? 'Y' : 'b');
    g.rect(22, 35, 20, 2, 'Y').rect(22, 37, 20, 1, 'D');
    for (let x = 18; x <= 45; x++) if (x % 3 === 0) g.set(x, 55, 'D').set(x, 56 + ((x >> 1) % 2), 'Y');
    return g.c.outline(NB);
  }
  const nemes = (g, y0, y1) => {
    for (let y = y0; y <= y1; y++) {
      const hw = y < 14 ? 7 + (y - 8) : 13 - Math.max(0, Math.round((y - 24) * 0.5));
      for (let x = 32 - hw; x <= 31 + hw; x++) g.set(x, y, y % 3 === 0 ? 'b' : x < 32 - hw + 1 ? 'y' : 'Y');
    }
  };
  function phCollar() {
    const g = mk(spP);
    nemes(g, 21, 33);
    [['t', 0], ['Y', 2], ['b', 4], ['Y', 6]].forEach(([c, d]) => g.ell(32, 27, 13 - d * 0.4, 6 - d * 0.5, c));
    g.ell(32, 25, 8, 3, 'Y');
    return g.c.outline(NB);
  }
  function phHead(p) {
    const g = mk(spP);
    nemes(g, 8, 20);
    g.ell(32, 18, 7, 8, 'Y', 'y', 'D');
    g.rect(26, 9, 12, 3, 'b').rect(26, 12, 12, 1, 'Y');
    g.rect(27, 16, 4, 2, 'k').rect(33, 16, 4, 2, 'k').set(26, 17, 'k').set(37, 17, 'k');
    const eye = p === 'glare' ? 'y' : 'c';
    g.rect(28, 16, 2, 2, eye).rect(34, 16, 2, 2, eye);
    if (p === 'glare') g.set(27, 15, 'y').set(36, 15, 'y');
    g.rect(31, 19, 2, 3, 'D').rect(30, 23, 4, 1, 'D');
    g.rect(31, 25, 2, 5, 'b').set(31, 26, 'Y').set(31, 28, 'Y'); // beard
    g.rect(31, 5, 2, 5, 'Y').set(30, 5, 'Y').set(33, 5, 'Y').set(31, 6, 'r').set(32, 6, 'r');
    if (p === 'cracked') { g.line(30, 10, 28, 17, 'y').line(28, 17, 33, 23, 'y').line(36, 12, 38, 20, 'y').set(29, 14, '#ffffff').set(37, 16, '#ffffff'); }
    return g.c.outline(NB);
  }
  const HANDS = pv(spP, 32, 38);
  function phCrook() {
    const g = mk(spP);
    g.line(25, 44, 38, 30, 'Y', 2).line(38, 30, 40, 28, 'b', 2).line(40, 28, 42, 30, 'Y', 2);
    g.rect(29, 37, 6, 3, 'Y').rect(30, 38, 4, 1, 'D'); // crossed hands hold both
    return g.c;
  }
  function phFlail() {
    const g = mk(spP);
    g.line(39, 44, 26, 30, 'b', 2).line(26, 30, 23, 28, 'Y');
    [[22, 29], [21, 31], [23, 32]].forEach(([x, y]) => g.line(x, y, x - 3, y + 5, 'Y'));
    return g.c;
  }
  // gold spiral: 8 orbs on a flat ring around him; back orbs small and dim, front orbs large (depth without two parts)
  function orbRing(step) {
    const g = mk(spP);
    for (let k = 0; k < 8; k++) {
      const a = ((k * 45 + step * 15) * Math.PI) / 180, x = 32 + Math.cos(a) * 30, y = 34 + Math.sin(a) * 10;
      if (Math.sin(a) > 0) g.ell(x, y, 3, 3, 'Y', 'y', 'D'); else g.ell(x, y, 2, 2, 'D');
    }
    return g.c.outline(NB);
  }
  const rigP = [];
  const robeC = phRobe(), collarC = phCollar(), headC2 = phHead('rest');
  const crookC = phCrook().outline(NB), flailC = phFlail().outline(NB);
  rigP.push(part('pharaoh', 'robe', { rest: robeC, 'gilded-half': gilded(robeC, spP.BY + 44), gilded: gilded(robeC) }, RP, PO, { order: 0 }));
  rigP.push(part('pharaoh', 'collar', { rest: collarC, gilded: gilded(collarC) }, pv(spP, 32, 27), RP, { order: 1, parent: 'robe' }));
  rigP.push(part('pharaoh', 'flail', { rest: flailC, raised: rotate(phFlail(), -45, HANDS[0], HANDS[1]).outline(NB), gilded: gilded(flailC) }, HANDS, RP, { order: 2, parent: 'robe' }));
  rigP.push(part('pharaoh', 'crook', { rest: crookC, raised: rotate(phCrook(), 45, HANDS[0], HANDS[1]).outline(NB), gilded: gilded(crookC) }, HANDS, RP, { order: 3, parent: 'robe' }));
  rigP.push(part('pharaoh', 'head', { rest: headC2, glare: phHead('glare'), cracked: phHead('cracked'), gilded: gilded(headC2) }, pv(spP, 32, 25), RP, { order: 4, parent: 'robe' }));
  rigP.push(part('pharaoh', 'orb-ring', { spin1: orbRing(0), spin2: orbRing(1), spin3: orbRing(2) }, pv(spP, 32, 34), PO, { order: 5 }));
  RIGS.pharaoh = { id: 'pharaoh', drawnHeight: 64, scale: { moment: 3, cinematic: 4 }, parts: rigP.sort((p, q) => p.order - q.order), gildOrder: ['robe', 'flail', 'crook', 'collar', 'head'] };

  // =====================================================================================
  // EFFECTS AND PROPS (pre-coloured, never tinted)
  // =====================================================================================
  const plus = (c, x, y, a, b) => c.px(x, y, b).px(x - 1, y, a).px(x + 1, y, a).px(x, y - 1, a).px(x, y + 1, a);
  function fxSheet(n, fn) { return sheet(Array.from({ length: n }, (_, i) => { const c = cv(8, 8); fn(c, i); return c; })); }
  S['rig-fx-ghost'] = fxSheet(4, (c, i) => {
    if (i === 0) { plus(c, 4, 4, MOON.m, MOON.l); c.px(4, 2, MOON.d).px(4, 6, MOON.d).px(2, 4, MOON.d).px(6, 4, MOON.d); }
    if (i === 1) c.rect(3, 3, 2, 2, MOON.l).px(4, 4, MOON.m);
    if (i === 2) c.ell(4, 4, 3.5, 2.5, GHOST.g, 0.5).ell(4, 4, 2, 1.5, GHOST.G, 0.5);
    if (i === 3) c.poly([[1, 6], [4, 1], [7, 5]], GHOST.G).px(4, 4, GHOST.q).px(3, 5, GHOST.q);
  });
  S['rig-fx-stone'] = fxSheet(6, (c, i) => {
    if (i === 0) c.ells(4, 4, 3, 2.6, [STONE.N, STONE.n, STONE.k]).outline(NB);
    if (i === 1) c.rect(3, 3, 2, 2, STONE.n).px(3, 3, STONE.N).outline(NB);
    if (i === 2) c.ell(4, 4, 3.5, 3, '#c8c0b0', 0.4).ell(4, 4, 2, 2, '#e0dacc', 0.5);
    if (i === 3) plus(c, 4, 4, DAWN.A, DAWN.L);
    if (i === 4) c.poly([[4, 0], [6, 4], [4, 8], [2, 4]], STONE.C).line(4, 1, 4, 6, STONE.c);
    if (i === 5) { plus(c, 4, 4, '#fff2c0', WHITE); c.px(4, 1, '#fff2c0').px(4, 7, '#fff2c0').px(1, 4, '#fff2c0').px(7, 4, '#fff2c0'); }
  });
  S['rig-fx-worm'] = fxSheet(5, (c, i) => {
    if (i === 0) c.ells(4, 4, 3, 2.5, [SWORM.H, SWORM.s, SWORM.S]);
    if (i === 1) c.rect(3, 3, 2, 2, SWORM.H).px(4, 4, SWORM.s);
    if (i === 2) c.ell(4, 4, 3.5, 3, SWORM.H, 0.4).ell(4, 4, 2, 1.5, SWORM.s, 0.5);
    if (i === 3) c.line(2, 6, 5, 1, SWORM.x, 2).line(3, 6, 5, 2, SWORM.X).outline(NB);
    if (i === 4) plus(c, 4, 4, SWORM.e, SWORM.E);
  });
  S['rig-fx-dog'] = fxSheet(5, (c, i) => {
    if (i === 0) c.poly([[2, 1], [6, 2], [5, 7], [1, 5]], DOG.C).line(3, 2, 4, 5, DOG.c);
    if (i === 1) c.poly([[1, 4], [4, 1], [7, 4], [4, 7]], DOG.G).px(4, 3, DOG.g).px(3, 4, DOG.g);
    if (i === 2) c.ell(4, 4, 3.5, 3, DOG.K, 0.5).ell(4, 4, 2, 2, DOG.k, 0.5);
    if (i === 3) plus(c, 4, 4, DOG.g, DOG.w);
    if (i === 4) c.ells(4, 4, 2.5, 2, [ST.N, ST.n, ST.k]).outline(NB);
  });
  S['rig-fx-pharaoh'] = fxSheet(5, (c, i) => {
    if (i === 0) plus(c, 4, 4, GOLD.Y, GOLD.y);
    if (i === 1) c.rect(3, 3, 2, 2, GOLD.y).px(4, 4, GOLD.Y);
    if (i === 2) c.poly([[1, 4], [4, 1], [7, 4], [4, 7]], GOLD.D).line(3, 3, 4, 4, GOLD.Y).px(3, 3, GOLD.y);
    if (i === 3) c.poly([[1, 2], [7, 1], [6, 6], [2, 7]], PH.w).line(1, 4, 7, 3, PH.b).px(6, 5, PH.W);
    if (i === 4) { plus(c, 4, 4, '#fff6d8', WHITE); }
  });
  // sand wave (worm anticipation): 0 ripple, 1 rising wave, 2 crest with spray
  S['rig-prop-sandwave'] = sheet([0, 1, 2].map((stage) => {
    const c = cv(64, 20), r = rng(25), hgt = [3, 8, 13][stage];
    c.ells(32, 19, 30, hgt, [SWORM.H, SWORM.s, SWORM.S], -0.6, 0.35);
    for (let i = 0; i < 3; i++) c.line(10 + i * 14, 19 - hgt * 0.4, 22 + i * 14, 19 - hgt * 0.55, SWORM.S);
    if (stage === 2) for (let i = 0; i < 14; i++) c.px(18 + r() * 28, 19 - hgt - 1 - r() * 5, r() < 0.5 ? SWORM.H : SWORM.s);
    return c.outline(NB);
  }));
  // torch for the tomb (cinematic 30, shot 3): 0 unlit, 1 and 2 burning
  S['rig-prop-torch'] = sheet([0, 1, 2].map((f) => {
    const c = cv(8, 16);
    c.rect(3, 8, 2, 8, DOG.G).rect(2, 7, 4, 2, DOG.g).px(3, 8, DOG.g);
    if (f) { c.ell(4, f === 1 ? 4 : 3.5, 2.5, f === 1 ? 3.5 : 4, DOG.g).ell(4, 5, 1.2, 2, DOG.w); c.px(f === 1 ? 3 : 5, 0, DOG.g); }
    return c.outline(NB);
  }));
  // riddle symbols (moment "Raetsel"): 0 child (crawling), 1 human (standing), 2 elder (with stick); 3..5 the same lit
  S['rig-prop-riddle'] = sheet([0, 1, 2, 3, 4, 5].map((i) => {
    const c = cv(16, 16), lit = i >= 3, k = i % 3, f = lit ? GOLD.y : GOLD.Y, e = lit ? WHITE : GOLD.D;
    if (k === 0) { c.ell(4, 7, 2.5, 2.5, f).rect(5, 9, 7, 3, f).rect(5, 12, 2, 3, e).rect(10, 12, 2, 3, e); }
    if (k === 1) { c.ell(8, 3, 2.5, 2.5, f).rect(6, 6, 5, 6, f).rect(6, 12, 2, 3, e).rect(9, 12, 2, 3, e).rect(4, 7, 2, 4, e).rect(11, 7, 2, 4, e); }
    if (k === 2) { c.ell(5, 5, 2.5, 2.5, f).poly([[6, 6], [11, 8], [10, 12], [6, 11]], f).rect(7, 12, 2, 3, e).rect(9, 12, 2, 3, e).line(12, 8, 13, 15, e); }
    return c.outline(lit ? GOLD.Y : NB);
  }));
  Object.assign(RIGS.fx || (RIGS.fx = {}), {
    ghost: 'rig-fx-ghost', stone: 'rig-fx-stone', worm: 'rig-fx-worm', sandwave: 'rig-prop-sandwave',
    dog: 'rig-fx-dog', torch: 'rig-prop-torch', pharaoh: 'rig-fx-pharaoh', riddle: 'rig-prop-riddle',
  });

  // =====================================================================================
  // ASTRONAUT: spear and hammer poses (7a). The sheets of blade and blade-arc are rebuilt with a larger frame.
  // =====================================================================================
  function extendPart(rec, extra) {
    const EW = 220, EH = 180, P = [110, 90], old = S[rec.frame], poses = {};
    Object.keys(rec.poses).forEach((n) => { poses[n] = cv(EW, EH).comp(decode(old, rec.poses[n]), P[0] - rec.pivotPx[0], P[1] - rec.pivotPx[1]); });
    Object.keys(extra).forEach((n) => { poses[n] = extra[n](cv(EW, EH), P); });
    const geo = build(rec.frame, poses, P);
    Object.assign(rec, { size: geo.size, poses: geo.poses, originX: geo.originX, originY: geo.originY, pivotPx: geo.pivotPx });
  }
  const astro = RIGS.astronaut;
  if (astro) {
    const byId = Object.fromEntries(astro.parts.map((p) => [p.id, p]));
    const grow1 = byId.blade && decode(S[byId.blade.frame], byId.blade.poses.grow1);
    if (byId.blade && grow1) extendPart(byId.blade, {
      // sun spear: a thin shaft of light with a small leaf-wedge head (the blade's own shape, not a lance)
      spear: (c, P) => {
        const shaft = 44;
        for (let x = 0; x < shaft; x++) c.px(P[0] + x, P[1] - 1, AC.coralL).px(P[0] + x, P[1], x % 6 === 3 ? AC.coralL : AC.white).px(P[0] + x, P[1] + 1, AC.coral);
        c.comp(grow1, P[0] + shaft - 2 - byId.blade.pivotPx[0], P[1] - byId.blade.pivotPx[1]);
        c.px(P[0] + 8, P[1] - 3, AC.coralL).px(P[0] + 22, P[1] + 3, AC.coralL).px(P[0] + 34, P[1] - 3, AC.white);
        return c;
      },
    });
    if (byId['blade-arc']) extendPart(byId['blade-arc'], {
      // star hammer: a shaft of light with a block head of gathered stars
      hammer: (c, P) => {
        const len = 30, hx = P[0] + len, hy = P[1] - 12, r = rng(20);
        for (let x = 0; x < len; x++) c.px(P[0] + x, P[1] - 1, AC.coralL).px(P[0] + x, P[1], AC.white).px(P[0] + x, P[1] + 1, AC.coral);
        c.rect(hx, hy, 14, 24, AC.coralD).rect(hx + 1, hy + 1, 12, 22, AC.coral);
        for (let j = 2; j < 22; j += 4) for (let i = 2; i < 12; i += 4) plus(c, hx + i + Math.round(r()), hy + j + Math.round(r()), AC.coralL, AC.white);
        c.rect(hx + 5, hy + 10, 4, 4, AC.white);
        return c.outline(AC.ink);
      },
    });
  }

  // =====================================================================================
  // INK SILHOUETTES for every rig part (Q-92: the bright impact frame shows the figures in ink on paper)
  // =====================================================================================
  Object.values(RIGS).forEach((rig) => {
    if (!rig || !Array.isArray(rig.parts)) return;
    rig.parts.forEach((p) => {
      const key = p.frame + '-ink';
      if (!S[key] && S[p.frame]) S[key] = recolorSheet(S[p.frame], INK);
      p.ink = key;
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
