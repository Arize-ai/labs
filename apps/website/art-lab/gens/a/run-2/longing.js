function draw(g, rand, seed, k) {
  // A body reaching along an arc toward a distant point it never meets
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, sdPolyline, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);

  // The one who longs: a heavy disc low on the left.
  const ax = X0 + 44 + rand() * 8, ay = Y1 - 42 - rand() * 6, ar = 22;
  // The thing longed for: a small point high on the far right.
  const bx = X1 - 26 - rand() * 8, by = Y0 + 26 + rand() * 8, br = 4.5;

  // The reach: a quadratic arc from A's rim toward B. It stops short.
  const ang = Math.atan2(by - ay, bx - ax) - 0.55;
  const sx = ax + Math.cos(ang) * ar, sy = ay + Math.sin(ang) * ar;
  const qx = (ax + bx) / 2 - 18, qy = Math.min(ay, by) - 34 - rand() * 8;
  const quad = (t) => {
    const u = 1 - t;
    return [u * u * sx + 2 * u * t * qx + t * t * bx, u * u * sy + 2 * u * t * qy + t * t * by];
  };
  const END = 0.84, N = 48;
  const pts = [], ts = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * END;
    pts.push(quad(t));
    ts.push(t);
  }
  const reachFade = (t) => 1 - 0.85 * smooth(clamp((t - 0.3) / (END - 0.3)));
  const pad = 22;
  const bx0 = Math.min(...pts.map((p) => p[0])) - pad, bx1 = Math.max(...pts.map((p) => p[0])) + pad;
  const by0 = Math.min(...pts.map((p) => p[1])) - pad, by1 = Math.max(...pts.map((p) => p[1])) + pad;

  g.print((x, y) => {
    let ink = 0, sig = 0;

    // Disc A: solid, lit from the upper left, with a soft halo.
    const dA = Math.hypot(x - ax, y - ay) - ar;
    const shade = 0.98 - 0.32 * clamp(((x - ax) + (y - ay)) / (2 * ar) + 0.5);
    ink = Math.max(ink, solid(dA) * shade + 0.2 * glow(dA, 9));

    // The reach: a glow along the arc, thinning as it goes.
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      let best = Infinity, bt = 0;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i][0] - x, dy = pts[i][1] - y, dd = dx * dx + dy * dy;
        if (dd < best) { best = dd; bt = ts[i]; }
      }
      const near = [];
      for (let i = 0; i < pts.length; i++) if (Math.abs(pts[i][0] - x) < 14) near.push(pts[i]);
      const d = near.length > 1 ? sdPolyline(x, y, near) : Math.sqrt(best);
      const n = 0.6 + 0.8 * (fbm(x / 6, y / 6) - 0.3);
      ink = Math.max(ink, 0.34 * glow(d, 3.5) * reachFade(bt) * clamp(n));
    }

    // Point B: the one orange thing, out of reach.
    const dB = Math.hypot(x - bx, y - by) - br;
    sig = solid(dB) + 0.42 * glow(dB, 8);
    return [ink, sig];
  });

  const circle = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;

  // Disc A's rim.
  g.line(circle(ax, ay, ar), "ink");

  // The arc in three weights: firm near the body, dotted where it gives out.
  const a = Math.round(N * 0.38), b = Math.round(N * 0.68);
  g.line(polyD(pts.slice(0, a + 1)), "ink", { width: 1.25 });
  g.line(polyD(pts.slice(a, b + 1)), "soft", { width: 1.25 });
  g.line(polyD(pts.slice(b)), "faint", { dash: "1 3" });

  // An orbit around B the arc never crosses.
  g.line(circle(bx, by, 13), "faint", { dash: "1 3" });
  g.line(circle(bx, by, br), "sig");

  // A dimension line measuring the distance between them.
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const nx = dy / L, ny = -dx / L, off = -30;
  const p0 = [ax + nx * off, ay + ny * off], p1 = [bx + nx * off, by + ny * off];
  g.line(polyD([p0, p1]), "faint", { dash: "4 3" });
  const tick = (p) => polyD([[p[0] - nx * 4, p[1] - ny * 4], [p[0] + nx * 4, p[1] + ny * 4]]);
  g.line(tick(p0), "soft");
  g.line(tick(p1), "soft");
}
