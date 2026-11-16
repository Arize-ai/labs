function draw(g, rand, seed, k) {
  // Three lanes of events streaming toward a dashed now line, latest event in orange
  const { X0, X1, Y0, Y1, clamp, smooth, sdBox, solid, glow, num } = k;
  const lanes = 3, h = 12;
  const top = Y0 + 16, bottom = Y1 - 22;
  const laneY = Array.from({ length: lanes }, (_, l) => Math.round(top + ((bottom - top) * l) / (lanes - 1)));
  const nowX = Math.round(X1 - 34 - rand() * 10);
  const hot = 1; // the middle lane carries the latest event
  const fade = (x) => smooth(clamp((x - X0 + 10) / 90));

  // Events: rounded spans along each lane, older ones off to the left.
  const events = [];
  laneY.forEach((ly, l) => {
    let x = Math.round(X0 - 24 + rand() * 18);
    const stop = l === hot ? nowX - 7 - 10 : nowX - 8 - rand() * 26;
    for (;;) {
      const w = Math.round(6 + rand() * 16);
      if (x + w > stop) break;
      events.push({ x, y: ly - h / 2, w, h, lane: l, outlined: rand() < 0.3, sig: false });
      x += w + Math.round(6 + rand() * 18);
    }
  });
  const latest = { x: nowX - 7, y: laneY[hot] - h / 2, w: 14, h, lane: hot, outlined: false, sig: true };
  events.push(latest);
  for (const e of events) { e.cx = e.x + e.w / 2; e.cy = e.y + e.h / 2; }

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (const e of events) {
      if (Math.abs(y - e.cy) > 22 || x < e.x - 22 || x > e.x + e.w + 22) continue;
      const d = sdBox(x, y, e.cx, e.cy, e.w / 2, e.h / 2, 2.5);
      // Lit from the upper left: each fill brightens toward its start and top.
      const shade = 1 - 0.2 * clamp((x - e.x) / Math.max(e.w, 1)) - 0.08 * clamp((y - e.y) / e.h);
      if (e.sig) sig = Math.max(sig, solid(d) * shade + 0.36 * glow(d, 7));
      else {
        const f = fade(e.cx);
        ink = Math.max(ink, (solid(d) * (e.outlined ? 0.2 : 0.88 * shade) + 0.16 * glow(d, 5)) * f);
      }
    }
    return [ink, sig];
  });

  // Lanes: solid up to now, dotted into the future.
  for (const ly of laneY) {
    const yy = num(ly) + 0.5;
    g.line(`M${X0} ${yy}H${nowX}`, "faint");
    g.line(`M${nowX} ${yy}H${X1}`, "faint", { dash: "1 3" });
  }
  // The now line, and the time axis beneath.
  g.line(`M${nowX + 0.5} ${Y0}V${Y1}`, "soft", { dash: "4 3" });
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "soft");
  for (let x = X0 + 30; x < X1; x += 40) {
    const t = Math.round(x) + 0.5;
    g.line(`M${t} ${Y1}v4`, fade(x) > 0.5 ? "soft" : "faint");
  }
  // Outlined events once they have emerged; the latest in orange.
  for (const e of events) {
    if (e.sig) g.box(e.x, e.y, e.w, e.h, "sig");
    else if (e.outlined && fade(e.cx) > 0.55) g.box(e.x, e.y, e.w, e.h, "ink");
  }
}
