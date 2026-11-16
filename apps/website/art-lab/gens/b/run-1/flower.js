function draw(g, rand, seed, k) {
  // A single open cosmos bloom on a slender stem, botanical plate
  const { clamp, smooth, solid, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);
  const CX = 205, CY = 100;
  const rot = (rand() * 2 - 1) * 8 * Math.PI / 180;
  const f = 0.6 + (rand() * 2 - 1) * 0.04;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const UL = [-Math.SQRT1_2, -Math.SQRT1_2];
  const toScreen = (u, v) => { const b = v * f; return [CX + u * cr - b * sr, CY + u * sr + b * cr]; };
  const toPlane = (x, y) => { const dx = x - CX, dy = y - CY; return [dx * cr + dy * sr, (-dx * sr + dy * cr) / f]; };

  // Central disc, an ellipse about 26 by 18.
  const DA = 13, DB = 13 * 0.69 * (f / 0.6);
  const discLocal = (x, y) => {
    const dx = x - CX, dy = y - CY;
    const a = dx * cr + dy * sr, b = -dx * sr + dy * cr;
    return [a, b, Math.hypot(a / DA, b / DB)];
  };
  const discPt = (ang, r) => {
    const a = r * DA * Math.cos(ang), b = r * DB * Math.sin(ang);
    return [CX + a * cr - b * sr, CY + a * sr + b * cr];
  };

  // Petals in the flower's own plane, then foreshortened.
  const phi0 = rand() * Math.PI / 4;
  const petals = [];
  for (let i = 0; i < 8; i++) {
    petals.push({
      phi: phi0 + i * Math.PI / 4 + (rand() * 2 - 1) * 0.07,
      L: 62 * (1 + (rand() * 2 - 1) * 0.1),
      hw: 12 * (1 + (rand() * 2 - 1) * 0.1),
      s0: 11, hidden: false,
    });
  }
  const sdir = (phi) => {
    const [x, y] = toScreen(Math.cos(phi), Math.sin(phi));
    const dx = x - CX, dy = y - CY, h = Math.hypot(dx, dy);
    return [dx / h, dy / h];
  };
  const byLR = petals.slice().sort((p, q) => {
    const a = sdir(p.phi), b = sdir(q.phi);
    return (b[0] + b[1]) - (a[0] + a[1]);
  });
  const hA = byLR[0], hB = byLR[1];
  let diff = hB.phi - hA.phi;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  hA.phi += Math.sign(diff) * 0.17;
  hB.phi -= Math.sign(diff) * 0.17;
  hA.hidden = hB.hidden = true;
  const order = [hA, hB, ...petals.filter((p) => !p.hidden)];
  for (const p of order) {
    p.c = Math.cos(p.phi); p.s = Math.sin(p.phi);
    const d = sdir(p.phi);
    p.m = clamp((d[0] * UL[0] + d[1] * UL[1] + 1) / 2);
    const [px, py] = toScreen(-p.s, p.c);
    p.sc = Math.hypot(px - CX, py - CY);
  }
  const taper = (cn) => (cn < 0 ? 1 - 0.45 * cn * cn : 1);
  const insideP = (p, u, v) => {
    const s = u * p.c + v * p.s, t = -u * p.s + v * p.c;
    const dx = s - (p.s0 + 0.62 * p.L);
    const a = dx > 0 ? 0.38 * p.L : 0.62 * p.L;
    const cn = dx / a;
    if (cn <= -1 || cn >= 1) return null;
    const hwv = p.hw * taper(cn) * Math.sqrt(1 - cn * cn);
    if (Math.abs(t) >= hwv) return null;
    return { q: (s - p.s0) / p.L, t };
  };
  const coveredBy = (from, x, y) => {
    if (discLocal(x, y)[2] < 1) return true;
    const [u, v] = toPlane(x, y);
    for (let j = from + 1; j < order.length; j++) if (insideP(order[j], u, v)) return true;
    return false;
  };
  const headCovers = (x, y) => coveredBy(-1, x, y);

  // Stamens standing up around the disc rim, pollen at their tips.
  const up = [sr, -cr];
  const stamens = [];
  for (let i = 0; i < 14; i++) {
    const ang = i * 2 * Math.PI / 14 + (rand() * 2 - 1) * 0.12;
    const p = discPt(ang, 0.95);
    const ox = p[0] - CX, oy = p[1] - CY, oh = Math.hypot(ox, oy) || 1;
    const len = 5 + rand() * 2;
    const tip = [p[0] + up[0] * len * 0.85 + (ox / oh) * len * 0.35, p[1] + up[1] * len * 0.85 + (oy / oh) * len * 0.35];
    stamens.push([p, tip]);
  }

  // Stem: a faint S from the head's underside down to the bottom rule.
  const SP = [[212, 118], [216, 140], [186, 165], [188, 194]];
  const stem = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50, mt = 1 - t;
    const w0 = mt * mt * mt, w1 = 3 * t * mt * mt, w2 = 3 * t * t * mt, w3 = t * t * t;
    const px = w0 * SP[0][0] + w1 * SP[1][0] + w2 * SP[2][0] + w3 * SP[3][0];
    const py = w0 * SP[0][1] + w1 * SP[1][1] + w2 * SP[2][1] + w3 * SP[3][1];
    const tx = -3 * mt * mt * SP[0][0] + 3 * (mt * mt - 2 * t * mt) * SP[1][0] + 3 * (2 * t * mt - t * t) * SP[2][0] + 3 * t * t * SP[3][0];
    const ty = -3 * mt * mt * SP[0][1] + 3 * (mt * mt - 2 * t * mt) * SP[1][1] + 3 * (2 * t * mt - t * t) * SP[2][1] + 3 * t * t * SP[3][1];
    const th = Math.hypot(tx, ty);
    stem.push({ p: [px, py], n: [-ty / th, tx / th] });
  }
  const sxTab = {};
  for (let y = 118; y <= 194; y++) {
    let j = 0;
    while (j < stem.length - 2 && stem[j + 1].p[1] < y) j++;
    const a = stem[j].p, b = stem[j + 1].p;
    const t = clamp((y - a[1]) / ((b[1] - a[1]) || 1));
    sxTab[y] = a[0] + (b[0] - a[0]) * t;
  }
  const sxAt = (y) => {
    const y0 = Math.floor(y), y1 = Math.min(194, y0 + 1);
    const t = y - y0;
    return sxTab[y0] * (1 - t) + sxTab[y1] * t;
  };
  const nearestStem = (yy) => stem.reduce((best, s) => (Math.abs(s.p[1] - yy) < Math.abs(best.p[1] - yy) ? s : best), stem[0]);

  // Leaf: a lance from the stem up and to the right.
  const LA = nearestStem(160).p, LB = [248, 142];
  const ldx = LB[0] - LA[0], ldy = LB[1] - LA[1], llen = Math.hypot(ldx, ldy);
  const ld = [ldx / llen, ldy / llen], ln = [ld[1], -ld[0]]; // ln points up
  const leafHW = (q) => 5 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(clamp(q), 0.85))), 0.8);
  const leafMid = (q) => 3 * Math.sin(Math.PI * q);
  const leafAt = (x, y) => {
    const rx = x - LA[0], ry = y - LA[1];
    const q = (rx * ld[0] + ry * ld[1]) / llen;
    if (q <= 0 || q >= 1) return 0;
    const tt = rx * ln[0] + ry * ln[1] - leafMid(q);
    const h = leafHW(q);
    if (Math.abs(tt) >= h) return 0;
    return 0.35 + 0.15 * clamp(tt / h);
  };

  // Bud: a small oval leaning left.
  const BC = [150, 150], bal = -0.35, bca = Math.cos(bal), bsa = Math.sin(bal);
  const budPt = (ang) => {
    const a = 4.5 * Math.cos(ang), b = 7 * Math.sin(ang);
    return [BC[0] + a * bca - b * bsa, BC[1] + a * bsa + b * bca];
  };

  g.print((x, y) => {
    if (x < 70 || x > 320 || y < 0 || y > 200) return 0;
    let org = 0;
    if (Math.abs(x - CX) < 32 && Math.abs(y - CY) < 28) {
      for (const [, tp] of stamens) org = Math.max(org, solid(Math.hypot(x - tp[0], y - tp[1]) - 2));
    }
    const dx = x - CX, dy = y - CY, h = Math.hypot(dx, dy) || 1;
    const dUL = (dx * UL[0] + dy * UL[1]) / h;
    const [a, b, e] = discLocal(x, y);
    if (e < 1) {
      const ink = 0.3 + 0.15 * smooth(clamp((e - 0.5) / 0.5)) * clamp(dUL);
      if (b < 0) org = Math.max(org, 0.72 + 0.25 * fbm(x / 3, y / 3));
      return [ink, org];
    }
    const [u, v] = toPlane(x, y);
    for (let i = order.length - 1; i >= 0; i--) {
      const p = order[i];
      const r = insideP(p, u, v);
      if (!r) continue;
      let tone;
      if (p.hidden) tone = 0.33 + 0.04 * clamp(r.q);
      else {
        const tip = 0.6 + 0.3 * p.m, base = 0.45 + 0.1 * p.m;
        tone = base + (tip - base) * smooth(clamp(r.q));
      }
      if (Math.abs(r.t) * p.sc < 1.7 && r.q > 0.08 && r.q < 0.9) tone -= 0.13;
      tone += 0.04 * (fbm(x / 7, y / 7) - 0.5);
      return [tone, org];
    }
    if (org > 0.05) return [0, org];
    if (y >= 118 && y <= 194) {
      const sx = sxAt(y);
      if (Math.abs(x - sx) < 2.7) return 0.4 + (x < sx ? 0.12 : 0);
    }
    const lf = leafAt(x, y);
    if (lf) return lf;
    {
      const bx = x - BC[0], by = y - BC[1];
      const lx = bx * bca + by * bsa, ly = -bx * bsa + by * bca;
      if (Math.hypot(lx / 4.5, ly / 7) < 1) return 0.5 + 0.06 * clamp(-lx / 4.5);
    }
    const e2 = Math.hypot(a / 74, b / (74 * f));
    const side = clamp(0.35 + 0.9 * dUL);
    return 0.25 * smooth(clamp((1.6 - e2) / 0.7)) * side;
  });

  const segs = (pts, vis, stroke, opts) => {
    let run = [];
    const flush = () => { if (run.length > 1) g.line(polyD(run), stroke, opts); run = []; };
    for (const pt of pts) { if (vis(pt[0], pt[1])) run.push(pt); else flush(); }
    flush();
  };

  // Stem edges, hidden where the head sits in front.
  segs(stem.map((s) => [s.p[0] + s.n[0] * 2.6, s.p[1] + s.n[1] * 2.6]), (x, y) => !headCovers(x, y), "ink");
  segs(stem.map((s) => [s.p[0] - s.n[0] * 2.6, s.p[1] - s.n[1] * 2.6]), (x, y) => !headCovers(x, y), "soft");

  // Leaf outline and midrib.
  const leafPt = (q, side) => {
    const off = leafMid(q) + side * leafHW(q);
    return [LA[0] + ld[0] * llen * q + ln[0] * off, LA[1] + ld[1] * llen * q + ln[1] * off];
  };
  const leafOutline = [];
  for (let i = 0; i <= 30; i++) leafOutline.push(leafPt(i / 30, 1));
  for (let i = 30; i >= 0; i--) leafOutline.push(leafPt(i / 30, -1));
  segs(leafOutline, (x, y) => !headCovers(x, y), "ink");
  const leafRib = [];
  for (let i = 1; i <= 26; i++) leafRib.push(leafPt(0.03 + i / 30, 0));
  segs(leafRib, (x, y) => !headCovers(x, y), "faint");

  // Bud and its short side stem.
  const budOutline = [];
  for (let i = 0; i <= 40; i++) budOutline.push(budPt(i / 40 * 2 * Math.PI));
  segs(budOutline, (x, y) => !headCovers(x, y), "soft");
  const bb = budPt(Math.PI / 2);
  const js = nearestStem(176);
  const J = [js.p[0] + js.n[0] * 2.6, js.p[1] + js.n[1] * 2.6];
  const ctl = [(bb[0] + J[0]) / 2 - 6, Math.max(bb[1], J[1]) + 2];
  const budStem = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, mt = 1 - t;
    budStem.push([mt * mt * bb[0] + 2 * mt * t * ctl[0] + t * t * J[0], mt * mt * bb[1] + 2 * mt * t * ctl[1] + t * t * J[1]]);
  }
  segs(budStem, (x, y) => !headCovers(x, y), "soft");

  // Petal outlines with notched tips, and their midribs.
  const g3 = (d) => Math.exp(-(d / 0.045) * (d / 0.045));
  order.forEach((p, idx) => {
    const pts = [];
    for (let th = -Math.PI; th <= Math.PI + 1e-6; th += 0.02) {
      const cn = Math.cos(th), sn = Math.sin(th);
      const a = cn > 0 ? 0.38 * p.L : 0.62 * p.L;
      let s = p.s0 + 0.62 * p.L + a * cn;
      const t = p.hw * taper(cn) * sn;
      if (Math.abs(th) < 0.6) s -= 2 * (g3(th + 0.26) + g3(th) + g3(th - 0.26));
      pts.push(toScreen(s * p.c - t * p.s, s * p.s + t * p.c));
    }
    segs(pts, (x, y) => !coveredBy(idx, x, y), "ink");
    const rib = [];
    for (let i = 0; i <= 20; i++) {
      const s = p.s0 + 0.67 * p.L * i / 20;
      rib.push(toScreen(s * p.c, s * p.s));
    }
    segs(rib, (x, y) => !coveredBy(idx, x, y), "faint");
  });

  // Disc outline, then the stamens and their pollen.
  const discOutline = [];
  for (let i = 0; i < 48; i++) discOutline.push(discPt(i / 48 * 2 * Math.PI, 1));
  g.line(polyD(discOutline, true), "soft");
  for (const [p0, tp] of stamens) {
    g.line(`M${num(p0[0])} ${num(p0[1])}L${num(tp[0])} ${num(tp[1])}`, "soft");
    g.line(`M${num(tp[0] - 1.1)} ${num(tp[1])}a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0`, "sig");
  }

  // The single understated nod toward the light.
  const E = [120, 60];
  const ux = E[0] - CX, uy = E[1] - CY, uh = Math.hypot(ux, uy);
  const ud = [ux / uh, uy / uh], perp = [-ud[1], ud[0]];
  const S = [CX + ud[0] * 16, CY + ud[1] * 16];
  const M = [(S[0] + E[0]) / 2 + perp[0] * 4, (S[1] + E[1]) / 2 + perp[1] * 4];
  const arc = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, mt = 1 - t;
    arc.push([mt * mt * S[0] + 2 * mt * t * M[0] + t * t * E[0], mt * mt * S[1] + 2 * mt * t * M[1] + t * t * E[1]]);
  }
  segs(arc, (x, y) => !headCovers(x, y), "faint", { dash: "2 4" });
}
