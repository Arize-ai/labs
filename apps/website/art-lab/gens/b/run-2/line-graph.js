function draw(g, rand, seed, k) {
  // A rising line graph whose newest point burns at the peak
  const { clamp, solid, glow, sdPolyline, polyD, num } = k;

  const ox = 96, oy = 186, axR = 306, axT = 60;
  const base = [[104, 160], [130, 148], [156, 154], [182, 122], [208, 132], [234, 98], [260, 108], [286, 76]];
  // Jitter interior vertices; keep the endpoints fixed and the final point highest.
  const pts = base.map(([x, y], i) => {
    if (i === 0 || i === base.length - 1) return [x, y];
    const jy = y + (rand() * 2 - 1) * 8;
    return [x, Math.max(86, Math.min(176, jy))];
  });
  const last = pts[pts.length - 1];
  const R = 20 + rand() * 8; // final glow radius

  // Trace height at a given x.
  const traceY = (x) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if (x >= ax && x <= bx) return ay + (by - ay) * (x - ax) / (bx - ax);
    }
    return null;
  };
  const markers = pts.slice(0, -1);

  g.print((x, y) => {
    if (x < ox || y > oy || x > axR || y < axT - 10) return 0;
    let ink = 0, sig = 0;

    // Area under the trace: 0.5 just below the trace, 0.08 at the axis.
    if (x >= 104 && x <= 286) {
      const ty = traceY(x);
      if (ty !== null && y > ty) {
        const t = clamp((y - ty) / (oy - ty));
        ink = 0.5 - 0.42 * t;
      }
    }

    // Narrow glow band hugging the trace, falling off on both sides.
    const dl = sdPolyline(x, y, pts);
    if (dl < 9) ink = Math.max(ink, 0.7 * Math.exp(-(dl * dl) / 18));

    // The first seven markers.
    for (const [mx, my] of markers) {
      const dm = Math.hypot(x - mx, y - my) - 2.5;
      if (dm < 4) ink = Math.max(ink, 0.9 * solid(dm));
    }

    // The final reading: a burning orange marker with its glow.
    const r = Math.hypot(x - last[0], y - last[1]);
    if (r < R + 4) {
      const dm = r - 5;
      const bias = clamp(((last[0] - x) + (last[1] - y)) / (2 * R) * 0.5 + 0.5); // stronger to the upper left
      const fall = clamp(1 - (r - 5) / (R - 5));
      const halo = 0.8 * fall * fall * (0.8 + 0.35 * bias);
      sig = Math.max(solid(dm), Math.min(0.85, halo));
      if (dm < 0) ink = Math.max(ink, 0.6);
    }

    return [ink, sig];
  });

  // Gridlines, faint and dashed.
  for (const gy of [150, 114, 78]) g.line(`M${ox} ${gy + 0.5}H${axR}`, "faint", { dash: "2 3" });

  // Axes.
  g.line(`M${ox + 0.5} ${axT}V${oy + 0.5}H${axR}`, "soft");

  // Ticks below the horizontal axis and left of the vertical axis.
  for (let tx = 104; tx <= 286; tx += 26) g.line(`M${tx + 0.5} ${oy + 0.5}V${oy + 4.5}`, "soft");
  for (const ty of [150, 114, 78]) g.line(`M${ox + 0.5} ${ty + 0.5}H${ox - 3.5}`, "soft");

  // Drop line from the final point to the axis.
  g.line(`M${last[0] + 0.5} ${last[1] + 9}V${oy}`, "soft", { dash: "4 3" });

  // The trace itself.
  g.line(polyD(pts), "ink");

  // Thin ring around the final marker.
  const rr = 9;
  g.line(
    `M${num(last[0] - rr)} ${num(last[1])}A${rr} ${rr} 0 1 0 ${num(last[0] + rr)} ${num(last[1])}A${rr} ${rr} 0 1 0 ${num(last[0] - rr)} ${num(last[1])}Z`,
    "faint"
  );
}
