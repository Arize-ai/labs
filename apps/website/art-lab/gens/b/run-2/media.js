function draw(g, rand, seed, k) {
  // A ray of light bending as it passes through a glass slab
  const { clamp, smooth, solid, sdPolyline, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Slab
  const sx0 = 110, sx1 = 290, sy0 = 105, sy1 = 150;
  const thick = sy1 - sy0;

  // Source stays fixed; the incidence angle varies by about ±6°.
  const src = [95, 62];
  const baseTheta = Math.atan2(75, 43); // ~60.2° from the normal
  const theta = baseTheta + (rand() * 2 - 1) * (6 * Math.PI / 180);
  const tI = Math.tan(theta);
  const n = Math.sin(baseTheta) / Math.sin(Math.atan2(30, 45)); // ~1.56, matches the brief's geometry
  const r = Math.asin(Math.sin(theta) / n);
  const tR = Math.tan(r);

  const entry = [src[0] + (sy0 - src[1]) * tI, sy0];
  const exit = [entry[0] + thick * tR, sy1];

  // Emergent ray: parallel to incident, down to y 193, kept inside the subject area.
  let eLen = 193 - sy1;
  if (exit[0] + eLen * tI > 305) eLen = (305 - exit[0]) / tI;
  const emerg = [exit[0] + eLen * tI, sy1 + eLen];

  // Ghost: straight through, stopping where it would leave the slab.
  let gLen = thick;
  if (entry[0] + gLen * tI > sx1 - 2) gLen = (sx1 - 2 - entry[0]) / tI;
  const ghost = [entry[0] + gLen * tI, sy0 + gLen];

  // Reflected ray: mirror of the incident about the top face.
  const reflect = [entry[0] + 37 * tI, sy0 - 37];

  const incSeg = [src, entry];
  const refrSeg = [entry, exit];
  const emSeg = [exit, emerg];
  const rfSeg = [entry, reflect];

  const band = (d, peak, half) => peak * smooth(clamp(1 - d / half));

  g.print((x, y) => {
    if (x < 70 || x > 330 || y < 38 || y > 206) return 0;
    let ink = 0, orange = 0;

    // Source: hot core, glow gone by radius 18.
    const sr = Math.hypot(x - src[0], y - src[1]);
    if (sr < 20) {
      const core = solid(sr - 2.5);
      const halo = Math.pow(clamp(1 - sr / 18), 2);
      ink = Math.max(ink, core, halo);
    }

    // Incident ray.
    ink = Math.max(ink, band(sdPolyline(x, y, incSeg), 0.7, 3.5));

    const inSlab = x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1;
    if (inSlab) {
      // Even glass, a bright skin under the top face, dimming to the lower right.
      let glass = 0.35;
      const topBand = smooth(clamp(1 - (y - sy0) / 6));
      glass += 0.2 * topBand;
      const diag = ((x - sx0) / (sx1 - sx0) + (y - sy0) / thick) / 2;
      glass -= 0.1 * smooth(clamp((diag - 0.45) / 0.55)) * (1 - topBand);
      glass += (fbm(x / 2.5, y / 2.5) - 0.5) * 0.15; // seeded mottle, about ±0.05
      ink = Math.max(ink, glass);

      // Refracted path: soft glow spreading into the glass, orange at its heart.
      const dr = sdPolyline(x, y, refrSeg);
      ink = Math.max(ink, 0.6 * Math.exp(-dr / 5));
      orange = 0.8 * smooth(clamp(1 - dr / 2.6));
    }

    // Emergent ray, dimmer.
    if (y > sy1) ink = Math.max(ink, band(sdPolyline(x, y, emSeg), 0.45, 3.5));

    // Reflected ray, very faint.
    if (y < sy0) ink = Math.max(ink, band(sdPolyline(x, y, rfSeg), 0.2, 3.5));

    return [ink, orange];
  });

  // Slab outline.
  g.box(sx0, sy0, sx1 - sx0, sy1 - sy0, "ink");

  // Surface normals at entry and exit.
  g.line(`M${entry[0]} ${sy0 - 15}V${sy0 + 15}`, "faint", { dash: "3 3" });
  g.line(`M${exit[0]} ${sy1 - 15}V${sy1 + 15}`, "faint", { dash: "3 3" });

  // Ghost path: where the light would have gone.
  g.line(polyD([entry, ghost]), "faint", { dash: "4 3" });

  // Rays.
  g.line(polyD(rfSeg), "faint");
  g.line(polyD(emSeg), "soft");
  g.line(polyD(incSeg), "ink");

  // The medium acting on the message.
  g.line(polyD(refrSeg), "sig", { width: 1.5 });
}
