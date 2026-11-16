function draw(g, rand, seed, k) {
  // Lanes of events flowing right; the newest one crosses the now line in orange.
  const { X0, X1, Y0, Y1, clamp, smooth, sdBox, solid, glow, num } = k;
  const lanes = 4, h = 12;
  const top = Y0 + 14, bottom = Y1 - 14;
  const now = Math.round(X1 - 36);
  const hot = 1 + Math.floor(rand() * 2);
  const age = (x) => 0.22 + 0.78 * smooth(clamp((x - X0 + 10) / 130));

  const rows = Array.from({ length: lanes }, (_, l) => {
    const y = Math.round(top + ((bottom - top) * l) / (lanes - 1) - h / 2);
    const evs = [];
    let x = Math.round(X0 - 24 + rand() * 14);
    const limit = l === hot ? now - 18 : now - 4 - Math.floor(rand() * 30);
    for (;;) {
      const w = Math.round(6 + rand() * (rand() < 0.3 ? 26 : 12));
      if (x + w > limit) break;
      evs.push({ x, w, filled: rand() < 0.68, sig: false });
      x += w + Math.round(5 + rand() * 14);
    }
    if (l === hot) {
      const w = 16, ex = now - w / 2;
      while (evs.length && evs[evs.length - 1].x + evs[evs.length - 1].w > ex - 5) evs.pop();
      evs.push({ x: ex, w, filled: true, sig: true });
    }
    return { y, cy: y + h / 2, evs };
  });

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (const row of rows) {
      if (Math.abs(y - row.cy) > 22) continue;
      for (const e of row.evs) {
        if (x < e.x - 24 || x > e.x + e.w + 24) continue;
        const d = sdBox(x, y, e.x + e.w / 2, row.cy, e.w / 2 - 1, h / 2 - 1, 2);
        // Lit from the upper left: each event brightens toward its start and top.
        const shade = 1 - 0.18 * clamp((x - e.x) / Math.max(e.w, 1)) - 0.1 * clamp((y - row.y) / h);
        if (e.sig) sig = Math.max(sig, solid(d) * shade + 0.35 * glow(d, 7));
        else {
          const a = age(e.x + e.w / 2);
          ink = Math.max(ink, e.filled ? (solid(d) * 0.9 * shade + 0.16 * glow(d, 5)) * a : solid(d) * 0.16 * a);
        }
      }
    }
    return [ink, sig];
  });

  // Lanes: dotted guides the events ride along, ending at now.
  for (const row of rows) g.line(`M${X0} ${num(row.cy) + 0.5}H${now}`, "faint", { dash: "1 3" });
  // The now line.
  g.line(`M${now + 0.5} ${top - 18}V${bottom + 18}`, "soft", { dash: "4 3" });
  for (const row of rows) {
    for (const e of row.evs) {
      if (e.sig) g.box(e.x, row.y, e.w, h, "sig");
      else if (!e.filled) g.box(e.x, row.y, e.w, h, age(e.x + e.w / 2) > 0.6 ? "soft" : "faint");
    }
  }
}
