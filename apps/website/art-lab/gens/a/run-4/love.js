function draw(g, rand, seed, k) {
  // A plotted heart: two traces that meet at one orange point
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, makeNoise, W, H, Y0, Y1 } = k;
  const fbm = makeNoise(seed + 11);
  const cx = W / 2, cy = H / 2;
  const s = 4.05 + rand() * 0.25;
  const tilt = (rand() - 0.5) * 0.1;
  const ct = Math.cos(tilt), st = Math.sin(tilt);

  // The heart curve, y up, centred on its own height.
  const heart = (t) => {
    const hx = 16 * Math.sin(t) ** 3;
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const x = hx * s, y = -(hy + 2.7) * s;
    return [cx + x * ct - y * st, cy + x * st + y * ct];
  };
  const N = 72;
  const leftHalf = [], rightHalf = [];
  for (let i = 0; i <= N; i++) {
    const t = (Math.PI * i) / N;
    rightHalf.push(heart(t));
    leftHalf.push(heart(-t));
  }
  const outline = rightHalf.concat(leftHalf.slice(0, -1).reverse());
  const tip = rightHalf[N];
  const cusp = rightHalf[0];

  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const M = 30;

  g.print((x, y) => {
    const td = Math.hypot(x - tip[0], y - tip[1]) - 3.5;
    const sig = solid(td) + 0.45 * glow(td, 6);
    if (x < bx0 - M || x > bx1 + M || y < by0 - M || y > by1 + M) return [0, sig];
    const near = outline.filter(([px, py]) => Math.abs(px - x) < 26 && Math.abs(py - y) < 26);
    const dist = near.length > 1 ? sdPolyline(x, y, near) : 26;
    const inside = inPolygon(x, y, outline);
    const d = inside ? -dist : dist;
    // Lit from the upper left: the fill brightens toward its top-left.
    const u = clamp(((x - bx0) + (y - by0)) / (bx1 - bx0 + by1 - by0));
    const shade = 0.96 - 0.4 * u + 0.08 * (fbm(x / 11, y / 11) - 0.5);
    const ink = inside
      ? solid(d) * shade
      : 0.26 * glow(d, 9) + 0.1 * glow(d, 3);
    return [ink, sig];
  });

  // Inner contour, a dotted guide set in from the edge.
  const ccx = cx, ccy = (by0 + by1) / 2;
  const inner = outline.map(([x, y]) => [ccx + (x - ccx) * 0.84, ccy + (y - ccy) * 0.84 - 3]);
  g.line(polyD(inner, true), "soft", { dash: "1 3" });

  // Symmetry axis and the baseline the two traces meet on.
  g.line(`M${num(cusp[0]) }${" "}${num(Y0 - 2)}L${num(tip[0])} ${num(Y1 + 2)}`, "faint", { dash: "1 3" });
  g.line(`M${num(tip[0] - 70)} ${Math.round(tip[1]) + 0.5}H${num(tip[0] + 70)}`, "faint");

  // The two traces, one per half, meeting at the tip.
  g.line(polyD(leftHalf), "ink", { width: 1.25 });
  g.line(polyD(rightHalf), "ink", { width: 1.25 });
}
