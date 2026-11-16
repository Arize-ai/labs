function draw(g, rand, seed, k) {
  // A fern frond arching up, its unfurling fiddlehead tip in orange
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, sdPolyline, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);

  // The rachis: a quadratic arch from the base up and over to the right.
  const B = [128 + rand() * 10, Y1 - 2];
  const C = [138 + rand() * 14, 58 + rand() * 10];
  const E = [252 + rand() * 12, 82 + rand() * 8];
  const q = (t) => {
    const u = 1 - t;
    return [u * u * B[0] + 2 * u * t * C[0] + t * t * E[0], u * u * B[1] + 2 * u * t * C[1] + t * t * E[1]];
  };
  const tan = (t) => {
    const dx = 2 * (1 - t) * (C[0] - B[0]) + 2 * t * (E[0] - C[0]);
    const dy = 2 * (1 - t) * (C[1] - B[1]) + 2 * t * (E[1] - C[1]);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  const rachis = Array.from({ length: 61 }, (_, i) => q(i / 60));

  // The fiddlehead: a log spiral continuing the rachis's heading, curling down.
  const [ex, ey] = tan(1);
  let h = Math.atan2(ey, ex), px = E[0], py = E[1];
  const spiral = [[px, py]];
  for (let phi = 0; phi < 2.2 * Math.PI; phi += 0.08) {
    const r = 15 * Math.exp(-phi * 0.38);
    px += Math.cos(h) * r * 0.08; py += Math.sin(h) * r * 0.08;
    h += 0.08;
    spiral.push([px, py]);
  }
  const coil = spiral[spiral.length - 1];
  const sxs = spiral.map((p) => p[0]), sys = spiral.map((p) => p[1]);
  const sb = [Math.min(...sxs) - 24, Math.max(...sxs) + 24, Math.min(...sys) - 24, Math.max(...sys) + 24];

  // Pinnae: tapered, lobed leaflets alternating along the rachis, swept toward the tip.
  const n = 13 + Math.floor(rand() * 3), sweep = 0.55 + rand() * 0.15;
  const pinnae = [];
  for (let i = 0; i < n; i++) {
    for (const side of [1, -1]) {
      const u = (i + (side < 0 ? 0.5 : 0)) / n;
      const t = 0.07 + 0.79 * u;
      const [tx, ty] = tan(t), a = q(t);
      const nx = -ty * side, ny = tx * side;
      let dx = nx * Math.cos(sweep) + tx * Math.sin(sweep), dy = ny * Math.cos(sweep) + ty * Math.sin(sweep);
      const L = 7 + 42 * Math.sin(Math.PI * (0.25 + 0.75 * u));
      const b = [a[0] + dx * L, a[1] + dy * L];
      const wmax = 2 + 0.17 * L, lobes = Math.max(2, Math.round(L / 6.5));
      const pad = wmax + 4;
      pinnae.push({
        a, b, dx, dy, L, wmax, lobes, side,
        bb: [Math.min(a[0], b[0]) - pad, Math.max(a[0], b[0]) + pad, Math.min(a[1], b[1]) - pad, Math.max(a[1], b[1]) + pad],
      });
    }
  }
  const width = (p, s) => p.wmax * Math.pow(1 - s, 0.7) * (0.55 + 0.45 * Math.abs(Math.cos(s * Math.PI * p.lobes)));
  const pinnaD = (p, x, y) => {
    const wx = x - p.a[0], wy = y - p.a[1];
    const along = wx * p.dx + wy * p.dy, s = along / p.L;
    if (s < 0) return Math.hypot(wx, wy) - p.wmax * 0.55;
    if (s > 1) return Math.hypot(x - p.b[0], y - p.b[1]);
    return Math.abs(wx * p.dy - wy * p.dx) - width(p, s);
  };

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (const p of pinnae) {
      const bb = p.bb;
      if (x < bb[0] || x > bb[1] || y < bb[2] || y > bb[3]) continue;
      const d = pinnaD(p, x, y);
      const s = clamp(((x - p.a[0]) * p.dx + (y - p.a[1]) * p.dy) / p.L);
      // Lit from the upper left: upper leaflets and leaflet bases brighter.
      const lightSide = p.side * 1 > 0 ? 0.92 : 0.78;
      const tone = (lightSide - 0.3 * s) * (0.92 + 0.16 * (fbm(x / 6, y / 6) - 0.5));
      ink = Math.max(ink, solid(d) * tone + 0.12 * glow(d, 5));
    }
    if (x > 90 && x < 290 && y > 50 && y < 200) ink = Math.max(ink, 0.28 * glow(sdPolyline(x, y, rachis), 3));
    if (x > sb[0] && x < sb[1] && y > sb[2] && y < sb[3]) {
      const d = sdPolyline(x, y, spiral) - 1.6;
      sig = solid(d) + 0.35 * glow(d, 6);
    }
    return [ink, sig];
  });

  // Structure: stipe emerging from the ground, rachis, midribs, and the coil.
  g.fadeLine(`M${num(B[0])} ${num(B[1])}L${num(B[0] - 3)} ${num(B[1] + 26)}`, "var(--fg)", 0.85, B[1], B[1] + 26);
  g.line(polyD(rachis), "ink", { width: 1.5 });
  for (const p of pinnae) {
    const e = [p.a[0] + p.dx * p.L * 0.92, p.a[1] + p.dy * p.L * 0.92];
    g.line(polyD([p.a, e]), "soft");
  }
  g.line(polyD(spiral), "sig", { width: 1.5 });
  g.line(`M${num(coil[0] - 2)} ${num(coil[1])}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z`, "sig");
}
