function draw(g, rand, seed, k) {
  // Vaporwave: banded setting sun over a perspective grid between mountains
  const { X0, X1, Y1, clamp, solid, glow, inPolygon, polyD, num } = k;
  const cx = 200, hy = 140, sr = 44, sy = hy - 22;

  // The sun's slats: gaps that thicken toward the horizon.
  const gaps = [0, 1, 2, 3, 4].map((i) => ({ y: sy - 18 + i * 9 - i * i * 0.6, h: 1.2 + i * 0.45 }));

  // Low mountains on either side, rising from the horizon.
  const ridge = (xa, xb, dir) => {
    const pts = [[xa, hy]];
    const n = 6;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = xa + (xb - xa) * t;
      const swell = dir > 0 ? t : 1 - t;
      const hgt = (i % 2 ? 10 + rand() * 18 : 3 + rand() * 7) * (0.55 + 0.6 * swell);
      pts.push([x, hy - hgt]);
    }
    pts.push([xb, hy]);
    return pts;
  };
  const mountains = [ridge(X0, 166, 1), ridge(234, X1, -1)];
  const mBoxes = mountains.map((m) => {
    const ys = m.map((p) => p[1]);
    return [m[0][0], m[m.length - 1][0], Math.min(...ys), hy];
  });

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Mountains occlude the sun; lit from the upper left.
    for (let m = 0; m < mountains.length; m++) {
      const [x0, x1, y0, y1] = mBoxes[m];
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (inPolygon(x, y, mountains[m])) {
        const t = clamp((y - y0) / (y1 - y0));
        return [0.5 * (1 - 0.6 * t) * (1 - 0.15 * clamp((x - x0) / (x1 - x0))), 0];
      }
    }
    if (y <= hy) {
      const dc = Math.hypot(x - cx, y - sy) - sr;
      let d = dc;
      for (const gp of gaps) d = Math.max(d, -(Math.abs(y - gp.y) - gp.h));
      d = Math.max(d, y - hy + 1);
      const shade = 1 - 0.3 * clamp((y - (sy - sr)) / (hy - sy + sr)) - 0.08 * clamp((x - cx + sr) / (2 * sr));
      sig = Math.max(solid(d) * shade, dc > 0 ? 0.3 * glow(dc, 10) : 0);
    } else {
      // The floor: haze at the horizon and the sun's reflection.
      const side = clamp((Math.min(x - X0, X1 - x) + 10) / 30);
      const haze = 0.16 * Math.exp(-(y - hy) / 14) * side;
      const refl = 0.32 * Math.exp(-(y - hy) / 11) * Math.exp(-(((x - cx) / 46) ** 2));
      ink = Math.max(haze, refl);
    }
    return [ink, sig];
  });

  // Converging grid lines, fading into the horizon.
  const half = X1 - cx, depth = Y1 - hy;
  let conv = "";
  for (let i = -7; i <= 7; i++) {
    if (i === 0) { conv += `M${cx + 0.5} ${hy + 2}V${Y1}`; continue; }
    const spread = i * 22;
    let yb = Y1;
    if (Math.abs(spread) > half) yb = hy + (depth * half) / Math.abs(spread);
    const xa = cx + (spread * 2) / depth, xb = cx + (spread * (yb - hy)) / depth;
    conv += `M${num(xa)} ${hy + 2}L${num(xb)} ${num(yb)}`;
  }
  g.fadeLine(conv, "var(--fg)", 0.45, Y1, hy);

  // Receding cross lines, scrolled by the seed.
  const phase = rand();
  for (let n = 0; n < 9; n++) {
    const y = hy + depth / (1 + (n + phase) * 0.7);
    if (y > Y1 || y < hy + 2) continue;
    g.line(`M${X0} ${num(Math.round(y) + 0.5)}H${X1}`, n < 3 ? "soft" : "faint");
  }

  for (const m of mountains) g.line(polyD(m), "ink");
  g.line(`M${X0} ${hy + 0.5}H${X1}`, "ink");
}
