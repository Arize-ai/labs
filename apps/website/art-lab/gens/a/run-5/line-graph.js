function draw(g, rand, seed, k) {
  // A two-series line chart; the latest peak is ringed in orange
  const { X0, X1, Y0, Y1, clamp, solid, glow, sdPolyline, polyD, num } = k;

  // The chart frame: the axes sit at the box's left and bottom edges.
  const ax = X0 + 2, ay = Y1 - 2;
  const yOf = (v) => ay - 6 - v * (ay - 6 - (Y0 + 6));

  // Data points, evenly spaced along x.
  const N = 8 + Math.floor(rand() * 3);
  const xs0 = ax + 14, xs1 = X1 - 6, dx = (xs1 - xs0) / (N - 1);
  const xs = Array.from({ length: N }, (_, i) => xs0 + i * dx);

  // Stretches a raw series so its lowest value maps to lo and its highest to hi.
  const rescale = (arr, lo, hi) => {
    const mn = Math.min(...arr), mx = Math.max(...arr);
    return arr.map((v) => lo + ((v - mn) / (mx - mn || 1)) * (hi - lo));
  };

  // Primary series: a rising random walk. Secondary: a flatter, noisier one.
  let v = 0;
  const raw = xs.map(() => (v += 0.6 + (rand() - 0.35) * 1.6));
  const prim = rescale(raw, 0.12, 0.9).map((u, i) => [xs[i], yOf(u)]);
  let w = 0;
  const raw2 = xs.map(() => (w += (rand() - 0.45) * 1.2));
  const sec = rescale(raw2, 0.08, 0.48).map((u, i) => [xs[i], yOf(u)]);

  // The orange point: the primary series' highest value (smallest y).
  let pk = 0;
  prim.forEach((p, i) => { if (p[1] < prim[pk][1]) pk = i; });
  const peak = prim[pk];

  // Only the segments near x can be close to (x, y).
  const near = (pts, x) => {
    const i = clamp(Math.floor((x - xs0) / dx), 0, N - 2);
    return pts.slice(Math.max(0, i - 1), Math.min(N, i + 3));
  };
  // The primary line's height at x, for the light pooled beneath it.
  const lineY = (x) => {
    const i = clamp(Math.floor((x - xs0) / dx), 0, N - 2);
    const t = clamp((x - xs[i]) / dx);
    return prim[i][1] + (prim[i + 1][1] - prim[i][1]) * t;
  };

  g.print((x, y) => {
    if (x < ax - 10 || x > X1 + 12 || y < Y0 - 14 || y > ay + 8) return 0;
    let ink = 0, sig = 0;

    // Light pooling under the primary line, fading toward the axis.
    if (x >= xs0 && x <= xs1) {
      const cy = lineY(x);
      if (y > cy) ink = 0.2 * Math.exp(-(y - cy) / 38) * clamp((ay - y) / 8);
    }

    // Glow along both lines.
    ink = Math.max(ink, 0.3 * glow(sdPolyline(x, y, near(prim, x)), 3.5));
    ink = Math.max(ink, 0.12 * glow(sdPolyline(x, y, near(sec, x)), 3));

    // Point markers, lit from the upper left.
    const i0 = clamp(Math.round((x - xs0) / dx), 0, N - 1);
    for (let i = Math.max(0, i0 - 1); i <= Math.min(N - 1, i0 + 1); i++) {
      if (i === pk) continue;
      const [px, py] = prim[i];
      const d = Math.hypot(x - px, y - py) - 3.2;
      const shade = 1 - 0.2 * clamp((x - px + y - py) / 8 + 0.5);
      ink = Math.max(ink, solid(d) * 0.95 * shade + 0.22 * glow(d, 5));
    }

    // The peak marker, in orange.
    const pd = Math.hypot(x - peak[0], y - peak[1]) - 4;
    sig = solid(pd) + 0.4 * glow(pd, 7);
    return [ink, sig];
  });

  // Dotted gridlines.
  for (let gI = 1; gI <= 4; gI++) {
    const gy = Math.round(yOf(gI / 4)) + 0.5;
    g.line(`M${ax} ${gy}H${X1}`, "faint", { dash: "1 3" });
    g.line(`M${ax - 4} ${gy}h4`, "soft");
  }

  // Axes, with a tick under each data point.
  g.line(`M${ax + 0.5} ${Y0 - 4}V${ay + 0.5}H${X1}`, "soft");
  for (const x of xs) g.line(`M${Math.round(x) + 0.5} ${ay}v4`, "soft");

  // The two series: secondary soft, primary in full ink.
  g.line(polyD(sec), "soft");
  g.line(polyD(prim), "ink", { width: 1.25 });

  // A dotted guide from the peak down to the axis, and a ring around it.
  const gx = Math.round(peak[0]) + 0.5;
  g.line(`M${gx} ${num(peak[1] + 9)}V${ay}`, "faint", { dash: "1 3" });
  const r = 7.5;
  g.line(`M${num(peak[0] - r)} ${num(peak[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, "sig");
}
