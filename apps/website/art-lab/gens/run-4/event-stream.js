function draw(g, rand, seed, k) {
  // Three event lanes streaming right; the event crossing "now" is orange
  const { X0, X1, Y0, Y1, clamp, smooth, sdBox, solid, glow, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const lanes = 3, eh = 12, nowX = Math.round(X0 + 0.8 * (X1 - X0)) + 0.5;
  const top = Y0 + 22, bottom = Y1 - 22;
  const laneY = Array.from({ length: lanes }, (_, l) => Math.round(top + ((bottom - top) * l) / (lanes - 1)));
  const hot = Math.floor(rand() * lanes);

  // Build each lane backward from the head of the stream.
  const events = [];
  laneY.forEach((ly, l) => {
    let x1;
    if (l === hot) {
      const w = 14;
      events.push({ x: nowX - w / 2, w, y: ly, sig: true });
      x1 = nowX - w / 2 - 6 - rand() * 8;
    } else {
      x1 = nowX - 6 - rand() * 18;
    }
    while (x1 > X0 + 4) {
      const w = rand() < 0.2 ? 18 + rand() * 10 : 7 + rand() * 6;
      const x = Math.max(X0, x1 - w);
      if (x1 - x < 5) break;
      events.push({ x, w: x1 - x, y: ly, sig: false });
      x1 = x - (5 + rand() * 16);
    }
  });
  events.forEach((e) => { e.cx = e.x + e.w / 2; e.cy = e.y; });
  const hotEvent = events.find((e) => e.sig);

  // Older events have dissolved further into the ground.
  const age = (x) => 0.2 + 0.8 * smooth(clamp((x - X0) / (nowX - X0)));

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (const e of events) {
      if (Math.abs(y - e.cy) > 18 || x < e.x - 18 || x > e.x + e.w + 18) continue;
      const d = sdBox(x, y, e.cx, e.cy, e.w / 2, eh / 2, 2);
      // Lit from the upper left.
      const shade = 1 - 0.18 * clamp((y - (e.cy - eh / 2)) / eh) - 0.12 * clamp((x - e.x) / Math.max(e.w, 1));
      if (e.sig) sig = Math.max(sig, solid(d) * shade + 0.36 * glow(d, 7));
      else {
        const a = age(e.cx);
        const n = a < 0.6 ? 0.5 * (fbm(x / 7, y / 7) - 0.5) * (1 - a) : 0;
        ink = Math.max(ink, clamp(solid(d) * (0.9 * a * shade + n)) + 0.16 * a * glow(d, 5));
      }
    }
    // A faint wash of light trailing the cursor, where events have just landed.
    if (x < nowX && x > nowX - 60 && y > top - 16 && y < bottom + 16)
      ink = Math.max(ink, 0.06 * smooth(clamp(1 - (nowX - x) / 60)));
    return [ink, sig];
  });

  // Rails: faint in the past, soft near now, dotted into the future.
  const mid = Math.round(X0 + 0.4 * (nowX - X0));
  for (const ly of laneY) {
    const yy = num(ly) + 0.5;
    g.line(`M${X0} ${yy}H${mid}`, "faint");
    g.line(`M${mid} ${yy}H${nowX}`, "soft");
    g.line(`M${nowX + 9} ${yy}H${X1 - 4}`, "faint", { dash: "1 3" });
    g.line(`M${X1 - 8} ${num(ly - 3.5)}L${X1 - 3} ${yy}L${X1 - 8} ${num(ly + 4.5)}`, "soft");
  }
  // Outlines on the recent events, so they read crisply.
  for (const e of events) {
    if (e.sig || e.cx < mid) continue;
    g.box(e.x, e.cy - eh / 2, e.w, eh, "soft");
  }
  g.box(hotEvent.x, hotEvent.cy - eh / 2, hotEvent.w, eh, "sig");
  // The consumer's position: a dashed "now" threshold.
  g.line(`M${nowX} ${Y0}V${Y1}`, "soft", { dash: "4 3" });
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
}
