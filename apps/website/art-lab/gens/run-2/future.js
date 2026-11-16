function draw(g, rand, seed, k) {
  // A forecast: a known past line opening into a widening cone of futures
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const s = rand() * 50;

  const nowX = Math.round(X0 + (X1 - X0) * (0.42 + rand() * 0.06)) + 0.5;
  const nowY = 132 + rand() * 10;
  const slope = 0.12 + rand() * 0.1; // rises to the right
  const spread = 46 + rand() * 6;

  // The past: a noisy line that settles into the present.
  const hist = [];
  for (let x = X0; x <= nowX; x += 1.5) {
    const u = (x - X0) / (nowX - X0);
    const w = 1 - smooth(clamp((u - 0.8) / 0.2));
    const y = nowY + (nowX - x) * slope * 0.8 + 18 * (fbm(x / 16, s) - 0.5) * w + 4 * Math.sin(x / 9 + s) * w;
    hist.push([x, y]);
  }
  hist[hist.length - 1] = [nowX, nowY];

  // The future: a median and nested bands that widen with distance.
  const cy = (x) => nowY - slope * (x - nowX);
  const hw = (x) => 2 + spread * Math.pow(clamp((x - nowX) / (X1 - nowX)), 0.85);
  const tip = [X1, cy(X1)];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x <= nowX + 2) {
      const near = hist.filter(([px]) => Math.abs(px - x) < 14);
      if (near.length > 1) ink = 0.36 * glow(sdPolyline(x, y, near), 3.5);
    }
    if (x >= nowX && x <= X1) {
      const c = cy(x), h = hw(x), dy = Math.abs(y - c);
      const u = (x - nowX) / (X1 - nowX);
      // Lit from the upper left; fading as the future gets further away.
      const light = (1 - 0.35 * u) * (1 + 0.12 * clamp((c - y) / Math.max(h, 1), -1, 1));
      const band = 0.16 * solid(dy - h) + 0.18 * solid(dy - 0.66 * h) + 0.26 * solid(dy - 0.33 * h);
      ink = Math.max(ink, band * light);
    }
    const td = Math.hypot(x - tip[0], y - tip[1]) - 3.5;
    sig = solid(td) + 0.42 * glow(td, 7);
    return [ink, sig];
  });

  // Band edges, from the present out to the horizon.
  const edge = (f, sign) => {
    const pts = [];
    for (let x = nowX; x <= X1; x += 3) pts.push([x, cy(x) + sign * f * hw(x)]);
    pts.push([X1, cy(X1) + sign * f * hw(X1)]);
    return pts;
  };
  g.line(polyD(edge(1, -1)), "soft");
  g.line(polyD(edge(1, 1)), "soft");
  g.line(polyD(edge(0.66, -1)), "faint");
  g.line(polyD(edge(0.66, 1)), "faint");

  // The median projection, dashed like a threshold not yet crossed.
  g.line(`M${num(nowX)} ${num(nowY)}L${num(tip[0] - 4)} ${num(cy(tip[0] - 4))}`, "ink", { dash: "4 3" });

  // The past, solid.
  g.line(polyD(hist), "ink", { width: 1.25 });

  // Now: a dotted guide and a small ring where the known ends.
  g.line(`M${nowX} ${Y0}V${Y1}`, "faint", { dash: "1 3" });
  const r = 2.5;
  g.line(`M${num(nowX - r)} ${num(nowY)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, "ink", { width: 1.25, fill: true });

  // Time axis.
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
  g.line(`M${nowX} ${Y1}v4`, "soft");
}
