function draw(g, rand, seed, k) {
  // A refractor on a tripod, sighted on one orange star.
  const { clamp, smooth, sdBox, sdPolyline, solid, glow, polyD, num, makeNoise, X0, X1, Y0, Y1 } = k;
  const fbm = makeNoise(seed + 11);

  // The star, and the pivot the tube turns on; the tube points straight at it.
  const star = [284 + rand() * 14, 64 + rand() * 10];
  const px = 166 + rand() * 6, py = 146;
  const dx = star[0] - px, dy = star[1] - py, dist = Math.hypot(dx, dy);
  const cx = dx / dist, cy = dy / dist;
  const toCard = (u, v) => [px + u * cx - v * cy, py + u * cy + v * cx];

  // The tube's sections along its axis: [u0, u1, half-width, tone].
  const segs = [
    [-50, -32, 3.5, 0.75], // eyepiece
    [-32, -18, 6, 0.6],    // focuser
    [-18, 92, 10, 0.92],   // main tube
    [92, 114, 12.5, 0.8],  // dew shield
  ];
  const quad = ([u0, u1, hw]) => [toCard(u0, -hw), toCard(u1, -hw), toCard(u1, hw), toCard(u0, hw)];
  const quads = segs.map(quad);
  const all = quads.flat();
  const bx0 = Math.min(...all.map((p) => p[0])) - 30, bx1 = Math.max(...all.map((p) => p[0])) + 30;
  const by0 = Math.min(...all.map((p) => p[1])) - 30, by1 = Math.max(...all.map((p) => p[1])) + 30;

  // Mount and tripod.
  const mount = [px, py + 9];
  const foot = [mount[0], mount[1] + 4];
  const legs = [
    [foot, [px - 36, Y1]],
    [foot, [px + 40, Y1]],
    [foot, [px + 4, Y1 - 6]],
  ];

  // A few faint background stars, kept clear of the tube and the bright one.
  const faint = [];
  for (let n = 0; n < 5; n++) {
    const s = [X0 + 20 + rand() * (X1 - X0 - 40), Y0 + rand() * 50];
    if (Math.hypot(s[0] - star[0], s[1] - star[1]) > 30 && s[0] < 250) faint.push(s);
  }

  g.print((x, y) => {
    let ink = 0;
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      const rx = x - px, ry = y - py;
      const u = rx * cx + ry * cy, v = -rx * cy + ry * cx;
      let dmin = Infinity;
      for (const [u0, u1, hw, t] of segs) {
        const d = sdBox(u, v, (u0 + u1) / 2, 0, (u1 - u0) / 2, hw);
        dmin = Math.min(dmin, d);
        // Lit from the upper left: the side at negative v is the top.
        const shade = 1 - 0.4 * clamp((v / hw + 1) / 2);
        ink = Math.max(ink, solid(d) * t * shade);
      }
      ink = Math.max(ink, 0.2 * glow(dmin, 7));
    }
    // Mount block and legs.
    const md = sdBox(x, y, mount[0], mount[1], 6, 4.5, 1);
    ink = Math.max(ink, solid(md) * 0.7 + 0.12 * glow(md, 5));
    if (y > mount[1] - 4) for (const l of legs) ink = Math.max(ink, 0.18 * glow(sdPolyline(x, y, l) - 0.5, 3));
    // Faint field stars.
    for (const s of faint) ink = Math.max(ink, 0.45 * solid(Math.hypot(x - s[0], y - s[1]) - 1.2));
    // A little sky haze along the line of sight.
    const ld = sdPolyline(x, y, [toCard(114, 0), star]);
    ink = Math.max(ink, 0.08 * glow(ld, 6) * (0.6 + 0.8 * (fbm(x / 7, y / 7) - 0.5)));
    // The star.
    const sd = Math.hypot(x - star[0], y - star[1]) - 3.5;
    return [ink, solid(sd) + 0.42 * glow(sd, 7)];
  });

  // Tube outlines, front sections last so they read on top.
  quads.forEach((q, n) => g.line(polyD(q, true), n === 2 ? "ink" : "soft", { width: n === 2 ? 1.25 : 1 }));
  // Objective lens face at the open end.
  const [l0, l1] = [toCard(114, -12.5), toCard(114, 12.5)];
  g.line(polyD([l0, l1]), "ink", { width: 1.5 });
  // Legs.
  g.line(polyD(legs[0]), "ink", { width: 1.25 });
  g.line(polyD(legs[1]), "ink", { width: 1.25 });
  g.line(polyD(legs[2]), "soft");
  g.box(mount[0] - 6, mount[1] - 4.5, 12, 9, "soft");
  // Line of sight to the star, and a field-of-view ring around it.
  g.line(polyD([toCard(118, 0), toCard(dist - 14, 0)]), "soft", { dash: "1 3" });
  const r = 13;
  g.line(`M${num(star[0] - r)} ${num(star[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, "faint", { dash: "1 3" });
  // Ground.
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
}
