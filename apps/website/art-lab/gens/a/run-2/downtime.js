function draw(g, rand, seed, k) {
  // Status page uptime bars: one day's bar is down, in orange.
  const { X0, X1, Y0, Y1, clamp, sdBox, solid, glow, num } = k;
  const n = 20, pitch = (X1 - X0) / n, bw = 8;
  const top = Math.round(Y0 + 22), h = 74, bottom = top + h;
  const outage = 11 + Math.floor(rand() * 6);
  const degraded = new Set();
  while (degraded.size < 2) {
    const d = Math.floor(rand() * n);
    if (Math.abs(d - outage) > 1) degraded.add(d);
  }
  const bars = Array.from({ length: n }, (_, i) => {
    const x = Math.round(X0 + i * pitch + (pitch - bw) / 2);
    const state = i === outage ? "down" : degraded.has(i) ? "degraded" : "up";
    return { x, y: top, w: bw, h, state };
  });

  g.print((x, y) => {
    if (y < top - 26 || y > bottom + 26) return 0;
    const c = Math.floor((x - X0) / pitch);
    let ink = 0, sig = 0;
    for (let i = c - 2; i <= c + 2; i++) {
      if (i < 0 || i >= n) continue;
      const b = bars[i];
      const d = sdBox(x, y, b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2);
      // Lit from above-left: fills brighten toward their top.
      const shade = 1 - 0.28 * clamp((y - b.y) / b.h);
      if (b.state === "down") sig = Math.max(sig, solid(d) * shade + 0.34 * glow(d, 7));
      else if (b.state === "degraded") ink = Math.max(ink, solid(d) * 0.22);
      else ink = Math.max(ink, solid(d) * 0.88 * shade + 0.12 * glow(d, 5));
    }
    return [ink, sig];
  });

  // Degraded days outlined, the outage edged in orange.
  for (const b of bars) {
    if (b.state === "degraded") g.box(b.x, b.y, b.w, b.h, "ink");
    if (b.state === "down") g.box(b.x, b.y, b.w, b.h, "sig");
  }
  // Time axis with weekly ticks, and a dotted guide above.
  const axisY = bottom + 12;
  g.line(`M${X0} ${axisY + 0.5}H${X1}`, "soft");
  for (let i = 0; i <= n; i += 5) {
    const x = Math.round(X0 + i * pitch) + 0.5;
    g.line(`M${x} ${axisY}v4`, "soft");
  }
  g.line(`M${X0} ${top - 12 + 0.5}H${X1}`, "faint", { dash: "1 3" });
  // A dashed marker dropping from the outage to the axis.
  const ox = Math.round(bars[outage].x + bw / 2) + 0.5;
  g.line(`M${ox} ${bottom + 3}V${num(axisY)}`, "soft", { dash: "1 3" });
}
