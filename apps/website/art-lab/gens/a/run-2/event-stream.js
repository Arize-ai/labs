function draw(g, rand, seed, k) {
  // Events flowing along four lanes toward a dashed "now" line; the newest event is orange
  const { X0, X1, Y0, Y1, clamp, smooth, sdBox, solid, glow, num } = k;
  const lanes = 4, eh = 10;
  const nowX = Math.round(X1 - 22) + 0.5;
  const top = Y0 + 12, laneH = (Y1 - 12 - top) / (lanes - 1);
  const laneY = Array.from({ length: lanes }, (_, l) => Math.round(top + l * laneH));

  // Each lane: events at irregular intervals, ending before "now".
  const events = [];
  for (let l = 0; l < lanes; l++) {
    const row = [];
    let x = X0 + rand() * 14;
    while (true) {
      const w = Math.round(6 + rand() * 10);
      if (x + w > nowX - 4) break;
      row.push({ x: Math.round(x), w, y: laneY[l] - eh / 2, l });
      x += w + 5 + rand() * 20;
    }
    events.push(row);
  }

  // The newest event: the one nearest the "now" line, pushed up against it.
  let newest = null;
  for (const row of events) {
    const e = row[row.length - 1];
    if (e && (!newest || e.x + e.w > newest.x + newest.w)) newest = e;
  }
  if (newest) newest.x = Math.round(nowX - 3 - newest.w);

  // Age: old events on the left are dim, recent ones are near solid.
  const age = (x) => 0.18 + 0.72 * smooth(clamp((x - X0) / (nowX - X0)));

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (let l = 0; l < lanes; l++) {
      if (Math.abs(y - laneY[l]) > 16) continue;
      for (const e of events[l]) {
        if (x < e.x - 14 || x > e.x + e.w + 14) continue;
        const d = sdBox(x, y, e.x + e.w / 2, laneY[l], e.w / 2, eh / 2, 1.5);
        // Lit from the upper left: each fill brightens toward its top-left.
        const shade = 1 - 0.2 * clamp((x - e.x) / e.w) - 0.1 * clamp((y - e.y) / eh);
        if (e === newest) sig = Math.max(sig, solid(d) * shade + 0.35 * glow(d, 7));
        else {
          const a = age(e.x + e.w / 2);
          ink = Math.max(ink, solid(d) * a * shade + 0.16 * a * glow(d, 5));
        }
      }
    }
    return [ink, sig];
  });

  // Lane rules: dotted guides the events ride on.
  for (let l = 0; l < lanes; l++) {
    g.line(`M${X0 - 6} ${laneY[l] + 0.5}H${nowX}`, "faint", { dash: "1 3" });
  }
  // Recent events get a crisp outline; older ones stay as print.
  for (const row of events) {
    for (const e of row) {
      if (e === newest) g.box(e.x, e.y, e.w, eh, "sig");
      else if (e.x > X0 + (nowX - X0) * 0.55) g.box(e.x, e.y, e.w, eh, "soft");
    }
  }
  // The "now" threshold, and a short axis underneath.
  g.line(`M${nowX} ${Y0 - 2}V${Y1 + 4}`, "soft", { dash: "4 3" });
  g.line(`M${X0 - 6} ${Y1 + 4.5}H${X1}`, "faint");
  for (let x = X0; x < nowX; x += 36) g.line(`M${Math.round(x) + 0.5} ${Y1 + 4}v3`, "faint");
  g.line(`M${num(nowX + 6)} ${(Y0 + Y1) / 2 + 0.5}h12m-4 -3l4 3l-4 3`, "soft");
}
