function draw(g, rand, seed, k) {
  // A forecast fan opening from a single bright present moment
  const { clamp, solid, sdPolyline, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  const AX = 182, AY = 120, MX = 304, AXIS = 172;

  // Fan geometry: mouth height 90–120, centred near the median, kept above the axis.
  const h = 90 + rand() * 30;
  const mid = Math.min(115, 169 - h / 2);
  const up = mid - h / 2, lo = mid + h / 2;
  const bow = 3 + rand() * 3;
  const tOf = (x) => clamp((x - AX) / (MX - AX));
  const yU = (x) => AY + (up - AY) * tOf(x);
  const yL = (x) => AY + (lo - AY) * tOf(x);
  const yM = (x) => { const t = tOf(x); return AY - 12 * t - bow * Math.sin(Math.PI * t); };

  // Catmull-Rom through control points.
  function spline(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // The past: a wandering track with perpendicular jitter on its interior points.
  const ctrl = [[96, 156], [122, 162], [148, 140], [166, 132], [AX, AY]];
  const jittered = ctrl.map((p, i) => {
    if (i === 0 || i === ctrl.length - 1) return p;
    const a = ctrl[i - 1], b = ctrl[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const j = (2 + rand() * 4) * (rand() < 0.5 ? -1 : 1);
    return [p[0] - (dy / L) * j, p[1] + (dx / L) * j];
  });
  const past = spline(jittered, 10);
  const pastLine = past.filter((p) => Math.hypot(p[0] - AX, p[1] - AY) > 5.5);

  // Median path.
  const median = [];
  for (let i = 0; i <= 30; i++) { const x = AX + (MX - AX) * (i / 30); median.push([x, yM(x)]); }

  // Branching futures.
  const nB = 5 + (rand() < 0.5 ? 1 : 0);
  const dashes = ["2 2", "3 2", "1 2", "4 2", "2 3", "1 3"];
  const branches = [];
  for (let i = 0; i < nB; i++) {
    let f = -0.85 + 1.7 * (i + 0.5) / nB + (rand() - 0.5) * 0.16;
    if (Math.abs(f) < 0.18) f = (rand() < 0.5 ? -1 : 1) * 0.22;
    const ex = 270 + rand() * 34;
    const amp = 2 + rand() * 4, freq = 1 + rand() * 1.5, ph = rand() * Math.PI * 2;
    const pts = [];
    for (let j = 0; j <= 32; j++) {
      const t = j / 32, x = AX + (ex - AX) * t;
      const m = yM(x);
      const hw = f < 0 ? m - yU(x) : yL(x) - m;
      let y = m + f * hw + amp * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * freq * t + ph);
      y = clamp(y, yU(x) + 1, yL(x) - 1);
      if (Math.hypot(x - AX, y - AY) > 6.5) pts.push([x, y]);
    }
    branches.push(pts);
  }

  g.print((x, y) => {
    if (x < 90 || x > 308 || y < 40 || y > 176) return 0;
    let ink = 0, orange = 0;

    // The cone of probability.
    if (x > AX && x <= MX) {
      const u = yU(x), l = yL(x), m = yM(x);
      if (y >= u && y <= l) {
        const t = tOf(x);
        const s = y < m ? (m - y) / Math.max(m - u, 0.5) : (y - m) / Math.max(l - m, 0.5);
        const c = 0.9 - 0.35 * t;
        let tone = c - (c - 0.2) * Math.pow(clamp(s), 1.6);
        if (x > 290) tone *= clamp((MX - x) / 14 + (fbm(x / 5, y / 5) - 0.5) * 0.5);
        ink = tone;
      }
    }

    // The glow around now: 1 at the disc, 0.3 by radius 18.
    const r = Math.hypot(x - AX, y - AY);
    let gt = 0;
    if (r <= 5) gt = 1;
    else if (r <= 18) gt = 1 - 0.7 * (r - 5) / 13;
    else gt = 0.3 * Math.exp(-(r - 18) / 4);
    ink = Math.max(ink, gt);
    if (r < 11) orange = gt + 0.05; // the disc and its tight glow

    // Past: only a faint halo hugging the track.
    if (x < AX + 4) {
      const dp = sdPolyline(x, y, past);
      ink = Math.max(ink, 0.15 * solid(dp - 3));
    }

    return [ink, orange];
  });

  // Ground axis and the present tick.
  g.line(`M92 ${AXIS + 0.5}H308`, "faint");
  g.line(`M${AX + 0.5} 125V${AXIS}`, "faint", { dash: "2 3" });

  // Fan boundaries.
  g.line(polyD([[AX, AY], [MX, up]]), "soft", { dash: "4 3" });
  g.line(polyD([[AX, AY], [MX, lo]]), "soft", { dash: "4 3" });

  // Possible futures.
  branches.forEach((pts, i) => { if (pts.length > 1) g.line(polyD(pts), "faint", { dash: dashes[i % dashes.length] }); });

  // The median, and the certain past.
  g.line(polyD(median), "soft");
  g.line(polyD(pastLine), "ink");
}
