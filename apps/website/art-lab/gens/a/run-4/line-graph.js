function draw(g, rand, seed, k) {
  // A plotted series of data points with the latest point marked
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const left = X0 + 6, right = X1 - 6, base = Y1, top = Y0 + 6;
  const n = 8 + Math.floor(rand() * 3);
  const step = (right - left) / (n - 1);
  const yOf = (v) => base - v * (base - top);

  // A main series that trends upward with noise, and a flatter comparison series.
  const phase = rand() * 10, rise = 0.35 + rand() * 0.2;
  const vals = [], ref = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    vals.push(clamp(0.22 + rise * smooth(u) + 0.22 * (fbm(u * 4 + phase, phase) - 0.5) + 0.06 * Math.sin(u * 9 + phase), 0.1, 0.95));
    ref.push(clamp(0.3 + 0.12 * u + 0.12 * (fbm(u * 3 + phase + 40, 3) - 0.5), 0.08, 0.9));
  }
  const pts = vals.map((v, i) => [left + i * step, yOf(v)]);
  const refPts = ref.map((v, i) => [left + i * step, yOf(v)]);
  const last = pts[n - 1];
  const r = 3.2;

  g.print((x, y) => {
    if (x < left - 14 || x > right + 14 || y < top - 20 || y > base + 2) return 0;
    // The line's height at x, by its segment.
    const s = clamp(Math.floor((x - left) / step), 0, n - 2);
    const t = clamp((x - pts[s][0]) / step);
    const ly = pts[s][1] + (pts[s + 1][1] - pts[s][1]) * t;
    // The area under the line, lit from the upper left.
    let ink = 0;
    if (x >= left && x <= right && y > ly) {
      const shade = 1 - 0.3 * clamp((x - left) / (right - left));
      ink = 0.3 * Math.exp(-(y - ly) / 40) * clamp((base - y) / 8) * shade;
    }
    // A glow along the line, from nearby segments only.
    const a = Math.max(0, s - 1), b = Math.min(n, s + 3);
    ink = Math.max(ink, 0.32 * glow(sdPolyline(x, y, pts.slice(a, b)), 3.5));
    // Data point markers.
    const i = clamp(Math.round((x - left) / step), 0, n - 1);
    let sig = 0;
    if (i < n - 1) {
      const d = Math.hypot(x - pts[i][0], y - pts[i][1]) - r;
      ink = Math.max(ink, 0.9 * solid(d));
    }
    const ld = Math.hypot(x - last[0], y - last[1]) - r - 0.6;
    sig = solid(ld) + 0.42 * glow(ld, 7);
    return [ink, sig];
  });

  // Dotted gridlines and the axes.
  for (let q = 1; q <= 3; q++) {
    const gy = Math.round(yOf(q / 4 + 0.05)) + 0.5;
    g.line(`M${left - 6} ${gy}H${right + 6}`, "faint", { dash: "1 3" });
  }
  g.line(`M${left - 6.5} ${top - 10}V${base + 0.5}H${right + 6}`, "soft");
  for (let i = 0; i < n; i++) {
    const tx = Math.round(pts[i][0]) + 0.5;
    g.line(`M${tx} ${base + 0.5}v4`, "soft");
  }

  // The comparison series, then the main line and its markers.
  g.line(polyD(refPts), "soft", { dash: "4 3" });
  g.line(polyD(pts), "ink", { width: 1.25 });
  const circle = ([cx, cy], rr) =>
    `M${num(cx - rr)} ${num(cy)}a${rr} ${rr} 0 1 0 ${num(2 * rr)} 0a${rr} ${rr} 0 1 0 ${num(-2 * rr)} 0Z`;
  for (let i = 0; i < n - 1; i++) g.line(circle(pts[i], r + 1), "ink");
  g.line(circle(last, r + 1.6), "sig", { width: 1.25 });
  // A dotted drop from the latest point to its axis.
  g.line(`M${num(last[0]) + 0.5} ${num(last[1] + r + 4)}V${base}`, "soft", { dash: "1 3" });
}
