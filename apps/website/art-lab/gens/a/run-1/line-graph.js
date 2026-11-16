function draw(g, rand, seed, k) {
  // A line graph: two series on axes, the peak point marked orange
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const ax = X0 + 4, ay = Y1;
  const N = 8;
  const left = ax + 14, right = X1 - 6;
  const xOf = (i) => left + ((right - left) * i) / (N - 1);
  const yOf = (v) => ay - 8 - v * (ay - 8 - (Y0 + 6));

  // Main series: a noisy upward trend. Second: a flatter baseline series.
  const phase = rand() * 10, lift = 0.35 + rand() * 0.2;
  const main = [], other = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const v = clamp(0.18 + lift * smooth(u) + 0.22 * (fbm(i * 0.9 + phase, 3.1) - 0.5) + 0.06 * Math.sin(i * 1.7 + phase), 0.06, 0.95);
    main.push([xOf(i), yOf(v)]);
    const w = clamp(0.3 + 0.08 * u + 0.18 * (fbm(i * 0.8 + phase, 9.7) - 0.5), 0.05, 0.9);
    other.push([xOf(i), yOf(w)]);
  }
  // The point of the figure: the series' highest point.
  let peak = 0;
  for (let i = 1; i < N; i++) if (main[i][1] < main[peak][1]) peak = i;
  const pk = main[peak];

  // Curve height at x, for the light pooling under the line.
  const curveY = (x) => {
    if (x <= left) return main[0][1];
    if (x >= right) return main[N - 1][1];
    const f = ((x - left) / (right - left)) * (N - 1), i = Math.floor(f), t = f - i;
    return main[i][1] + (main[Math.min(i + 1, N - 1)][1] - main[i][1]) * t;
  };

  g.print((x, y) => {
    if (x < ax - 4 || x > right + 16 || y < Y0 - 12 || y > ay + 6) return 0;
    let ink = 0, sig = 0;
    // Area under the main line, brightest at the line, fading to the axis.
    if (x >= left && x <= right) {
      const cy = curveY(x);
      if (y > cy && y < ay) ink = 0.32 * Math.exp(-(y - cy) / 30) * clamp((ay - y) / 8) * (1 - 0.2 * clamp((x - left) / (right - left)));
    }
    // Glow around the line.
    ink = Math.max(ink, 0.3 * glow(sdPolyline(x, y, main), 4));
    // Data points: solid round markers, lit from the upper left.
    for (let i = 0; i < N; i++) {
      if (i === peak) continue;
      const dx = x - main[i][0], dy = y - main[i][1];
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) continue;
      const d = Math.hypot(dx, dy) - 3.2;
      ink = Math.max(ink, solid(d) * (0.85 + 0.1 * clamp(-(dx + dy) / 6)) + 0.25 * glow(d, 4));
    }
    const pd = Math.hypot(x - pk[0], y - pk[1]) - 4;
    sig = solid(pd) + 0.4 * glow(pd, 7);
    return [ink, sig];
  });

  // Gridlines and axes.
  for (let r = 1; r <= 4; r++) {
    const gy = Math.round(yOf(r / 4)) + 0.5;
    g.line(`M${ax} ${gy}H${X1}`, "faint", { dash: "1 3" });
    g.line(`M${ax - 4} ${gy}h4`, "soft");
  }
  g.line(`M${ax + 0.5} ${Y0 - 4}V${ay + 0.5}H${X1}`, "soft");
  for (let i = 0; i < N; i++) g.line(`M${Math.round(xOf(i)) + 0.5} ${ay}v4`, "soft");

  // The comparison series, as rules only with hollow markers.
  g.line(polyD(other), "faint", { width: 1.25 });
  for (const [x, y] of other) g.box(x - 2.5, y - 2.5, 5, 5, "soft");

  // The main series and the peak marker's crosshair.
  g.line(polyD(main), "ink", { width: 1.25 });
  g.line(`M${num(pk[0]) + 0.5} ${num(pk[1]) + 8}V${ay}`, "soft", { dash: "1 3" });
  g.line(`M${num(pk[0] - 7)} ${num(pk[1])}a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z`, "sig");
}
