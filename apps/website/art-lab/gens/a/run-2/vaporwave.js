function draw(g, rand, seed, k) {
  // A striped sun setting behind wire mountains over a perspective grid floor
  const { clamp, solid, glow, inPolygon, polyD, num, X0, X1, Y1 } = k;
  const hz = 140, cx = 200, cy = 130, R = 50;

  // The sun's slits: bands widening toward the horizon.
  const slits = [0, 1, 2, 3].map((i) => ({ c: 106 + i * 9, hw: 1.2 + 0.6 * i }));

  // Mountains either side, jagged by the seed.
  const range = (x0, x1, n) => {
    const pts = [[x0, hz]];
    for (let i = 1; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / n + (rand() - 0.5) * 6;
      const h = (i % 2 ? 22 : 9) + rand() * 12;
      pts.push([x, hz - h]);
    }
    pts.push([x1, hz]);
    return pts;
  };
  const left = range(88, 172, 6), right = range(228, 312, 6);
  const bb = (p) => [Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1]))];
  const mounts = [left, right].map((p) => ({ p, b: bb(p) }));

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // The sun: solid above the horizon, cut by slits, brightest at its top.
    if (Math.abs(x - cx) < R + 40 && y > cy - R - 40 && y < hz + 30) {
      const d = Math.hypot(x - cx, y - cy) - R;
      if (y < hz) {
        let cut = 1;
        for (const s of slits) cut = Math.min(cut, clamp(0.5 + (Math.abs(y - s.c) - s.hw) / k.P));
        const shade = 1 - 0.3 * clamp((y - (cy - R)) / (hz - cy + R)) - 0.08 * clamp((x - cx + R) / (2 * R));
        sig = solid(d) * cut * shade * solid(y - hz + 0.5) + 0.28 * glow(d, 10);
      }
    }
    // Mountains: a faint fill, lit from the upper left.
    for (const m of mounts) {
      const [a, b, t] = m.b;
      if (x < a || x > b || y < t || y > hz) continue;
      if (inPolygon(x, y, m.p)) ink = Math.max(ink, 0.3 - 0.12 * clamp((x - a) / (b - a)) - 0.1 * clamp((y - t) / (hz - t)));
    }
    // The sun's reflection on the floor.
    if (y > hz && x > X0 && x < X1) {
      ink = Math.max(ink, 0.26 * Math.exp(-(y - hz) / 14) * Math.exp(-Math.abs(x - cx) / 46));
    }
    return [ink, sig];
  });

  // Sun rim above the first slit.
  const arc = [];
  for (let i = 0; i <= 80; i++) {
    const a = Math.PI + (Math.PI * i) / 80;
    const p = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    if (p[1] < slits[0].c - slits[0].hw - 1) arc.push(p);
  }
  g.line(polyD(arc), "sig");

  // Mountain outlines.
  for (const m of mounts) g.line(polyD(m.p), "soft");

  // The horizon.
  g.line(`M${X0} ${hz + 0.5}H${X1}`, "ink");

  // Floor grid: rows compressing into the distance.
  const depth = Y1 - hz;
  for (let n = 1; n <= 6; n++) {
    const y = Math.round(hz + depth * (n / 6) ** 2) + 0.5;
    g.line(`M${X0} ${y}H${X1}`, n >= 3 ? "soft" : "faint");
  }
  // Floor grid: rays to the vanishing point, clipped to the box.
  const spread = 28;
  for (let o = -8; o <= 8; o++) {
    const y0 = hz + 2;
    const xAt = (y) => cx + (o * spread * (y - hz)) / depth;
    let y1 = Y1, x1 = xAt(Y1);
    if (x1 < X0 || x1 > X1) {
      const bx = x1 < X0 ? X0 : X1;
      y1 = hz + (depth * (bx - cx)) / (o * spread);
      x1 = bx;
    }
    g.line(`M${num(xAt(y0))} ${num(y0)}L${num(x1)} ${num(y1)}`, Math.abs(o) <= 2 ? "soft" : "faint");
  }
}
