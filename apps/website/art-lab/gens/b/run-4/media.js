function draw(g, rand, seed, k) {
  // A light ray bending through a glass slab, refraction diagram plate
  const { clamp, solid, sdPolyline, polyD, num } = k;

  // Slab
  const sx0 = 130, sx1 = 270, sy0 = 95, sy1 = 165;
  const bandY = 99;

  // Base geometry from the brief: entry (170,95), exit (200,165), incoming from (96,62).
  const entry = [170, sy0];
  const th0 = Math.atan2(170 - 96, 95 - 62);           // incidence angle from the normal
  const ph0 = Math.atan2(200 - 170, sy1 - sy0);        // refraction angle
  const n = Math.sin(th0) / Math.sin(ph0);             // effective index that yields the brief's bend
  const inLen = Math.hypot(170 - 96, 95 - 62);
  const outLen = Math.hypot(262 - 200, 193 - 165);

  // Variation: incoming angle ±4°, bend recomputed by Snell's law.
  const th = th0 + (rand() * 2 - 1) * (4 * Math.PI / 180);
  const ph = Math.asin(clamp(Math.sin(th) / n, -1, 1));
  const dx = Math.sin(th), dy = Math.cos(th);
  const exit = [entry[0] + (sy1 - sy0) * Math.tan(ph), sy1];
  const start = [entry[0] - inLen * dx, entry[1] - inLen * dy];
  const end = [exit[0] + outLen * dx, exit[1] + outLen * dy];

  // Undeviated path, clipped where it leaves the slab (right face or bottom face).
  const tRight = (sx1 - entry[0]) / dx, tBottom = (sy1 - entry[1]) / dy;
  const tU = Math.min(tRight, tBottom);
  const undev = [entry[0] + tU * dx, entry[1] + tU * dy];

  // Tonal variation of the slab, ±0.05.
  const shift = (rand() * 2 - 1) * 0.05;
  const toneUL = 0.35 + shift, toneLR = 0.2 + shift;

  const incoming = [start, entry];
  const inside = [entry, exit];
  const outgoing = [exit, end];

  const rayCore = (d) => solid(d - 1.5);
  const rayGlow = (d) => 0.6 * clamp(1 - (d - 1.5) / 10);
  const bloom = (cx, cy, x, y) => {
    const r = Math.hypot(x - cx, y - cy);
    if (r <= 8) return 1;
    const t = clamp((r - 8) / 8);
    return 1 - t * t * (3 - 2 * t);
  };

  const bx0 = Math.min(start[0], sx0) - 16, bx1 = Math.max(end[0], sx1) + 16;
  const by0 = start[1] - 16, by1 = end[1] + 16;

  g.print((x, y) => {
    if (x < bx0 || x > bx1 || y < by0 || y > by1) return 0;
    let ink = 0, sig = 0;

    // Slab body and top-face highlight band.
    if (x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1) {
      const t = 0.5 * ((x - sx0) / (sx1 - sx0) + (y - sy0) / (sy1 - sy0));
      ink = toneUL + (toneLR - toneUL) * t;
      if (y <= bandY + 0.5) ink = 0.55;
    }

    // Incoming and outgoing rays in ink.
    const dIn = sdPolyline(x, y, incoming);
    const dOut = sdPolyline(x, y, outgoing);
    const dRay = Math.min(dIn, dOut);
    if (dRay < 14) ink = Math.max(ink, rayCore(dRay), rayGlow(dRay));

    // Blooms where the light strikes the surfaces.
    ink = Math.max(ink, bloom(entry[0], entry[1], x, y), bloom(exit[0], exit[1], x, y));

    // The bend inside the glass, in orange.
    const dSeg = sdPolyline(x, y, inside);
    if (dSeg < 14) {
      const core = rayCore(dSeg);
      sig = Math.max(core, rayGlow(dSeg));
      // Let the orange core win through the blooms so the bend stays continuous.
      if (core > 0.5) ink = Math.min(ink, 0.9);
      else if (sig > 0.05 && y > sy0 && y < sy1) ink = Math.min(ink, sig - 0.02 > 0 ? Math.max(sig - 0.02, 0) : ink);
    }

    return [ink, sig];
  });

  // Slab outline and highlight-band inner edge.
  g.box(sx0, sy0, sx1 - sx0, sy1 - sy0, "ink");
  g.line(`M${sx0} ${bandY + 0.5}H${sx1}`, "faint");

  // Undeviated path through the block.
  g.line(polyD([entry, undev]), "faint", { dash: "2 3" });

  // Normals at entry and exit, 40 long, centred on the points.
  g.line(`M${num(entry[0])} ${entry[1] - 20}V${entry[1] + 20}`, "soft", { dash: "4 3" });
  g.line(`M${num(exit[0])} ${exit[1] - 20}V${exit[1] + 20}`, "soft", { dash: "4 3" });

  // Rays along their centres.
  g.line(polyD(incoming), "ink");
  g.line(polyD(outgoing), "ink");
  g.line(polyD(inside), "sig");
}
