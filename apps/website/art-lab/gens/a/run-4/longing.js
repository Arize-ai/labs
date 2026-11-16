function draw(g, rand, seed, k) {
  // A curve rising toward a dashed limit it never quite reaches
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, sdPolyline, polyD, num } = k;
  const rate = 2.6 + rand() * 0.5;
  const ay = Y0 + 20 + rand() * 6;           // the asymptote: what it longs for
  const base = Y1;
  const xEnd = X1 - 14;                      // the curve stops short of the goal
  const span = xEnd - X0;
  const curveY = (x) => {
    const u = clamp((x - X0) / span);
    return base - (base - ay) * (1 - Math.exp(-rate * u)) * 0.97;
  };
  const N = 90;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const x = X0 + (span * i) / N;
    return [x, curveY(x)];
  });
  const goal = [X1, ay];

  g.print((x, y) => {
    let ink = 0;
    if (x >= X0 && x <= xEnd) {
      const cy = curveY(x);
      // Light pools under the curve, brightest at the line, and more so to the left.
      const lean = 1 - 0.3 * clamp((x - X0) / span);
      if (y > cy) ink = 0.46 * lean * Math.exp(-(y - cy) / 30) * clamp((base - y) / 10);
    }
    if (x > X0 - 12 && x < xEnd + 12) {
      const near = pts.filter(([px]) => Math.abs(px - x) < 12);
      if (near.length > 1) ink = Math.max(ink, 0.3 * glow(sdPolyline(x, y, near), 4));
    }
    const gd = Math.hypot(x - goal[0], y - goal[1]) - 3.5;
    return [ink, solid(gd) + 0.42 * glow(gd, 8)];
  });

  // The curve itself, fading in from its start.
  const split = Math.round(N * 0.18);
  g.line(polyD(pts.slice(0, split + 1)), "soft", { width: 1.25 });
  g.line(polyD(pts.slice(split)), "ink", { width: 1.25 });
  // The limit: a dashed threshold reaching the goal.
  g.line(`M${X0} ${num(Math.round(ay) + 0.5)}H${num(X1 - 7)}`, "soft", { dash: "4 3" });
  // The remaining gap, measured with a dotted guide from the tip.
  const tip = pts[pts.length - 1];
  g.line(`M${num(Math.round(tip[0]) + 0.5)} ${num(tip[1])}V${num(ay + 2)}`, "faint", { dash: "1 3" });
  // Axis.
  g.line(`M${X0} ${base + 0.5}H${X1}`, "faint");
}
