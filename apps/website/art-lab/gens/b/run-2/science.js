function draw(g, rand, seed, k) {
  // A glass prism splitting one beam into a fan of rays
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;

  // Geometry from the brief.
  const apex = [200, 66], bl = [146, 160], br = [254, 160];
  const prism = [apex, br, bl];
  const beamA = [84, 96], entry = [176, 116], exit = [226, 122];
  const beam = [beamA, entry];
  const inner = [entry, exit];

  // Fan: seven rays from the exit point to x 316, ends spaced 112..184.
  // The fourth (measured) ray stays fixed at (316, 148); the others jitter ±1.5°.
  const rays = [];
  for (let i = 0; i < 7; i++) {
    const ty = 112 + i * 12;
    let a = Math.atan2(ty - exit[1], 316 - exit[0]);
    if (i !== 3) a += ((rand() * 2 - 1) * 1.5 * Math.PI) / 180;
    const ey = exit[1] + (316 - exit[0]) * Math.tan(a);
    rays.push([exit, [316, ey]]);
  }
  const measured = rays[3];

  // Interior gradient: brightest near the middle of the upper-left face,
  // shifted up to ±6 units along it, dying toward the lower-right corner.
  const fx = bl[0] - apex[0], fy = bl[1] - apex[1];
  const flen = Math.hypot(fx, fy);
  const shift = (rand() * 2 - 1) * 6;
  const hot = [
    (apex[0] + bl[0]) / 2 + (fx / flen) * shift,
    (apex[1] + bl[1]) / 2 + (fy / flen) * shift,
  ];
  const hotSpan = Math.hypot(br[0] - hot[0], br[1] - hot[1]);

  g.print((x, y) => {
    if (x < 80 || x > 320 || y < 58 || y > 192) return 0;
    let ink = 0, sig = 0;

    // Prism interior wash.
    if (inPolygon(x, y, prism)) {
      const t = clamp(Math.hypot(x - hot[0], y - hot[1]) / hotSpan);
      ink = 0.1 + 0.25 * (1 - t);
    }

    // Incoming beam: a 6-unit band at 0.9, glow gone within 10 units.
    if (x < 182) {
      const d = sdPolyline(x, y, beam) - 3;
      const halo = d > 0 ? Math.pow(clamp(1 - d / 10), 2) : 1;
      ink = Math.max(ink, 0.9 * Math.max(solid(d), halo));
    }

    // Path inside the glass.
    if (x > 170 && x < 232) {
      const d = sdPolyline(x, y, inner) - 3;
      ink = Math.max(ink, 0.7 * solid(d));
    }

    // Fan: a dim spreading sheet, each ray thinning to the right.
    if (x > exit[0]) {
      const u = clamp((x - exit[0]) / (316 - exit[0]));
      let wash = 0;
      for (const r of rays) {
        const d = sdPolyline(x, y, r) - 2;
        wash = Math.max(wash, glow(d, 2.5));
      }
      ink = Math.max(ink, 0.2 * (1 - 0.5 * u) * wash);

      // Orange glow along the outer third of the measured ray.
      if (u > 2 / 3) {
        const d = sdPolyline(x, y, measured) - 1.5;
        const ramp = clamp((u - 2 / 3) * 6);
        sig = 0.55 * glow(d, 2.5) * ramp;
      }
    }

    // Entry point: the brightest spot, round glow of radius 22.
    const re = Math.hypot(x - entry[0], y - entry[1]);
    if (re < 22) ink = Math.max(ink, Math.pow(1 - re / 22, 1.5));

    // Exit point: 0.6, small glow of radius 12.
    const rx = Math.hypot(x - exit[0], y - exit[1]);
    if (rx < 12) ink = Math.max(ink, 0.6 * Math.pow(1 - rx / 12, 1.5));

    return [ink, sig];
  });

  // Prism outline, full strength.
  g.line(polyD(prism, true), "ink");

  // Incoming beam centre line.
  g.line(polyD(beam), "soft");

  // The six ordinary rays, faint; the measured ray in orange.
  rays.forEach((r, i) => {
    if (i !== 3) g.line(polyD(r), "faint");
  });
  g.line(polyD(measured), "sig");

  // Surface normal at the entry point, perpendicular to the left face.
  const nx = -fy / flen, ny = fx / flen;
  g.line(
    `M${num(entry[0] - nx * 15)} ${num(entry[1] - ny * 15)}L${num(entry[0] + nx * 15)} ${num(entry[1] + ny * 15)}`,
    "faint",
    { dash: "2 3" }
  );

  // Ground line under the prism.
  g.line("M120 160.5H280", "soft");
}
