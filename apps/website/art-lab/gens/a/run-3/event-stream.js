function draw(g, rand, seed, k) {
  // Three event lanes flowing right; the newest event crosses the read cursor
  const { X0, X1, Y0, Y1, clamp, smooth, sdBox, solid, glow, num } = k;
  const lanes = [Y0 + 30, (Y0 + Y1) / 2, Y1 - 30];
  const nowX = Math.round(X1 - 34);
  const h = 12;
  const fade = (x) => 0.15 + 0.85 * smooth(clamp((x - X0) / 90));

  // Events per lane: pills of varying width, packed left to right up to the cursor.
  const events = lanes.map((ly, li) => {
    const out = [];
    let x = X0 + rand() * 10;
    const stop = li === 1 ? nowX - 18 : nowX - 6 - rand() * 18;
    while (true) {
      const w = Math.round(6 + rand() * 14);
      if (x + w > stop) break;
      out.push({ x: Math.round(x), y: Math.round(ly - h / 2), w, h, filled: rand() < 0.7, sig: false });
      x += w + 4 + rand() * 9;
    }
    return out;
  });
  // The newest event, straddling the cursor on the middle lane.
  const hot = { x: nowX - 7, y: Math.round(lanes[1] - h / 2), w: 14, h, filled: true, sig: true };
  events[1].push(hot);

  g.print((x, y) => {
    let li = 0, best = Infinity;
    for (let i = 0; i < lanes.length; i++) {
      const d = Math.abs(y - lanes[i]);
      if (d < best) { best = d; li = i; }
    }
    let ink = 0, sig = 0;
    if (best < 22) {
      for (const e of events[li]) {
        if (x < e.x - 20 || x > e.x + e.w + 20) continue;
        const d = sdBox(x, y, e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 1.5);
        const shade = 1 - 0.22 * clamp((x - e.x) / e.w) - 0.1 * clamp((y - e.y) / e.h);
        if (e.sig) sig = Math.max(sig, solid(d) * shade + 0.38 * glow(d, 7));
        else {
          const f = fade(e.x + e.w / 2);
          ink = Math.max(ink, f * (solid(d) * (e.filled ? 0.9 * shade : 0.18) + 0.16 * glow(d, 5)));
        }
      }
    }
    return [ink, sig];
  });

  // Lane rules: dotted guides, solid past the cursor where events will arrive.
  for (const ly of lanes) {
    const yy = num(Math.round(ly) + 0.5);
    g.fadeLine(`M${X0} ${yy}H${nowX}`, "var(--fg)", 0.001, 0, 1); // keeps defs order stable
    g.line(`M${X0} ${yy}H${nowX - 2}`, "faint", { dash: "1 3" });
    g.line(`M${nowX + 9} ${yy}H${X1 - 4}`, "faint");
    g.line(`M${X1 - 8} ${num(ly - 3.5)}L${X1 - 4} ${yy}L${X1 - 8} ${num(ly + 4.5)}`, "soft");
  }
  // Outlined events, only where they have emerged from the ground.
  for (const lane of events)
    for (const e of lane) if (!e.filled && !e.sig && e.x > X0 + 50) g.box(e.x, e.y, e.w, e.h, "soft");
  g.box(hot.x, hot.y, hot.w, hot.h, "sig");
  // The consumer's read cursor.
  g.line(`M${nowX + 0.5} ${Y0 + 6}V${Y1 - 6}`, "soft", { dash: "4 3" });
  g.line(`M${nowX - 3.5} ${Y0 + 6.5}H${nowX + 4.5}`, "soft");
}
