function draw(g, rand, seed, k) {
  // A small refractor on a tripod, aimed at one bright star
  const { clamp, smooth, solid, sdBox, sdPolyline, polyD } = k;

  // The star, jittered; the tube aims at it within 26°–34°.
  const sx = 300 + (rand() * 2 - 1) * 10;
  const sy = 66 + (rand() * 2 - 1) * 10;
  const E = [128, 168], L = 150;
  const deg = Math.PI / 180;
  const a = clamp(Math.atan2(E[1] - sy, sx - E[0]), 26 * deg, 34 * deg);
  const ux = Math.cos(a), uy = -Math.sin(a);   // along the axis, toward the objective
  const nx = -Math.sin(a), ny = -Math.cos(a);  // perpendicular, toward the upper left
  const P = (t, s) => [E[0] + t * ux + s * nx, E[1] + t * uy + s * ny];
  const O = P(L, 0);

  const DS = L - 28; // dew shield starts here
  const hwAt = (t) => (t >= DS ? 12 + (t - DS) / 28 : 7 + 4 * clamp(t / L));

  // Mount and collar at the balance point.
  const tm = 66, hm = hwAt(tm);
  const mountS = -(hm + 5);
  const mountC = P(tm, mountS);
  const legTops = [-4, 0, 4].map((o) => P(tm + o, mountS - 5));
  const feet = [[146, 192], [192, 194], [236, 190]];
  const legs = legTops.map((p, i) => [p, feet[i]]);

  // Lens rim points the rays aim at.
  const lensTop = P(L, 13), lensBot = P(L, -13);

  // Background stars, kept clear of the main star and the tube.
  const axis = [E, O];
  const bg = [];
  const want = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < 300 && bg.length < want; i++) {
    const x = 16 + rand() * 368, y = 14 + rand() * 104;
    if (Math.hypot(x - sx, y - sy) < 40) continue;
    if (sdPolyline(x, y, axis) - 13 < 40) continue;
    if (bg.some((b) => Math.hypot(x - b[0], y - b[1]) < 30)) continue;
    bg.push([x, y, 0.2 + rand() * 0.15]);
  }

  g.print((x, y) => {
    let ink = 0, org = 0;

    for (const b of bg) {
      const d = Math.hypot(x - b[0], y - b[1]);
      if (d < 4) ink = Math.max(ink, b[2] * solid(d - 2));
    }

    // Star and halo.
    const r = Math.hypot(x - sx, y - sy);
    if (r < 40) {
      const halo = (0.15 + 0.85 * Math.pow(clamp(1 - r / 34), 2)) * smooth(clamp((34 - r) / 4));
      ink = Math.max(ink, halo, solid(r - 4));
      org = Math.max(solid(r - 4), (halo + 0.06) * smooth(clamp((10 - r) / 3)));
    }

    if (x < 100 || x > 290 || y < 60 || y > 202) return [ink, org];

    // Ground pool.
    const gq = ((x - 192) / 30) ** 2 + ((y - 194) / 5) ** 2;
    if (gq < 1) ink = Math.max(ink, 0.1 * smooth(clamp((1 - gq) * 3)));

    // Tripod legs: thin texture bands.
    for (const leg of legs) {
      const d = sdPolyline(x, y, leg) - 1.5;
      if (d < 3) ink = Math.max(ink, 0.25 * solid(d));
    }

    // Local tube coordinates.
    const dx = x - E[0], dy = y - E[1];
    const t = dx * ux + dy * uy, s = dx * nx + dy * ny;
    if (t < -8 || t > L + 8 || Math.abs(s) > 30) return [ink, org];

    // Mount block.
    const md = sdBox(t, s, tm, mountS, 7, 5);
    if (md < 2) ink = Math.max(ink, 0.4 * solid(md));

    // Tube body, shaded as a cylinder lit from the upper left.
    const hw = hwAt(t);
    const td = Math.max(Math.abs(s) - hw, -t, t - L);
    if (td < 2) {
      const v = clamp(s / hw, -1, 1);
      let tone = v >= 0 ? 0.45 + 0.25 * smooth(clamp(v / 0.6)) : 0.45 + 0.3 * v;
      tone *= 0.85 + 0.15 * clamp(t / L);
      if (t >= DS) tone = v > 0.55 ? 0.8 : tone + 0.1;
      if (Math.abs(t - tm) < 4) tone = 0.4; // collar
      ink = Math.max(ink * (1 - solid(td)), tone * solid(td));
    }
    // Collar ring stands slightly proud of the tube.
    const cd = sdBox(t, s, tm, 0, 4, hm + 1.5);
    if (cd < 2) ink = Math.max(ink, 0.4 * solid(cd));

    // Eyepiece stub, down from the eyepiece end.
    const ed = sdBox(t, s, 2, -13, 3.5, 6);
    if (ed < 2) ink = Math.max(ink, 0.3 * solid(ed));

    // Objective lens face.
    const q = Math.hypot((t - L) / 4, s / 13);
    if (q < 1.5) ink = Math.max(ink, 0.9 * solid((q - 1) * 4));

    return [ink, org];
  });

  // Rays: faint dashes from the star to the top, centre and bottom of the lens.
  for (const p of [lensTop, O, lensBot]) {
    const dx = p[0] - sx, dy = p[1] - sy, len = Math.hypot(dx, dy);
    const st = [sx + (dx / len) * 8, sy + (dy / len) * 8];
    g.line(polyD([st, p]), "faint", { dash: "4 3" });
  }

  // Tube outline: two long edges with the dew-shield flare, and the eyepiece end.
  const hwDS = 7 + 4 * (DS / L);
  for (const sg of [1, -1]) {
    g.line(polyD([P(0, 7 * sg), P(DS, hwDS * sg), P(DS, 12 * sg), P(L, 13 * sg)]), "ink");
  }
  g.line(polyD([P(0, 7), P(0, -7)]), "ink");

  // Objective lens ellipse.
  const ell = [];
  for (let i = 0; i < 40; i++) {
    const th = (i / 40) * Math.PI * 2;
    ell.push(P(L + 4 * Math.cos(th), 13 * Math.sin(th)));
  }
  g.line(polyD(ell, true), "ink");

  // Collar ring.
  g.line(polyD([P(tm - 4, hm + 1.5), P(tm + 4, hm + 1.5), P(tm + 4, -hm - 1.5), P(tm - 4, -hm - 1.5)], true), "soft");

  // Eyepiece.
  g.line(polyD([P(-1.5, -7), P(-1.5, -19), P(5.5, -19), P(5.5, -7.1)]), "soft");

  // Tripod legs.
  for (const leg of legs) g.line(polyD(leg), "ink");

  // Ground.
  g.line(`M120 194.5H264`, "faint");
}
