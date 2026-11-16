function draw(g, rand, seed, k) {
  // A rising line graph whose last point glows like a lit filament
  const { clamp, solid, polyD, num } = k;

  const axisX = 96, axisY = 186, axisTop = 62, axisRight = 308;
  const base = [[106, 162], [130, 150], [152, 157], [176, 130], [200, 139], [224, 110], [248, 121], [270, 92], [290, 78]];

  // Jitter the interior vertices. Clamping keeps the overall rise and keeps the last vertex highest.
  const pts = base.map(([x, y], i) => {
    if (i === 0 || i === base.length - 1) return [x, y];
    const lo = 78 + 8 + (7 - i) * 4;  // top limit: stays below the final point, more so further left
    const hi = 170 - i * 6;           // bottom limit: keeps the trend climbing
    return [x, clamp(y + (rand() * 2 - 1) * 8, lo, hi)];
  });
  const [fx, fy] = pts[pts.length - 1];
  const discR = 4.5;
  const glowR = 18 + rand() * 8;

  // y of the polyline at x, or null outside its span
  const lineY = (x) => {
    if (x < pts[0][0] || x > fx) return null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x >= x0 && x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
    }
    return null;
  };
  const markers = pts.slice(0, -1);

  g.print((x, y) => {
    if (x < axisX - 4 || x > axisRight + 8 || y < 50 || y > axisY + 4) return 0;
    let ink = 0, orange = 0;

    // Area under the line: 0.55 just beneath it, falling to 0.08 at the axis.
    // A small gap below the line keeps the stroke crisp.
    const ly = lineY(x);
    if (ly !== null && y > ly + 2 && y < axisY) {
      const t = clamp((y - (ly + 2)) / (axisY - (ly + 2)));
      ink = 0.55 + (0.08 - 0.55) * t;
    }

    // Vertex markers
    for (const [mx, my] of markers) {
      const d = Math.hypot(x - mx, y - my) - 2.5;
      if (d < 3) ink = Math.max(ink, 0.9 * solid(d));
    }

    // Final point and its glow, slightly stronger toward the upper left
    const dx = x - fx, dy = y - fy;
    const dist = Math.hypot(dx, dy);
    if (dist < glowR + 4) {
      const d = dist - discR;
      const core = solid(d);
      let halo = 0;
      if (d > 0) {
        const t = clamp(d / (glowR - discR));
        const dir = dist > 0 ? -(dx + dy) / (dist * Math.SQRT2) : 0; // +1 toward the upper left
        halo = 0.7 * (1 - t) * (1 - t) * (1 + 0.2 * dir);
      }
      orange = Math.max(core, halo);
    }

    return [ink, orange];
  });

  // Gridlines
  for (const gy of [146, 106, 66]) g.line(`M${axisX} ${gy + 0.5}H304`, "faint", { dash: "4 3" });
  // Axes
  g.line(`M${axisX + 0.5} ${axisY}V${axisTop}`, "soft");
  g.line(`M${axisX} ${axisY + 0.5}H${axisRight}`, "ink");
  // Drop line from the final point to the axis
  g.line(`M${num(fx + 0.5)} ${num(fy + discR)}V${axisY}`, "faint", { dash: "1 3" });
  // Data line
  g.line(polyD(pts), "ink", { width: 1.2 });
}
