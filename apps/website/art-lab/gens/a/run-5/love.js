function draw(g, rand, seed, k) {
  // A plotted heart curve; two halves meet at one orange point.
  const { clamp, smooth, makeNoise, sdPolyline, inPolygon, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const s = 4.4 + rand() * 0.2, cx = 200, cy = 114 + rand() * 2;
  const tilt = (rand() - 0.5) * 0.1, ct = Math.cos(tilt), st = Math.sin(tilt);
  const place = (hx, hy) => {
    const x = hx * s, y = -hy * s;
    return [cx + x * ct - y * st, cy + x * st + y * ct];
  };
  const heart = (t) => [
    16 * Math.sin(t) ** 3,
    13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  ];
  const N = 160;
  const pts = Array.from({ length: N + 1 }, (_, i) => place(...heart((i / N) * Math.PI * 2)));
  const right = pts.slice(0, N / 2 + 1), left = pts.slice(N / 2);
  const tip = pts[N / 2], cusp = pts[0];

  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  for (const [x, y] of pts) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
  const pad = 30, span = (bx1 - bx0) + (by1 - by0);

  g.print((x, y) => {
    const td = Math.hypot(x - tip[0], y - tip[1]) - 3.5;
    const sig = solid(td) + 0.42 * glow(td, 7);
    if (x < bx0 - pad || x > bx1 + pad || y < by0 - pad || y > by1 + pad) return [0, sig];
    const near = pts.filter(([px, py]) => Math.abs(px - x) < 14 && Math.abs(py - y) < 14);
    const dist = near.length > 1 ? sdPolyline(x, y, near) : 14;
    const inside = inPolygon(x, y, pts);
    let ink;
    if (inside) {
      // Lit from the upper left, deepening toward the tip.
      const u = clamp(((x - bx0) + (y - by0)) / span);
      const body = 0.92 - 0.5 * smooth(u) + 0.08 * (fbm(x / 7, y / 7) - 0.5);
      ink = Math.max(body * solid(-dist), 0.3 * Math.exp(-dist / 3));
    } else {
      ink = 0.26 * glow(dist, 7) + 0.1 * glow(dist, 18);
    }
    return [clamp(ink), sig];
  });

  // Construction guides: the axis of symmetry and the two lobe circles.
  const [ax0, ay0] = place(0, 15.5), [ax1, ay1] = place(0, -20);
  g.line(`M${num(ax0)} ${num(ay0)}L${num(ax1)} ${num(ay1)}`, "faint", { dash: "1 3" });
  for (const side of [-1, 1]) {
    const [ox, oy] = place(side * 8.2, 4.6), r = num(7.6 * s);
    g.line(`M${num(ox - 7.6 * s)} ${num(oy)}a${r} ${r} 0 1 0 ${num(15.2 * s)} 0a${r} ${r} 0 1 0 ${num(-15.2 * s)} 0Z`, "faint", { dash: "1 3" });
  }
  g.line(`M${num(cusp[0] - 4)} ${num(cusp[1]) + 0.5}h8`, "soft");

  // The two halves, each its own rule, meeting at the tip.
  g.line(polyD(right), "ink", { width: 1.25 });
  g.line(polyD(left), "ink", { width: 1.25 });
}
