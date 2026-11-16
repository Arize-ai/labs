function draw(g, rand, seed, k) {
  // A plotted parametric heart curve; its two halves meet in orange
  const { X0, X1, Y0, Y1, clamp, solid, glow, sdPolyline, inPolygon, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const s = 4.4, cx = 200, cy = 112;
  const tilt = (rand() - 0.5) * 0.08, ct = Math.cos(tilt), st = Math.sin(tilt);
  const N = 160;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const rx = hx * ct - hy * st, ry = hx * st + hy * ct;
    pts.push([cx + rx * s, cy - ry * s]);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const bw = bx1 - bx0, bh = by1 - by0, pad = 28;
  // The cusp where the two lobes meet (t = 0).
  const cusp = pts[0];
  // A soft highlight on the upper-left lobe.
  const hlx = bx0 + bw * (0.26 + rand() * 0.06), hly = by0 + bh * (0.2 + rand() * 0.06);

  g.print((x, y) => {
    let ink = 0;
    if (x > bx0 - pad && x < bx1 + pad && y > by0 - pad && y < by1 + pad) {
      const dist = sdPolyline(x, y, pts);
      const inside = inPolygon(x, y, pts);
      const d = inside ? -dist : dist;
      if (inside) {
        // Lit from the upper left: brighter toward the top-left, darker to the tip.
        const u = clamp(((x - bx0) / bw + (y - by0) / bh) / 2);
        const shade = 0.5 + 0.38 * (1 - u) + 0.08 * (fbm(x / 7, y / 7) - 0.5);
        const hl = 0.22 * Math.exp(-((x - hlx) ** 2 + (y - hly) ** 2) / 260);
        // A brighter rim just inside the edge.
        ink = clamp(solid(d) * (shade + hl) + 0.12 * Math.exp(d / 3));
      } else {
        ink = 0.22 * glow(d, 8);
      }
    }
    const td = Math.hypot(x - cusp[0], y - cusp[1]) - 3.5;
    return [ink, solid(td) + 0.45 * glow(td, 7)];
  });

  // Axes of the plot, dotted, crossing at the heart's origin.
  const ax = Math.round(cx) + 0.5, ay = Math.round(cy) + 0.5;
  g.line(`M${ax} ${Y0 - 4}V${Y1 + 2}`, "faint", { dash: "1 3" });
  g.line(`M${X0} ${ay}H${X1}`, "faint", { dash: "1 3" });
  for (let u = -16; u <= 16; u += 4) {
    if (u === 0) continue;
    const tx = Math.round(cx + u * s) + 0.5;
    g.line(`M${tx} ${ay - 2}v4`, "soft");
  }
  for (let v = -16; v <= 12; v += 4) {
    if (v === 0) continue;
    const ty = Math.round(cy - v * s) + 0.5;
    g.line(`M${ax - 2} ${ty}h4`, "soft");
  }
  // The curve itself, crisp.
  g.line(polyD(pts, true), "ink", { width: 1.25 });
  g.line(`M${num(cusp[0] - 3.5)} ${num(cusp[1])}a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z`, "sig");
}
