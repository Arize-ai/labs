function draw(g, rand, seed, k) {
  // A forecast cone fanning out from a single present moment
  const { clamp, smooth, solid, polyD, num } = k;

  // ---- Past track: a Catmull-Rom curve through the brief's points ----
  const knots = [[96, 172], [130, 162], [158, 150], [184, 138]];
  const ext = [
    [2 * knots[0][0] - knots[1][0], 2 * knots[0][1] - knots[1][1]],
    ...knots,
    [2 * knots[3][0] - knots[2][0], 2 * knots[3][1] - knots[2][1]],
  ];
  const cr = (a, b, c, d, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  };
  const track = [];
  for (let i = 1; i < ext.length - 2; i++) {
    for (let s = 0; s < 16; s++) {
      const t = s / 16;
      track.push([
        cr(ext[i - 1][0], ext[i][0], ext[i + 1][0], ext[i + 2][0], t),
        cr(ext[i - 1][1], ext[i][1], ext[i + 1][1], ext[i + 2][1], t),
      ]);
    }
  }
  track.push(knots[3].slice());
  const cum = [0];
  for (let i = 1; i < track.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(track[i][0] - track[i - 1][0], track[i][1] - track[i - 1][1]));
  }
  const L = cum[cum.length - 1];
  const at = (s) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    const a = track[i - 1], b = track[i];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return { p: [a[0] + tx * f, a[1] + ty * f], n: [-ty / tl, tx / tl] };
  };
  // Seven past positions, evenly spaced (~14–15 apart), jittered up to 2 units off the curve.
  const discs = [];
  for (let j = 0; j < 7; j++) {
    const { p, n } = at((j * (L - 14)) / 6);
    const off = (rand() * 2 - 1) * 2;
    discs.push([p[0] + n[0] * off, p[1] + n[1] * off]);
  }

  // ---- Cone ----
  const ax = 184, ay = 138, mx = 306;
  const endY = 94 + rand() * 22;
  const hw = Math.min(40 + rand() * 14, endY - 48); // keep the upper lip on the card
  const span = mx - ax;
  const cyAt = (t) => ay + (endY - ay) * (0.55 * t + 0.45 * t * t);
  const hAt = (t) => 4 + (hw - 4) * Math.pow(t, 0.9);
  const bulge = 6;
  const yTop = endY - hw - 6, yBot = ay + 4 + Math.max(0, hw * 0.5) + 30;

  g.print((x, y) => {
    if (x < 84 || x > 320 || y < 30 || y > 200) return 0;
    let ink = 0, org = 0;

    // Cone light: bright at the apex, thinning toward the mouth.
    if (x >= ax && x <= mx + bulge + 3 && y > yTop && y < yBot) {
      const t = clamp((x - ax) / span);
      const c = cyAt(t), h = hAt(t);
      const u = (y - c) / h;
      let m = solid(Math.abs(y - c) - h);
      if (x > mx) m *= Math.abs(u) <= 1 ? solid(x - (mx + bulge * (1 - u * u))) : 0;
      if (m > 0) {
        const uc = clamp(Math.abs(u));
        const tone = 0.68 - 0.58 * t + 0.1 * (1 - uc * uc) + 0.06 * clamp(-u) * (1 - t);
        ink = Math.max(ink, m * tone);
      }
    }

    // Past discs: constant 0.5, crisp; slightly padded so a lattice point always lands.
    if (x < ax + 4 && y > 125) {
      for (const [px, py] of discs) {
        const d = Math.hypot(x - px, y - py) - 3;
        if (d < 4) ink = Math.max(ink, 0.5 * solid(d - 1.2));
      }
    }

    // Present: full orange disc with a soft ~20-unit glow.
    const r = Math.hypot(x - ax, y - ay);
    if (r < 28) {
      if (r <= 6) org = 1;
      else org = Math.max(solid(r - 6), 0.6 * (1 - smooth(clamp((r - 6) / 20))));
    }
    return [ink, org];
  });

  // ---- Lines ----
  const N = 40;
  const upper = [], lower = [], centre = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = ax + span * t, c = cyAt(t), h = hAt(t);
    upper.push([x, c - h]);
    lower.push([x, c + h]);
    centre.push([x, c]);
  }
  const mouth = [];
  for (let i = 0; i <= 20; i++) {
    const u = -1 + (2 * i) / 20;
    mouth.push([mx + bulge * (1 - u * u), cyAt(1) + u * hAt(1)]);
  }
  centre[centre.length - 1] = [mx + bulge, cyAt(1)];

  g.line(polyD(upper), "soft", { dash: "4 3" });
  g.line(polyD(lower), "soft", { dash: "4 3" });
  g.line(polyD(centre), "faint", { dash: "2 3" });
  g.line(polyD(mouth), "faint");

  for (const xi of [214, 244, 274, 304]) {
    const t = clamp((xi - ax) / span), c = cyAt(t), h = hAt(t);
    const arc = [];
    for (let i = 0; i <= 12; i++) {
      const u = -1 + (2 * i) / 12;
      arc.push([xi + 3 * (1 - u * u), c + u * h]);
    }
    g.line(polyD(arc), "faint");
  }

  g.line(polyD(track), "ink");
  for (const [px, py] of discs) {
    g.line(`M${num(px - 3)} ${num(py)}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`, "faint");
  }
}
