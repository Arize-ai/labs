function draw(g, rand, seed, k) {
  // A status page's uptime bars, one day of downtime in orange
  const { X0, X1, Y0, Y1, clamp, solid, glow } = k;
  const n = 20, pitch = (X1 - X0) / n, bw = 8;
  const top = Y0 + 16, base = Y1 - 14, fullH = base - top;
  const outage = 11 + Math.floor(rand() * 6);
  const bars = Array.from({ length: n }, (_, i) => {
    const degraded = i === outage - 1 || (i === outage + 1 && rand() < 0.6);
    const hf = i === outage ? 1 : degraded ? 0.5 + rand() * 0.15 : 0.9 + rand() * 0.1;
    const h = Math.round(fullH * hf);
    const x = Math.round(X0 + i * pitch + (pitch - bw) / 2);
    return { x, y: base - h, w: bw, h, degraded, out: i === outage };
  });

  g.print((x, y) => {
    if (x < X0 - 16 || x > X1 + 16 || y < top - 20 || y > base + 16) return 0;
    const c = Math.floor((x - X0) / pitch);
    let ink = 0, sig = 0;
    for (let i = c - 2; i <= c + 2; i++) {
      const b = bars[i];
      if (!b) continue;
      const d = k.sdBox(x, y, b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2);
      // Lit from the upper left: brighter toward the top of each bar.
      const shade = 1 - 0.28 * clamp((y - b.y) / fullH) - 0.08 * clamp((x - b.x) / b.w);
      if (b.out) sig = Math.max(sig, solid(d) * shade + 0.34 * glow(d, 8));
      else if (b.degraded) ink = Math.max(ink, solid(d) * 0.3 * shade);
      else ink = Math.max(ink, solid(d) * 0.9 * shade);
    }
    return [ink, sig];
  });

  // Guides: the 100% line and the baseline.
  g.line(`M${X0} ${top + 0.5}H${X1}`, "faint", { dash: "1 3" });
  g.line(`M${X0} ${base + 0.5}H${X1}`, "soft");
  for (let i = 0; i <= n; i += 5) {
    const tx = Math.round(X0 + i * pitch) + 0.5;
    g.line(`M${tx} ${base}v4`, "soft");
  }
  for (const b of bars) {
    if (b.out) g.box(b.x, b.y, b.w, b.h, "sig");
    else if (b.degraded) g.box(b.x, b.y, b.w, b.h, "ink");
  }
}
