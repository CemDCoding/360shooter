/* Final sprites, part 6 (Ergaenzung H-39 "M10: Boss-Finisher"), delivery part 1.
 * Extends window.PX_SPRITES. Load order: sprites.js, sprites-world.js, sprites-desert.js, sprites-m8.js, sprites-m9.js, this file.
 * Same format: { frameWidth, frameHeight, palette, frames: [rows[]] }, '.' = transparent.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 * Pixels are painted into a colour canvas first and packed into palette rows at the end (sheet()).
 *
 * Boss order in every per-boss sheet: 0 root (Baummonster) 1 ghost (Waldgeist) 2 stone (Riesen-Stein)
 *                                     3 worm (Sand-Wurm) 4 dog (Waechter-Hund) 5 pharaoh (Pharao)
 *   finisher-portrait  160x20  x6   visor strip of the serious astronaut, frame = boss reflected in the visor; drawn x2 (320x40)
 *   finisher-hit        96x96  x6   close-up of the boss core at the final hit (crack, eye torn open); drawn x2
 *   finisher-shards      4x4  x18   shatter blocks, 3 per boss (index boss*3 + 0..2)
 *   finisher-finale-4  320x180 x11  Level 4, Baummonster, WURZELBRECHER; drawn x2 (640x360)
 *   finisher-finale-9  320x180 x11  Level 9, Waldgeist, MONDSCHNITT; drawn x2
 * Finale frame index: 0 establish  1 charge  2 aim  3 leap  4 boss roar  5 beam  6 impact light  7 impact dark
 *                     8 break 1  9 break 2  10 aftermath. Frames 6 and 7 are impact frames (skipped with reduceEffects).
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const C = {
    ink: '#0b0610', white: '#ffffff', cream: '#fff4e8', suitS: '#e0c9d6', suitN: '#ac90b0', suitD: '#5e4a6e', sil: '#1a1024',
    visor: '#2a1640', visorD: '#170b26', glint: '#ffa0ae', teal: '#5fe0c0', tealL: '#b8ffe9',
    coral: '#ff6b8a', coralD: '#bf3458', coralL: '#ffa0ae',
  };

  // ---------- helpers ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const on = (x, y, lv) => BAYER[(y & 3) * 4 + (x & 3)] < lv * 16;
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const p = hx(a), q = hx(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

  function cv(w, h) {
    const a = new Array(w * h).fill(null);
    const c = {
      w, h, a,
      px(x, y, col) { x = Math.round(x); y = Math.round(y); if (col && x >= 0 && y >= 0 && x < w && y < h) a[y * w + x] = col; return c; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? a[y * w + x] : null; },
      rect(x, y, rw, rh, col) {
        x = Math.round(x); y = Math.round(y);
        for (let j = Math.max(0, y); j < Math.min(h, y + rh); j++) for (let i = Math.max(0, x); i < Math.min(w, x + rw); i++) a[j * w + i] = col;
        return c;
      },
      fill(col) { a.fill(col); return c; },
      ell(cx, cy, rx, ry, col, lv) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1 && (lv == null || on(x, y, lv))) c.px(x, y, col);
        }
        return c;
      },
      // shaded ellipse, light from the top left: [highlight, base, shade]
      ells(cx, cy, rx, ry, cols, hiT = -0.75, loT = 0.55) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy > 1) continue;
          const l = dx + dy;
          c.px(x, y, l < hiT ? cols[0] : l > loT ? cols[2] : cols[1]);
        }
        return c;
      },
      line(x0, y0, x1, y1, col, t = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor((t - 1) / 2);
        for (let i = 0; i <= n; i++) c.rect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, t, t, col);
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
      dith(x, y, rw, rh, col, lv) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (on(i, j, lv)) c.px(i, j, col); return c; },
      outline(col) {
        const b = a.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (b[y * w + x]) continue;
          if ((x > 0 && b[y * w + x - 1]) || (x < w - 1 && b[y * w + x + 1]) || (y > 0 && b[(y - 1) * w + x]) || (y < h - 1 && b[(y + 1) * w + x])) a[y * w + x] = col;
        }
        return c;
      },
      // light edge: filled pixels whose neighbour in direction (dx,dy) is empty or outline
      rim(col, dx, dy, skip) {
        const b = a.slice();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const v = b[y * w + x];
          if (!v || v === C.ink || (skip && skip.includes(v))) continue;
          const nx = x + dx, ny = y + dy, n = nx >= 0 && ny >= 0 && nx < w && ny < h ? b[ny * w + nx] : null;
          if (!n || n === C.ink) a[y * w + x] = col;
        }
        return c;
      },
      comp(src, dx = 0, dy = 0) {
        for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.a[y * src.w + x]; if (v) c.px(x + dx, y + dy, v); }
        return c;
      },
      map(fn) { for (let i = 0; i < a.length; i++) if (a[i]) a[i] = fn(a[i], i % w, (i / w) | 0); return c; },
      sil(col, lv) { const d = cv(w, h); for (let i = 0; i < a.length; i++) if (a[i] && (lv == null || on(i % w, (i / w) | 0, lv))) d.a[i] = col; return d; },
      shear(k, py) {
        const d = cv(w, h);
        for (let y = 0; y < h; y++) { const s = Math.round((y - py) * k); for (let x = 0; x < w; x++) { const v = a[y * w + x]; if (v) d.px(x + s, y, v); } }
        return d;
      },
    };
    return c;
  }

  // stamp an existing sprite frame (optionally scaled, flipped, recoloured)
  function spr(c, key, f, x, y, o = {}) {
    const d = S[key], s = o.s || 1, rows = d.frames[f];
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.') continue;
        const col = o.fn ? o.fn(d.palette[ch]) : d.palette[ch];
        c.rect(x + (o.flip ? r.length - 1 - i : i) * s, y + j * s, s, s, col);
      }
    });
    return c;
  }

  // palette keys: ASCII first, then Latin-1/Latin Extended letters (single UTF-16 units), enough for shaded scenes
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
          if (ch === undefined) { ch = POOL[m.size]; if (!ch) throw new Error('sprites-m10: palette full'); m.set(v, ch); palette[ch] = v; }
          s += ch;
        }
        rows.push(s);
      }
      return rows;
    });
    return { frameWidth: fw, frameHeight: fh, palette, frames };
  }

  // jagged crack: glow (wide) under core (thin)
  function crack(c, x, y, dir, len, r, core, glow, t = 1) {
    const pts = [[x, y]];
    const branches = [];
    for (let i = 0; i < len; i++) {
      dir += (r() - 0.5) * 0.9;
      x += Math.cos(dir) * 2; y += Math.sin(dir) * 2;
      pts.push([x, y]);
      if (r() < 0.1 && len > 6) branches.push([x, y, dir + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.5), Math.round(len / 3)]);
    }
    for (let i = 1; i < pts.length; i++) c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], glow, t + 1);
    for (let i = 1; i < pts.length; i++) c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], core, t);
    branches.forEach(([bx, by, bd, bl]) => crack(c, bx, by, bd, bl, r, core, glow, 1));
    return c;
  }

  // crack that stays inside the already painted shape
  function crackIn(c, x, y, dir, len, r, core, glow, t) {
    const tmp = crack(cv(c.w, c.h), x, y, dir, len, r, core, glow, t);
    for (let i = 0; i < c.a.length; i++) if (tmp.a[i] && c.a[i]) c.a[i] = tmp.a[i];
    return c;
  }

  // ---------- serious astronaut, ~60 px tall, feet at (x,y), facing right ----------
  // pose: stand (gun low) | aim | leap | back ; tone: 0 lit, 1 shadowed, 2 silhouette ; rim: light edge colour, rimDir: -1 light from left, 1 from right
  function astro(o) {
    const c = cv(o.w || 320, o.h || 180), x = o.x, y = o.y, p = o.pose;
    let muzzle = null;
    const gun = (gx, gy) => {
      c.rect(gx, gy, 12, 8, C.cream).rect(gx, gy + 6, 12, 2, C.suitS).rect(gx + 3, gy - 1, 6, 1, C.teal).rect(gx + 2, gy + 2, 2, 2, C.teal);
      c.rect(gx + 2, gy + 8, 4, 5, C.coral).rect(gx + 5, gy + 8, 1, 5, C.coralD);
      c.rect(gx + 12, gy + 1, 9, 6, C.coral).rect(gx + 14, gy + 1, 1, 6, C.coralD).rect(gx + 17, gy + 1, 1, 6, C.coralD).rect(gx + 12, gy + 5, 9, 2, C.coralD);
      c.rect(gx + 21, gy + 2, 2, 4, C.tealL);
      muzzle = [gx + 23, gy + 4];
    };
    // legs and boots
    if (p === 'leap') {
      c.rect(x - 10, y - 13, 5, 8, C.cream).rect(x - 14, y - 7, 6, 4, C.coral);
      c.rect(x + 3, y - 15, 5, 7, C.suitS).rect(x + 6, y - 10, 6, 3, C.coralD);
    } else {
      c.rect(x - 7, y - 13, 5, 10, C.cream).rect(x + 2, y - 13, 5, 10, C.suitS);
      c.rect(x - 8, y - 4, 7, 4, C.coral).rect(x + 2, y - 4, 7, 4, C.coralD);
    }
    // backpack (behind, facing right) or big pack (back view)
    if (p === 'back') c.rect(x - 11, y - 30, 22, 16, C.suitN).rect(x - 9, y - 28, 18, 2, C.suitS).rect(x - 3, y - 24, 6, 3, C.coral);
    else c.rect(x - 13, y - 28, 4, 13, C.suitN);
    // torso
    c.rect(x - 9, y - 27, 18, 15, C.cream).rect(x + 4, y - 27, 5, 15, C.suitS).rect(x + 7, y - 27, 2, 15, C.suitN).rect(x - 9, y - 14, 18, 2, C.suitN);
    if (p === 'back') c.rect(x - 8, y - 28, 16, 14, C.suitN).rect(x - 6, y - 26, 12, 3, C.suitS).rect(x - 2, y - 21, 4, 3, C.coral);
    else c.rect(x - 5, y - 23, 5, 4, C.coral).rect(x + 2, y - 22, 2, 1, C.teal);
    // helmet
    c.ells(x, y - 41, 15, 13, [C.white, C.cream, C.suitS], -0.9, 0.7);
    c.rect(x - 16, y - 44, 3, 6, C.coral).rect(x + 14, y - 44, 3, 6, C.coralD);
    c.line(x, y - 54, x, y - 57, C.suitN).rect(x - 1, y - 60, 3, 3, C.coral);
    if (p !== 'back') {
      c.ells(x + 2, y - 40, 11, 8, [C.visor, C.visor, C.visorD], -2, 0.5);
      // narrow eyes: outer corner high, inner corner low (determined, not cute)
      c.rect(x - 5, y - 42, 2, 1, C.teal).rect(x - 5, y - 41, 4, 1, C.teal).rect(x - 4, y - 40, 4, 1, C.teal).px(x - 5, y - 41, C.tealL);
      c.rect(x + 7, y - 42, 2, 1, C.teal).rect(x + 5, y - 41, 4, 1, C.teal).rect(x + 4, y - 40, 4, 1, C.teal).px(x + 8, y - 41, C.tealL);
      c.line(x - 7, y - 45, x - 4, y - 47, C.glint).px(x - 8, y - 43, C.glint);
    } else {
      c.rect(x - 15, y - 41, 30, 2, C.suitS); // helmet seam
    }
    // arms and gun
    if (p === 'aim' || p === 'leap') {
      c.rect(x - 12, y - 25, 4, 9, C.suitS);
      c.rect(x + 6, y - 25, 14, 5, C.cream).rect(x + 6, y - 21, 14, 1, C.suitS);
      gun(x + 18, y - 28);
    } else if (p === 'stand') {
      c.rect(x - 12, y - 25, 4, 11, C.suitS);
      c.rect(x + 7, y - 25, 5, 9, C.cream).rect(x + 10, y - 25, 2, 9, C.suitS);
      gun(x + 8, y - 16);
    } else {
      c.rect(x - 13, y - 26, 4, 11, C.suitS).rect(x + 9, y - 26, 4, 11, C.suitN);
    }
    c.outline(C.ink);
    const keep = [C.teal, C.tealL];
    if (o.tone === 1) {
      const T = { [C.white]: C.suitS, [C.cream]: C.suitS, [C.suitS]: C.suitN, [C.suitN]: C.suitD, [C.coral]: C.coralD, [C.coralD]: '#7a1f3a', [C.glint]: C.coralD };
      c.map((v) => T[v] || v);
    } else if (o.tone === 2) {
      c.map((v) => (keep.includes(v) || v === C.ink ? v : C.sil));
    }
    if (o.rim) {
      c.rim(o.rim, o.rimDir || -1, 0, keep);
      if (o.tone === 2) c.rim(o.rim, 0, -1, keep).rim(o.rim, -(o.rimDir || -1), 0, keep); // silhouettes: light all around
    }
    return { c, muzzle };
  }

  // ---------- effects ----------
  function radial(c, fx, fy, n, col, r, r0 = 40, wMax = 2) {
    for (let i = 0; i < n; i++) {
      const a = ((i + r() * 0.7) / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), R = 420, w = 0.6 + r() * wMax;
      const r1 = r0 + r() * 30;
      c.poly([[fx + ca * r1, fy + sa * r1], [fx + ca * R - sa * w * 4, fy + sa * R + ca * w * 4], [fx + ca * R + sa * w * 4, fy + sa * R - ca * w * 4]], col);
    }
    return c;
  }
  function hlines(c, n, col, r, y0, y1) {
    for (let i = 0; i < n; i++) c.rect(Math.round(r() * c.w) - 40, Math.round(y0 + r() * (y1 - y0)), 30 + Math.round(r() * 120), r() < 0.2 ? 2 : 1, col);
    return c;
  }
  function glow(c, m, k) {
    c.ell(m[0], m[1], 11 * k, 11 * k, C.coralD, 0.5).ell(m[0], m[1], 7 * k, 7 * k, C.coral).ell(m[0], m[1], 3.5 * k, 3.5 * k, C.white);
    return c;
  }
  function sparks(c, m, r, n) {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = 10 + r() * 34, x = m[0] + Math.cos(a) * d, y = m[1] + Math.sin(a) * d;
      c.line(x, y, x - Math.cos(a) * 4, y - Math.sin(a) * 4, r() < 0.5 ? C.coral : C.coralL);
    }
    return c;
  }
  // beam from x0 to the right edge at height y, flare where it hits (hx)
  function beam(c, x0, y, hitX, t = 6) {
    c.dith(x0, y - t / 2 - 6, c.w - x0, t + 12, C.coralD, 0.5);
    c.rect(x0, y - t / 2 - 3, c.w - x0, t + 6, C.coral).rect(x0, y - t / 2, c.w - x0, t, C.white);
    c.ell(x0, y, 7, 10, C.coral).ell(x0, y, 4, 6, C.white);
    c.ell(hitX, y, 22, 28, C.coralD, 0.5).ell(hitX, y, 15, 20, C.coral).ell(hitX, y, 9, 13, C.white);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; c.line(hitX, y, hitX + Math.cos(a) * 34, y + Math.sin(a) * 30, C.white); }
    return c;
  }
  // break a layer into 4x4 blocks that fly away from (cx,cy); t 0..1
  function shatter(src, cx, cy, t, r, ember) {
    const d = cv(src.w, src.h);
    for (let by = 0; by < src.h; by += 4) for (let bx = 0; bx < src.w; bx += 4) {
      let any = false;
      for (let j = 0; j < 4 && !any; j++) for (let i = 0; i < 4; i++) if (src.get(bx + i, by + j)) { any = true; break; }
      if (!any) continue;
      const rr = r();
      if (rr < t * 0.35) continue;
      const dx = bx + 2 - cx, dy = by + 2 - cy, dist = Math.hypot(dx, dy) || 1;
      const k = t * (16 + dist * 0.55 + r() * 18);
      const ox = Math.round((dx / dist) * k), oy = Math.round((dy / dist) * k - t * r() * 10);
      const burn = r() < t * 0.55 ? ember[(r() * ember.length) | 0] : null;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = src.get(bx + i, by + j); if (v) d.px(bx + i + ox, by + j + oy, burn || v); }
    }
    return d;
  }
  // fray a layer into drifting strands and mist; t 0..1
  function fray(src, t, r, mistCol) {
    const d = cv(src.w, src.h);
    const shift = [];
    for (let y = 0; y < src.h; y++) shift.push(Math.round(t * (6 + r() * 26) * (y % 4 < 2 ? 1 : 0.6)));
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const v = src.a[y * src.w + x];
      if (!v || on(x, y, t * 0.85)) continue;
      d.px(x + shift[y], y - Math.round(t * 6), t > 0.5 && on(x + 1, y, 0.5) ? mistCol : mix(v, mistCol, t * 0.6));
    }
    return d;
  }

  // ---------- portrait strip 160x20 (visor close-up, boss reflected) ----------
  const BOSSES = [
    { key: 'boss-root-monster', size: 64, refl: '#7a5638' },
    { key: 'boss-forest-ghost', size: 48, refl: '#d6f0ff' },
    { key: 'boss-giant-stone', size: 64, refl: '#b4b4c8' },
    { key: 'boss-sand-worm', size: 64, refl: '#e8b47a' },
    { key: 'boss-guardian-dog', size: 64, refl: '#ffcf4a' },
    { key: 'boss-pharaoh', size: 64, refl: '#ffcf4a' },
  ];
  function portrait(b) {
    const c = cv(160, 20);
    c.fill(C.cream).rect(0, 0, 160, 1, C.white).rect(0, 17, 160, 1, C.suitS).rect(0, 18, 160, 2, C.suitN);
    // visor with rounded ends
    c.rect(8, 3, 144, 14, C.visor).ell(8, 10, 6, 7, C.visor).ell(151, 10, 6, 7, C.visor);
    c.dith(2, 13, 156, 1, C.visorD, 0.5).rect(2, 14, 156, 3, C.visorD).map((v, x, y) => (v === C.visorD && (x < 3 || x > 156) ? C.visor : v));
    // reflection of the boss (downsampled silhouette) in the right part of the visor
    const d = S[b.key], fr = d.frames[0], bw = 20, bh = 11, sx = b.size / bw, sy = b.size / bh;
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      let hit = 0;
      for (let v = 0; v < sy; v++) for (let u = 0; u < sx; u++) { const ch = (fr[Math.floor(j * sy + v)] || '')[Math.floor(i * sx + u)]; if (ch && ch !== '.') hit++; }
      if (hit > (sx * sy) / 3) c.px(126 + i, 4 + j, mix(b.refl, C.visor, 0.5));
    }
    // streak and glints
    c.dith(14, 4, 104, 1, '#4a2a66', 0.5).line(13, 5, 9, 13, C.glint).line(18, 5, 16, 9, C.glint).px(122, 4, C.glint).px(148, 5, C.glint);
    // eyes: narrow, outer corner high, inner corner low
    const eye = (rows, hiX) => { rows.forEach(([y, x0, x1]) => c.rect(x0, y, x1 - x0 + 1, 1, C.teal)); c.rect(hiX, rows[0][0], 3, 1, C.tealL); };
    eye([[7, 44, 51], [8, 44, 59], [9, 46, 63], [10, 51, 63], [11, 56, 62]], 45);
    eye([[7, 108, 115], [8, 100, 115], [9, 96, 113], [10, 96, 108], [11, 97, 103]], 112);
    c.rect(56, 8, 2, 2, C.visorD).rect(102, 8, 2, 2, C.visorD); // pupils
    return c;
  }
  S['finisher-portrait'] = sheet(BOSSES.map(portrait));

  // ---------- hit images 96x96 ----------
  function hitRoot() {
    const c = cv(96, 96), r = rng(11);
    c.rect(8, 14, 80, 82, '#7a5638');
    [12, 19, 31, 58, 72, 80, 85].forEach((x) => c.line(x, 16, x + (x % 3) - 1, 95, '#5a3c26', 2));
    [10, 24, 66].forEach((x) => c.line(x, 18, x, 95, '#9a7350'));
    c.ell(20, 14, 18, 12, '#3a6b2c').ell(50, 9, 24, 11, '#4f8a3c').ell(78, 15, 18, 12, '#3a6b2c').ell(46, 6, 12, 5, '#7cc455', 0.5);
    for (let i = 0; i < 26; i++) c.px(6 + r() * 84, 2 + r() * 20, r() < 0.5 ? '#7cc455' : '#3a6b2c');
    // brows thrown up
    c.line(16, 30, 38, 34, '#2a1a12', 3).line(54, 24, 80, 22, '#2a1a12', 3);
    // left eye glowing, right eye torn open
    c.ell(28, 43, 11, 7, '#2a1a12').ell(28, 43, 5, 4, '#ff4a3a').px(26, 41, '#ffd0b0');
    c.ell(67, 40, 14, 13, '#2a1a12').ell(67, 40, 10, 9, '#e8dcc0').ell(68, 41, 2.5, 2.5, '#ff4a3a').px(67, 40, '#ffd0b0');
    // roaring mouth with teeth
    c.ell(48, 73, 25, 13, '#2a1a12');
    for (let x = 27; x < 66; x += 7) c.poly([[x, 61], [x + 6, 61], [x + 3, 69]], '#e8dcc0');
    for (let x = 30; x < 66; x += 7) c.poly([[x, 86], [x + 6, 86], [x + 3, 79]], '#e8dcc0');
    crackIn(c, 56, 14, Math.PI / 2 + 0.25, 44, rng(5), C.white, C.coralD, 2);
    return c.outline(C.ink);
  }
  function hitGhost() {
    const c = cv(96, 96);
    c.line(30, 24, 18, 4, '#a08a6a', 3).line(22, 12, 10, 9, '#a08a6a', 2).line(66, 24, 78, 4, '#a08a6a', 3).line(74, 12, 86, 9, '#a08a6a', 2);
    c.line(19, 6, 16, 2, '#d8c8a8').line(77, 6, 80, 2, '#d8c8a8');
    c.ells(48, 52, 38, 42, [C.white, '#d6f0ff', '#9ab8e8'], -0.7, 0.6);
    // frayed hem
    for (let x = 0; x < 96; x++) {
      const hem = Math.round(84 + Math.sin(x / 3.2) * 4 + Math.sin(x / 1.3) * 1.5);
      for (let y = hem; y < 96; y++) if (c.get(x, y)) c.a[y * 96 + x] = on(x, y, (y - hem) / 12 + 0.2) ? null : '#9ab8e8';
    }
    // eye holes: left squeezed, right torn wide
    c.ell(32, 46, 9, 12, '#1a1230').rect(31, 47, 2, 2, '#ff4ad8');
    c.ell(64, 44, 12, 17, '#1a1230').px(64, 46, '#ff4ad8').px(65, 45, '#ffd0f5');
    c.ell(48, 75, 6, 9, '#1a1230');
    crackIn(c, 60, 12, Math.PI / 2 - 0.35, 40, rng(9), '#1a1230', C.coralD, 2);
    return c.outline(C.ink);
  }
  function hitStone() {
    const c = cv(96, 96);
    [[20, 34, 12, 22], [32, 26, 22, 24], [48, 22, 26, 26], [64, 28, 16, 22], [74, 36, 10, 16]].forEach(([x, y, hgt, wd]) => {
      c.poly([[x - wd / 4, y + 10], [x, y - hgt], [x + wd / 4, y + 10]], '#9ff5ec').poly([[x, y - hgt], [x + wd / 4, y + 10], [x, y + 10]], '#4fb8b0');
    });
    c.ells(48, 58, 44, 36, ['#b4b4c8', '#8a8aa0', '#5e5e78'], -0.8, 0.5);
    c.ell(48, 58, 44, 36, '#3e3e56', 0.25).ells(44, 54, 38, 30, ['#b4b4c8', '#8a8aa0', '#5e5e78'], -0.8, 0.6);
    c.ell(22, 74, 7, 4, '#6a4fb0').ell(70, 34, 6, 3, '#8a6bd0').ell(78, 70, 5, 3, '#6a4fb0');
    c.rect(22, 52, 16, 4, '#3e3e56').rect(26, 53, 8, 2, '#ff4ad8');
    c.ell(66, 52, 10, 9, '#3e3e56').ell(66, 52, 6, 6, '#ff4ad8').px(65, 50, '#ffd0f5');
    [[34, 76], [40, 72], [46, 77], [52, 72], [58, 77], [64, 73]].reduce((p, q) => (c.line(p[0], p[1], q[0], q[1], '#3e3e56', 2), q));
    crackIn(c, 50, 24, Math.PI / 2 - 0.1, 36, rng(3), C.white, C.coralD, 2);
    return c.outline(C.ink);
  }
  function hitWorm() {
    const c = cv(96, 96);
    for (let a = -2.5; a <= -0.65; a += 0.22) c.line(48 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, 48 + Math.cos(a) * 50, 50 + Math.sin(a) * 50, '#8a5a32', 3);
    c.ells(48, 50, 43, 43, ['#f0c888', '#c88e58', '#8a5a32'], -0.8, 0.6);
    [40, 35].forEach((rr) => { for (let k = 0; k < 120; k++) { const a = (k / 120) * Math.PI * 2; if (Math.sin(a) > -0.2) c.px(48 + Math.cos(a) * rr, 50 + Math.sin(a) * rr, '#a87438'); } });
    c.ell(48, 52, 29, 28, '#5a1a2a').ell(48, 54, 18, 17, '#2a0a14');
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, d = 0.13; c.poly([[48 + Math.cos(a - d) * 29, 52 + Math.sin(a - d) * 28], [48 + Math.cos(a + d) * 29, 52 + Math.sin(a + d) * 28], [48 + Math.cos(a) * 20, 52 + Math.sin(a) * 19]], '#fff4e0'); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.26, d = 0.16; c.poly([[48 + Math.cos(a - d) * 18, 54 + Math.sin(a - d) * 17], [48 + Math.cos(a + d) * 18, 54 + Math.sin(a + d) * 17], [48 + Math.cos(a) * 12, 54 + Math.sin(a) * 11]], '#e8b47a'); }
    c.ell(14, 30, 4, 4, '#ffb02a').px(13, 29, '#fff0a0');
    c.ell(82, 28, 6, 6, '#ffb02a').ell(82, 28, 2, 2, '#2a0a14').px(80, 26, '#fff0a0');
    crackIn(c, 70, 12, Math.PI / 2 + 0.5, 22, rng(4), C.white, C.coralD, 2);
    return c.outline(C.ink);
  }
  function hitDog() {
    const c = cv(96, 96);
    c.poly([[20, 0], [42, 36], [14, 42]], '#2e2e4c').poly([[22, 10], [36, 34], [20, 37]], '#1a1a30');
    c.poly([[76, 0], [54, 36], [82, 42]], '#2e2e4c').poly([[74, 10], [60, 34], [76, 37]], '#1a1a30');
    c.line(16, 26, 30, 22, '#ffcf4a', 2).line(80, 26, 66, 22, '#ffcf4a', 2);
    c.ells(48, 50, 27, 24, ['#4e4e78', '#2e2e4c', '#1a1a30'], -0.8, 0.6);
    c.poly([[34, 60], [62, 60], [56, 94], [40, 94]], '#2e2e4c').poly([[50, 60], [62, 60], [56, 94], [50, 94]], '#1a1a30');
    c.rect(43, 89, 10, 5, '#0c0c18');
    c.poly([[48, 30], [53, 37], [48, 44], [43, 37]], '#ffcf4a').px(48, 34, '#fff0a0');
    c.rect(22, 30, 8, 2, '#c7922a').rect(66, 30, 8, 2, '#c7922a');
    // left eye narrow, right eye torn open with gold kohl
    c.poly([[28, 47], [42, 49], [40, 52], [29, 50]], '#5ff5ec').line(26, 46, 42, 48, '#ffcf4a');
    c.ell(62, 49, 8, 7, '#e8e4d0').ell(63, 49, 2, 2, '#2fb8c0').line(54, 41, 72, 43, '#ffcf4a').line(70, 52, 76, 55, '#ffcf4a');
    for (let y = 66; y < 88; y += 5) c.px(37, y, '#e8e4d0').px(59, y, '#e8e4d0');
    crackIn(c, 56, 30, Math.PI / 2 + 0.25, 30, rng(8), C.white, C.coralD, 2);
    return c.outline(C.ink);
  }
  function hitPharaoh() {
    const c = cv(96, 96);
    c.poly([[18, 22], [78, 22], [94, 94], [2, 94]], '#ffcf4a');
    c.ell(48, 24, 34, 18, '#ffcf4a');
    c.map((v, x, y) => (v === '#ffcf4a' && y > 8 && (y - 8) % 7 < 3 ? '#3a5ad8' : v));
    c.ells(48, 52, 19, 25, ['#ffe2a0', '#ffcf4a', '#c7922a'], -0.7, 0.6);
    c.rect(29, 30, 38, 4, '#ffcf4a').rect(29, 33, 38, 1, '#c7922a');
    c.line(48, 2, 48, 20, '#3ac8b8', 3).ell(48, 4, 4, 4, '#3ac8b8').px(47, 3, '#c8464e').px(49, 3, '#c8464e');
    c.rect(34, 45, 10, 3, '#1a1020').px(38, 46, '#5ff5ec').line(34, 47, 29, 50, '#1a1020');
    c.ell(58, 46, 7, 6, '#ece6d4').ell(58, 46, 1.5, 1.5, '#1a1020').line(50, 39, 66, 39, '#1a1020', 2).line(65, 48, 70, 51, '#1a1020');
    c.line(48, 50, 48, 58, '#c7922a').ell(48, 66, 4, 3, '#1a1020');
    c.rect(44, 76, 8, 16, '#3a5ad8').map((v, x, y) => (v === '#3a5ad8' && x >= 44 && x < 52 && y >= 76 && (y - 76) % 4 === 0 ? '#ffcf4a' : v));
    crackIn(c, 44, 28, Math.PI / 2 + 0.3, 34, rng(6), C.white, C.coralD, 2);
    return c.outline(C.ink);
  }
  S['finisher-hit'] = sheet([hitRoot(), hitGhost(), hitStone(), hitWorm(), hitDog(), hitPharaoh()]);

  // ---------- shards 4x4, 3 per boss ----------
  const SHARD = [['#7a5638', '#4f8a3c', '#9a7350'], ['#d6f0ff', '#9ab8e8', '#6a86c8'], ['#8a8aa0', '#9ff5ec', '#5e5e78'],
    ['#c88e58', '#e8b47a', '#8a5a32'], ['#2e2e4c', '#ffcf4a', '#4e4e78'], ['#ffcf4a', '#3a5ad8', '#ece6d4']];
  S['finisher-shards'] = sheet(SHARD.flat().map((col) => {
    const c = cv(4, 4).fill(col);
    c.rect(3, 0, 1, 4, mix(col, C.ink, 0.35)).rect(0, 3, 4, 1, mix(col, C.ink, 0.35)).px(0, 0, mix(col, C.white, 0.4));
    return c;
  }));

  // ---------- backgrounds 320x180 (m: 0 normal, 1 darker, 2 dim, 3 calm after) ----------
  function bgForest(c, r, m) {
    const k = [0, 0.3, 0.45, 0][m], T = (col) => mix(col, C.ink, k);
    c.fill(T('#183d1c')).dith(0, 0, 320, 36, T('#1f4a22'), 0.25).dith(0, 36, 320, 8, T('#1f4a22'), 0.125);
    if (m === 3 || m === 0) for (let i = 0; i < 3; i++) { const x = 90 + i * 70; c.poly([[x, 0], [x + 18, 0], [x + 70, 150], [x + 40, 150]], m === 3 ? '#2c5e2a' : '#244e24', 0.25); }
    for (let i = 0; i < 10; i++) { const x = i * 34 + r() * 12; c.rect(x, 50, 5, 100, T('#0f2612')).ell(x + 2, 52, 15, 13, T('#0f2612')); }
    c.rect(0, 140, 320, 40, T('#0b1c0c')).dith(0, 140, 320, 4, T('#16331a'), 0.5);
    for (let i = 0; i < 40; i++) { const x = r() * 320, y = 142 + r() * 34; c.line(x, y, x + 1, y - 3, T('#1f4a22')); }
    c.rect(0, 0, 18, 180, T('#07120a')).ell(10, 20, 26, 22, T('#07120a')).rect(302, 0, 18, 180, T('#07120a')).ell(312, 24, 26, 24, T('#07120a'));
    return c;
  }
  function bgNight(c, r, m) {
    const k = [0, 0.3, 0.45, 0][m], T = (col) => mix(col, C.ink, k);
    c.fill(T('#140c2e')).dith(0, 0, 320, 60, T('#1c1240'), 0.5);
    for (let i = 0; i < 46; i++) { const x = r() * 320, y = r() * 110; if (Math.hypot(x - 250, y - 46) > 32) c.px(x, y, r() < 0.3 ? '#ffffff' : T('#b8b0e8')); }
    c.ell(250, 46, 31, 31, T('#3a2c70'), 0.25).ell(250, 46, 21, 21, '#e8e4ff').ell(256, 40, 5, 4, '#c8c0ee').ell(242, 54, 6, 4, '#c8c0ee').ell(258, 56, 3, 3, '#c8c0ee');
    for (let i = 0; i < 9; i++) { const x = i * 38 + r() * 14; c.rect(x, 64, 4, 90, T('#0b0620')).poly([[x - 14, 96], [x + 2, 50], [x + 18, 96]], T('#0b0620')); }
    c.dith(0, 118, 320, 24, '#3a3270', 0.25).dith(0, 128, 320, 8, '#3a3270', 0.5);
    c.rect(0, 142, 320, 38, T('#08051a')).dith(0, 142, 320, 4, T('#1a1440'), 0.5);
    c.rect(0, 0, 16, 180, T('#05030f')).rect(304, 0, 16, 180, T('#05030f'));
    return c;
  }

  // ---------- finale builder ----------
  function finale(B) {
    const r = rng(B.seed), W = 320, H = 180, s2 = B.size * 2;
    const boss = (f, tone, x = B.bx, y = B.by) => { const c = cv(W, H); spr(c, B.key, f, x, y, { s: 2, flip: B.flip, fn: tone ? (col) => mix(col, C.ink, tone) : null }); return c; };
    const cx = B.bx + B.size, cy = B.by + B.size; // boss centre in the frame
    const F = [];
    let c;

    // 0 establish: the astronaut faces the boss
    c = cv(W, H); B.bg(c, r, 0);
    c.comp(boss(0, 0.15));
    c.comp(astro({ x: 62, y: 150, pose: 'stand', tone: 1, rim: B.rim }).c);
    B.drift(c, r, 0);
    F.push(c);

    // 1 charge: the gun pulls in coral light
    c = cv(W, H).fill(B.dark);
    const a1 = astro({ x: 150, y: 152, pose: 'stand', tone: 1, rim: C.coral, rimDir: 1 });
    radial(c, a1.muzzle[0], a1.muzzle[1], 26, B.darkLine, r, 30);
    c.comp(a1.c); glow(c, a1.muzzle, 1); sparks(c, a1.muzzle, r, 30);
    F.push(c);

    // 2 aim: fully charged, wind, the boss looms on the right
    c = cv(W, H); B.bg(c, r, 1);
    c.comp(boss(1, 0.45), 70, 0);
    hlines(c, 16, B.wind, r, 30, 160);
    const a2 = astro({ x: 84, y: 150, pose: 'aim', tone: 1, rim: C.coral, rimDir: 1 });
    c.comp(a2.c); glow(c, a2.muzzle, 1.3); sparks(c, a2.muzzle, r, 16);
    F.push(c);

    // 3 leap: flat boss colour, speed lines, after-images
    c = cv(W, H).fill(B.flat);
    hlines(c, 30, B.flatLine, r, 10, 170); hlines(c, 24, C.cream, r, 20, 160);
    const l3 = astro({ x: 150, y: 128, pose: 'leap', tone: 0, rim: C.coral }).c.shear(-0.35, 128);
    c.comp(l3.sil(B.flatLine, 0.5), -30, 0).comp(l3.sil(C.coralD), -14, 0).comp(l3);
    F.push(c);

    // 4 boss roar
    c = cv(W, H).fill(B.dark);
    const rx = 160 - B.size, ry = 90 - B.size;
    radial(c, rx + B.mouth[0] * 2, ry + B.mouth[1] * 2, 30, B.darkLine, r, 34);
    B.roar(c, r, rx, ry);
    c.comp(boss(2, 0, rx, ry));
    F.push(c);

    // 5 beam: fired in mid-air, straight through the boss
    c = cv(W, H); B.bg(c, r, 2);
    const bossL = boss(3, 0.1);
    c.comp(bossL);
    const a5 = astro({ x: 58, y: cy + 24, pose: 'leap', tone: 0, rim: C.coral, rimDir: 1 });
    const astroL = a5.c.shear(-0.2, cy + 24);
    const beamL = beam(cv(W, H), a5.muzzle[0] + Math.round((a5.muzzle[1] - (cy + 24)) * -0.2) + 1, cy, cx);
    c.comp(beamL).comp(astroL);
    F.push(c);

    // 6 impact frame, light: ink silhouettes on paper
    c = cv(W, H).fill(C.white);
    radial(c, cx, cy, 30, C.ink, r, 46, 2.5);
    c.comp(bossL.sil(C.ink)).comp(beamL.sil(C.ink)).comp(astroL.sil(C.ink));
    c.ell(cx, cy, 10, 14, C.white);
    F.push(c);

    // 7 impact frame, dark: paper silhouettes on ink, cracks in ink
    c = cv(W, H).fill(C.ink);
    radial(c, cx, cy, 14, C.white, r, 60, 1);
    c.comp(bossL.sil(C.white));
    for (let i = 0; i < 6; i++) crack(c, cx, cy, (i / 6) * Math.PI * 2 + 0.4, 12 + i * 2, r, C.ink, C.ink);
    c.comp(astroL.sil(C.white));
    F.push(c);

    // 8 + 9 break, 10 aftermath (boss specific)
    B.breakFrames(F, { r, boss, bossL, cx, cy, W, H });
    c = cv(W, H); B.bg(c, r, 3); B.after(c, r, cx, cy);
    c.ell(B.backX, 116, 44, 52, B.backGlow, 0.25).ell(B.backX, 116, 28, 36, B.backGlow, 0.5);
    c.comp(astro({ x: B.backX, y: 152, pose: 'back', tone: 2, rim: B.backRim, rimDir: 1 }).c);
    F.push(c);
    return F;
  }

  function forestDrift(c, r, n = 24) {
    for (let i = 0; i < n; i++) { const x = r() * 320, y = 20 + r() * 140; c.rect(x, y, 2, 1, r() < 0.5 ? '#4f8a3c' : '#7cc455').px(x + 1, y + 1, '#3a6b2c'); }
  }

  const ROOT = {
    key: 'boss-root-monster', size: 64, bx: 176, by: 22, seed: 404,
    bg: bgForest, dark: '#081308', darkLine: '#1f4a22', flat: '#1d4a17', flatLine: '#2f6a28', wind: '#3a6b2c', rim: '#9fd08a',
    mouth: [32, 42], backX: 120, backRim: '#e8f5c8', backGlow: '#4f8a3c',
    drift: (c, r) => forestDrift(c, r),
    roar(c, r, x, y) { // roots lash towards the camera
      [[20, 52, -60, 200], [28, 56, 40, 220], [44, 52, 260, 210], [36, 56, 180, 230]].forEach(([sx, sy, ex, ey]) => c.line(x + sx * 2, y + sy * 2, ex, ey, '#5a3c26', 7).line(x + sx * 2, y + sy * 2, ex, ey, '#7a5638', 3));
      c.ell(x + 48, y + 64, 14, 10, '#ff4a3a', 0.25).ell(x + 80, y + 64, 14, 10, '#ff4a3a', 0.25);
    },
    breakFrames(F, k) {
      const { r, bossL, cx, cy, W, H } = k;
      // 8: cracks of light through the bark
      let c = cv(W, H); bgForest(c, r, 2);
      const b8 = cv(W, H).comp(bossL).map((v) => mix(v, C.ink, 0.35));
      for (let i = 0; i < 7; i++) crack(b8, cx, cy, (i / 7) * Math.PI * 2 + 0.2, 10 + ((i * 5) % 9), r, C.white, C.coral, 1);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.1; c.poly([[cx, cy], [cx + Math.cos(a - 0.05) * 200, cy + Math.sin(a - 0.05) * 200], [cx + Math.cos(a + 0.05) * 200, cy + Math.sin(a + 0.05) * 200]], '#3a6b2c', 0.25); }
      c.comp(b8).ell(cx, cy, 6, 8, C.white);
      c.comp(astro({ x: 54, y: 152, pose: 'stand', tone: 2, rim: C.coral, rimDir: 1 }).c);
      F.push(c);
      // 9: the boss bursts into splinters, leaves and ember
      c = cv(W, H); bgForest(c, r, 1);
      c.ell(cx, cy, 40, 40, '#2c5e2a', 0.25).ell(cx, cy, 16, 18, C.coral, 0.5).ell(cx, cy, 8, 10, C.white);
      c.comp(shatter(b8, cx, cy, 0.7, r, [C.coral, C.coralL, '#ffd0b0']));
      forestDrift(c, r, 40);
      c.comp(astro({ x: 54, y: 152, pose: 'stand', tone: 2, rim: C.coral, rimDir: 1 }).c);
      F.push(c);
    },
    after(c, r, cx) { // where the boss stood: a split stump, smoke, falling leaves
      const st = cv(320, 180);
      st.rect(cx - 26, 120, 52, 24, '#7a5638').rect(cx + 10, 120, 16, 24, '#5a3c26').rect(cx - 26, 120, 4, 24, '#9a7350');
      st.poly([[cx - 26, 121], [cx - 16, 104], [cx - 6, 121]], '#7a5638').poly([[cx - 4, 121], [cx + 6, 96], [cx + 14, 121]], '#9a7350').poly([[cx + 12, 121], [cx + 20, 108], [cx + 26, 121]], '#5a3c26');
      st.line(cx - 30, 144, cx - 44, 150, '#5a3c26', 3).line(cx + 30, 144, cx + 46, 150, '#5a3c26', 3).line(cx + 1, 104, cx - 2, 143, '#2a1a12');
      for (let i = 0; i < 6; i++) st.px(cx - 18 + i * 7, 119, C.coral);
      c.comp(st.outline(C.ink));
      for (let i = 0; i < 4; i++) c.ell(cx - 8 + i * 6, 104 - i * 14, 10, 8, '#3a5a3a', 0.25);
      forestDrift(c, r, 30);
    },
  };

  const GHOST = {
    key: 'boss-forest-ghost', size: 48, bx: 196, by: 38, seed: 909,
    bg: bgNight, dark: '#07051a', darkLine: '#2a1c5a', flat: '#2a1458', flatLine: '#3c2478', wind: '#3a3270', rim: '#b8b0e8',
    mouth: [24, 30], backX: 150, backRim: '#ffffff', backGlow: '#4a4290',
    drift(c, r) { for (let i = 0; i < 18; i++) c.px(r() * 320, 60 + r() * 90, '#b8b0e8'); },
    roar(c, r, x, y) { // the mask screams: magenta in the eye holes, a ring of mist
      c.ell(x + 48, y + 48, 70, 60, '#3a3270', 0.25).ell(x + 48, y + 48, 54, 46, '#2a1c5a', 0.5);
      c.ell(x + 34, y + 40, 10, 8, '#ff4ad8', 0.25).ell(x + 62, y + 40, 10, 8, '#ff4ad8', 0.25);
    },
    breakFrames(F, k) {
      const { r, bossL, cx, cy, W, H } = k;
      const mist = '#b8b0e8';
      // 8: the ghost frays from the hit outward
      let c = cv(W, H); bgNight(c, r, 2);
      const b8 = cv(W, H).comp(bossL);
      for (let i = 0; i < 5; i++) crack(b8, cx, cy, (i / 5) * Math.PI * 2 + 0.6, 9, r, '#1a1230', C.coral, 1);
      c.comp(fray(b8, 0.3, r, mist));
      c.comp(astro({ x: 54, y: 152, pose: 'stand', tone: 2, rim: '#e8e4ff', rimDir: 1 }).c);
      F.push(c);
      // 9: only mist strands remain, drawn up into the moonlight
      c = cv(W, H); bgNight(c, r, 1);
      c.ell(250, 46, 31, 31, '#3a2c70', 0.5);
      const f9 = fray(b8, 0.72, r, mist);
      c.comp(f9.sil('#3a3270', 0.5), 0, -8).comp(f9);
      for (let i = 0; i < 30; i++) { const t = r(); c.px(cx + (250 - cx) * t + (r() - 0.5) * 30, cy + (46 - cy) * t + (r() - 0.5) * 30, r() < 0.4 ? C.white : mist); }
      c.comp(astro({ x: 54, y: 152, pose: 'stand', tone: 2, rim: '#e8e4ff', rimDir: 1 }).c);
      F.push(c);
    },
    after(c, r) { // calm moonlight, two antlers left in the grass
      c.dith(0, 120, 320, 22, '#4a4290', 0.25);
      c.line(214, 146, 206, 136, '#a08a6a', 2).line(209, 140, 203, 140, '#a08a6a').line(232, 147, 240, 138, '#a08a6a', 2).line(237, 141, 243, 141, '#a08a6a');
      for (let i = 0; i < 20; i++) c.px(r() * 320, 70 + r() * 70, '#b8b0e8');
    },
  };

  S['finisher-finale-4'] = sheet(finale(ROOT));
  S['finisher-finale-9'] = sheet(finale(GHOST));

  // shared with sprites-m10b.js (delivery part 2); each file runs in its own build time slot
  root.PX_FINISHER = { C, rng, on, mix, cv, spr, sheet, crack, crackIn, astro, radial, hlines, glow, sparks, beam, shatter, fray, finale };
})(typeof window !== 'undefined' ? window : globalThis);
