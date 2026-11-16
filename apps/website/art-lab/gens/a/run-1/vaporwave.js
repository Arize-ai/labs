function draw(g, rand, seed, k) {
  // A striped sun setting behind wire mountains over a perspective grid
  const { X0, X1, Y0, Y1, clamp, solid, glow, polyD, num, inPolygon } = k;
  const cx = 200, h = 142, r = 44, cy = h - 22;

  // Sun slits: gaps that thicken toward the horizon.
  const gaps = [];
  let gy = h - 2.5;
  for (let n = 0; n < 5; n++) {
    const gh = 5.5 - n * 0.7;
    gaps.push([gy, gh / 2]);
    gy -= gh + 4 + n * 1.6;
  }

  // Low wireframe mountains either side, a little seeded.
  const jit = () => (rand() - 0.5) * 6;
  const left = [[X0, h], [X0 + 18, h - 16 + jit()], [X0 + 34, h - 10 + jit()], [X0 + 54, h - 30 + jit()], [X0 + 72, h - 13 + jit()], [X0 + 86, h]];
  const right = [[X1 - 88, h], [X1 - 70, h - 15 + jit()], [X1 - 52, h - 34 + jit()], [X1 - 36, h - 18 + jit()], [X1 - 18, h - 24 + jit()], [X1, h]];
  const bbox = (p) => [Math.min(...p.map((q) => q[1])), p[0][0], p[p.length - 1][0]];
  const mts = [left, right].map((p) => ({ p, b: bbox(p) }));

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Mountains: lit from the upper left.
    for (const m of mts) {
      const [top, x0, x1] = m.b;
      if (y >= top && y <= h && x >= x0 && x <= x1 && inPolygon(x, y, m.p)) {
        const shade = 0.62 - 0.22 * clamp((x - x0) / (x1 - x0)) - 0.1 * clamp((y - top) / (h - top));
        return [shade, 0];
      }
    }
    if (y <= h + 1) {
      const cd = Math.hypot(x - cx, y - cy) - r;
      let d = Math.max(cd, y - h);
      for (const [gc, gh] of gaps) {
        if (Math.abs(y - gc) < gh + 3) d = Math.max(d, gh - Math.abs(y - gc));
      }
      const shade = 1 - 0.22 * clamp((y - (cy - r)) / (2 * r)) - 0.08 * clamp((x - (cx - r)) / (2 * r));
      sig = solid(d) * shade;
      if (cd > 0) sig = Math.max(sig, 0.32 * glow(cd, 11));
      // Faint sky haze above the horizon.
      ink = 0.12 * Math.exp(-(h - y) / 16) * Math.exp(-(((x - cx) / 110) ** 2));
    } else {
      // Floor: the sun's light pooled at the horizon, dying toward the viewer.
      if (x > X0 - 6 && x < X1 + 6 && y < Y1 + 6) {
        ink = 0.34 * Math.exp(-(y - h) / 12) * Math.exp(-(((x - cx) / 70) ** 2)) + 0.08 * Math.exp(-(y - h) / 30);
      }
    }
    return [ink, sig];
  });

  // Perspective grid: rays from the vanishing point, fading into the horizon.
  const bottom = Y1;
  for (let i = -7; i <= 7; i++) {
    const bx = cx + i * 26;
    let ex = bx, ey = bottom;
    if (bx < X0 || bx > X1) {
      const xb = bx < X0 ? X0 : X1;
      ex = xb;
      ey = h + ((bottom - h) * (xb - cx)) / (bx - cx);
    }
    g.fadeLine(`M${num(cx)} ${h}L${num(ex)} ${num(ey)}`, "var(--fg)", 0.45, bottom, h);
  }
  // Cross lines, closer together toward the horizon.
  const zs = [1, 1.35, 1.85, 2.6, 3.7, 5.4];
  zs.forEach((z, n) => {
    const y = Math.round(h + (bottom - h) / z) + 0.5;
    g.line(`M${X0} ${y}H${X1}`, n < 3 ? "soft" : "faint");
  });

  // Mountain wireframes, the horizon, and the sun's rim.
  for (const m of mts) {
    g.line(polyD(m.p), "soft");
    const peaks = m.p.slice(1, -1);
    for (let n = 0; n < peaks.length - 1; n++) {
      const a = peaks[n], b = peaks[n + 1];
      const mx = (a[0] + b[0]) / 2;
      g.line(polyD([a, [mx, h], b]), "faint");
    }
  }
  g.line(`M${X0} ${h + 0.5}H${X1}`, "ink", { width: 1.25 });
  const a0 = Math.asin((h - cy) / r), sx = r * Math.cos(a0);
  g.line(`M${num(cx - sx)} ${h}A${r} ${r} 0 1 1 ${num(cx + sx)} ${h}`, "sig");
  g.line(`M${X0} ${Y0 + 0.5}H${X1}`, "faint", { dash: "1 3" });
}
