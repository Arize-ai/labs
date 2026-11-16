function draw(g, rand, seed, k) {
  // A fern frond arching up, its uncurling fiddlehead tip in orange
  const { clamp, smooth, solid, glow, sdPolyline, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);

  // The rachis: a cubic arching from the base up and to the right.
  const lean = (rand() - 0.5) * 14;
  const P0 = [128 + lean * 0.3, 196], P1 = [134 + lean, 120], P2 = [180, 70 + rand() * 8], P3 = [258 + rand() * 10, 78 + rand() * 8];
  const at = (t) => {
    const u = 1 - t;
    return [
      u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
      u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
    ];
  };
  const tan = (t) => {
    const a = at(Math.max(0, t - 0.01)), b = at(Math.min(1, t + 0.01));
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  const rachis = Array.from({ length: 41 }, (_, i) => at(i / 40));

  // The fiddlehead: the tip keeps going and coils clockwise.
  const tip = P3, td = tan(1), R0 = 11 + rand() * 3;
  const c = [tip[0] - td[1] * R0, tip[1] + td[0] * R0];
  const th0 = Math.atan2(tip[1] - c[1], tip[0] - c[0]);
  const coil = [];
  for (let i = 0; i <= 60; i++) {
    const s = i / 60, th = th0 + s * Math.PI * 3.1, r = R0 * Math.pow(1 - 0.85 * s, 1.3);
    coil.push([c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)]);
  }
  const cb = [c[0] - R0 - 10, c[0] + R0 + 10, c[1] - R0 - 10, c[1] + R0 + 10];

  // Pinnae: opposite pairs along the rachis, longest low down, shrinking to the tip.
  const N = 12, Lmax = 40 + rand() * 4, ang = (52 + rand() * 10) * Math.PI / 180;
  const leaves = [];
  for (let i = 0; i < N; i++) {
    for (const side of [-1, 1]) {
      const t = 0.07 + (i * 0.86) / (N - 1) + (side > 0 ? 0.018 : 0);
      const a = at(t), [tx, ty] = tan(t);
      const ca = Math.cos(ang), sa = Math.sin(ang) * side;
      const dx = tx * ca - ty * sa, dy = tx * sa + ty * ca;
      const L = Lmax * Math.pow(1 - t, 0.75) * (0.72 + 0.28 * smooth(clamp(t / 0.3))) + 4;
      const b = [a[0] + dx * L, a[1] + dy * L];
      const w = 0.19 * L + 1.2, lobes = Math.max(2, Math.round(L / 6.5));
      leaves.push({
        a, b, ex: b[0] - a[0], ey: b[1] - a[1], L, w, lobes,
        box: [Math.min(a[0], b[0]) - w - 8, Math.max(a[0], b[0]) + w + 8, Math.min(a[1], b[1]) - w - 8, Math.max(a[1], b[1]) + w + 8],
      });
    }
  }
  const rb = [Math.min(P0[0], P1[0], P2[0], P3[0]) - 10, Math.max(P0[0], P3[0]) + 10, Math.min(P2[1], P3[1]) - 10, P0[1] + 10];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (const f of leaves) {
      const [x0, x1, y0, y1] = f.box;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const wx = x - f.a[0], wy = y - f.a[1];
      const h = clamp((wx * f.ex + wy * f.ey) / (f.L * f.L));
      const dist = Math.hypot(wx - f.ex * h, wy - f.ey * h);
      const r = f.w * Math.sqrt(clamp(h * 5)) * Math.pow(1 - h, 0.8) * (0.62 + 0.38 * Math.abs(Math.cos(h * Math.PI * f.lobes)));
      const d = dist - r;
      // Lit from the upper left, brightest near the rachis.
      const shade = 0.95 - 0.28 * h - 0.12 * clamp((x - y - 0) / 300);
      ink = Math.max(ink, solid(d) * shade + 0.14 * glow(d, 5));
    }
    if (x > rb[0] && x < rb[1] && y > rb[2] && y < rb[3]) ink = Math.max(ink, 0.3 * glow(sdPolyline(x, y, rachis), 3));
    // The frond dissolves into the ground at its base.
    ink *= 1 - 0.6 * smooth(clamp((y - 165) / 35)) * (0.6 + 0.8 * (fbm(x / 7, y / 7) - 0.3));
    if (x > cb[0] && x < cb[1] && y > cb[2] && y < cb[3]) {
      const sd = sdPolyline(x, y, coil) - 1.6;
      sig = solid(sd) + 0.38 * glow(sd, 6);
    }
    return [clamp(ink), sig];
  });

  // Structure: the rachis fading into the ground, midribs, and the coil.
  g.fadeLine(polyD(rachis), "var(--fg)", 0.85, 150, 200);
  for (const f of leaves) {
    const e = [f.a[0] + f.ex * 0.82, f.a[1] + f.ey * 0.82];
    if (f.a[1] < 175) g.line(polyD([f.a, e]), "soft");
  }
  g.line(polyD(coil), "sig", { width: 1.25 });
  g.line(`M${num(P0[0] - 26)} ${num(P0[1]) + 0.5}H${num(P0[0] + 26)}`, "faint", { dash: "1 3" });
}
