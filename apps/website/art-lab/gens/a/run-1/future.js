function draw(g, rand, seed, k) {
  // A forecast: past trace, the present, a widening fan of possible futures.
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const ph = rand() * 50;

  // The present sits a little left of centre, so the future gets the room.
  const xn = Math.round(X0 + (X1 - X0) * (0.42 + rand() * 0.06));
  const y0 = 158 + rand() * 8, yn = 134 + rand() * 6;
  const slope = (y0 - yn) / (xn - X0);

  // The past: a noisy rising trace that lands exactly on "now".
  const wob = (x) => 16 * (fbm(x / 13, ph) - 0.5) + 4 * Math.sin(x / 9 + ph);
  const past = [];
  for (let x = X0; x <= xn + 0.01; x += 1.5) {
    const t = (x - X0) / (xn - X0);
    past.push([x, y0 - slope * (x - X0) + wob(x) - wob(xn) * smooth(t)]);
  }
  const now = [xn, past[past.length - 1][1]];

  // The future: a median that carries the trend on, with a fan that widens.
  const slope2 = slope * (0.9 + rand() * 0.4);
  const span = X1 - xn;
  const med = (x) => now[1] - slope2 * (x - xn);
  const halfW = (t) => 1.5 + 44 * Math.pow(t, 0.85);
  const fracs = [1, 0.62, 0.3];
  const tones = [0.2, 0.42, 0.68];

  g.print((x, y) => {
    let ink = 0;
    if (x < xn + 8) {
      const near = past.filter(([px]) => Math.abs(px - x) < 14);
      if (near.length > 1) ink = 0.34 * glow(sdPolyline(x, y, near), 3.5) * smooth(clamp((x - X0) / 40));
    }
    if (x >= xn && x <= X1) {
      const t = (x - xn) / span, m = med(x), w = halfW(t), dy = Math.abs(y - m);
      if (dy < w + 4) {
        // Lit from the upper left: each band brightens toward its top, and
        // the fan's certainty thins as it reaches forward.
        const shade = (1 - 0.4 * smooth(t)) * (1 - 0.18 * clamp((y - (m - w)) / (2 * w + 1)));
        for (let b = 0; b < 3; b++) ink = Math.max(ink, tones[b] * shade * solid(dy - w * fracs[b]));
      }
    }
    const td = Math.hypot(x - now[0], y - now[1]) - 3.5;
    return [ink, solid(td) + 0.42 * glow(td, 7)];
  });

  // Fan edges: the outer bound faint, the likely band soft.
  const edge = (f, s) => {
    const pts = [];
    for (let x = xn; x <= X1 + 0.01; x += 4) pts.push([x, med(x) + s * halfW((x - xn) / span) * f]);
    return pts;
  };
  g.line(polyD(edge(1, -1)), "faint");
  g.line(polyD(edge(1, 1)), "faint");
  g.line(polyD(edge(0.62, -1)), "soft");
  g.line(polyD(edge(0.62, 1)), "soft");
  g.line(`M${num(now[0])} ${num(now[1])}L${num(X1)} ${num(med(X1))}`, "soft", { dash: "1 3" });

  // What happened, in a crisp rule; then the present as a threshold.
  g.line(polyD(past), "ink", { width: 1.25 });
  g.line(`M${xn + 0.5} ${Y0 + 4}V${Y1}`, "faint", { dash: "4 3" });
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
}
