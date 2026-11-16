function draw(g, rand, seed, k) {
  // A young fern frond unrolling into a tight fiddlehead coil
  const { clamp, smooth, solid, sdPolyline, polyD } = k;
  const PI = Math.PI;
  const cx = 262, cy = 92, R0 = 30, R1 = 5;
  const T = 2.25 + rand() * 0.5;           // turns of the crozier
  const mid = (rand() - 0.5) * 16;         // shift of the rachis arc's midpoint
  const th0 = Math.atan2(110 - cy, 240 - cx) + 0.3;
  const lnR = Math.log(R1 / R0);
  const rOf = (u) => R0 * Math.exp(lnR * u);
  const S = (u) => {
    const a = th0 + 2 * PI * T * u, r = rOf(u);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const uOr = Math.log(R0 / 11) / Math.log(R0 / R1); // innermost full turn starts here

  // --- Rachis: Catmull-Rom through the brief's points, then a bridge into the coil.
  const P0 = [128, 196], P1 = [170 + 0.62 * mid, 158 + 0.78 * mid], P2 = [210, 128], P3 = [240, 110];
  const Pm = [2 * P0[0] - P1[0], 2 * P0[1] - P1[1]];
  const cr = (a, b, c, d, t) => [0, 1].map((j) => 0.5 * (2 * b[j] + (c[j] - a[j]) * t +
    (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t * t * t));
  const R = [];
  for (let i = 0; i < 20; i++) R.push(cr(Pm, P0, P1, P2, i / 20));
  for (let i = 0; i < 20; i++) R.push(cr(P0, P1, P2, P3, i / 20));
  const S0 = S(0), Sn = S(0.003);
  const st = norm([Sn[0] - S0[0], Sn[1] - S0[1]]);
  const t0 = norm([P3[0] - P1[0], P3[1] - P1[1]]);
  const B1 = [P2[0] + t0[0] * 18, P2[1] + t0[1] * 18];
  const B2 = [S0[0] - st[0] * 14, S0[1] - st[1] * 14];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, m = 1 - t;
    const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
    R.push([a * P2[0] + b * B1[0] + c * B2[0] + d * S0[0], a * P2[1] + b * B1[1] + c * B2[1] + d * S0[1]]);
  }
  const cum = [0];
  for (let i = 1; i < R.length; i++) cum.push(cum[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
  const Lr = cum[cum.length - 1];
  const rachisHw = (s) => 4.5 + (1 - s) * (1 - s);

  // --- Centreline: rachis then spiral.
  const CX = [], CY = [], HW = [], UU = [];
  for (let i = 0; i < R.length; i++) { CX.push(R[i][0]); CY.push(R[i][1]); HW.push(rachisHw(cum[i] / Lr)); UU.push(-1); }
  const NS = 220;
  for (let i = 1; i <= NS; i++) {
    const u = i / NS, p = S(u);
    CX.push(p[0]); CY.push(p[1]); HW.push(1.5 + 0.1 * rOf(u)); UU.push(u);
  }
  const N = CX.length;
  const DX = [], DY = [], IL2 = [], IL = [];
  let sx0 = 1e9, sx1 = -1e9, sy0 = 1e9, sy1 = -1e9;
  for (let i = 0; i < N; i++) {
    sx0 = Math.min(sx0, CX[i]); sx1 = Math.max(sx1, CX[i]);
    sy0 = Math.min(sy0, CY[i]); sy1 = Math.max(sy1, CY[i]);
    if (i < N - 1) {
      const dx = CX[i + 1] - CX[i], dy = CY[i + 1] - CY[i], l2 = dx * dx + dy * dy || 1e-6;
      DX.push(dx); DY.push(dy); IL2.push(1 / l2); IL.push(1 / Math.sqrt(l2));
    }
  }
  sx0 -= 8; sx1 += 8; sy0 -= 8; sy1 += 8;

  const at = (s) => {
    let i = 0;
    while (i < R.length - 2 && cum[i + 1] < s) i++;
    const h = clamp((s - cum[i]) / ((cum[i + 1] - cum[i]) || 1));
    const tg = norm([R[i + 1][0] - R[i][0], R[i + 1][1] - R[i][1]]);
    return [R[i][0] + (R[i + 1][0] - R[i][0]) * h, R[i][1] + (R[i + 1][1] - R[i][1]) * h, tg[0], tg[1], rachisHw(s / Lr)];
  };

  // --- Pinnae: nine alternating pairs, swept ~55° forward.
  const pinnae = [];
  for (let i = 0; i < 9; i++) {
    for (const side of [-1, 1]) {
      const sfrac = 0.04 + 0.74 * i / 8 + (side > 0 ? 0.045 : 0);
      const [bx, by, tx, ty, hwS] = at(sfrac * Lr);
      const L = (44 - 34 * i / 8) * (1 + (rand() - 0.5) * 0.24);
      const ang = side * (55 + (rand() - 0.5) * 12) * PI / 180;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const ux = tx * ca - ty * sa, uy = tx * sa + ty * ca;
      const nx = -uy, ny = ux;
      const w = 9 - 6 * i / 8;
      const nl = clamp(Math.round(7 - 3 * i / 8) + Math.floor(rand() * 3) - 1, 3, 8);
      const tipX = bx + ux * L, tipY = by + uy * L;
      pinnae.push({
        bx, by, ux, uy, nx, ny, L, w, nl, hwS,
        ss: (-nx - ny) >= 0 ? 1 : -1,
        base: 0.4 + 0.15 * i / 8,
        x0: Math.min(bx, tipX) - w - 2, x1: Math.max(bx, tipX) + w + 2,
        y0: Math.min(by, tipY) - w - 2, y1: Math.max(by, tipY) + w + 2,
      });
    }
  }
  const hP = (p, t) => {
    const f = t / p.L;
    if (f <= 0 || f >= 1) return 0;
    const env = (p.w / 2) * Math.sqrt(clamp(f / 0.14)) * Math.pow(1 - f, 0.65);
    return env * (0.7 + 0.3 * Math.sqrt(Math.abs(Math.sin(PI * p.nl * f))));
  };

  // --- Buds tucked along the inner side of the outer turns.
  const buds = [];
  const nb = 3 + (rand() < 0.5 ? 1 : 0);
  for (let j = 0; j < nb; j++) {
    const u = 0.05 + 0.25 * (j + 0.3 + 0.4 * rand()) / nb;
    const p = S(u), q = S(u + 0.002);
    const tg = norm([q[0] - p[0], q[1] - p[1]]);
    const inw = [-tg[1], tg[0]];
    const off = 1.5 + 0.1 * rOf(u) + 1.9;
    const b = [p[0] + inw[0] * off, p[1] + inw[1] * off];
    buds.push([
      [b[0] - tg[0] * 1.8, b[1] - tg[1] * 1.8],
      [b[0] + tg[0] * 1.0, b[1] + tg[1] * 1.0],
      [b[0] + tg[0] * 1.3 + inw[0] * 1.2, b[1] + tg[1] * 1.3 + inw[1] * 1.2],
    ]);
  }

  g.print((x, y) => {
    if (x < 95 || x > 312 || y < 40 || y > 206) return 0;
    let ink = 0, org = 0;

    // Inner glow of the new tissue.
    const gd = Math.hypot(x - cx, y - cy);
    if (gd < 55) ink = 0.3 * (1 - smooth(clamp(gd / 55)));

    // Pinnae.
    for (const p of pinnae) {
      if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) continue;
      const px = x - p.bx, py = y - p.by;
      const t = px * p.ux + py * p.uy;
      if (t <= 0 || t >= p.L) continue;
      const v = px * p.nx + py * p.ny;
      const h = hP(p, t);
      const av = Math.abs(v);
      if (av > h + 2) continue;
      const inside = solid(av - h);
      let tone = p.base + 0.15 * (smooth(clamp(0.5 + 0.6 * p.ss * v / (h + 0.01))) - 0.5);
      const fade = 1 - smooth(clamp((h - av) / 2));
      tone += (0.3 - tone) * fade;
      ink = Math.max(ink, tone * inside);
    }

    // Buds inside the coil.
    if (gd < 34) for (const b of buds) ink = Math.max(ink, 0.7 * solid(sdPolyline(x, y, b) - 1.4));

    // Rachis and crozier.
    if (x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1) {
      let best = 1e9, bi = 0, bh = 0;
      for (let i = 0; i < N - 1; i++) {
        const px = x - CX[i], py = y - CY[i];
        let h = (px * DX[i] + py * DY[i]) * IL2[i];
        h = h < 0 ? 0 : h > 1 ? 1 : h;
        const ex = px - DX[i] * h, ey = py - DY[i] * h;
        const d2 = ex * ex + ey * ey;
        if (d2 < best) { best = d2; bi = i; bh = h; }
      }
      const hw = HW[bi] + (HW[bi + 1] - HW[bi]) * bh;
      const d = Math.sqrt(best);
      if (d - hw < 3) {
        const body = solid(d - hw);
        const v = ((x - CX[bi]) * DY[bi] - (y - CY[bi]) * DX[bi]) * IL[bi];
        const vs = clamp(v / hw, -1, 1);
        const u0 = UU[bi], u1 = UU[bi + 1];
        if (u1 < 0) {
          const tone = 0.6 + (vs > 0 ? 0.1 * vs : 0.15 * vs);
          ink = Math.max(ink, tone * body);
        } else {
          const u = u0 < 0 ? u1 * bh : u0 + (u1 - u0) * bh;
          const tone = 0.8 + 0.15 * u + 0.04 * vs;
          if (u >= uOr) org = Math.max(org, tone * body);
          else ink = Math.max(ink, tone * body);
        }
      }
    }
    return [ink, org];
  });

  // --- Lines.
  // Pinna outlines (scalloped edge) and midribs.
  for (const p of pinnae) {
    const tA = Math.min(p.hwS, p.L * 0.3);
    const left = [], right = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const t = tA + (p.L - tA) * i / n;
      const h = hP(p, Math.min(t, p.L - 0.001));
      const bx = p.bx + p.ux * t, by = p.by + p.uy * t;
      left.push([bx + p.nx * h, by + p.ny * h]);
      right.push([bx - p.nx * h, by - p.ny * h]);
    }
    g.line(polyD(left.concat(right.reverse())), "soft");
    g.line(polyD([[p.bx + p.ux * tA, p.by + p.uy * tA], [p.bx + p.ux * p.L, p.by + p.uy * p.L]]), "faint");
  }

  // Outer edge of the rachis and the full spiral; the innermost turn in orange.
  const EP = [];
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
    const dv = norm([CX[b] - CX[a], CY[b] - CY[a]]);
    EP.push([CX[i] + dv[1] * HW[i], CY[i] - dv[0] * HW[i]]);
  }
  let split = UU.findIndex((u) => u >= uOr);
  if (split < 1) split = N - 1;
  g.line(polyD(EP.slice(0, split + 1)), "ink");
  g.line(polyD(EP.slice(split)), "sig");

  // Ghost turn still to unroll.
  const ghost = [];
  const ga = th0 + 0.5, gb = th0 + 2 * PI - 0.6;
  for (let i = 0; i <= 80; i++) {
    const f = i / 80, a = ga + (gb - ga) * f, r = 36 - 2 * f;
    ghost.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  g.line(polyD(ghost), "faint", { dash: "3 3" });
}
