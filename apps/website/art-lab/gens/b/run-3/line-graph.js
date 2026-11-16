function draw(g, rand, seed, k) {
  // A rising line graph, its newest point lit in orange
  const { clamp, smooth, solid, polyD } = k;

  // Data: first point fixed, interior vertices jittered, final point held near (296, 70).
  const base = [[108, 168], [132, 150], [156, 158], [180, 128], [204, 136], [228, 104], [252, 112], [276, 84], [296, 70]];
  const pts = base.map(([x, y], i) => (i > 0 && i < base.length - 1) ? [x, y + (rand() * 2 - 1) * 8] : [x, y]);
  const last = pts[pts.length - 1];
  const peak = 0.4 + rand() * 0.15;
  const axisY = 186, axisX = 100, right = 306;
  const dotR = 2.5, finalR = 4.5, glowR = 24;

  // Height of the curve at x, by linear interpolation along the polyline.
  const curveY = (x) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if (x >= ax && x <= bx) return ay + (by - ay) * ((x - ax) / (bx - ax));
    }
    return null;
  };

  g.print((x, y) => {
    if (x < 96 || x > 324 || y < 42 || y > 190) return 0;
    let ink = 0;

    // Area band: brightest just under the curve, dissolving toward the baseline.
    if (x >= pts[0][0] && x <= last[0]) {
      const cy = curveY(x);
      if (cy !== null && y >= cy && y <= axisY) {
        const t = clamp((axisY - y) / Math.max(1, axisY - cy));
        const ul = 0.05 * t * clamp((last[0] - x) / (last[0] - pts[0][0]));
        ink = 0.08 + (peak - 0.08) * t + ul;
      }
    }

    // Vertex markers on the first eight points.
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(x - pts[i][0], y - pts[i][1]) - dotR;
      if (d < 3) ink = Math.max(ink, 0.85 * solid(d));
    }

    // Final point: full-tone orange dot with a glow fading to nothing at radius 24.
    let sig = 0;
    const r = Math.hypot(x - last[0], y - last[1]);
    if (r < glowR + 2) {
      const core = solid(r - finalR);
      const halo = 0.6 * smooth(clamp(1 - (r - finalR) / (glowR - finalR)));
      sig = Math.max(core, halo);
    }

    return [ink, sig];
  });

  // Gridlines: faint, dashed.
  for (const gy of [146, 106, 66]) g.line(`M${axisX} ${gy + 0.5}H${right}`, "faint", { dash: "4 3" });

  // Axes: half strength, meeting in a clean corner.
  g.line(`M${axisX + 0.5} 60V${axisY + 0.5}H${right}`, "soft");

  // Ticks hanging below the horizontal axis.
  for (const tx of [156, 204, 252, 296]) g.line(`M${tx + 0.5} ${axisY + 0.5}V${axisY + 4.5}`, "faint");

  // Drop line from the final point to the axis.
  g.line(`M${last[0] + 0.5} ${last[1] + finalR + 1}V${axisY}`, "faint", { dash: "1 3" });

  // Data polyline: full ink, stopping at the edge of the orange dot.
  const prev = pts[pts.length - 2];
  const dx = last[0] - prev[0], dy = last[1] - prev[1];
  const len = Math.hypot(dx, dy);
  const end = [last[0] - (dx / len) * finalR, last[1] - (dy / len) * finalR];
  g.line(polyD([...pts.slice(0, -1), end]), "ink", { width: 1.5 });
}
