/* Shared board library for the H-48 storyboards (mockups/m13b-<boss>.html).
 * Same drawing rules as mockups/m13-rig-und-storyboard.html (H-46): rigs from PX_RIGS, whole-pixel positions,
 * colours only from tokens (export/tokens.css) or pre-coloured sprites. No network, no DOM outside the page.
 * Usage: const B = window.M13B(); then B.board(host, caption, (c) => { ... }).
 */
window.M13B = function () {
  const S = window.PX_SPRITES, RG = window.PX_RIGS, F = window.PX_FONTS;
  const css = getComputedStyle(document.documentElement), tok = (n) => css.getPropertyValue(n).trim(), num = (n) => parseFloat(tok(n));
  const T = {
    ink: tok('--color-finisher-ink'), paper: tok('--color-finisher-paper'),
    title: tok('--color-finisher-title'), name: tok('--color-finisher-name'), shadow: tok('--color-finisher-title-shadow'),
    band: tok('--color-finisher-cutin-band'), edge: tok('--color-finisher-cutin-edge'), speed: tok('--color-finisher-speedline'),
    slash: tok('--color-finisher-slash'), rim: tok('--color-finisher-slash-rim'), coral: tok('--color-coral-400'), gold: tok('--color-gold-400'),
  };
  const SA = num('--size-rig-scale-astronaut'), SBM = num('--size-rig-scale-boss-moment'), SBC = num('--size-rig-scale-boss-cinematic');
  const GROUND = num('--size-rig-ground'), BAR = num('--size-finisher-letterbox');
  const X = { am: num('--size-rig-astro-x-moment'), bm: num('--size-rig-boss-x-moment'), ac: num('--size-rig-astro-x-cinematic'), bc: num('--size-rig-boss-x-cinematic') };
  const AI = [num('--opacity-rig-afterimage-1'), num('--opacity-rig-afterimage-2'), num('--opacity-rig-afterimage-3')];
  const PORTRAIT = { rootMonster: 0, forestGhost: 1, giantStone: 2, giantSandWorm: 3, guardianDog: 4, pharaoh: 5 };

  // ---------- frames ----------
  const cache = new Map();
  function fr(key, f, tint) {
    const id = key + '|' + f + '|' + (tint || '');
    if (cache.has(id)) return cache.get(id);
    const d = S[key]; if (!d) throw new Error('Sprite fehlt: ' + key);
    const c = document.createElement('canvas'); c.width = d.frameWidth; c.height = d.frameHeight;
    const x = c.getContext('2d'), rows = d.frames[f];
    for (let y = 0; y < rows.length; y++) for (let i = 0; i < rows[y].length; i++) { const ch = rows[y][i]; if (ch === '.') continue; x.fillStyle = tint || d.palette[ch]; x.fillRect(i, y, 1, 1); }
    cache.set(id, c); return c;
  }
  function spr(ctx, key, f, x, y, s, o = {}) {
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const d = S[key];
    if (o.flip) { ctx.translate(Math.round(x) + d.frameWidth * s, Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(fr(key, f), 0, 0, d.frameWidth * s, d.frameHeight * s); }
    else ctx.drawImage(fr(key, f), Math.round(x), Math.round(y), d.frameWidth * s, d.frameHeight * s);
    ctx.restore();
  }

  // ---------- rigs (contract rules; anchors from PX_RIGS) ----------
  function drawRig(ctx, id, o) {
    const rig = RG[id], s = o.s, pose = o.pose || {}, ang = o.ang || {}, off = o.off || {}, ov = {};
    const add = (p, k, v) => { ov[p] = ov[p] || {}; ov[p][k] = (ov[p][k] || 0) + v; };
    if (id === 'astronaut') {
      const ap = pose['arm-front'] || 'rest', an = rig.anchors['arm-front'][ap];
      ov.raygun = { pose: an.raygun.pose, x: an.raygun.x, y: an.raygun.y };
      ov.blade = { x: an.blade.x, y: an.blade.y, angle: an.blade.angle };
      ov['blade-arc'] = { x: an.blade.x, y: an.blade.y, angle: an.blade.angle };
      const drop = rig.anchors.bodyDrop[pose['leg-front']] || 0;
      if (drop) ['torso', 'arm-front', 'arm-back', 'pack'].forEach((p) => add(p, 'dy', drop));
      if (pose.torso === 'lean') Object.entries(rig.anchors.torsoLean).forEach(([p, v]) => add(p, 'dx', v[0]));
    }
    if (id === 'forestGhost' && pose.body === 'stretch') Object.entries(rig.anchors.stretch).forEach(([p, v]) => { add(p, 'dx', v[0]); add(p, 'dy', v[1]); });
    if (id === 'guardianDog' && pose['legs-front'] === 'lie') Object.entries(rig.anchors.lie).forEach(([p, v]) => { add(p, 'dx', v[0]); add(p, 'dy', v[1]); });
    const byId = Object.fromEntries(rig.parts.map((p) => [p.id, p])), world = {};
    const calc = (p) => {
      if (world[p.id]) return world[p.id];
      const v = ov[p.id] || {}, d = off[p.id] || [0, 0];
      const lx = (v.x != null ? v.x : p.x) + (v.dx || 0) + d[0], ly = (v.y != null ? v.y : p.y) + (v.dy || 0) + d[1];
      const a = (v.angle || 0) + (ang[p.id] || 0);
      let r;
      if (p.parent) { const P = calc(byId[p.parent]), rad = (P.a * Math.PI) / 180; r = { x: P.x + (lx * Math.cos(rad) - ly * Math.sin(rad)) * s, y: P.y + (lx * Math.sin(rad) + ly * Math.cos(rad)) * s, a: P.a + a }; }
      else r = { x: o.x + lx * s, y: o.y + ly * s, a };
      return (world[p.id] = r);
    };
    const hidden = new Set(o.hide || []);
    if (id === 'astronaut') { if (!pose.blade) hidden.add('blade'); if (!pose['blade-arc']) hidden.add('blade-arc'); }
    ctx.save();
    if (o.flip) { ctx.translate(o.x, 0); ctx.scale(-1, 1); ctx.translate(-o.x, 0); }
    rig.parts.forEach((p) => {
      if (hidden.has(p.id)) return;
      const w = calc(p), pn = pose[p.id] || o.all || (ov[p.id] && ov[p.id].pose) || Object.keys(p.poses)[0];
      const f = p.poses[pn] != null ? p.poses[pn] : 0;
      const sil = o.sil === 'all' || (Array.isArray(o.sil) && o.sil.includes(p.id));
      const img = o.ink ? fr(p.ink, f) : sil ? fr(p.silhouette, f) : fr(p.frame, f);
      ctx.save();
      ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.partAlpha && o.partAlpha[p.id] != null ? o.partAlpha[p.id] : 1);
      ctx.translate(Math.round(w.x), Math.round(w.y)); ctx.rotate((w.a * Math.PI) / 180);
      ctx.drawImage(img, -p.pivotPx[0] * s, -p.pivotPx[1] * s, p.size[0] * s, p.size[1] * s);
      ctx.restore();
    });
    ctx.restore();
  }
  function trail(ctx, id, o, pts) { pts.slice(0, 3).forEach((p, i) => drawRig(ctx, id, Object.assign({}, o, { x: p[0], y: p[1], alpha: AI[i] }))); }

  // astronaut poses (H-46) plus H-48 additions
  const A = {
    stand: { 'arm-front': 'rest' },
    aim: { 'arm-front': 'aim' },
    crouch: { 'leg-front': 'crouch', 'leg-back': 'crouch', torso: 'lean', 'arm-back': 'back', 'arm-front': 'aim' },
    leap: { 'leg-front': 'tuck', 'leg-back': 'tuck', pack: 'thrust', 'arm-back': 'back', 'arm-front': 'aim' },
    raise: { 'leg-front': 'tuck', 'leg-back': 'tuck', 'arm-back': 'up', 'arm-front': 'raise', helmet: 'dark', blade: 'full' },
    smear: { 'leg-front': 'smear', 'leg-back': 'smear', torso: 'smear', 'arm-back': 'back', 'arm-front': 'smear', 'blade-arc': 'arc1', helmet: 'dark' },
    cut: { 'leg-front': 'kneel', 'leg-back': 'kneel', torso: 'lean', 'arm-back': 'back', 'arm-front': 'slash-end', blade: 'full' },
    guard: { 'leg-front': 'crouch', 'leg-back': 'crouch', 'arm-back': 'back', 'arm-front': 'aim', blade: 'full' },
    shootUp: { 'arm-front': 'aim', raygun: 'up45', 'arm-back': 'back', helmet: 'dark' },
    shootDown: { 'arm-front': 'slash-end', 'leg-front': 'crouch', 'leg-back': 'crouch', helmet: 'dark' },
  };
  const P = (...list) => Object.assign({}, ...list);

  // ---------- text ----------
  function ktext(ctx, str, s, cx, y, col, sh) {
    const font = F.kapsel, gs = [...str].map((ch) => (ch === ' ' ? null : (font.g[ch] || font.g['?']).split('/')));
    const w = gs.reduce((a, g) => a + (g ? g[0].length : font.space) + 1, -1), x0 = Math.round(cx - (w * s) / 2);
    const pass = (c, ox) => { ctx.fillStyle = c; let x = 0; gs.forEach((g) => { if (g) g.forEach((r, ry) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') ctx.fillRect(x0 + (x + i + ox) * s, y + (ry + ox) * s, s, s); }); x += (g ? g[0].length : font.space) + 1; }); };
    if (sh) pass(sh, 1);
    pass(col, 0);
  }
  const title = (c) => { c.setTransform(1, 0, 0, 1, 0, 0); ktext(c, 'BEZWUNGEN!', 4, 320, BAR + 12, T.title, T.shadow); };
  const nameText = (c, n) => { c.setTransform(1, 0, 0, 1, 0, 0); ktext(c, n, 3, 320, BAR + 12, T.name, T.shadow); };

  // ---------- scene ----------
  const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function pxCircle(ctx, cx, cy, r) { for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1); } }
  // worlds: night (forest ghost), elf (giant stone), desert (sand worm), pyramid (guardian dog), oasis (pharaoh)
  function world(ctx, key, o = {}) {
    const bg = tok('--color-finisher-bg-' + key), g = tok('--color-biome-' + key + '-ground'), gh = tok('--color-biome-' + key + '-ground-hi'), gl = tok('--color-biome-' + key + '-ground-lo');
    const r = rnd(o.seed || 4);
    ctx.fillStyle = bg; ctx.fillRect(-400, -400, 1440, 1160);
    ctx.save(); ctx.globalAlpha = o.dark == null ? 0.45 : o.dark; ctx.fillStyle = T.ink; ctx.fillRect(-400, -400, 1440, 1160); ctx.restore();
    if (key === 'night' || key === 'elf') { // stars
      ctx.fillStyle = T.title; for (let i = 0; i < (key === 'night' ? 40 : 26); i++) ctx.fillRect(Math.round(-300 + r() * 1240), Math.round(-100 + r() * 330), 1, 1);
    }
    if (o.moon) { ctx.fillStyle = T.title; pxCircle(ctx, o.moon[0], o.moon[1], o.moon[2] || 22); ctx.fillStyle = bg; pxCircle(ctx, o.moon[0] + 7, o.moon[1] - 4, (o.moon[2] || 22) - 4); }
    if (o.sun) { ctx.fillStyle = T.gold; pxCircle(ctx, o.sun[0], o.sun[1], o.sun[2] || 26); ctx.save(); ctx.globalAlpha = 0.35; pxCircle(ctx, o.sun[0], o.sun[1], (o.sun[2] || 26) + 10); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = T.ink;
    if (key === 'night') for (let i = -4; i < 14; i++) { const x = i * 70 + r() * 30, w = 10 + r() * 10; ctx.fillRect(Math.round(x), -200, Math.round(w), 520); pxCircle(ctx, x + w / 2, 60 + r() * 50, 26 + r() * 14); }
    if (key === 'elf') for (let i = -4; i < 14; i++) { const x = i * 74 + r() * 30, h = 120 + r() * 120; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 14, GROUND - h); ctx.lineTo(x + 28, GROUND); ctx.fill(); }
    if (key === 'desert') for (let i = -3; i < 8; i++) { ctx.beginPath(); ctx.ellipse(i * 150 + r() * 60, GROUND + 10, 110 + r() * 40, 46 + r() * 20, 0, Math.PI, 0); ctx.fill(); }
    if (key === 'pyramid') { for (let y = -200; y < GROUND; y += 14) for (let x = -400 + ((y / 14) % 2) * 20; x < 1040; x += 40) ctx.fillRect(x, y, 38, 12); }
    if (key === 'oasis') {
      for (let i = -2; i < 7; i++) { const x = i * 160 + r() * 60; ctx.beginPath(); ctx.moveTo(x - 70, GROUND); ctx.lineTo(x, GROUND - 90 - r() * 30); ctx.lineTo(x + 70, GROUND); ctx.fill(); }
      for (let i = -2; i < 8; i++) { const x = i * 120 + r() * 50; ctx.fillRect(Math.round(x), GROUND - 80, 4, 80); for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(x - 18 + k * 9), GROUND - 84 + (k % 2) * 4, 12, 3); }
    }
    ctx.restore();
    if (o.mist) { ctx.save(); ctx.globalAlpha = o.mist; ctx.fillStyle = T.title; for (let i = 0; i < 9; i++) ctx.fillRect(Math.round(-300 + r() * 1200), Math.round(GROUND - 40 - r() * 120), 120 + Math.round(r() * 200), 6 + Math.round(r() * 6)); ctx.restore(); }
    ctx.fillStyle = g; ctx.fillRect(-400, GROUND, 1440, 400);
    ctx.fillStyle = gh; ctx.fillRect(-400, GROUND, 1440, 2);
    ctx.fillStyle = gl; for (let i = 0; i < 60; i++) ctx.fillRect(Math.round(-300 + r() * 1240), GROUND + 6 + Math.round(r() * 50), 6 + Math.round(r() * 14), 2);
  }
  function bars(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = T.ink; ctx.fillRect(0, 0, 640, BAR); ctx.fillRect(0, 360 - BAR, 640, BAR); }
  function cam(ctx, cx, cy, z) { ctx.setTransform(z, 0, 0, z, Math.round(320 - cx * z), Math.round(180 - cy * z)); }
  function fx(ctx, sheet, i, x, y, s, a) { spr(ctx, sheet, i, x - 4 * s, y - 4 * s, s, { alpha: a }); }
  function burst(ctx, sheet, seed, cx, cy, n, list, rad, s, a) { const r = rnd(seed); for (let i = 0; i < n; i++) { const t = r() * Math.PI * 2, d = r() * rad; fx(ctx, sheet, list[(r() * list.length) | 0], cx + Math.cos(t) * d, cy + Math.sin(t) * d * 0.8, s, a); } }
  function rise(ctx, sheet, seed, x0, x1, y0, y1, n, list, s) { const r = rnd(seed); for (let i = 0; i < n; i++) fx(ctx, sheet, list[(r() * list.length) | 0], x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), s); }
  function speedH(ctx, seed, n, col, y0, y1) { const r = rnd(seed); ctx.fillStyle = col; for (let i = 0; i < n; i++) ctx.fillRect(Math.round(r() * 640) - 60, Math.round(y0 + r() * (y1 - y0)), 40 + Math.round(r() * 140), r() < 0.2 ? 2 : 1); }
  function radial(ctx, seed, fx0, fy0, n, col, r0 = 56) {
    const r = rnd(seed); ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { const a = ((i + r() * 0.7) / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), R = 700, w = 2 + r() * 5, r1 = r0 + r() * 30;
      ctx.beginPath(); ctx.moveTo(fx0 + ca * r1, fy0 + sa * r1); ctx.lineTo(fx0 + ca * R - sa * w, fy0 + sa * R + ca * w); ctx.lineTo(fx0 + ca * R + sa * w, fy0 + sa * R - ca * w); ctx.fill(); }
  }
  // speedline ring around the boss: the moment's main hit without a full-screen flash (13a)
  // H-50 (Q-95): spec from size.rig-hit-ring-*; r0 = ringR(refHeight, bossScale); step 1..3 (each motion.duration.rig-hit-ring-step)
  const ringR = (refH, s) => (refH / 2) * s + num('--size-rig-hit-ring-gap');
  function ring(ctx, seed, cx, cy, r0, step = 1) {
    const r = rnd(seed), n = num('--size-rig-hit-ring-rays'), jit = (num('--size-rig-hit-ring-jitter') * Math.PI) / 180;
    const lMin = num('--size-rig-hit-ring-ray-min'), lMax = num('--size-rig-hit-ring-ray-max'), sq = num('--size-rig-hit-ring-squash');
    const dIn = num('--size-rig-hit-ring-dot-in'), dOut = num('--size-rig-hit-ring-dot-out'), out = num('--size-rig-hit-ring-step-out') * (step - 1);
    const last = step >= num('--size-rig-hit-ring-steps');
    ctx.save(); ctx.fillStyle = T.speed; if (last) ctx.globalAlpha = num('--opacity-rig-hit-ring-last');
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2 + (r() * 2 - 1) * jit, L0 = lMin + r() * (lMax - lMin), L = last ? L0 * 0.5 : L0, ca = Math.cos(a), sa = Math.sin(a);
      for (let k = 0; k < L; k++) { const d = k < L / 2 ? dIn : dOut, rr = r0 + out + k; ctx.fillRect(Math.round(cx + ca * rr - d / 2), Math.round(cy + sa * rr * sq - d / 2), d, d); }
    }
    ctx.restore();
  }
  // laser: white core with coral rim (Graphics band in the game)
  function beam(ctx, x0, y0, x1, y1, w = 4) {
    ctx.save(); ctx.lineCap = 'butt';
    ctx.strokeStyle = T.rim; ctx.lineWidth = w + 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = T.slash; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }
  function slashLine(ctx, x, y0, y1, s) { const w = (num('--size-rig-slash') * s) / 2, rim = num('--size-rig-slash-rim') * s; ctx.fillStyle = T.rim; ctx.fillRect(Math.round(x - w - rim), y0, Math.round((w + rim) * 2), y1 - y0); ctx.fillStyle = T.slash; ctx.fillRect(Math.round(x - w), y0, Math.round(w * 2), y1 - y0); }
  function slashH(ctx, y, x0, x1, s) { const w = (num('--size-rig-slash') * s) / 2, rim = num('--size-rig-slash-rim') * s; ctx.fillStyle = T.rim; ctx.fillRect(x0, Math.round(y - w - rim), x1 - x0, Math.round((w + rim) * 2)); ctx.fillStyle = T.slash; ctx.fillRect(x0, Math.round(y - w), x1 - x0, Math.round(w * 2)); }
  function cutIn(ctx, boss) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = T.band; ctx.fillRect(0, 160, 640, 40);
    ctx.fillStyle = T.edge; ctx.fillRect(0, 158, 640, 2); ctx.fillRect(0, 200, 640, 2);
    spr(ctx, 'finisher-portrait', PORTRAIT[boss], 160, 160, 2);
  }
  // bright impact frame: paper, radial ink lines, figures in ink (-ink sheets, Q-92); dark frame = the same inverted
  function impact(ctx, dark, fxp, fyp, figures) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = dark ? T.ink : T.paper; ctx.fillRect(0, 0, 640, 360); radial(ctx, 7, fxp, fyp, 30, dark ? T.paper : T.ink);
    figures(dark);
  }

  // ---------- boards ----------
  function board(host, caption, fn) {
    const el = typeof host === 'string' ? document.getElementById(host) : host; if (!el) return;
    const fig = document.createElement('figure'), c = document.createElement('canvas');
    c.width = 640; c.height = 360; c.setAttribute('role', 'img'); c.setAttribute('aria-label', caption.replace(/<[^>]+>/g, ''));
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    try { fn(ctx); } catch (e) { document.getElementById('err').textContent += caption.replace(/<[^>]+>/g, '') + ': ' + e.message + '\n'; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cap = document.createElement('figcaption'); cap.innerHTML = caption;
    fig.append(c, cap); el.appendChild(fig);
  }
  function timeline(host, total, segs, ticks) {
    const el = document.getElementById(host); if (!el) return;
    segs.forEach(([a, b, cls, lab, row]) => {
      const s = document.createElement('div'); s.className = 'seg ' + cls; s.style.left = (a / total) * 100 + '%'; s.style.width = ((b - a) / total) * 100 + '%'; el.appendChild(s);
      if (lab) { const l = document.createElement('div'); l.className = 'lab'; l.style.left = (a / total) * 100 + '%'; l.style.top = 14 + (row || 0) * 10 + 'px'; l.innerHTML = lab; el.appendChild(l); }
    });
    ticks.forEach(([t, n]) => { const k = document.createElement('div'); k.className = 'tick'; k.style.left = (t / total) * 100 + '%'; k.innerHTML = '<span>' + n + '</span>'; el.appendChild(k); });
    el.style.height = '60px';
  }
  function only() {
    const TH = new URLSearchParams(location.search).get('theme') || '';
    const ONLY = TH.startsWith('only-') ? TH.slice(5).split(',') : null;
    if (ONLY) { document.querySelector('header.doc').hidden = true; document.querySelectorAll('section').forEach((s) => { if (!ONLY.some((id) => s.querySelector('#' + id))) s.remove(); }); }
  }
  only();
  const astro = (ctx, x, pose, o = {}) => drawRig(ctx, 'astronaut', Object.assign({ x, y: GROUND, s: SA, pose }, o));
  const rig = (ctx, id, x, pose, s, o = {}) => drawRig(ctx, id, Object.assign({ x, y: GROUND, s, pose }, o));
  return { S, RG, T, SA, SBM, SBC, GROUND, BAR, X, AI, A, P, fr, spr, drawRig, trail, ktext, title, nameText, rnd, world, bars, cam, fx, burst, rise, speedH, radial, ring, ringR, beam, slashLine, slashH, cutIn, impact, board, timeline, astro, rig };
};
