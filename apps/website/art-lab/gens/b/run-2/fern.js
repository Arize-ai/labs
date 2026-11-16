function draw(g, rand, seed, k) {
  // A single fern frond, its tip still curled into a fiddlehead
  const { clamp, solid, polyD } = k;
  const cx = 240, cy = 80;
  const R = 16 + rand() * 4;
  const T = 2.2 + rand() * 0.6;
  const DEG = Math.PI / 180;

  // Nearest distance to a polyline, plus fractional position along it (0..1).
  const near = (x, y, pts) => {
    let best = 1e18, bi = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1];
      const bx = pts[i + 1][0] - ax, by = pts[i + 1][1] - ay;
      const l2 = bx * bx + by * by || 1;
      let t = ((x - ax) * bx + (y - ay) * by) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x - ax - bx * t, ey = y - ay - by * t, d2 = ex * ex + ey * ey;
      if (d2 < best) { best = d2; bi = i + t; }
    }
    return [Math.sqrt(best), bi / (pts.length - 1)];
  };
  const cum = (pts) => {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  };

  // The crozier: a clockwise spiral starting at its left side, heading up.
  const a0 = Math.PI, N = 180;
  const spiral = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, th = a0 + 2 * Math.PI * T * u, r = 1.5 + (R - 1.5) * (1 - u);
    spiral.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  const spC = cum(spiral), spTotal = spC[N];
  let tipI = N;
  while (tipI > 0 && spC[tipI] > spTotal - 6) tipI--;
  const tip = spiral.slice(tipI);
  const outerU = 1 / T;

  // The rachis: a cubic from the foot through ~(190,140), arriving at the coil heading up.
  const S = spiral[0];
  const B = [[168, 194], [165, 165], [S[0] - 4, 112], S];
  const cub = (t) => {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * B[0][0] + b * B[1][0] + c * B[2][0] + d * B[3][0], a * B[0][1] + b * B[1][1] + c * B[2][1] + d * B[3][1]];
  };
  const stem = [];
  for (let i = 0; i <= 60; i++) stem.push(cub(i / 60));
  const stC = cum(stem), stTotal = stC[60];
  const at = (f) => {
    const target = f * stTotal;
    let i = 0;
    while (i < 59 && stC[i + 1] < target) i++;
    const t = (target - stC[i]) / (stC[i + 1] - stC[i] || 1);
    const a = stem[i], b = stem[i + 1];
    return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  let sx0 = 1e9, sx1 = -1e9, sy0 = 1e9, sy1 = -1e9;
  for (const [x, y] of stem) { sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y); }

  // Pinnae: 9 alternating pairs, tapering 48 → 12.
  const pinnae = [];
  for (let j = 0; j < 9; j++) {
    for (const side of [0, 1]) {
      const f = 0.07 + ((j + side * 0.5) / 9) * 0.72;
      const { p, ang } = at(f);
      const jit = (rand() * 2 - 1) * 6 * DEG;
      const a = ang + (side === 0 ? -55 : 55) * DEG + jit;
      const L = (48 - (36 * j) / 8) * (1 + (rand() * 2 - 1) * 0.12);
      const lobes = Math.max(2, Math.round((L / 4.5) * (0.8 + 0.4 * rand())));
      const dir = [Math.cos(a), Math.sin(a)], nrm = [-Math.sin(a), Math.cos(a)];
      const ul = -nrm[0] - nrm[1] > 0 ? 1 : -1;
      const fac = 0.75 + (0.25 * j) / 8;
      const hw = (s) => 3.5 * Math.pow(Math.max(0, 1 - s), 0.75) * (0.72 + 0.28 * Math.abs(Math.sin(Math.PI * lobes * s)));
      const end = [p[0] + dir[0] * L, p[1] + dir[1] * L];
      pinnae.push({
        p, dir, nrm, L, ul, fac, hw, end,
        bx0: Math.min(p[0], end[0]) - 5, bx1: Math.max(p[0], end[0]) + 5,
        by0: Math.min(p[1], end[1]) - 5, by1: Math.max(p[1], end[1]) + 5,
        M: lobes * 6,
      });
    }
  }

  // Unopened buds clinging just above the coil.
  const buds = [];
  const nb = 3 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < nb; i++) {
    const th = (-150 + (120 * (i + 0.5)) / nb + (rand() * 2 - 1) * 6) * DEG;
    const sz = 4 + rand() * 2;
    const rr = R + 2.6 + sz / 2 * 0.6;
    buds.push({ x: cx + rr * Math.cos(th), y: cy + rr * Math.sin(th), r: sz / 2, th });
  }

  g.print((x, y) => {
    if (y > 194 || x < 110 || x > 300 || y < 30) return 0;
    let ink = 0, org = 0;

    // Glow around the coil, quiet inside its gaps so the spiral stays legible.
    const dc = Math.hypot(x - cx, y - cy);
    if (dc < R + 34) {
      const e = dc - R;
      ink = e > 0 ? 0.5 * Math.pow(clamp(1 - e / 34), 2) : 0.12;
    }

    // The coil itself.
    if (dc < R + 5) {
      const [d, u] = near(x, y, spiral);
      const hw = 2.6 - 0.8 * u;
      ink = Math.max(ink, solid(d - hw) * (u < outerU ? 1.0 : 0.8));
      const [dt] = near(x, y, tip);
      org = solid(dt - 2.2) + 0.25 * Math.exp(-dt / 4);
    }

    // Buds.
    for (const b of buds) {
      const bd = Math.hypot(x - b.x, y - b.y) - b.r;
      if (bd < 3) ink = Math.max(ink, 0.7 * solid(bd));
    }

    // Rachis.
    if (x > sx0 - 5 && x < sx1 + 5 && y > sy0 - 5 && y < sy1 + 5) {
      const [d, fr] = near(x, y, stem);
      if (d < 5) ink = Math.max(ink, solid(d - 2.4) * (0.5 + 0.3 * fr));
    }

    // Pinnae.
    for (const q of pinnae) {
      if (x < q.bx0 || x > q.bx1 || y < q.by0 || y > q.by1) continue;
      const dx = x - q.p[0], dy = y - q.p[1];
      const a = dx * q.dir[0] + dy * q.dir[1];
      if (a < 0 || a > q.L) continue;
      const c = dx * q.nrm[0] + dy * q.nrm[1];
      const h = q.hw(a / q.L);
      const e = solid(Math.abs(c) - h);
      if (e <= 0) continue;
      const v = clamp((c * q.ul) / (h || 1), -1, 1);
      let t = 0.475 + 0.125 * v;
      if (Math.abs(c) < 1.3) t = 0.7;
      ink = Math.max(ink, t * q.fac * e);
    }

    return [ink, org];
  });

  // Pinna outlines and midribs.
  for (const q of pinnae) {
    const upper = [], lower = [];
    for (let i = 0; i <= q.M; i++) {
      const s = i / q.M, a = s * q.L, h = q.hw(s);
      const bx = q.p[0] + q.dir[0] * a, by = q.p[1] + q.dir[1] * a;
      upper.push([bx + q.nrm[0] * h, by + q.nrm[1] * h]);
      lower.push([bx - q.nrm[0] * h, by - q.nrm[1] * h]);
    }
    g.line(polyD(upper.concat(lower.reverse()), true), "soft");
    const m = 0.9 * q.L;
    g.line(polyD([q.p, [q.p[0] + q.dir[0] * m, q.p[1] + q.dir[1] * m]]), "faint");
  }

  // Bud outlines.
  for (const b of buds) {
    const r = b.r;
    g.line(`M${(b.x - r).toFixed(2)} ${b.y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`, "soft");
  }

  // Rachis and full spiral, then the orange tip over it.
  g.line(polyD(stem.concat(spiral.slice(1))), "ink", { width: 1.2 });
  g.line(polyD(tip), "sig", { width: 1.6 });

  // Ground horizon.
  g.line(`M128 194.5H212`, "faint", { dash: "4 3" });
}
