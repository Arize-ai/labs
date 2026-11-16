function draw(g, rand, seed, k) {
  // A fern frond rising from the ground, its fiddlehead unfurling in orange
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, sdPolyline, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);

  // The rachis, integrated from a curvature that tightens into a crozier.
  const ds = 1.5, L = 220, L1 = 148 + rand() * 8;
  const raw = [];
  let x = 0, y = 0, th = -Math.PI / 2 + 0.12 + (rand() - 0.5) * 0.12;
  for (let s = 0; s <= L; s += ds) {
    raw.push([x, y, s]);
    const kap = 0.0035 + 0.22 * Math.pow(smooth(clamp((s - L1) / (L - L1))), 1.5);
    th += kap * ds;
    x += Math.cos(th) * ds;
    y += Math.sin(th) * ds;
  }
  const at = (s) => raw[Math.min(raw.length - 1, Math.max(0, Math.round(s / ds)))];

  // Pinnae: tapered, lobed leaflets alternating along the stem.
  const pinRaw = [];
  const sEnd = L1 + 14, lenMax = 44 + rand() * 6;
  for (let s = 16, i = 0; s <= sEnd; s += 8.5, i++) {
    const u = s / sEnd;
    const len = lenMax * Math.pow(1 - u, 0.8) * smooth(clamp(u * 4 + 0.3)) + 3;
    for (const sg of [-1, 1]) {
      const ss = s + sg * 2.2;
      const p = at(ss), q = at(ss + 3);
      const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const ang = ta + sg * (1.12 + 0.08 * (fbm(i * 0.7, sg + 3) - 0.5));
      pinRaw.push({ a: [p[0], p[1]], b: [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len], r0: len * 0.16 + 1, len });
    }
  }

  // Fit the whole frond into the figure box.
  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  const ext = (px, py, r) => {
    bx0 = Math.min(bx0, px - r); bx1 = Math.max(bx1, px + r);
    by0 = Math.min(by0, py - r); by1 = Math.max(by1, py + r);
  };
  for (const p of raw) ext(p[0], p[1], 2);
  for (const p of pinRaw) ext(p.b[0], p.b[1], p.r0 * 0.4);
  const sc = Math.min((X1 - X0) / (bx1 - bx0), (Y1 - Y0) / (by1 - by0));
  const ox = (X0 + X1) / 2 - ((bx0 + bx1) / 2) * sc, oy = (Y0 + Y1) / 2 - ((by0 + by1) / 2) * sc;
  const T = (p) => [ox + p[0] * sc, oy + p[1] * sc];

  const stem = raw.filter((p) => p[2] <= L1).map(T);
  const spiral = raw.filter((p) => p[2] >= L1 - ds).map(T);
  const stemLite = stem.filter((_, i) => i % 4 === 0 || i === stem.length - 1);
  const pinnae = pinRaw.map((p) => {
    const a = T(p.a), b = T(p.b), r0 = p.r0 * sc, pad = r0 + 14;
    return {
      a, b, r0, lobes: Math.max(2, Math.round((p.len * sc) / 6)),
      ex: b[0] - a[0], ey: b[1] - a[1],
      bb: [Math.min(a[0], b[0]) - pad, Math.max(a[0], b[0]) + pad, Math.min(a[1], b[1]) - pad, Math.max(a[1], b[1]) + pad],
    };
  });
  let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity;
  for (const [px, py] of spiral) { sx0 = Math.min(sx0, px); sx1 = Math.max(sx1, px); sy0 = Math.min(sy0, py); sy1 = Math.max(sy1, py); }
  const stemTop = Math.min(...stem.map((p) => p[1])), base = stem[0];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // The frond thins as it nears the ground it grows from.
    const emerge = 1 - 0.55 * smooth(clamp((y - (base[1] - 46)) / 46));
    const lightTL = clamp(1 - ((x - X0) + (y - Y0)) / (X1 - X0 + Y1 - Y0));
    for (const p of pinnae) {
      if (x < p.bb[0] || x > p.bb[1] || y < p.bb[2] || y > p.bb[3]) continue;
      const wx = x - p.a[0], wy = y - p.a[1];
      const t = clamp((wx * p.ex + wy * p.ey) / (p.ex * p.ex + p.ey * p.ey || 1));
      const dist = Math.hypot(wx - p.ex * t, wy - p.ey * t);
      const r = p.r0 * (1 - 0.85 * t) * (0.72 + 0.28 * Math.abs(Math.sin(t * p.lobes * Math.PI + 0.6)));
      const d = dist - r;
      const shade = 0.64 + 0.22 * (1 - t) + 0.12 * lightTL;
      ink = Math.max(ink, (solid(d) * shade + 0.15 * glow(d, 5)) * emerge);
    }
    ink = Math.max(ink, 0.26 * glow(sdPolyline(x, y, stemLite), 3) * emerge);
    if (x > sx0 - 24 && x < sx1 + 24 && y > sy0 - 24 && y < sy1 + 24) {
      const d = sdPolyline(x, y, spiral) - 1.7;
      sig = solid(d) + 0.34 * glow(d, 6);
    }
    return [ink, sig];
  });

  // Midribs, the stem fading into the ground, and the crozier.
  for (const p of pinnae) {
    const e = [p.a[0] + p.ex * 0.82, p.a[1] + p.ey * 0.82];
    g.line(polyD([p.a, e]), p.a[1] > base[1] - 40 ? "faint" : "soft");
  }
  g.fadeLine(polyD(stem), "var(--fg)", 0.85, stemTop, base[1] + 14);
  g.line(polyD(spiral), "sig", { width: 1.25 });
  g.line(`M${num(base[0] - 46)} ${Math.round(base[1]) + 0.5}H${num(base[0] + 46)}`, "faint", { dash: "1 3" });
}
