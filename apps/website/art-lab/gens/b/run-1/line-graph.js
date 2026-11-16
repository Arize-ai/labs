function draw(g, rand, seed, k) {
  // A line graph climbing to its newest point, still glowing
  const { clamp, smooth, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed);

  const ax = 96, ay = 186, axTop = 62, axRight = 310;
  const x0 = 100, x1 = 290;

  // The reference profile from the brief; vertices are sampled from it, then jittered.
  const profile = [[100, 172], [124, 160], [148, 166], [172, 136], [196, 146], [220, 114], [244, 124], [266, 90], [290, 98]];
  const interp = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const [xa, ya] = pts[i - 1], [xb, yb] = pts[i];
        return ya + (yb - ya) * (x - xa) / (xb - xa);
      }
    }
    return pts[pts.length - 1][1];
  };

  const n = 8 + Math.floor(rand() * 4); // 8–11 vertices
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * i / (n - 1);
    let y = interp(profile, x);
    if (i === n - 1) y = 84 + rand() * 24;
    else if (i > 0) y = clamp(y + (rand() * 2 - 1) * 10, 72, 180);
    pts.push([x, y]);
  }
  const [px, py] = pts[n - 1];

  g.print((x, y) => {
    if (x < ax - 4 || x > px + 40 || y < py - 40 || y > ay + 4) return 0;
    let ink = 0;
    if (x >= x0 && x <= x1 && y < ay) {
      const cy = interp(pts, x);
      if (y > cy) {
        const t = clamp((y - cy) / (ay - cy));
        // Left third stays almost dark; the mass brightens toward the peak.
        const u = clamp((x - x0) / (x1 - x0));
        const topTone = 0.15 + 0.3 * smooth(clamp((u - 0.3) / 0.25)) + 0.05 * smooth(clamp((u - 0.55) / 0.45));
        ink = topTone + (0.08 - topTone) * t + 0.04 * (fbm(x / 7, y / 7) - 0.5);
      }
    }
    // The newest reading: tone 1 inside r5, 0.3 by r22, gone by r34.
    const r = Math.hypot(x - px, y - py);
    let sig = 0;
    if (r < 5) sig = 1;
    else if (r < 22) sig = 1 - 0.7 * smooth((r - 5) / 17);
    else if (r < 34) sig = 0.3 * (1 - smooth((r - 22) / 12));
    return [ink, sig];
  });

  // Gridlines, faint and dashed.
  for (const gy of [150, 114, 78]) g.line(`M${ax} ${gy + 0.5}H${axRight}`, "faint", { dash: "4 3" });

  // Axes.
  g.line(`M${ax + 0.5} ${axTop}V${ay + 0.5}H${axRight}`, "soft");

  // Ticks at each vertex on the horizontal axis.
  for (const [vx] of pts) g.line(`M${num(vx) }${" "}${ay}V${ay - 3}`, "faint");

  // Projection guides from the final point.
  g.line(`M${num(px) } ${num(py + 5)}V${ay}`, "soft", { dash: "2 3" });
  g.line(`M${num(px - 5)} ${num(py)}H${ax}`, "soft", { dash: "2 3" });

  // The polyline: the subject.
  g.line(polyD(pts), "ink", { width: 1.5 });

  // A crisp rim on the final point.
  const rr = 5;
  g.line(`M${num(px - rr)} ${num(py)}a${rr} ${rr} 0 1 0 ${2 * rr} 0a${rr} ${rr} 0 1 0 ${-2 * rr} 0`, "sig");
}
