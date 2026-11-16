function draw(g, rand, seed, k) {
  // A telescope on a tripod, sighted along a dotted guide at one star
  const { X0, X1, Y1, clamp, solid, glow, sdBox, sdPolyline, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);

  // The tube's frame: eyepiece end at E, axis pointing up and to the right.
  const ang = -(20 + rand() * 7) * Math.PI / 180;
  const ex = 126 + rand() * 6, ey = 150 + rand() * 4;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const nx = -dy, ny = dx; // normal, pointing down and to the right
  const at = (u, v) => [ex + dx * u + nx * v, ey + dy * u + ny * v];
  const rect = (u0, u1, hw) => [at(u0, -hw), at(u1, -hw), at(u1, hw), at(u0, hw)];

  // The tube's parts, in axis coordinates: [u0, u1, half width].
  const parts = [
    [-16, -4, 3.5],  // eyepiece
    [-5, 6, 6.5],    // focuser
    [5, 104, 10],    // main tube
    [100, 132, 12.5] // dew shield
  ];
  const objU = 132;
  const starU = 190 + rand() * 8;
  const star = at(starU, 0), obj = at(objU, 0);

  // The mount, under the tube's balance point, and the tripod below it.
  const M = at(52, 17);
  const ground = Y1 - 2;
  const spread = 28 + rand() * 6;
  const feet = [[M[0] - spread, ground], [M[0] + 5, ground + 1], [M[0] + spread + 4, ground]];
  const legs = feet.map((f) => [M, f]);
  const beam = [obj, star];

  // A loose bounding box for the tube, so far points skip the work.
  const tx0 = ex - 30, tx1 = obj[0] + 25, ty0 = obj[1] - 25, ty1 = ey + 25;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x > tx0 && x < tx1 && y > ty0 && y < ty1) {
      const px = x - ex, py = y - ey;
      const u = px * dx + py * dy, v = px * nx + py * ny;
      let d = Infinity;
      for (const [u0, u1, hw] of parts) d = Math.min(d, sdBox(u, v, (u0 + u1) / 2, 0, (u1 - u0) / 2, hw));
      // Lit from the upper left: the top edge and the eyepiece end are brightest.
      const shade = 0.95 - 0.32 * clamp((v + 12) / 24) - 0.1 * clamp(u / objU);
      ink = solid(d) * shade + 0.18 * glow(d, 6);
    }
    // The mount head.
    const md = sdBox(x, y, M[0], M[1], 6, 4.5, 1.5);
    ink = Math.max(ink, solid(md) * 0.7 + 0.12 * glow(md, 4));
    // A faint halo along the legs.
    if (y > M[1] - 6) {
      for (const l of legs) ink = Math.max(ink, 0.14 * glow(sdPolyline(x, y, l), 3));
    }
    // Starlight running down the line of sight, thin and broken.
    const bd = sdPolyline(x, y, beam);
    ink = Math.max(ink, 0.12 * glow(bd, 3.5) * clamp(fbm(x / 6, y / 6) + 0.3));
    // The star: the point of the figure.
    const sd = Math.hypot(x - star[0], y - star[1]) - 3.2;
    sig = solid(sd) + 0.42 * glow(sd, 7);
    return [ink, sig];
  });

  // The ground, and the tripod standing on it; the back leg is softer.
  g.line(`M${X0} ${num(ground) + 0.5}H${X1}`, "faint", { dash: "1 3" });
  g.line(polyD(legs[1]), "soft", { width: 1.25 });
  g.line(polyD(legs[0]), "ink", { width: 1.25 });
  g.line(polyD(legs[2]), "ink", { width: 1.25 });
  g.line(polyD([at(52, 10), [M[0], M[1] - 4.5]]), "soft");

  // The tube in outline, from the eyepiece forward.
  g.line(polyD(rect(-16, -4, 3.5), true), "soft");
  g.line(polyD(rect(-5, 6, 6.5), true), "ink");
  g.line(polyD(rect(5, 104, 10), true), "ink");
  g.line(polyD(rect(100, 132, 12.5), true), "ink");
  // A band at the balance point, and the objective's glass.
  g.line(polyD([at(46, -10), at(46, 10)]), "soft");
  g.line(polyD([at(58, -10), at(58, 10)]), "soft");
  g.line(polyD([at(objU - 2.5, -10), at(objU - 2.5, 10)]), "faint");

  // The line of sight, out to the star.
  g.line(polyD([at(objU + 6, 0), at(starU - 8, 0)]), "soft", { dash: "1 3" });
  // The star's crosshair ticks.
  const [sx, sy] = star;
  g.line(`M${num(sx - 11)} ${num(sy)}h5M${num(sx + 6)} ${num(sy)}h5M${num(sx)} ${num(sy - 11)}v5M${num(sx)} ${num(sy + 6)}v5`, "faint");
}
