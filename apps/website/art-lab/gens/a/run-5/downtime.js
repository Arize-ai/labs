function draw(g, rand, seed, k) {
  // A status page: daily uptime bars, one outage day in orange
  const { X0, X1, clamp, smooth, makeNoise, sdBox, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);

  // The bars: one per day, wide enough to hold a few dots across.
  const n = 14, bw = 11, pitch = (X1 - X0 - bw) / (n - 1);
  const top = 106, bot = 178, bh = bot - top;
  const outage = 6 + Math.floor(rand() * 5);
  const degraded = new Set([outage - 1]);
  if (rand() < 0.6) {
    let d = Math.floor(rand() * n);
    if (d === outage) d = (d + 3) % n;
    degraded.add(d);
  }
  const bars = Array.from({ length: n }, (_, i) => ({
    x: Math.round(X0 + i * pitch),
    kind: i === outage ? "out" : degraded.has(i) ? "deg" : "up",
  }));
  const ocx = bars[outage].x + bw / 2;

  // The availability trace above: flat at the top, dropping out at the outage.
  const base = 70, drop = 26;
  const pts = [];
  for (let x = X0; x <= X1; x += 1) {
    const u = (x - ocx) / 9;
    let y = base + drop * Math.exp(-(u * u * u * u));
    const dd = bars[outage - 1].x + bw / 2;
    y += 6 * Math.exp(-(((x - dd) / 6) ** 2));
    y += 1.6 * (fbm(x / 10, seed % 53) - 0.5);
    pts.push([x, y]);
  }

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Glow around the trace, culled by x.
    if (y > base - 16 && y < base + drop + 16) {
      const near = pts.filter(([px]) => Math.abs(px - x) < 14);
      if (near.length > 1) ink = Math.max(ink, 0.26 * glow(sdPolyline(x, y, near), 4));
    }
    if (y > top - 14 && y < bot + 14) {
      const c = Math.round((x - X0 - bw / 2) / pitch);
      for (let i = c - 1; i <= c + 1; i++) {
        if (i < 0 || i >= n) continue;
        const b = bars[i];
        const d = sdBox(x, y, b.x + bw / 2, top + bh / 2, bw / 2 - 0.5, bh / 2 - 0.5, 1.5);
        // Lit from the upper left: brighter toward the top.
        const shade = 1 - 0.28 * clamp((y - top) / bh) - 0.06 * clamp((x - b.x) / bw);
        if (b.kind === "out") sig = Math.max(sig, solid(d) * shade + 0.34 * glow(d, 7));
        else if (b.kind === "deg") ink = Math.max(ink, solid(d) * 0.3 * shade);
        else ink = Math.max(ink, solid(d) * 0.9 * shade + 0.12 * glow(d, 4));
      }
    }
    return [ink, sig];
  });

  // Structure: the trace, its nominal level, the outage bar's edge, the day axis.
  g.line(`M${X0} ${num(base) + 0.5}H${X1}`, "faint", { dash: "1 3" });
  g.line(polyD(pts), "ink", { width: 1.25 });
  for (const b of bars) {
    if (b.kind === "deg") g.box(b.x, top, bw, bh, "ink");
    if (b.kind === "out") g.box(b.x, top, bw, bh, "sig");
  }
  const ax = bot + 7;
  g.line(`M${X0} ${ax + 0.5}H${X1}`, "soft");
  for (let i = 0; i < n; i += 1) {
    const tx = Math.round(bars[i].x + bw / 2) + 0.5;
    g.line(`M${tx} ${ax}v${i % 7 === 0 ? 4 : 2}`, "soft");
  }
  // A dotted guide from the dip in the trace down to the day it happened.
  const dipY = Math.round(base + drop + 6);
  g.line(`M${Math.round(ocx) + 0.5} ${dipY}V${top - 5}`, "soft", { dash: "1 3" });
}
