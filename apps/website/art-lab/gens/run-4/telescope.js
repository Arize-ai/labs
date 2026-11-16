function draw(g, rand, seed, k) {
  // A refractor telescope on a tripod, aimed at one orange star
  const { clamp, solid, glow, sdPolyline, polyD, num } = k;
  const ang = ((24 + rand() * 8) * Math.PI) / 180;
  const c = Math.cos(ang), s = Math.sin(ang);
  const dx = c, dy = -s;            // along the tube, up and to the right
  const nx = -s, ny = -c;           // the tube's normal, toward the upper left
  const A = [112 + rand() * 10, 160 + rand() * 6];
  const L = 150, shieldL = 30;
  const P = (u, v) => [A[0] + dx * u + nx * v, A[1] + dy * u + ny * v];
  const B = P(L, 0);
  const tStar = L + 50 + rand() * 6;
  const star = P(tStar, 0);
  const fbm = k.makeNoise(seed + 11);

  // Tube sections: [u0, u1, half-width at u0, half-width at u1, tone]
  const segs = [
    [-16, 0, 4, 4, 0.7],
    [0, L - shieldL, 8, 11, 0.88],
    [L - shieldL, L, 13, 13, 0.95],
  ];
  const seg = (u, v, q) => {
    const t = clamp((u - q[0]) / (q[1] - q[0]));
    const hw = q[2] + (q[3] - q[2]) * t;
    return [Math.max(Math.abs(v) - hw, q[0] - u, u - q[1]), hw];
  };

  // The mount: a head under the tube's balance point, three legs to the ground.
  const uM = L * 0.42;
  const hwM = 8 + 3 * (uM / (L - shieldL));
  const M = P(uM, -hwM - 6);
  const groundY = 190;
  const legs = [
    [M[0] - 42 - rand() * 6, groundY],
    [M[0] + 36 + rand() * 6, groundY],
    [M[0] + 5, groundY + 2],
  ];

  const beam = [B, star];
  const bx0 = A[0] - 30, bx1 = B[0] + 30, by0 = B[1] - 30, by1 = A[1] + 30;

  // A few distant ink stars, faint, in the upper sky.
  const faint = Array.from({ length: 4 }, () => [k.X0 + rand() * 150, k.Y0 + rand() * 40]);

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      const rx = x - A[0], ry = y - A[1];
      const u = rx * dx + ry * dy, v = rx * nx + ry * ny;
      let dMin = Infinity;
      for (const q of segs) {
        const [d, hw] = seg(u, v, q);
        dMin = Math.min(dMin, d);
        // Lit from the upper left: brighter on the top side and toward the back.
        const shade = (0.72 + 0.28 * clamp(0.5 + v / (2 * hw))) * (1 - 0.12 * clamp(u / L));
        ink = Math.max(ink, solid(d) * q[4] * shade);
      }
      ink = Math.max(ink, 0.18 * glow(dMin, 8));
    }
    // Mount head.
    const hd = k.sdBox(x, y, M[0], M[1], 6, 5, 1.5);
    ink = Math.max(ink, 0.7 * solid(hd) + 0.12 * glow(hd, 6));
    // Starlight falling into the objective.
    ink = Math.max(ink, 0.12 * glow(sdPolyline(x, y, beam), 5) * (0.6 + 0.4 * fbm(x / 6, y / 6)));
    for (const f of faint) {
      const fd = Math.hypot(x - f[0], y - f[1]) - 1;
      ink = Math.max(ink, 0.4 * solid(fd) + 0.1 * glow(fd, 3));
    }
    const sd = Math.hypot(x - star[0], y - star[1]) - 3.5;
    sig = solid(sd) + 0.45 * glow(sd, 8);
    return [ink, sig];
  });

  // Outlines of the tube sections.
  for (const q of segs) {
    g.line(polyD([P(q[0], q[2]), P(q[1], q[3]), P(q[1], -q[3]), P(q[0], -q[2])], true), q[0] < 0 ? "soft" : "ink");
  }
  // The objective lens, a heavier rule across the open end.
  g.line(polyD([P(L, 13), P(L, -13)]), "ink", { width: 1.5 });
  // Tripod legs and the mount head.
  for (const leg of legs) g.line(polyD([M, leg]), leg[1] > groundY ? "soft" : "ink", { width: 1.25 });
  g.line(polyD([[M[0] - 6, M[1] - 5], [M[0] + 6, M[1] - 5], [M[0] + 6, M[1] + 5], [M[0] - 6, M[1] + 5]], true), "ink");
  g.line(polyD([M, P(uM, -hwM)]), "ink", { width: 1.25 });
  // The ground, and the dotted line of sight to the star.
  g.line(`M${k.X0} ${groundY + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
  g.line(polyD([B, P(tStar - 7, 0)]), "soft", { dash: "1 3" });
}
