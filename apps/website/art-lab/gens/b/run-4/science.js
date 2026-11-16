function draw(g, rand, seed, k) {
  // A glass prism splitting one beam into a measured fan of rays
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Geometry from the brief.
  const apex = [200, 70], bl = [150, 170], br = [250, 170];
  const prism = [apex, br, bl];
  const src = [90, 140], entry = [172, 126], exit = [232, 135];
  const screenX = 300, screenTop = 95, screenBot = 185;
  const floorY = 172;

  // Variation: fan spread and ray count.
  const s = rand();
  const ya = 114 + 8 * s, yb = 184 - 8 * s;
  const n = 6 + Math.floor(rand() * 3); // 6..8
  const lands = [];
  for (let i = 0; i < n; i++) lands.push([screenX, ya + (yb - ya) * i / (n - 1)]);
  // Orange: any ray except the outermost two (the top and the bottom).
  const oi = 1 + Math.floor(rand() * (n - 2));
  const oLand = lands[oi];
  const oRay = [exit, oLand];

  // Slopes bounding the fan wedge.
  const fanDx = screenX - exit[0];
  const sTop = (ya - exit[1]) / fanDx, sBot = (yb - exit[1]) / fanDx;

  // Incoming beam: unit normal pointing upward (toward the upper-left light).
  const bdx = entry[0] - src[0], bdy = entry[1] - src[1];
  const bl_ = Math.hypot(bdx, bdy);
  const nux = bdy / bl_, nuy = -bdx / bl_; // (-14,-82)/len → points up
  const beamPts = [src, entry];
  const glassPts = [entry, exit];

  // Left face: inward unit normal and distance helper.
  const fdx = bl[0] - apex[0], fdy = bl[1] - apex[1];
  const fl = Math.hypot(fdx, fdy);
  const inx = -fdy / fl, iny = fdx / fl; // (100,50)/len, points into the glass
  const maxD = (br[0] - apex[0]) * inx + (br[1] - apex[1]) * iny;

  g.print((x, y) => {
    if (x < 80 || x > 312 || y < 60 || y > 190) return 0;
    let ink = 0, orange = 0;

    // Below the floor line stays dark across the floor's span.
    const belowFloor = y > floorY && x < 286;

    if (!belowFloor) {
      // Prism body, lit from the upper left, with a bright band inside the left face.
      if (inPolygon(x, y, prism)) {
        const d = (x - apex[0]) * inx + (y - apex[1]) * iny;
        let t = 0.35 - 0.2 * clamp(d / maxD);
        if (d > 0.8 && d < 5.5) t = 0.5;
        t += 0.04 * (fbm(x / 7, y / 7) - 0.5);
        ink = Math.max(ink, t);
      }

      // Incoming beam: bright core, tight glow, stronger on its upper side.
      const bd = sdPolyline(x, y, beamPts) - 3;
      if (bd < 14) {
        const up = (x - src[0]) * nux + (y - src[1]) * nuy > 0;
        const w = up ? 6.6 : 5;
        ink = Math.max(ink, bd < 0 ? 1 : glow(bd, w));
      }

      // Beam inside the glass.
      const gd = sdPolyline(x, y, glassPts) - 2.6;
      ink = Math.max(ink, 0.8 * solid(gd));

      // Fan wedge: soft light dimming toward the screen.
      if (x > exit[0] && x < screenX - 2) {
        const dx = x - exit[0];
        const sl = (y - exit[1]) / dx;
        const feather = 1.6 / dx;
        const inside = clamp((sl - sTop) / feather + 0.5) * clamp((sBot - sl) / feather + 0.5);
        if (inside > 0) {
          const t = dx / fanDx;
          ink = Math.max(ink, inside * (0.6 - 0.35 * t));
        }
        // The orange ray as a narrow band of signal light.
        const od = sdPolyline(x, y, oRay) - 2.4;
        if (od < 0) orange = Math.max(orange, 0.62 - 0.3 * (dx / fanDx));
      }
    }

    // Screen strip.
    if (Math.abs(x - screenX) <= 2 && y >= screenTop && y <= screenBot) ink = Math.max(ink, 0.2);

    // Landing spots.
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(x - lands[i][0], y - lands[i][1]) - 3;
      if (d > 10) continue;
      const v = 0.7 * solid(d) + 0.2 * glow(Math.max(d, 0), 3);
      if (i === oi) orange = Math.max(orange, solid(d) + 0.35 * glow(Math.max(d, 0), 4));
      else ink = Math.max(ink, v);
    }

    return [ink, orange];
  });

  // Prism edges.
  g.line(polyD(prism, true), "ink");

  // Incoming beam edges.
  for (const sgn of [1, -1]) {
    const ox = nux * 3 * sgn, oy = nuy * 3 * sgn;
    g.line(polyD([[src[0] + ox, src[1] + oy], [entry[0] + ox, entry[1] + oy]]), "soft");
  }

  // Beam inside the glass.
  g.line(polyD(glassPts), "soft");

  // Fan rays.
  for (let i = 0; i < n; i++) {
    if (i === oi) continue;
    g.line(polyD([exit, lands[i]]), "faint");
  }
  g.line(polyD(oRay), "sig", { width: 1.2 });

  // Screen outline.
  g.box(screenX - 2, screenTop, 4, screenBot - screenTop, "soft");

  // Floor.
  g.line(`M120 ${num(floorY + 0.5)}H280`, "faint", { dash: "4 3" });

  // Normal to the left face at the entry point, ~30 units long.
  g.line(
    polyD([
      [entry[0] - inx * 15, entry[1] - iny * 15],
      [entry[0] + inx * 15, entry[1] + iny * 15],
    ]),
    "faint",
    { dash: "2 2" }
  );
}
