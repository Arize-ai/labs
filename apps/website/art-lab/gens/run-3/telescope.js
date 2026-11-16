function draw(g, rand, seed, k) {
  // A refractor telescope on a tripod, sighted on one orange star.
  const { clamp, solid, glow, sdBox, polyD, num, X0, X1, Y1 } = k;
  const ang = -(22 + rand() * 6) * Math.PI / 180;
  const u = [Math.cos(ang), Math.sin(ang)];
  const nu = [u[1], -u[0]]; // perpendicular, pointing up-left (toward the light)
  const pivot = [200 + rand() * 8, 120];
  const L = 156, sp = 80;
  const A = [pivot[0] - u[0] * sp, pivot[1] - u[1] * sp];
  const at = (s, n) => [A[0] + u[0] * s + nu[0] * n, A[1] + u[1] * s + nu[1] * n];

  // Tube sections along the axis: eyepiece, focuser, main tube, dew shield.
  const parts = [
    { s0: 0, s1: 22, hw: 4, tone: 0.42, stroke: "soft" },
    { s0: 18, s1: 40, hw: 6.5, tone: 0.7, stroke: "ink" },
    { s0: 38, s1: 124, hw: 11, tone: 0.62, stroke: "ink" },
    { s0: 120, s1: L, hw: 13.5, tone: 0.86, stroke: "ink" },
  ];
  const star = at(L + 30 + rand() * 8, 0);
  const mount = [pivot[0] - nu[0] * -14, pivot[1] - nu[1] * -14];
  const foot = Y1;
  const legs = [
    [[mount[0], mount[1] + 4], [mount[0] - 36, foot]],
    [[mount[0], mount[1] + 4], [mount[0] + 34, foot]],
  ];
  const back = [[mount[0], mount[1] + 4], [mount[0] + 6, foot - 6]];

  // A few faint stars in the sky, away from the tube.
  const stars = [];
  while (stars.length < 4) {
    const p = [X0 + 10 + rand() * 120, 62 + rand() * 50];
    if (p[1] < A[1] - 30 - (p[0] - X0) * 0.1) stars.push(p);
  }

  const bx0 = A[0] - 20, bx1 = at(L, 0)[0] + 20, by0 = at(L, 14)[1] - 20, by1 = A[1] + 25;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      const dx = x - A[0], dy = y - A[1];
      const s = dx * u[0] + dy * u[1], n = dx * nu[0] + dy * nu[1];
      for (const p of parts) {
        const d = sdBox(s, n, (p.s0 + p.s1) / 2, 0, (p.s1 - p.s0) / 2, p.hw);
        // Lit from the upper left: brighter on the up-left side of the tube.
        const shade = 0.72 + 0.28 * clamp(0.5 + n / (2 * p.hw));
        ink = Math.max(ink, solid(d) * p.tone * shade + 0.14 * glow(d, 6));
      }
    }
    // Mount head.
    const md = sdBox(x, y, mount[0], mount[1], 6, 5, 1.5);
    ink = Math.max(ink, solid(md) * 0.75 + 0.1 * glow(md, 5));
    for (const s of stars) ink = Math.max(ink, 0.3 * glow(Math.hypot(x - s[0], y - s[1]) - 1, 1.6));
    const sd = Math.hypot(x - star[0], y - star[1]) - 3.2;
    sig = solid(sd) + 0.45 * glow(sd, 8);
    return [ink, sig];
  });

  // Tube outlines, back to front.
  for (const p of parts) {
    g.line(polyD([at(p.s0, p.hw), at(p.s1, p.hw), at(p.s1, -p.hw), at(p.s0, -p.hw)], true), p.stroke, { width: 1.25 });
  }
  // A highlight rule along the lit side of the main tube.
  g.line(polyD([at(44, 7.5), at(118, 7.5)]), "soft");
  // Objective lens face.
  g.line(polyD([at(L - 2, 10.5), at(L - 2, -10.5)]), "soft");
  // Line of sight to the star.
  g.line(polyD([at(L + 4, 0), at(L + 24, 0)]), "faint", { dash: "1 3" });
  // Tripod.
  g.box(mount[0] - 6, mount[1] - 5, 12, 10, "ink");
  for (const l of legs) g.line(polyD(l), "ink", { width: 1.25 });
  g.line(polyD(back), "soft");
  const sy = foot - 22, t = (sy - legs[0][0][1]) / (foot - legs[0][0][1]);
  const lx = (l) => l[0][0] + (l[1][0] - l[0][0]) * t;
  g.line(`M${num(lx(legs[0]))} ${num(sy)}L${num(mount[0] + 6 * t)} ${num(sy + 2)}L${num(lx(legs[1]))} ${num(sy)}`, "faint");
  // Ground.
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint", { dash: "1 3" });
}
