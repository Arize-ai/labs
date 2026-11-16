function draw(g, rand, seed, k) {
  // A magnifying lens over a faint trace, revealing one slow span.
  const { X0, X1, Y0, Y1, clamp, sdBox, sdPolyline, solid, glow, polyD, num } = k;

  // The trace: a parent span and a waterfall of steps.
  const n = 5, top = Y0 + 12, rowH = (Y1 - 14 - top) / n, barH = 10;
  const raw = [];
  let cur = 0;
  for (let i = 0; i < n; i++) {
    const w = 26 + rand() * 22;
    raw.push({ s: cur, w, model: i % 2 === 0 });
    cur += w + 4 + rand() * 8;
  }
  const total = raw[n - 1].s + raw[n - 1].w, sc = (X1 - X0) / total;
  const bars = raw.map((b, i) => ({
    x: Math.round(X0 + b.s * sc),
    y: Math.round(top + i * rowH + (rowH - barH) / 2),
    w: Math.max(8, Math.round(b.w * sc)),
    h: barH,
    model: b.model,
  }));
  const ti = 2, target = bars[ti];
  bars.forEach((b) => { b.cx = b.x + b.w / 2; b.cy = b.y + b.h / 2; });

  // The lens, centred on the slow span, with its handle to the lower right.
  const R = 44, m = 1.6;
  const cx = clamp(target.cx, X0 + R + 4, X1 - R - 36), cy = target.cy;
  const ux = Math.SQRT1_2, uy = Math.SQRT1_2;
  const h0 = [cx + ux * (R + 2), cy + uy * (R + 2)], h1 = [cx + ux * (R + 38), cy + uy * (R + 38)];
  const hw = 4.5;
  const parent = { cx: (X0 + X1) / 2, cy: Y0 + 1.5, hw: (X1 - X0) / 2, hh: 1.5 };

  g.print((x, y) => {
    const dl = Math.hypot(x - cx, y - cy) - R;
    let ink = 0, sig = 0;
    if (dl < 0) {
      // Inside the glass: the trace, magnified and fully lit.
      const qx = cx + (x - cx) / m, qy = cy + (y - cy) / m;
      const r = Math.hypot(x - cx + R * 0.4, y - cy + R * 0.4) / (R * 1.6);
      ink = 0.04 + 0.07 * clamp(r);
      for (const b of bars) {
        if (Math.abs(qy - b.cy) > 14) continue;
        const d = sdBox(qx, qy, b.cx, b.cy, b.w / 2, b.h / 2) * m;
        const shade = 1 - 0.25 * clamp((qx - b.x) / b.w);
        if (b === target) sig = Math.max(sig, solid(d) * shade + 0.3 * glow(d, 6));
        else ink = Math.max(ink, solid(d) * (b.model ? 0.88 * shade : 0.3) + 0.12 * glow(d, 5));
      }
      const pd = sdBox(qx, qy, parent.cx, parent.cy, parent.hw, parent.hh) * m;
      ink = Math.max(ink, 0.6 * solid(pd));
      return [ink, sig];
    }
    // Outside: the same trace, barely there.
    for (const b of bars) {
      if (Math.abs(y - b.cy) > 8 || x < b.x - 3 || x > b.x + b.w + 3) continue;
      const d = sdBox(x, y, b.cx, b.cy, b.w / 2, b.h / 2);
      ink = Math.max(ink, solid(d) * (b.model ? 0.2 : 0.1));
    }
    ink = Math.max(ink, 0.18 * solid(sdBox(x, y, parent.cx, parent.cy, parent.hw, parent.hh)));
    ink = Math.max(ink, 0.2 * glow(dl, 7));
    // The handle, lit from the upper left.
    if (x > h0[0] - 10 && y > h0[1] - 10 && x < h1[0] + 10 && y < h1[1] + 10) {
      const hd = sdPolyline(x, y, [h0, h1]) - hw;
      const along = clamp(((x - h0[0]) * ux + (y - h0[1]) * uy) / 36);
      ink = Math.max(ink, solid(hd) * (0.92 - 0.3 * along) + 0.15 * glow(hd, 4));
    }
    return ink;
  });

  // Faint outlines for the tool steps the lens doesn't cover.
  for (const b of bars) {
    const dx = Math.max(Math.abs(cx - b.cx) - b.w / 2, 0), dy = Math.max(Math.abs(cy - b.cy) - b.h / 2, 0);
    if (Math.hypot(dx, dy) > R + 3 && !b.model) g.box(b.x, b.y, b.w, b.h, "faint");
  }

  // The time axis.
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "soft");
  for (let t = 0; t <= 4; t++) g.line(`M${Math.round(X0 + ((X1 - X0) * t) / 4) + 0.5} ${Y1}v4`, "soft");

  // The lens rim, a double rule, and a glint at the upper left.
  const circle = (r) => {
    const rr = num(r);
    return `M${num(cx - r)} ${num(cy)}a${rr} ${rr} 0 1 0 ${num(2 * r)} 0a${rr} ${rr} 0 1 0 ${num(-2 * r)} 0Z`;
  };
  g.line(circle(R), "ink", { width: 1.5 });
  g.line(circle(R - 3), "soft");
  const glint = [];
  for (let a = 200; a <= 245; a += 5) {
    const t = (a * Math.PI) / 180;
    glint.push([cx + (R - 8) * Math.cos(t), cy + (R - 8) * Math.sin(t)]);
  }
  g.line(polyD(glint), "soft", { width: 1.5 });

  // The magnified slow span, outlined in orange.
  const mx = cx + (target.x - cx) * m, my = cy + (target.y - cy) * m;
  g.box(mx, my, target.w * m, target.h * m, "sig");

  // The handle's outline and collar.
  const px = -uy * hw, py = ux * hw;
  const hp = [
    [h0[0] + px, h0[1] + py], [h1[0] + px, h1[1] + py],
    [h1[0] - px, h1[1] - py], [h0[0] - px, h0[1] - py],
  ];
  g.line(polyD(hp, true), "ink");
  const c0 = [h0[0] + ux * 6, h0[1] + uy * 6];
  g.line(polyD([[c0[0] + px, c0[1] + py], [c0[0] - px, c0[1] - py]]), "soft");
}
