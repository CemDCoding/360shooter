/* Final sprites, part 10 (Ergaenzung H-46 "M13 Teil 1: Figurenteile, Laserklinge, Rosenschnitt, Storyboard Level 4").
 * Extends window.PX_SPRITES and adds window.PX_RIGS (rig data for src/config/rigs/*.ts, AP-183).
 * Load order: ... sprites-m10.js, sprites-m10b.js, sprites-m10c.js, sprites-m11.js, this file (needs nothing from them).
 * Same format: { frameWidth, frameHeight, palette, frames: [rows[]] }, '.' = transparent.
 * Pure code, no DOM, no network: safe in an empty vm context (scripts/build-sprites.mjs).
 *
 * Every rig part is one sheet:  rig-<rig>-<part>      frames = drawn poses (index = PX_RIGS[..].parts[i].poses[name])
 *                         plus  rig-<rig>-<part>-sil  same frames, all pixels white (#ffffff): hit-white silhouette (RS-06.3)
 * Rigs (facing right = astronaut; the boss faces left towards her, Q: astronaut left, boss right):
 *   astronaut   10 parts, serious ~60 px version of H-39, shown x2 (moment and cinematic)
 *   rootMonster  8 parts, 64 px like in game, shown x3 in the moment and x4 in the cinematic
 * Effects (pre-coloured, never tinted):
 *   rig-fx-root          8x8  x8   0 rose 1 bud 2 petal 3 leaf light 4 leaf dark 5 wood splinter 6 spark coral 7 spark white
 *   rig-prop-rosehedge  80x28 x3   0 sprouts 1 leaves and buds 2 full bloom (end of Rosenschnitt and cinematic 4)
 *   rig-fx-ground-bulge 48x16 x3   0 crack 1 mound 2 mound with root tips (boss anticipation, under the astronaut)
 * Pivots: originX/originY = pivot / frame size (0..1). x/y = offset of the pivot in px (unscaled) to the parent pivot,
 * or for root parts to the figure origin (astronaut: between the boots on the ground; boss: bottom centre of the 64 px box).
 */
(function (root) {
  const S = root.PX_SPRITES || (root.PX_SPRITES = {});
  const RIGS = root.PX_RIGS || (root.PX_RIGS = {});
  const C = {
    ink: '#0b0610', white: '#ffffff', cream: '#fff4e8', suitS: '#e0c9d6', suitN: '#ac90b0', suitD: '#5e4a6e',
    visor: '#2a1640', visorD: '#170b26', glint: '#ffa0ae', teal: '#5fe0c0', tealL: '#b8ffe9',
    coral: '#ff6b8a', coralD: '#bf3458', coralL: '#ffa0ae',
  };
  // boss palette = boss-root-monster in sprites-world.js
  const W = { o: '#070a14', t: '#7a5638', T: '#5a3c26', b: '#9a7350', d: '#2a1a12', w: '#e8dcc0', f: '#4f8a3c', F: '#3a6b2c', L: '#7cc455', r: '#ff4a3a', y: '#ffd0b0' };
  // roses: old rose to wine red, clearly apart from the astronaut's coral (decision 6a)
  const RO = { d: '#5e1230', b: '#9c2a52', m: '#c4466e', l: '#ecc2d2' };
  const G = { hi: '#3a6e3f', mid: '#2f5d34', lo: '#26502b' }; // biome.forest-ground*
  const WHITE = '#ffffff';

  // ---------- helpers (pure) ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const on = (x, y, lv) => BAYER[(y & 3) * 4 + (x & 3)] < lv * 16;
  const r3 = (v) => Math.round(v * 1000) / 1000;

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
      // 4-neighbour outline; skip(x, y) may veto single outline pixels (cut edges of split parts)
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
  // shear rows above py sideways (k > 0: top goes left)
  function shear(src, k, py) {
    const d = cv(src.w, src.h);
    for (let y = 0; y < src.h; y++) { const s = Math.round((y - py) * k); for (let x = 0; x < src.w; x++) { const v = src.a[y * src.w + x]; if (v) d.px(x + s, y, v); } }
    return d;
  }
  // nearest-neighbour scale around (cx, cy), pixel-edge coordinates
  function scale(src, sx, sy, cx, cy) {
    const d = cv(src.w, src.h);
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) d.a[y * d.w + x] = src.get(Math.floor((x + 0.5 - cx) / sx + cx), Math.floor((y + 0.5 - cy) / sy + cy));
    return d;
  }
  // rotation around (cx, cy) with 3x3 supersampling and majority vote: keeps 1-px lines readable at 45 deg.
  // This is the drawn pose source; the game itself only fine-rotates by up to +-20 deg (RS-06.4).
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
  const rotPt = (x, y, deg) => { const r = (deg * Math.PI) / 180; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; };

  // palette keys: ASCII first, then Latin-1 letters (single UTF-16 units)
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
          if (ch === undefined) { ch = POOL[m.size]; if (!ch) throw new Error('sprites-m13: palette full'); m.set(v, ch); palette[ch] = v; }
          s += ch;
        }
        rows.push(s);
      }
      return rows;
    });
    return { frameWidth: fw, frameHeight: fh, palette, frames };
  }
  function crop(c, x0, y0, w, h) {
    const d = cv(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) d.a[j * w + i] = c.get(x0 + i, y0 + j);
    return d;
  }

  // Build one rig part: crop all pose canvases to their common box, write sheet + silhouette sheet,
  // return the part record. pivot = [x, y] in canvas pixel-edge coordinates; ref = parent pivot or figure origin.
  function part(rig, id, poses, pivot, ref, o = {}) {
    const names = Object.keys(poses), list = names.map((k) => poses[k]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach((c) => { for (let i = 0; i < c.a.length; i++) if (c.a[i]) { const x = i % c.w, y = (i / c.w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
    // keep the pivot inside the frame
    x0 = Math.min(x0, Math.floor(pivot[0]) - 1); y0 = Math.min(y0, Math.floor(pivot[1]) - 1);
    x1 = Math.max(x1, Math.ceil(pivot[0])); y1 = Math.max(y1, Math.ceil(pivot[1]));
    const w = x1 - x0 + 1, h = y1 - y0 + 1, key = 'rig-' + rig + '-' + id;
    const cropped = list.map((c) => crop(c, x0, y0, w, h));
    S[key] = sheet(cropped);
    S[key + '-sil'] = sheet(cropped.map((c) => c.sil(WHITE)));
    const rec = {
      id, frame: key, silhouette: key + '-sil', size: [w, h],
      poses: Object.fromEntries(names.map((n, i) => [n, i])),
      originX: r3((pivot[0] - x0) / w), originY: r3((pivot[1] - y0) / h),
      pivotPx: [pivot[0] - x0, pivot[1] - y0],
      x: pivot[0] - ref[0], y: pivot[1] - ref[1],
      order: o.order,
    };
    if (o.parent) rec.parent = o.parent;
    if (o.freeRotate) rec.freeRotate = true;
    return rec;
  }

  // =====================================================================================
  // ASTRONAUT (serious version of H-39, ~60 px, facing right). Figure canvas 150x120, origin O between the boots.
  // =====================================================================================
  const AW = 150, AH = 120, O = [75, 105];
  const A = () => {
    const c = cv(AW, AH);
    c.R = (x, y, w, h, col, lv) => c.rect(O[0] + x, O[1] + y, w, h, col, lv);
    c.L = (x0, y0, x1, y1, col, t, lv) => c.line(O[0] + x0, O[1] + y0, O[0] + x1, O[1] + y1, col, t, lv);
    c.E = (x, y, rx, ry, cols, hi, lo) => c.ells(O[0] + x, O[1] + y, rx, ry, cols, hi, lo);
    c.P = (pts, col, lv) => c.poly(pts.map(([x, y]) => [O[0] + x, O[1] + y]), col, lv);
    return c;
  };
  const at = (x, y) => [O[0] + x, O[1] + y];

  // ---- torso (root): hips at (0,-13) ----
  function torsoBase() {
    const c = A();
    c.R(-5, -29, 10, 2, C.suitS); // collar
    c.R(-9, -27, 18, 15, C.cream).R(4, -27, 5, 15, C.suitS).R(7, -27, 2, 15, C.suitN).R(-9, -14, 18, 2, C.suitN);
    c.R(-5, -23, 5, 4, C.coral).R(-4, -22, 3, 2, C.coralL).R(2, -22, 2, 1, C.teal);
    return c;
  }
  const HIP = at(0, -13);
  const torso = {
    upright: torsoBase().outline(C.ink),
    lean: shear(torsoBase(), -0.3, HIP[1]).outline(C.ink),
    smear: (() => {
      const b = torsoBase(), s = scale(b, 0.8, 1.35, HIP[0], HIP[1]);
      const c = A();
      c.comp(s.sil(C.suitN), -3, 5, 0.5); // dithered trail, down and back (the leap goes up and forward)
      c.comp(s);
      return c.outline(C.ink);
    })(),
  };

  // ---- helmet (child of torso): neck at (0,-28) ----
  function helmet(dark) {
    const c = A();
    c.E(0, -41, 15, 13, [C.white, C.cream, C.suitS], -0.9, 0.7);
    c.R(-16, -44, 3, 6, C.coral).R(14, -44, 3, 6, C.coralD);
    c.L(0, -54, 0, -57, C.suitN).R(-1, -60, 3, 3, C.coral);
    if (!dark) {
      c.E(2, -40, 11, 8, [C.visor, C.visor, C.visorD], -2, 0.5);
      c.R(-5, -42, 2, 1, C.teal).R(-5, -41, 4, 1, C.teal).R(-4, -40, 4, 1, C.teal).R(-5, -41, 1, 1, C.tealL);
      c.R(7, -42, 2, 1, C.teal).R(5, -41, 4, 1, C.teal).R(4, -40, 4, 1, C.teal).R(8, -41, 1, 1, C.tealL);
      c.L(-7, -45, -4, -47, C.glint).R(-8, -43, 1, 1, C.glint);
    } else {
      // visor darkened while charging: only two glowing slits and the blade's coral in the glass
      c.E(2, -40, 11, 8, [C.visorD, C.visorD, C.visorD], -2, 0.5);
      c.R(-5, -41, 4, 1, C.tealL).R(5, -41, 4, 1, C.tealL);
      c.L(7, -35, 11, -37, C.coralD).L(8, -35, 11, -36, C.coral);
    }
    return c.outline(C.ink);
  }
  const helmetP = { serious: helmet(false), dark: helmet(true) };

  // ---- legs (children of torso): front leg hip (-5,-13) lit, back leg hip (+4,-13) shaded ----
  // joints relative to the hip: [knee, ankle]; the boot hangs below the ankle, toes forward (right).
  // crouch/kneel lower the hips by 4 px: the choreography moves torso, arms and pack down by ANCHORS.bodyDrop.
  const LEGS = {
    stand: [[0, 4], [0, 9]],
    crouch: [[4, 2], [1, 5]],
    tuck: [[6, -1], [2, 4]],
    kneel: { front: [[6, 1], [6, 5]], back: [[2, 7], [-6, 7]] },
    smear: [[-1, 6], [-3, 13]],
  };
  function leg(hx, front, pose) {
    const c = A(), col = front ? C.cream : C.suitS, shade = front ? C.suitS : C.suitN, boot = front ? C.coral : C.coralD;
    let j = LEGS[pose];
    if (!Array.isArray(j)) j = front ? j.front : j.back;
    const [k, f] = j, hy = -13;
    if (pose === 'smear') c.L(hx - 2, hy + 2, hx + f[0] - 3, hy + f[1] - 1, shade, 5, 0.5);
    c.L(hx, hy + 1, hx + k[0], hy + k[1], col, 5).L(hx + k[0], hy + k[1], hx + f[0], hy + f[1], col, 5);
    c.L(hx + 2, hy + 1, hx + k[0] + 2, hy + k[1], shade).L(hx + k[0] + 2, hy + k[1], hx + f[0] + 2, hy + f[1], shade);
    if (!front && pose === 'kneel') c.R(hx + f[0] - 4, hy + f[1] - 2, 4, 4, boot);
    else if (pose === 'smear') c.R(hx + f[0] - 3, hy + f[1] - 1, 6, 6, boot);
    else c.R(hx + f[0] - 3, hy + f[1], 7, 4, boot).R(hx + f[0] - 3, hy + f[1] + 3, 7, 1, front ? C.coralD : C.suitD);
    return c.outline(C.ink);
  }
  const legPoses = (hx, front) => ({ stand: leg(hx, front, 'stand'), crouch: leg(hx, front, 'crouch'), tuck: leg(hx, front, 'tuck'), kneel: leg(hx, front, 'kneel'), smear: leg(hx, front, 'smear') });

  // ---- pack (root): rucksack with recoil jet; attach point (-10,-22) ----
  function pack(thrust) {
    const c = A();
    c.R(-15, -30, 6, 16, C.suitN).R(-14, -30, 4, 2, C.suitS).R(-15, -16, 6, 2, C.suitD).R(-14, -14, 4, 2, C.suitD);
    c.L(-13, -31, -13, -34, C.suitN).R(-13, -36, 1, 2, C.coral);
    c.R(-13, -26, 2, 3, C.teal);
    if (thrust) {
      c.P([[-15, -12], [-9, -12], [-15, 0]], C.coralD);
      c.P([[-14, -12], [-10, -12], [-14, -3]], C.coral);
      c.P([[-13, -12], [-11, -12], [-13, -7]], C.white);
    }
    return c.outline(C.ink);
  }

  // ---- back arm (root): shoulder (-11,-25) ----
  const ARM_BACK = { rest: [-1, 9], back: [-8, 5], up: [-6, -7] };
  function armBack(p) {
    const c = A(), [hx, hy] = ARM_BACK[p];
    c.L(-11, -25, -11 + hx, -25 + hy, C.suitN, 4).L(-11, -25, -11 + hx, -25 + hy, C.suitS, 2);
    c.E(-11 + hx, -25 + hy, 2.5, 2.5, [C.coralD, C.coralD, C.suitD]);
    return c.outline(C.ink);
  }

  // ---- front arm (root): shoulder (8,-24); hand points relative to the shoulder ----
  const SH = [8, -24];
  const HAND = { rest: [2, 9], aim: [12, 0], raise: [-5, -11], 'slash-end': [9, 8], smear: [11, 3] };
  function armStroke(c, hx, hy, lv) {
    c.L(SH[0] + 1, SH[1] + 1, SH[0] + hx + 1, SH[1] + hy + 1, C.suitS, 5, lv);
    c.L(SH[0], SH[1], SH[0] + hx, SH[1] + hy, C.cream, 5, lv);
  }
  function armFront(p) {
    const c = A(), [hx, hy] = HAND[p];
    if (p === 'smear') {
      // gestretched in-between: a dithered fan from the raised arm over the top to the cut
      for (let i = 0; i <= 6; i++) {
        const a0 = Math.atan2(HAND.raise[1], HAND.raise[0]), a1 = Math.atan2(hy, hx) + 2 * Math.PI;
        const a = a0 + ((a1 - a0) * i) / 6, l = 13;
        c.L(SH[0], SH[1], SH[0] + Math.cos(a) * l, SH[1] + Math.sin(a) * l, i < 3 ? C.suitN : C.suitS, 4, 0.5);
      }
    }
    armStroke(c, hx, hy);
    c.E(SH[0] + hx, SH[1] + hy, 3, 3, [C.coralL, C.coral, C.coralD]);
    return c.outline(C.ink);
  }

  // ---- raygun (child of arm-front): grip at the hand. Drawn level, poses are pre-rotated (RS-06.4) ----
  const GUN_POSES = { a0: 0, up45: -45, up90: -90, back135: -135, down45: 45 };
  const MUZZLE = [19, -6];
  function gunLevel(flip) {
    const c = cv(60, 60), g = [30, 30];
    const R = (x, y, w, h, col) => c.rect(g[0] + x, g[1] + (flip ? -y - h : y), w, h, col);
    R(-4, -10, 12, 8, C.cream); R(-4, -4, 12, 2, C.suitS); R(-1, -11, 6, 1, C.teal); R(-2, -8, 2, 2, C.teal);
    R(-2, -2, 4, 5, C.coral); R(1, -2, 1, 5, C.coralD);
    R(8, -9, 9, 6, C.coral); R(10, -9, 1, 6, C.coralD); R(13, -9, 1, 6, C.coralD); R(8, -5, 9, 2, C.coralD);
    R(17, -8, 2, 4, C.tealL);
    return c;
  }
  const gunPose = {}, muzzleOf = {};
  Object.keys(GUN_POSES).forEach((k) => {
    const deg = GUN_POSES[k], flip = deg < -90; // pointing backwards: mirror first, the top of the gun stays up
    const r = rotate(gunLevel(flip), deg, 30, 30).outline(C.ink);
    const g = cv(AW, AH);
    gunPose[k] = g.comp(r, O[0] - 30, O[1] - 30); // grip at O in this canvas (relative pivot only)
    muzzleOf[k] = rotPt(MUZZLE[0], flip ? -MUZZLE[1] : MUZZLE[1], deg).map((v) => Math.round(v));
  });

  // ---- laser blade (child of arm-front, freeRotate): a curved leaf wedge with a chisel tip, base at the muzzle ----
  // Not a sword: no hilt, no straight rod, no round tip (decision 3a). Points right, rotate freely.
  function blade(len) {
    const c = cv(AW, AH), bx = O[0], by = O[1];
    for (let x = 0; x < len; x++) {
      const t = x / (len - 1), hw = 1.2 + 2.6 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)) * (t < 0.6 ? 1 : 1 - (t - 0.6) * 0.6);
      const cy = -2.6 * t * t;
      let top = cy - hw, bot = cy + hw;
      const cut = len - 6;
      if (x > cut) top += ((x - cut) / 6) * (bot - top - 0.6); // chisel: the top edge runs down to the lower tip
      for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
        const yc = y + 0.5;
        if (yc < top || yc > bot) continue;
        const inner = yc > top + 1 && yc < bot - 1.2 && x > 1;
        c.px(bx + x, by + y, inner ? C.white : C.coral);
      }
    }
    c.outline(C.coralD);
    return c;
  }
  const bladeP = { full: blade(34), grow2: blade(23), grow1: blade(12) };

  // ---- blade arc smear (child of arm-front, freeRotate): sickle swept by the blade, base at the muzzle ----
  function arc(thin) {
    const c = cv(AW, AH), R = 35, a0 = -120, a1 = 40;
    for (let y = -40; y <= 40; y++) for (let x = -40; x <= 40; x++) {
      const r = Math.hypot(x + 0.5, y + 0.5), th = (Math.atan2(y + 0.5, x + 0.5) * 180) / Math.PI;
      if (th < a0 || th > a1 || r > R) continue;
      const s = (th - a0) / (a1 - a0), wdt = (thin ? 1.5 : 2) + (thin ? 5 : 10) * Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.85 + 0.15)), 0.8);
      if (r < R - wdt) continue;
      const X = O[0] + x, Y = O[1] + y;
      if (thin) { if (on(X, Y, 0.5)) c.px(X, Y, r > R - 1.2 ? C.coral : C.coralL); continue; }
      if (s < 0.3 && !on(X, Y, 0.25 + s * 2)) continue;
      const edge = r > R - 1.2 || r < R - wdt + 1.2;
      c.px(X, Y, edge ? C.coral : s > 0.35 ? C.white : C.coralL);
    }
    return c;
  }
  const arcP = { arc1: arc(false), arc2: arc(true) };

  // ---- assemble the astronaut rig ----
  const ORIGIN = O, rigA = [];
  const torsoPart = part('astro', 'torso', torso, HIP, ORIGIN, { order: 4 });
  rigA.push(part('astro', 'pack', { rest: pack(false), thrust: pack(true) }, at(-10, -22), ORIGIN, { order: 0 }));
  rigA.push(part('astro', 'arm-back', { rest: armBack('rest'), back: armBack('back'), up: armBack('up') }, at(-11, -25), ORIGIN, { order: 1 }));
  rigA.push(part('astro', 'leg-back', legPoses(4, false), at(4, -13), HIP, { order: 2, parent: 'torso' }));
  rigA.push(part('astro', 'leg-front', legPoses(-5, true), at(-5, -13), HIP, { order: 3, parent: 'torso' }));
  rigA.push(torsoPart);
  rigA.push(part('astro', 'helmet', helmetP, at(0, -28), HIP, { order: 5, parent: 'torso' }));
  const SHP = at(SH[0], SH[1]);
  rigA.push(part('astro', 'arm-front', { rest: armFront('rest'), aim: armFront('aim'), raise: armFront('raise'), 'slash-end': armFront('slash-end'), smear: armFront('smear') }, SHP, ORIGIN, { order: 6 }));
  // children of arm-front: default offset = hand of pose 'rest'; other poses move them via ANCHORS (hold keys)
  const handRest = [SHP[0] + HAND.rest[0], SHP[1] + HAND.rest[1]];
  const gunRec = part('astro', 'raygun', gunPose, O, O, { order: 8, parent: 'arm-front' });
  gunRec.x = HAND.rest[0]; gunRec.y = HAND.rest[1];
  const bladeRec = part('astro', 'blade', bladeP, O, O, { order: 7, parent: 'arm-front', freeRotate: true });
  bladeRec.x = HAND.rest[0] + muzzleOf.a0[0]; bladeRec.y = HAND.rest[1] + muzzleOf.a0[1];
  const arcRec = part('astro', 'blade-arc', arcP, O, O, { order: 9, parent: 'arm-front', freeRotate: true });
  arcRec.x = bladeRec.x; arcRec.y = bladeRec.y;
  rigA.push(bladeRec, gunRec, arcRec);
  void handRest;

  // which raygun pose and blade angle belong to which arm pose; offsets relative to the arm-front pivot (shoulder)
  const ARM_GUN = { rest: 'a0', aim: 'a0', raise: 'back135', 'slash-end': 'down45', smear: 'a0' };
  const anchors = {};
  Object.keys(HAND).forEach((p) => {
    const g = ARM_GUN[p], m = muzzleOf[g];
    anchors[p] = {
      raygun: { pose: g, x: HAND[p][0], y: HAND[p][1] },
      blade: { x: HAND[p][0] + m[0], y: HAND[p][1] + m[1], angle: GUN_POSES[g] + (p === 'smear' ? -20 : 0) },
    };
  });

  RIGS.astronaut = {
    id: 'astronaut', drawnHeight: 60, scale: { moment: 2, cinematic: 2 },
    parts: rigA.sort((p, q) => p.order - q.order),
    // arm-front has children whose place depends on the arm pose: set raygun/blade/blade-arc x, y, pose, angle
    // with 'hold' keys in the same key frame as the arm pose (the contract has no per-pose anchors).
    anchors: { 'arm-front': anchors, bodyDrop: { crouch: 4, kneel: 4 }, torsoLean: { 'arm-front': [3, 0], 'arm-back': [2, 0], pack: [2, 0] } },
  };

  // =====================================================================================
  // ROOT MONSTER (boss-root-monster 64x64 frame 0, cut into 8 parts). Canvas 120x100, sprite origin at (28,30).
  // Figure origin = bottom centre of the 64 px box = canvas (60,94).
  // =====================================================================================
  const BW = 120, BH = 100, BX = 28, BY = 30, BO = [BX + 32, BY + 64];
  const Bc = () => {
    const c = cv(BW, BH);
    c.R = (x, y, w, h, col, lv) => c.rect(BX + x, BY + y, w, h, col, lv);
    c.L = (x0, y0, x1, y1, col, t, lv) => c.line(BX + x0, BY + y0, BX + x1, BY + y1, col, t, lv);
    c.E = (x, y, rx, ry, col, lv) => c.ell(BX + x, BY + y, rx, ry, col, lv);
    c.ES = (x, y, rx, ry, cols, hi, lo) => c.ells(BX + x, BY + y, rx, ry, cols, hi, lo);
    return c;
  };
  const bat = (x, y) => [BX + x, BY + y];

  function trunkFull() {
    const c = Bc();
    c.ES(32, 30, 19, 12, [W.b, W.t, W.T]);
    c.R(14, 30, 37, 21, W.t).R(14, 30, 2, 21, W.b).R(46, 30, 5, 21, W.T);
    [[20, 36, 46], [27, 42, 50], [38, 38, 48], [43, 34, 44]].forEach(([x, y0, y1]) => c.L(x, y0, x, y1, W.T));
    for (let x = 15; x <= 49; x++) {
      let y = 0;
      while (y < 40 && !c.get(BX + x, BY + y)) y++;
      if (!c.get(BX + x, BY + y)) continue;
      c.R(x, y, 1, 1, W.f);
      if (x % 3 === 0) c.R(x, y + 1, 1, 1, W.F);
      if (x % 7 === 2) c.R(x, y + 2, 1, 1, W.F);
    }
    c.E(24, 32, 5, 4, W.d).E(40, 32, 5, 4, W.d);
    c.R(22, 32, 3, 2, W.r).R(22, 32, 1, 1, W.y).R(38, 32, 3, 2, W.r).R(38, 32, 1, 1, W.y); // eyes look left, at her
    c.L(18, 26, 28, 29, W.T, 2).L(46, 26, 36, 29, W.T, 2);
    c.E(32, 44, 10, 5, W.d); // mouth cavity (the jaw covers its lower half when closed)
    [25, 29, 35, 39].forEach((x) => c.R(x, 40, 1, 2, W.w));
    return c;
  }
  const CUT = BX + 32; // canvas column where the right half starts
  function trunkHalf(right, cracked) {
    const c = trunkFull().keep((x) => (right ? x >= CUT : x < CUT));
    if (cracked) {
      // glowing seam along the cut, rose light seeping out (decision 9a)
      const r = rng(right ? 7 : 3), ex = right ? CUT : CUT - 1, dir = right ? 1 : -1;
      for (let y = BY + 18; y <= BY + 50; y++) {
        if (!c.get(ex, y)) continue;
        c.px(ex, y, RO.l);
        if (c.get(ex + dir, y)) c.px(ex + dir, y, RO.m);
        if (r() < 0.3 && c.get(ex + 2 * dir, y)) c.px(ex + 2 * dir, y, RO.m).px(ex + 3 * dir, y, r() < 0.5 ? RO.b : null);
      }
      for (let k = 0; k < 3; k++) { // two or three short side cracks
        const y = BY + 24 + Math.round(r() * 22);
        for (let i = 1; i < 5 + Math.round(r() * 4); i++) if (c.get(ex + i * dir, y + Math.round(i * (r() - 0.5)))) c.px(ex + i * dir, y + Math.round(i * (r() - 0.5)), i < 3 ? RO.m : RO.b);
      }
    }
    // no outline on the cut while closed (the halves meet seamlessly); with the crack the seam is light, not ink
    return c.outline(W.o, (x, y) => (right ? x === CUT - 1 : x === CUT) && y >= BY + 17 && y <= BY + 51);
  }

  function jaw(roar) {
    const c = Bc(), dy = roar ? 6 : 0;
    c.ES(32, 48 + dy, 11, 4, [W.b, W.t, W.T], -0.9, 0.5);
    c.R(22, 45 + dy, 21, 2, W.d);
    [27, 32, 37].forEach((x) => c.R(x, 44 + dy, 1, 2, W.w));
    if (roar) [24, 30, 34, 40].forEach((x) => c.R(x, 44 + dy, 1, 1, W.w));
    return c.outline(W.o);
  }

  function crownBase() {
    const c = Bc();
    c.L(24, 24, 16, 7, W.t, 2).L(19, 12, 12, 10, W.t);
    c.L(32, 22, 32, 5, W.T, 2);
    c.L(40, 24, 49, 8, W.T, 2).L(46, 12, 53, 12, W.T);
    [[15, 6, 5, 4], [33, 4, 4, 3], [50, 7, 5, 4], [11, 10, 2.5, 2]].forEach(([x, y, rx, ry]) => c.ES(x, y, rx, ry, [W.L, W.f, W.F]));
    return c;
  }
  const CROWN_PIV = bat(32, 24);
  const crownP = { upright: crownBase().outline(W.o), bent: rotate(crownBase(), 28, CROWN_PIV[0], CROWN_PIV[1]).outline(W.o) };

  // arms: left = front arm (towards the astronaut), right = back arm (shade colour, like the game sprite)
  const BARM = {
    rest: [[6, 44], [8, 52], [[7, 52, 5, 55], [9, 52, 11, 55]]],
    raised: [[6, 26], [2, 15], [[2, 15, 0, 11], [3, 15, 6, 12], [2, 15, 2, 11]]],
    stab: [[2, 44], [-6, 60], [[-6, 60, -9, 64], [-5, 60, -3, 64], [-6, 60, -6, 64]]],
  };
  function bossArm(right, p) {
    const c = Bc(), col = right ? W.T : W.t, m = (x) => (right ? 64 - x : x), [e, h, claws] = BARM[p];
    const sx = right ? 48 : 16;
    c.L(sx, 36, m(e[0]), e[1], col, 4).L(m(e[0]), e[1], m(h[0]), h[1], col, 3);
    if (!right) c.L(sx, 35, m(e[0]), e[1] - 1, W.b);
    claws.forEach(([x0, y0, x1, y1]) => c.L(m(x0), y0, m(x1), y1, W.T));
    return c.outline(W.o);
  }
  function bossRoots(right) {
    const c = Bc(), list = right ? [[37, 52, 40, 62], [44, 50, 54, 61]] : [[20, 50, 10, 61], [27, 52, 24, 62]];
    list.forEach(([x0, y0, x1, y1]) => c.L(x0, y0, x1, y1, right ? W.T : W.t, 3));
    return c.outline(W.o);
  }

  const rigB = [];
  const TL = bat(32, 51); // both halves pivot at the foot of the cut: they open outwards
  rigB.push(part('root', 'crown', crownP, CROWN_PIV, BO, { order: 0 }));
  rigB.push(part('root', 'roots-right', { rest: bossRoots(true) }, bat(40, 51), BO, { order: 2 }));
  rigB.push(part('root', 'roots-left', { rest: bossRoots(false) }, bat(24, 51), BO, { order: 3 }));
  rigB.push(part('root', 'trunk-right', { rest: trunkHalf(true, false), cracked: trunkHalf(true, true) }, TL, BO, { order: 4 }));
  rigB.push(part('root', 'trunk-left', { rest: trunkHalf(false, false), cracked: trunkHalf(false, true) }, TL, BO, { order: 5 }));
  rigB.push(part('root', 'arm-right', { rest: bossArm(true, 'rest'), raised: bossArm(true, 'raised'), stab: bossArm(true, 'stab') }, bat(48, 36), TL, { order: 1, parent: 'trunk-right' }));
  rigB.push(part('root', 'jaw', { closed: jaw(false), roar: jaw(true) }, bat(32, 45), BO, { order: 6 }));
  rigB.push(part('root', 'arm-left', { rest: bossArm(false, 'rest'), raised: bossArm(false, 'raised'), stab: bossArm(false, 'stab') }, bat(16, 36), TL, { order: 7, parent: 'trunk-left' }));
  RIGS.rootMonster = { id: 'rootMonster', drawnHeight: 64, scale: { moment: 3, cinematic: 4 }, parts: rigB.sort((p, q) => p.order - q.order) };

  // =====================================================================================
  // EFFECTS (pre-coloured)
  // =====================================================================================
  function fx(i) {
    const c = cv(8, 8);
    if (i === 0) { c.ells(4, 4, 3.5, 3.5, [RO.l, RO.b, RO.d], -0.9, 0.6).ell(4, 4, 1.5, 1.5, RO.m).px(4, 4, RO.d).outline(RO.d); }
    if (i === 1) { c.line(4, 7, 4, 5, W.F).ells(4, 3.5, 2, 2.5, [RO.m, RO.b, RO.d]).px(3, 2, RO.l); }
    if (i === 2) { c.poly([[2, 3], [6, 2], [6, 5], [3, 6]], RO.b).px(3, 3, RO.l).px(4, 3, RO.l).px(5, 5, RO.d); }
    if (i === 3) { c.poly([[1, 6], [3, 2], [7, 1], [5, 5]], W.L).line(2, 6, 6, 2, W.f); }
    if (i === 4) { c.poly([[1, 6], [3, 2], [7, 1], [5, 5]], W.F).line(2, 6, 6, 2, W.f); }
    if (i === 5) { c.line(2, 6, 6, 1, W.t, 2).line(2, 6, 5, 2, W.b).px(6, 1, W.T); }
    if (i === 6) { c.line(1, 4, 7, 4, C.coral).line(4, 1, 4, 7, C.coral).rect(3, 3, 3, 3, C.coralL).px(4, 4, C.white); }
    if (i === 7) { c.line(2, 4, 6, 4, C.coralL).line(4, 2, 4, 6, C.coralL).rect(3, 3, 2, 2, C.white); }
    return c;
  }
  S['rig-fx-root'] = sheet([0, 1, 2, 3, 4, 5, 6, 7].map(fx));

  function hedge(stage) {
    const c = cv(80, 28), r = rng(46);
    c.ells(40, 27, 38, 6 + stage * 3, [G.hi, W.F, G.lo], -0.8, 0.4);
    for (let i = 0; i < 26; i++) {
      const x = 4 + r() * 72, h = 4 + r() * (6 + stage * 6), y = 27;
      c.line(x, y, x + (r() - 0.5) * 4, y - h, W.F);
      if (stage >= 1) c.ells(x + (r() - 0.5) * 4, y - h, 2.5, 1.8, [W.L, W.f, W.F]);
    }
    if (stage >= 1) for (let i = 0; i < 14; i++) c.ells(6 + r() * 68, 27 - 6 - r() * (stage * 9), 3, 2, [W.L, W.f, W.F]);
    const roses = stage === 1 ? 5 : stage === 2 ? 11 : 0;
    for (let i = 0; i < roses; i++) {
      const x = 8 + ((i * 64) / Math.max(1, roses - 1)) + (r() - 0.5) * 6, y = 27 - 6 - r() * (stage * 8);
      if (stage === 1) c.ells(x, y, 1.6, 2.2, [RO.m, RO.b, RO.d]);
      else c.ells(x, y, 3, 2.6, [RO.l, RO.b, RO.d], -0.9, 0.5).ell(x, y, 1.2, 1, RO.m);
    }
    return c.outline(W.o);
  }
  S['rig-prop-rosehedge'] = sheet([hedge(0), hedge(1), hedge(2)]);

  function bulge(stage) {
    const c = cv(48, 16), r = rng(12);
    if (stage === 0) {
      let x = 8, y = 13;
      for (let i = 0; i < 16; i++) { const nx = x + 2, ny = 13 + Math.round((r() - 0.5) * 2); c.line(x, y, nx, ny, W.d); x = nx; y = ny; }
      return c;
    }
    const hgt = stage === 1 ? 4 : 7;
    c.ells(24, 15, 20, hgt, [G.hi, G.mid, G.lo], -0.6, 0.3);
    c.line(14, 15 - hgt + 3, 20, 13, W.d).line(28, 15 - hgt + 2, 34, 13, W.d).line(22, 15 - hgt + 1, 25, 14, W.d);
    if (stage === 2) { // root tips breaking through
      [[17, 6, 14, 1], [26, 5, 28, 0], [33, 7, 37, 3]].forEach(([x0, y0, x1, y1]) => c.line(x0, y0 + 2, x1, y1, W.t, 2).px(x1, y1, W.T));
      for (let i = 0; i < 6; i++) c.px(10 + r() * 28, 15 - hgt - 2 - r() * 4, W.d);
    }
    return c.outline(W.o);
  }
  S['rig-fx-ground-bulge'] = sheet([bulge(0), bulge(1), bulge(2)]);

  RIGS.fx = { root: 'rig-fx-root', hedge: 'rig-prop-rosehedge', bulge: 'rig-fx-ground-bulge' };
})(typeof window !== 'undefined' ? window : globalThis);
