function draw(g, rand, seed, k) {
  // An uptime history: throughput drops to zero, one outage bar in orange.
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdBox, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);

  // Daily status bars along the bottom.
  const N = 20, pitch = (X1 - X0) / N, bw = Math.round(pitch - 3.6);
  const by0 = 138, by1 = Y1, bh = by1 - by0;
  const down = 11 + Math.floor(rand() * 6);
  const degraded = new Set();
  while (degraded.size < 2) {
    const i = Math.floor(rand() * N);
    if (Math.abs(i - down) > 1) degraded.add(i);
  }
  const barX = (i) => Math.round(X0 + i * pitch + (pitch - bw) / 2);

  // Throughput trace above, flat and busy, falling to zero over the outage.
  const base = 118, xa = barX(down) - 1, xb = barX(down) + bw + 1, ramp = 3;
  const phase = rand() * 50;
  const level = (x) => 76 + 10 * (fbm(x / 16, phase) - 0.5) + 4 * (fbm(x / 4, phase + 9) - 0.5);
  const outage = (x) => smooth(clamp((x - xa + ramp) / ramp)) * smooth(clamp((xb + ramp - x) / ramp));
  const traceY = (x) => level(x) + (base - 1 - level(x)) * outage(x);
  const pts = [];
  for (let x = X0; x <= X1 + 0.01; x += 1) pts.push([x, traceY(x)]);

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (x >= X0 - 8 && x <= X1 + 8) {
      if (y < base + 10) {
        if (x >= X0 && x <= X1) {
          const cy = traceY(x);
          // Light pools under the trace, brightest at the line.
          if (y > cy && y < base) ink = 0.45 * Math.exp(-(y - cy) / 30) * clamp((base - y) / 8);
        }
        const near = pts.filter(([px]) => Math.abs(px - x) < 10);
        if (near.length > 1) ink = Math.max(ink, 0.28 * glow(sdPolyline(x, y, near), 4));
      }
      if (y > by0 - 14 && y < by1 + 14) {
        const i0 = Math.floor((x - X0) / pitch);
        for (let i = i0 - 1; i <= i0 + 1; i++) {
          if (i < 0 || i >= N) continue;
          const bx = barX(i);
          const d = sdBox(x, y, bx + bw / 2, by0 + bh / 2, bw / 2, bh / 2);
          // Lit from above: each bar brightens toward its top.
          const shade = 1 - 0.28 * clamp((y - by0) / bh);
          if (i === down) sig = Math.max(sig, solid(d) * shade + 0.35 * glow(d, 7));
          else ink = Math.max(ink, solid(d) * (degraded.has(i) ? 0.3 : 0.88 * shade));
        }
      }
    }
    return [ink, sig];
  });

  // The trace, its zero line, and the expected level across the gap.
  g.line(polyD(pts), "ink", { width: 1.25 });
  g.line(`M${X0} ${base + 0.5}H${X1}`, "faint");
  const ya = num(level(xa - ramp)), yb = num(level(xb + ramp));
  g.line(`M${num(xa - ramp)} ${ya}L${num(xb + ramp)} ${yb}`, "faint", { dash: "1 3" });

  // The outage window, as threshold rules down to the bars.
  for (const x of [xa - 0.5, xb + 0.5]) g.line(`M${num(x)} ${Y0 + 4}V${by1 + 4}`, "soft", { dash: "4 3" });

  for (const i of degraded) g.box(barX(i), by0, bw, bh, "soft");
  g.box(barX(down), by0, bw, bh, "sig");
  g.line(`M${X0} ${by1 + 4.5}H${X1}`, "faint");
}
