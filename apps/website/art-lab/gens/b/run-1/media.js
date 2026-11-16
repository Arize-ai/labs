function draw(g, rand, seed, k) {
  // A ray of light bending as it passes through a glass slab
  const { clamp, solid, glow, sdPolyline, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Slab: thickness varies, centred near y 130.
  const t = 44 + rand() * 12;
  const sx0 = 115, sx1 = 285;
  const top = 130 - t / 2, bottom = 130 + t / 2;

  // Angles from the surface normal. Base path: incoming (70,45), inside (16,50).
  const baseI = Math.atan2(70, 45);
  const baseT = Math.atan2(16, 50);
  // The composition's bend is stronger than real glass of index 1.5. Calibrate the
  // index to the given drawing so the bend stays sharp, and keep Snell's law consistent
  // across the variation.
  const n = Math.sin(baseI) / Math.sin(baseT);
  const thI = baseI + (rand() * 2 - 1) * (8 * Math.PI / 180);
  const thT = Math.asin(Math.sin(thI) / n);
  const si = Math.sin(thI), ci = Math.cos(thI);

  const entry = [170, top];
  const exit = [170 + t * Math.tan(thT), bottom];
  const inLen = Math.hypot(70, 45);
  const outLen = Math.hypot(42, 27);
  const refLen = Math.hypot(56, 36);
  const start = [entry[0] - inLen * si, entry[1] - inLen * ci];
  const outEnd = [exit[0] + outLen * si, exit[1] + outLen * ci];
  const ghostEnd = [entry[0] + t * Math.tan(thI), bottom];
  const refEnd = [entry[0] + refLen * si, entry[1] - refLen * ci];

  const incoming = [start, entry];
  const inside = [entry, exit];
  const outgoing = [exit, outEnd];
  const reflected = [entry, refEnd];

  const minX = Math.min(start[0], sx0) - 14, maxX = Math.max(outEnd[0], refEnd[0], sx1) + 14;
  const minY = Math.min(start[1], refEnd[1]) - 14, maxY = Math.max(outEnd[1], bottom) + 14;

  g.print((x, y) => {
    if (x < minX || x > maxX || y < minY || y > maxY) return 0;
    let ink = 0, sig = 0;
    const inSlab = x >= sx0 && x <= sx1 && y >= top && y <= bottom;

    // Glass body: 0.40 at upper left down to 0.20 at lower right, lit top edge.
    if (inSlab) {
      const u = clamp(((x - sx0) / (sx1 - sx0) + (y - top) / t) / 2);
      ink = 0.40 - 0.20 * u + 0.04 * (fbm(x / 9, y / 9) - 0.5);
      if (y - top < 4) ink = 0.5;
    }

    // Incoming ray: bright stroke with a soft glow.
    const di = sdPolyline(x, y, incoming) - 2.2;
    ink = Math.max(ink, solid(di), 0.45 * glow(Math.max(di, 0), 6) * (di > 0 ? 1 : 0));

    // Outgoing ray: slightly spent.
    const dout = sdPolyline(x, y, outgoing) - 2.2;
    ink = Math.max(ink, 0.85 * solid(dout), dout > 0 ? 0.28 * glow(dout, 4) : 0);

    // Reflected ray: thin quiet trail, no glow.
    const dr = sdPolyline(x, y, reflected) - 2.2;
    ink = Math.max(ink, 0.25 * solid(dr));

    // Entry and exit points.
    const re = Math.hypot(x - entry[0], y - entry[1]);
    ink = Math.max(ink, Math.pow(clamp(1 - re / 12), 2));
    const rx = Math.hypot(x - exit[0], y - exit[1]);
    ink = Math.max(ink, 0.7 * Math.pow(clamp(1 - rx / 8), 2));

    // Orange: the bent segment inside the glass, with a tight glow kept in the slab.
    if (inSlab) {
      const dt = sdPolyline(x, y, inside) - 2.6;
      sig = solid(dt) + (dt > 0 ? 0.55 * glow(dt, 3) : 0);
    }

    return [clamp(ink), clamp(sig)];
  });

  // Slab outline.
  g.box(sx0, top, sx1 - sx0, t, "ink");
  // Rays.
  g.line(polyD(incoming), "ink");
  g.line(polyD(outgoing), "ink");
  g.line(polyD([entry, ghostEnd]), "faint", { dash: "4 3" });
  g.line(polyD(reflected), "faint");
  // Surface normal at entry.
  g.line(`M${entry[0] + 0.5} ${top - 20}V${top + 20}`, "soft", { dash: "3 3" });
}
