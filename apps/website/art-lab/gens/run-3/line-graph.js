function draw(g, rand, seed, k) {
  // A rising line graph over dotted gridlines; the latest point is orange.
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const n = 9;
  const ax = X0 + 2, gx0 = X0 + 14, gx1 = X1 - 6;
  const yOf = (v) => Y1 - v * (Y1 - Y0);
  const phase = rand() * 6;

  // The main series climbs with some noise. The last point is the high.
  const vals = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    vals.push(clamp(0.18 + 0.5 * u + 0.07 * Math.sin(u * 9 + phase) + 0.14 * (rand() - 0.5), 0.08, 0.8));
  }
  vals[n - 1] = Math.min(0.9, Math.max(...vals) + 0.07 + rand() * 0.04);
  const pts = vals.map((v, i) => [gx0 + ((gx1 - gx0) * i) / (n - 1), yOf(v)]);

  // A quieter comparison series.
  const cmp = [];
  for (let i = 0; i <= 32; i++) {
    const u = i / 32;
    cmp.push([gx0 + (gx1 - gx0) * u, yOf(0.26 + 0.16 * u + 0.08 * (fbm(u * 6, phase) - 0.5))]);
  }

  const step = (gx1 - gx0) / (n - 1);
  const lineY = (x) => {
    const t = clamp((x - gx0) / step, 0, n - 1 - 1e-6), i = Math.floor(t), f = t - i;
    return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
  };
  const tip = pts[n - 1];

  g.print((x, y) => {
    let ink = 0;
    if (x >= gx0 && x <= gx1) {
      const cy = lineY(x);
      // The light pools under the line. It is brightest near the line and
      // toward the upper left.
      if (y > cy && y < Y1) {
        const u = (x - gx0) / (gx1 - gx0);
        ink = 0.42 * Math.exp(-(y - cy) / 30) * clamp((Y1 - y) / 8) * (1 - 0.2 * u);
      }
      const i = clamp(Math.floor((x - gx0) / step), 0, n - 2);
      const near = pts.slice(Math.max(0, i - 1), Math.min(n, i + 3));
      ink = Math.max(ink, 0.32 * glow(sdPolyline(x, y, near), 4));
    }
    // A soft halo around each data point.
    for (let i = 0; i < n - 1; i++) {
      const dx = x - pts[i][0];
      if (dx > 14 || dx < -14) continue;
      ink = Math.max(ink, 0.3 * glow(Math.hypot(dx, y - pts[i][1]) - 3, 4));
    }
    const td = Math.hypot(x - tip[0], y - tip[1]) - 4;
    return [ink, solid(td) + 0.42 * glow(td, 7)];
  });

  // Gridlines and axes.
  for (const v of [0.25, 0.5, 0.75]) g.line(`M${ax} ${num(Math.round(yOf(v)) + 0.5)}H${X1}`, "faint", { dash: "1 3" });
  g.line(`M${ax + 0.5} ${Y0 - 4}V${Y1 + 0.5}H${X1}`, "soft");
  for (const [px] of pts) g.line(`M${num(Math.round(px) + 0.5)} ${Y1}v4`, "soft");

  // The comparison series, then the main series.
  g.line(polyD(cmp), "faint", { width: 1.25 });
  g.line(polyD(pts), "ink", { width: 1.25 });

  // Hollow markers that knock out the line beneath them, and the orange high.
  const circ = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  for (let i = 0; i < n - 1; i++) g.line(circ(pts[i][0], pts[i][1], 2.5), "ink", { fill: true });
  g.line(circ(tip[0], tip[1], 4), "sig");
  g.line(`M${num(tip[0])} ${num(tip[1] + 6)}V${Y1}`, "soft", { dash: "1 3" });
}
