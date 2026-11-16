function draw(g, rand, seed, k) {
  // A rising line graph whose newest point glows like a lit filament
  const { clamp, smooth, solid, polyD, num } = k;

  const ox = 100, oy = 182, axTop = 62, axRight = 304;
  const base = [[100, 162], [128, 150], [152, 157], [178, 128], [204, 138], [230, 106], [256, 115], [284, 78]];
  // Jitter interior points by up to ±8; the first and last stay put, so the
  // final reading (y 78) is still the highest of them all.
  const pts = base.map(([x, y], i) => (i === 0 || i === base.length - 1) ? [x, y] : [x, y + (rand() * 2 - 1) * 8]);
  const [mx, my] = pts[pts.length - 1];
  const R = 22 + rand() * 8;

  // Trace height at x, and whether that segment is a climb (y decreasing).
  const traceAt = (x) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0);
        return { y: y0 + (y1 - y0) * t, rising: y1 < y0, t };
      }
    }
    return null;
  };

  g.print((x, y) => {
    if (x < ox - 6 || x > mx + R + 4 || y < my - R - 4 || y > oy + 4) return 0;
    let ink = 0;
    if (x >= ox && x <= mx && y <= oy) {
      const tr = traceAt(x);
      if (tr && y >= tr.y) {
        const t = clamp((y - tr.y) / (oy - tr.y));
        ink = 0.55 - 0.45 * t;
        // Upper-left light catches the climbs, strongest at their left foot.
        if (tr.rising) ink += 0.1 * (1 - 0.5 * tr.t);
        // Soft top edge so the curtain hangs from the line rather than past it.
        ink *= clamp((y - tr.y) / 2 + 0.5);
      }
    }
    // The live point: a hard orange core inside a glow that fades to 0 at R.
    const r = Math.hypot(x - mx, y - my);
    const orange = Math.max(solid(r - 4), r < R ? 1 - smooth(r / R) : 0);
    return [ink, orange];
  });

  // Gridlines, faint and dashed.
  for (const gy of [142, 102, 62]) g.line(`M${ox} ${gy + 0.5}H${axRight}`, "faint", { dash: "4 3" });
  // Axes.
  g.line(`M${ox + 0.5} ${axTop}V${oy + 0.5}H${axRight}`, "soft");
  // Ticks below each data point's x.
  for (const [px] of pts) g.line(`M${num(px) + 0.5} ${oy + 0.5}V${oy + 4.5}`, "soft");
  // Leader from the marker down to the axis.
  g.line(`M${num(mx) + 0.5} ${num(my + 5)}V${oy}`, "faint", { dash: "1 3" });
  // The trace.
  g.line(polyD(pts), "ink", { width: 1.5 });
  // Interior data dots: too small for the screen, so they are crisp marks.
  const rr = 1.5;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    g.line(`M${num(px - rr)} ${num(py)}a${rr} ${rr} 0 1 0 ${2 * rr} 0a${rr} ${rr} 0 1 0 ${-2 * rr} 0Z`, "ink", { fill: true });
  }
}
