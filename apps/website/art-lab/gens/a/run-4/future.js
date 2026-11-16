function draw(g, rand, seed, k) {
  // A forecast: known history meets a widening fan of possible futures.
  const { X0, X1, Y0, Y1, clamp, solid, glow, sdPolyline, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const phase = rand() * 10;
  const trend = (rand() - 0.4) * 0.22;
  const nx = Math.round(X0 + (X1 - X0) * (0.42 + rand() * 0.06));
  const L = X1 - nx;
  const yOf = (v) => Y1 - v * (Y1 - Y0);
  const val = (x) => {
    const u = (x - X0) / (X1 - X0);
    return 0.46 + 0.07 * Math.sin(u * 9 + phase) + 0.12 * (fbm(u * 6, phase) - 0.5) + trend * u;
  };

  // History, sampled up to now.
  const hist = [];
  for (let x = X0; x < nx; x += 2) hist.push([x, yOf(val(x))]);
  hist.push([nx, yOf(val(nx))]);
  const now = hist[hist.length - 1];

  // The forecast: a median that carries the trend on, and a band that widens with time.
  const slope = 0.05 + rand() * 0.2, bend = (rand() - 0.5) * 0.0012;
  const med = (x) => { const dx = x - nx; return now[1] - slope * dx - bend * dx * dx; };
  const half = (x) => 1.5 + 44 * Math.pow(clamp((x - nx) / L), 0.8);

  g.print((x, y) => {
    if (x < X0 - 6 || x > X1 + 6) return 0;
    let ink = 0;
    if (x <= nx) {
      const cy = yOf(val(clamp(x, X0, nx)));
      const area = y > cy ? 0.42 * Math.exp(-(y - cy) / 30) * clamp((Y1 - y) / 10) : 0;
      const near = hist.filter(([px]) => Math.abs(px - x) < 12);
      const line = near.length > 1 ? 0.3 * glow(sdPolyline(x, y, near), 4) : 0;
      ink = Math.max(area, line);
    } else {
      const t = clamp((x - nx) / L), w = half(x), a = Math.abs(y - med(x));
      // Lit from the upper left: the fan is brightest near now and on its upper side.
      const shade = (1 - 0.35 * t) * (1 - 0.12 * clamp((y - med(x)) / w));
      ink = Math.max(0.72 * solid(a - 0.45 * w), 0.4 * solid(a - 0.75 * w), 0.17 * solid(a - w)) * shade;
      ink = Math.max(ink, 0.08 * glow(a - w, 6) * (1 - t));
    }
    const rd = Math.hypot(x - now[0], y - now[1]) - 3.5;
    return [ink, solid(rd) + 0.45 * glow(rd, 7)];
  });

  // Rules: the past is a firm line, the future only its guides.
  const fut = [];
  for (let x = nx; x <= X1; x += 3) fut.push(x);
  if (fut[fut.length - 1] !== X1) fut.push(X1);
  g.line(`M${nx + 0.5} ${Y0}V${Y1}`, "faint", { dash: "1 3" });
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
  g.line(polyD(fut.map((x) => [x, med(x) - half(x)])), "faint");
  g.line(polyD(fut.map((x) => [x, med(x) + half(x)])), "faint");
  g.line(polyD(fut.map((x) => [x, med(x)])), "soft", { dash: "4 3" });
  g.line(polyD(hist), "ink", { width: 1.25 });
}
