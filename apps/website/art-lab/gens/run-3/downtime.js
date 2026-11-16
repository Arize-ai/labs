function draw(g, rand, seed, k) {
  // A status page: request trace flatlines while uptime bars go dark.
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdBox, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const phase = rand() * 10;

  // Uptime history: one bar per interval along the bottom.
  const n = 30, pitch = (X1 - X0) / n, bw = 5, barTop = 164, barH = 26;
  const s = 13 + Math.floor(rand() * 8), L = 2 + Math.floor(rand() * 3);
  const degraded = s - 1 - Math.floor(rand() * 3);
  const bars = Array.from({ length: n }, (_, b) => {
    const x = Math.round(X0 + b * pitch + (pitch - bw) / 2);
    const state = b === s ? "out" : b > s && b < s + L ? "gap" : b === degraded ? "weak" : "ok";
    return { x, state };
  });
  const xs = bars[s].x, xe = bars[s + L - 1].x + bw;

  // Request rate above: steady, then drops to the floor for the outage.
  const top = Y0 + 8, base = 146;
  const rate = (x) => {
    const up = 1 - smooth(clamp((x - xs + 2) / 4)) * (1 - smooth(clamp((x - xe + 2) / 4)));
    const v = 0.6 + 0.07 * Math.sin(x / 17 + phase) + 0.16 * (fbm(x / 14, phase) - 0.5);
    return base - v * up * (base - top);
  };
  const pts = [];
  for (let x = X0; x <= X1; x += 2) pts.push([x, rate(x)]);

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (y < base + 6 && x >= X0 && x <= X1) {
      const cy = rate(x);
      // Light pools under the trace; nothing under the flatline.
      if (y > cy && y < base) ink = 0.45 * Math.exp(-(y - cy) / 30) * clamp((cy < base - 3 ? 1 : 0)) * clamp((base - y) / 6);
      const near = pts.filter(([px]) => Math.abs(px - x) < 10);
      if (near.length > 1) ink = Math.max(ink, 0.28 * glow(sdPolyline(x, y, near), 4));
    }
    if (y > barTop - 14 && y < barTop + barH + 14) {
      const b = Math.floor((x - X0) / pitch);
      for (let q = Math.max(0, b - 1); q <= Math.min(n - 1, b + 1); q++) {
        const bar = bars[q];
        if (bar.state === "gap") continue;
        const d = sdBox(x, y, bar.x + bw / 2, barTop + barH / 2, bw / 2 - 0.5, barH / 2 - 0.5);
        // Lit from above: each bar brightens toward its top.
        const shade = 1 - 0.22 * clamp((y - barTop) / barH);
        if (bar.state === "out") sig = Math.max(sig, solid(d) * shade + 0.35 * glow(d, 7));
        else ink = Math.max(ink, solid(d) * (bar.state === "weak" ? 0.4 : 0.88) * shade);
      }
    }
    return [ink, sig];
  });

  g.line(polyD(pts), "ink", { width: 1.25 });
  g.line(`M${X0} ${base + 0.5}H${X1}`, "faint");
  // The outage window, marked by dotted guides from trace to bars.
  for (const gx of [xs - 2, xe + 2]) g.line(`M${Math.round(gx) + 0.5} ${top}V${barTop + barH + 4}`, "faint", { dash: "1 3" });
  // The SLO threshold the trace normally clears.
  const ty = Math.round(base - 0.38 * (base - top)) + 0.5;
  g.line(`M${X0} ${ty}H${X1}`, "soft", { dash: "4 3" });
  for (const bar of bars) {
    if (bar.state === "gap") g.box(bar.x, barTop, bw, barH, "soft");
    else if (bar.state === "weak") g.box(bar.x, barTop, bw, barH, "soft");
  }
  g.line(`M${X0} ${barTop + barH + 4.5}H${X1}`, "faint");
}
