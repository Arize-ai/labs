function draw(g, rand, seed, k) {
  // A single fern frond unrolling from a fiddlehead curl
  const { clamp, solid, sdPolyline, polyD } = k;
  const TAU = Math.PI * 2;

  // ---- Stem: a quadratic arc through (190,140) ----
  const A = [132, 194], C = [196, 138], B = [236, 90];
  const stemPts = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
    stemPts.push([a * A[0] + b * C[0] + c * B[0], a * A[1] + b * C[1] + c * B[1]]);
  }
  const cum = [0];
  for (let i = 1; i < stemPts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(stemPts[i][0] - stemPts[i - 1][0], stemPts[i][1] - stemPts[i - 1][1]));
  const Ltot = cum[cum.length - 1];
  const at = (s) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const p0 = stemPts[i - 1], p1 = stemPts[i];
    const f = clamp((s - cum[i - 1]) / (cum[i] - cum[i - 1]));
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy);
    return [p0[0] + dx * f, p0[1] + dy * f, dx / l, dy / l];
  };

  // Base: a short bare length continuing backward toward the card edge.
  const bdx = A[0] - C[0], bdy = A[1] - C[1], bl = Math.hypot(bdx, bdy);
  const baseEnd = [A[0] + (bdx / bl) * 14, A[1] + (bdy / bl) * 14];
  const basePts = [A, baseEnd];

  // ---- Leaflets: eleven alternating pairs ----
  const sA = cum[12], sB = Ltot - 16;
  const spacingSum = (1 - Math.pow(0.9, 10)) / 0.1;
  const baseSp = (sB - sA) / spacingSum;
  const leaves = [];
  let sPos = sA;
  for (let i = 0; i < 11; i++) {
    const sp = baseSp * Math.pow(0.9, i);
    const size = Math.pow(0.85, i);
    const f = 0.72 + 0.28 * Math.min(1, i / 5); // dim toward the base
    for (const side of [1, -1]) {
      const pos = side === 1 ? sPos : sPos + 0.45 * sp;
      const [bx, by, ux, uy] = at(pos);
      const nS = [uy, -ux]; // upper-left normal of the stem
      const ang = ((60 + 6 * (2 * rand() - 1)) * Math.PI) / 180;
      const dir = [Math.cos(ang) * ux + side * Math.sin(ang) * nS[0], Math.cos(ang) * uy + side * Math.sin(ang) * nS[1]];
      let nl = [-dir[1], dir[0]];
      if (nl[0] + nl[1] > 0) nl = [-nl[0], -nl[1]]; // nl points to the upper-left edge
      const dUp = -dir[1];
      const bv = [-dUp * dir[0], -1 - dUp * dir[1]];
      const cb = 0.15 * (bv[0] * nl[0] + bv[1] * nl[1]); // cupping: tip bends upward
      const L = 48 * size * (1 + 0.08 * (2 * rand() - 1));
      const Wd = 9 * size;
      const n = Math.max(5, Math.min(8, Math.round(7 - i * 0.25 + (2 * rand() - 1))));
      const lf = { bx, by, dir, nl, L, Wd, n, cb, f };
      // outline and bbox
      const N = 16 * n, e1 = [], e2 = [];
      for (let j = 0; j <= N; j++) {
        const s = j / N, [hw] = halfW(lf, s), m = s * L, o = cb * s * s * L;
        e1.push([bx + dir[0] * m + nl[0] * (o + hw), by + dir[1] * m + nl[1] * (o + hw)]);
        e2.push([bx + dir[0] * m + nl[0] * (o - hw), by + dir[1] * m + nl[1] * (o - hw)]);
      }
      lf.outline = e1.concat(e2.reverse());
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of lf.outline) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      lf.bb = [x0 - 3, y0 - 3, x1 + 3, y1 + 3];
      lf.rib = [];
      for (let j = 0; j <= 12; j++) {
        const s = 0.04 + (0.66 * j) / 12, m = s * L, o = cb * s * s * L;
        lf.rib.push([bx + dir[0] * m + nl[0] * o, by + dir[1] * m + nl[1] * o]);
      }
      leaves.push(lf);
    }
    sPos += sp;
  }
  function halfW(lf, s) {
    const prof = Math.sqrt(clamp(s / 0.15)) * Math.pow(Math.max(0, 1 - s), 0.6) * 1.1;
    const lr = Math.pow(Math.abs(Math.sin(Math.PI * lf.n * s)), 0.6);
    return [(lf.Wd / 2) * prof * (0.78 + 0.22 * lr), lr];
  }

  // ---- Fiddlehead: a logarithmic coil ----
  const cx = 250, cy = 98;
  const th0 = Math.atan2(B[1] - cy, B[0] - cx);
  const r0 = Math.hypot(B[0] - cx, B[1] - cy), rc = 3;
  const T = 2.25 + 0.5 * rand();
  const q = 0.88 + 0.24 * rand();
  const nb = Math.round(T * 6);
  const rAt = (s) => r0 * Math.pow(rc / r0, Math.pow(Math.max(0, s), q));
  const thAt = (s) => th0 + TAU * T * s;
  const hwAt = (r) => 0.13 * r + 0.3;
  const bumpAt = (s, r) => {
    if (s < 0.04 || s > 0.72) return 0;
    const u = (s - 0.04) / 0.68;
    return (0.1 * r + 0.4) * Math.pow(Math.abs(Math.sin(Math.PI * nb * u)), 0.8);
  };
  const s6 = Math.pow(Math.log(6 / r0) / Math.log(rc / r0), 1 / q);

  // Overall bounding box
  let gx0 = cx - 42, gy0 = cy - 42, gx1 = cx + 42, gy1 = cy + 42;
  for (const lf of leaves) { gx0 = Math.min(gx0, lf.bb[0]); gy0 = Math.min(gy0, lf.bb[1]); gx1 = Math.max(gx1, lf.bb[2]); gy1 = Math.max(gy1, lf.bb[3]); }
  gx0 = Math.min(gx0, baseEnd[0] - 4); gy1 = Math.max(gy1, baseEnd[1] + 4);

  g.print((x, y) => {
    if (x < gx0 || x > gx1 || y < gy0 || y > gy1) return 0;
    let ink = 0;

    // Leaflets
    for (const lf of leaves) {
      const bb = lf.bb;
      if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
      const dx = x - lf.bx, dy = y - lf.by;
      const s = (dx * lf.dir[0] + dy * lf.dir[1]) / lf.L;
      if (s <= 0 || s >= 1) continue;
      const v = dx * lf.nl[0] + dy * lf.nl[1] - lf.cb * s * s * lf.L;
      const [hw, lr] = halfW(lf, s);
      if (Math.abs(v) > hw + 3) continue;
      const inside = solid(Math.abs(v) - hw);
      const tt = clamp((v / Math.max(hw, 0.01) + 1) / 2);
      let tone = 0.45 + 0.35 * tt;
      if (lr > 0.8 && Math.abs(v) / Math.max(hw, 0.01) > 0.55) tone += 0.12; // lobe tip
      ink = Math.max(ink, tone * lf.f * inside);
    }

    // Stem: thin band, brighter on its upper-left side
    if (x > 124 && x < 242 && y > 84 && y < 200) {
      const d = sdPolyline(x, y, stemPts);
      if (d < 5) {
        const dUL = sdPolyline(x + 1.4, y + 1.4, stemPts);
        ink = Math.max(ink, 0.42 * solid(d - 2) + 0.18 * solid(dUL - 1.4));
      }
    }
    // Bare base, fading toward the card edge
    {
      const d = sdPolyline(x, y, basePts);
      if (d < 4) {
        const f = clamp(((x - A[0]) * (baseEnd[0] - A[0]) + (y - A[1]) * (baseEnd[1] - A[1])) / 196);
        ink = Math.max(ink, 0.42 * (1 - f) * solid(d - 2));
      }
    }

    // Fiddlehead
    const dx = x - cx, dy = y - cy, rho = Math.hypot(dx, dy);
    if (rho < 44) {
      const phi = Math.atan2(dy, dx);
      let coil = 0;
      for (let kk = -1; kk <= 4; kk++) {
        const s = (phi - th0 + TAU * kk) / (TAU * T);
        if (s < 0 || s > 1) continue;
        const r = rAt(s), hw = hwAt(r), dr = rho - r;
        const lim = hw + (dr > 0 ? bumpAt(s, r) : 0);
        coil = Math.max(coil, solid(Math.abs(dr) - lim));
      }
      ink = Math.max(ink, (0.93 + 0.07 * clamp(1 - rho / 18)) * coil);
      // Light given off by the new growth
      if (rho < 40) ink = Math.max(ink, 0.32 * Math.pow(1 - rho / 40, 1.6));
      // The growing point
      const core = solid(rho - 6);
      if (core > 0) return [ink * (1 - core), core];
    }
    return ink;
  });

  // ---- Lines ----
  for (const lf of leaves) {
    g.line(polyD(lf.outline, true), "soft");
    g.line(polyD(lf.rib), "faint");
  }

  // Stem traced from base to the fiddlehead core
  const centreOuter = [], centreCore = [], edgeOuter = [], edgeCore = [];
  const NS = 260;
  for (let j = 0; j <= NS; j++) {
    const s = j / NS, r = rAt(s), th = thAt(s);
    const c = [cx + r * Math.cos(th), cy + r * Math.sin(th)];
    const re = r + hwAt(r) + bumpAt(s, r);
    const e = [cx + re * Math.cos(th), cy + re * Math.sin(th)];
    if (s <= s6) { centreOuter.push(c); edgeOuter.push(e); }
    if (s >= s6 - 0.5 / NS) { centreCore.push(c); edgeCore.push(e); }
  }
  g.line(polyD(stemPts.concat(centreOuter)), "ink");
  g.fadeLine(`M${A[0]} ${A[1]}L${baseEnd[0].toFixed(2)} ${baseEnd[1].toFixed(2)}`, "var(--fg)", 1, 196, 204);

  // Fiddlehead outer edge, and the orange growing point
  g.line(polyD(edgeOuter), "ink");
  g.line(polyD(edgeCore), "sig");
  g.line(polyD(centreCore), "sig");

  // Growth arc: a quarter turn beyond the coil, the path the tip will unroll along
  const arc = [];
  for (let j = 0; j <= 30; j++) {
    const t = j / 30, th = -1.9 + (Math.PI / 2) * t, r = 24 + 4 * t;
    arc.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  g.line(polyD(arc), "faint", { dash: "2 3" });
}
