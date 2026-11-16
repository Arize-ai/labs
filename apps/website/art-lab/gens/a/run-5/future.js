function draw(g, rand, seed, k) {
  // A forecast: the past as a line, the future as a widening fan
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const nowX = Math.round(X0 + (X1 - X0) * (0.42 + rand() * 0.06)) + 0.5;
  const phase = rand() * 10, amp = 4 + rand() * 3;
  const pastY = (x) => {
    const t = (x - X0) / (nowX - X0);
    return 156 - 20 * t + amp * Math.sin(t * 9 + phase) + 9 * (fbm(x / 14, phase) - 0.5);
  };
  const past = [];
  for (let x = X0; x < nowX; x += 1.5) past.push([x, pastY(x)]);
  past.push([nowX, pastY(nowX)]);
  const nowY = past[past.length - 1][1];
  // Carry the recent slope into the future, bending toward a gentle rise.
  const slope = (nowY - past[past.length - 6][1]) / (nowX - past[past.length - 6][0]);
  const rise = 22 + rand() * 14, span = X1 - nowX;
  const med = (x) => {
    const u = clamp((x - nowX) / span);
    return nowY + slope * span * u * (1 - u) * 0.6 - rise * smooth(u);
  };
  const spread = (x) => 2 + 44 * Math.pow(clamp((x - nowX) / span), 1.15);
  const future = [];
  for (let x = nowX; x <= X1 + 0.1; x += 2) future.push([x, med(x)]);
  const band = (f) => future.map(([x, y]) => [x, y + f * spread(x)]);

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x < nowX + 2 && x > X0 - 8) {
      const near = past.filter(([px]) => Math.abs(px - x) < 12);
      if (near.length > 1) ink = 0.36 * glow(sdPolyline(x, y, near), 3.5);
    }
    if (x >= nowX && x <= X1) {
      const u = (x - nowX) / span, m = med(x), s = spread(x), dy = Math.abs(y - m);
      // Lit from the upper left: each band is brightest near now and up top.
      const shade = (1 - 0.35 * u) * (1 - 0.12 * clamp((y - m + s) / (2 * s)));
      const inner = 0.62 * solid(dy - 0.45 * s) * shade;
      const outer = 0.26 * solid(dy - s) * shade;
      ink = Math.max(ink, inner, outer, 0.12 * glow(dy - s, 6) * (1 - u));
    }
    const nd = Math.hypot(x - nowX, y - nowY) - 3.5;
    sig = solid(nd) + 0.42 * glow(nd, 7);
    return [ink, sig];
  });

  // Structure: the past line, the fan's bounds, its median, now and the axis.
  g.line(polyD(past), "ink", { width: 1.25 });
  g.line(polyD(band(-1)), "soft");
  g.line(polyD(band(1)), "soft");
  g.line(polyD(band(-0.45)), "faint");
  g.line(polyD(band(0.45)), "faint");
  g.line(polyD(future), "ink", { dash: "4 3" });
  g.line(`M${nowX} ${Y0 + 4}V${Y1}`, "faint", { dash: "1 3" });
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
  g.line(`M${nowX} ${Y1}v4`, "soft");
}
