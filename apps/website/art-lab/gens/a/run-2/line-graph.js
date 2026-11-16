function draw(g, rand, seed, k) {
  // A line graph: lit area under a rising series, peak point in orange
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const n = 8 + Math.floor(rand() * 3);
  const left = X0 + 10, right = X1 - 4, top = Y0 + 6, bottom = Y1 - 4;
  const xOf = (i) => left + ((right - left) * i) / (n - 1);
  const yOf = (v) => bottom - v * (bottom - top);

  // The main series: a noisy upward trend.
  const phase = rand() * 10, lift = 0.35 + rand() * 0.2;
  const vals = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    return clamp(0.22 + lift * u + 0.12 * Math.sin(u * 7 + phase) + 0.22 * (fbm(i * 0.9, phase) - 0.5), 0.1, 0.92);
  });
  const pts = vals.map((v, i) => [xOf(i), yOf(v)]);
  let peak = 0;
  for (let i = 1; i < n; i++) if (vals[i] > vals[peak]) peak = i;
  const pk = pts[peak];

  // A comparison series, flatter, drawn only as a rule.
  const ref = Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    return [xOf(i), yOf(clamp(0.3 + 0.18 * u + 0.1 * (fbm(i * 0.7 + 40, phase) - 0.5), 0.08, 0.9))];
  });

  const lineY = (x) => {
    const t = clamp((x - left) / (right - left)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t)), f = t - i;
    return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
  };
  const segIdx = (x) => Math.min(n - 2, Math.max(0, Math.floor(((x - left) / (right - left)) * (n - 1))));
  const markR = 3.2;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x >= left - 14 && x <= right + 14 && y >= top - 20 && y <= bottom + 6) {
      if (x >= left && x <= right) {
        const cy = lineY(x);
        if (y > cy && y < bottom) {
          // Area under the line: bright at the line, falling to the axis, lit from the left.
          const u = (x - left) / (right - left);
          const a = 0.55 * Math.exp(-(y - cy) / 40) * (1 - 0.25 * u) * smooth(clamp((bottom - y) / 8));
          ink = Math.max(ink, a);
        }
      }
      const s = segIdx(x);
      const near = pts.slice(Math.max(0, s - 1), Math.min(n, s + 3));
      ink = Math.max(ink, 0.32 * glow(sdPolyline(x, y, near), 3.5));
      for (let i = Math.max(0, s - 1); i < Math.min(n, s + 3); i++) {
        if (i === peak) continue;
        const d = Math.hypot(x - pts[i][0], y - pts[i][1]) - markR;
        ink = Math.max(ink, 0.2 * glow(d, 4));
      }
    }
    const pd = Math.hypot(x - pk[0], y - pk[1]) - 4;
    sig = solid(pd) + 0.42 * glow(pd, 7);
    return [ink, sig];
  });

  // Gridlines and axes.
  for (let r = 1; r <= 4; r++) {
    const gy = Math.round(yOf(r / 4)) + 0.5;
    g.line(`M${left} ${gy}H${X1}`, "faint", { dash: "1 3" });
  }
  for (let i = 0; i < n; i++) g.line(`M${Math.round(xOf(i)) + 0.5} ${Y1}v4`, "soft");
  g.line(`M${X0 + 0.5} ${Y0}V${Y1 + 0.5}H${X1}`, "soft");

  // The comparison series, then the main line with hollow markers.
  g.line(polyD(ref), "soft", { dash: "4 3" });
  g.line(polyD(pts), "ink", { width: 1.25 });
  const circle = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${num(2 * r)} 0a${r} ${r} 0 1 0 ${num(-2 * r)} 0Z`;
  for (let i = 0; i < n; i++) {
    if (i === peak) continue;
    g.line(circle(pts[i][0], pts[i][1], markR), "ink", { fill: true });
  }
  // A dotted drop from the peak to the axis.
  g.line(`M${Math.round(pk[0]) + 0.5} ${num(pk[1] + 7)}V${Y1}`, "soft", { dash: "1 3" });
  g.line(circle(pk[0], pk[1], 6.5), "sig");
}
