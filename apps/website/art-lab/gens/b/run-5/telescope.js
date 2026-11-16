function draw(g, rand, seed, k) {
  // A brass refractor on a tripod, sighting one bright star
  const { clamp, solid, sdBox, sdPolyline, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Star, jittered; the tube re-aims about its balance point so it still points at it.
  const S = [304 + (rand() * 2 - 1) * 8, 64 + (rand() * 2 - 1) * 8];
  const E0 = [148, 152], O0 = [262, 94];
  const L = Math.hypot(O0[0] - E0[0], O0[1] - E0[1]);
  const a0 = Math.atan2(O0[1] - E0[1], O0[0] - E0[0]);
  const tb = 57; // balance point along the tube, over the mount
  const P = [E0[0] + Math.cos(a0) * tb, E0[1] + Math.sin(a0) * tb];
  const a = a0 + Math.atan2(S[1] - P[1], S[0] - P[0]) - Math.atan2(64 - P[1], 304 - P[0]);
  const ux = Math.cos(a), uy = Math.sin(a), nx = uy, ny = -ux; // n points up-left
  const E = [P[0] - ux * tb, P[1] - uy * tb];
  const O = [E[0] + ux * L, E[1] + uy * L];
  const re = 7, ro = 10, rc = 12, tc = L - 18;
  const rad = t => re + (ro - re) * t / L;
  const at = (t, s) => [E[0] + ux * t + nx * s, E[1] + uy * t + ny * s];

  // Finder scope, riding above the tube at its midpoint.
  const tf0 = L / 2 - 20, tf1 = L / 2 + 20, rf = 3, sf = rad(L / 2) + 7;

  // Eyepiece stub, angled down and back.
  const ea = a + (162 * Math.PI) / 180;
  const ex = Math.cos(ea), ey = Math.sin(ea), epx = -ey, epy = ex;
  const eyeQuad = [
    [E[0] + epx * 4, E[1] + epy * 4], [E[0] + ex * 10 + epx * 4, E[1] + ey * 10 + epy * 4],
    [E[0] + ex * 10 - epx * 4, E[1] + ey * 10 - epy * 4], [E[0] - epx * 4, E[1] - epy * 4],
  ];

  // Mount head hangs just under the tube at the balance point, aligned with it.
  const rm = rad(tb), ms = -(rm + 6);
  const C = at(tb, ms);
  const mountQuad = [at(tb - 8, -rm), at(tb + 8, -rm), at(tb + 8, -rm - 12), at(tb - 8, -rm - 12)];
  const B = at(tb, -rm - 12);
  const Cw = [C[0] - 20, C[1] + 10];
  const feet = [[160, 192], [207, 194], [252, 191]];
  const legs = feet.map((f, i) => [[B[0] - 5 + i * 5, B[1]], f]);

  // Faint background stars, upper half, clear of the main star and the tube.
  const bg = [];
  const nBg = 3 + Math.floor(rand() * 4);
  for (let tries = 0; tries < 80 && bg.length < nBg; tries++) {
    const x = 40 + rand() * 320, y = 20 + rand() * 95, tone = 0.15 + rand() * 0.1;
    if (Math.hypot(x - S[0], y - S[1]) < 30) continue;
    if (sdPolyline(x, y, [E, O]) < 24) continue;
    if (bg.some(b => Math.hypot(x - b[0], y - b[1]) < 25)) continue;
    bg.push([x, y, tone]);
  }

  g.print((x, y) => {
    let ink = 0, org = 0;
    for (const b of bg) {
      const d = Math.hypot(x - b[0], y - b[1]) - 2;
      if (d < 3) ink = Math.max(ink, b[2] * solid(d));
    }
    if (x < 86 || x > 344 || y < 26 || y > 204) return ink;

    // The star: hot core, smooth falloff to nothing by radius 28.
    const sd = Math.hypot(x - S[0], y - S[1]);
    if (sd < 30) {
      ink = Math.max(ink, solid(sd - 3), Math.pow(clamp(1 - sd / 28), 1.5));
      org = solid(sd - 6);
    }

    // Ground: a barely-there band below the horizon.
    if (y >= 190 && y < 202 && x > 90 && x < 310) {
      const fall = clamp(1 - (y - 190) / 10);
      const ends = clamp((x - 96) / 14) * clamp((304 - x) / 14);
      ink = Math.max(ink, (0.12 + 0.05 * (fbm(x / 10, y / 10) - 0.5)) * fall * ends);
    }

    // Tripod legs as thin bars.
    for (const l of legs) {
      const d = sdPolyline(x, y, l) - 2;
      if (d < 2) ink = Math.max(ink, 0.3 * solid(d));
    }

    // Mount head and counterweight.
    const dx = x - E[0], dy = y - E[1];
    const t = dx * ux + dy * uy, s = dx * nx + dy * ny;
    ink = Math.max(ink, 0.45 * solid(sdBox(t, s, tb, ms, 8, 6, 1)));
    const cd = Math.hypot(x - Cw[0], y - Cw[1]) - 6;
    if (cd < 3) ink = Math.max(ink, 0.45 * solid(cd));

    // Eyepiece stub.
    const et = (x - E[0]) * ex + (y - E[1]) * ey, es = (x - E[0]) * epx + (y - E[1]) * epy;
    const edist = Math.max(Math.abs(es) - 4, -et, et - 10);
    if (edist < 3) ink = Math.max(ink, (0.42 + 0.08 * clamp(-es / 4, -1, 1)) * solid(edist));

    if (t > -4 && t < L + 8 && Math.abs(s) < 24) {
      // Tube body, lit from the upper left.
      if (t < tc + 2) {
        const r = rad(t);
        const d = Math.max(Math.abs(s) - r, -t, t - tc);
        const v = clamp(s / r, -1, 1);
        ink = Math.max(ink, (0.35 + 0.4 * (v + 1) / 2) * solid(d));
      }
      // Dew-shield collar, a step brighter.
      if (t > tc - 2) {
        const d = Math.max(Math.abs(s) - rc, tc - t, t - L);
        const v = clamp(s / rc, -1, 1);
        ink = Math.max(ink, (0.85 - 0.12 * (1 - v) / 2) * solid(d));
      }
      // Glint on the lens rim, on the side facing the star.
      const tl = t - L;
      if (tl > 0.5) {
        const q = Math.hypot(tl / (0.35 * ro), s / ro);
        ink = Math.max(ink, 0.6 * solid((q - 1.2) * 4) * clamp((s + 4) / 6));
      }
      // Finder scope.
      const fd = Math.max(Math.abs(s - sf) - rf, tf0 - t, t - tf1);
      if (fd < 3) ink = Math.max(ink, (0.38 + 0.08 * clamp((s - sf) / rf, -1, 1)) * solid(fd));
    }
    return [ink, org];
  });

  const ell = (t, r, th0, th1, closed) => {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const th = th0 + ((th1 - th0) * i) / 32;
      pts.push(at(t + 0.3 * r * Math.cos(th), r * Math.sin(th)));
    }
    return polyD(pts, closed);
  };

  // Tripod, mount and counterweight: half.
  for (const l of legs) g.line(polyD(l), "soft");
  g.line(polyD([at(tb - 8, ms), Cw]), "soft");
  g.line(polyD(mountQuad, true), "soft");
  g.line(`M${Cw[0] + 6} ${Cw[1]}A6 6 0 1 0 ${Cw[0] - 6} ${Cw[1]}A6 6 0 1 0 ${Cw[0] + 6} ${Cw[1]}`, "soft");

  // Tube silhouette: full.
  g.line(polyD([at(0, re), at(tc, rad(tc))]), "ink");
  g.line(polyD([at(0, -re), at(tc, -rad(tc))]), "ink");
  g.line(ell(0, re, 0, Math.PI * 2, true), "ink");
  g.line(polyD(eyeQuad, true), "ink");

  // Dew-shield collar, its seam ring, and the objective.
  g.line(polyD([at(tc, rc), at(L, rc)]), "ink");
  g.line(polyD([at(tc, -rc), at(L, -rc)]), "ink");
  g.line(ell(tc, rc, Math.PI / 2, (3 * Math.PI) / 2, false), "ink");
  g.line(ell(L, rc, 0, Math.PI * 2, true), "ink");
  g.line(ell(L, ro, 0, Math.PI * 2, true), "ink");

  // Finder scope and its brackets: half.
  g.line(polyD([at(tf0, sf + rf), at(tf1, sf + rf), at(tf1, sf - rf), at(tf0, sf - rf)], true), "soft");
  for (const tt of [L / 2 - 12, L / 2 + 12]) {
    const r = rad(tt);
    g.line(polyD([at(tt - 1.5, r), at(tt - 1.5, sf - rf), at(tt + 1.5, sf - rf), at(tt + 1.5, r)], true), "soft");
  }

  // Sightline from the objective to the star.
  const sx = S[0] - O[0], sy = S[1] - O[1], sl = Math.hypot(sx, sy);
  const A = [O[0] + (sx / sl) * 5, O[1] + (sy / sl) * 5];
  const Z = [S[0] - (sx / sl) * 6, S[1] - (sy / sl) * 6];
  g.line(polyD([A, Z]), "faint", { dash: "4 3" });

  // Horizon.
  g.line("M96 190.5H304", "faint");
}
