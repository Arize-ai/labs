function draw(g, rand, seed, k) {
  // A night's hypnogram: sleep cycles, the last long REM dream lit orange
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdBox, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);

  // Stage levels, wake at the top, deep sleep at the bottom.
  const L = { wake: 88, rem: 110, n1: 130, n2: 152, n3: 174 };
  const axisY = Y1;

  // Build the night: cycles deepen early, REM lengthens late.
  const segs = [];
  let t = 0;
  const add = (stage, d) => { segs.push({ stage, s: t, e: t + d }); t += d; };
  add("wake", 0.18 + rand() * 0.06);
  const cycles = 4 + (rand() < 0.4 ? 1 : 0);
  for (let c = 0; c < cycles; c++) {
    add("n1", 0.1 + rand() * 0.06);
    add("n2", 0.3 + rand() * 0.15);
    const deep = c < 2 ? 0.55 - 0.2 * c + rand() * 0.1 : c === 2 && rand() < 0.5 ? 0.15 : 0;
    if (deep > 0) { add("n3", deep); add("n2", 0.2 + rand() * 0.1); }
    add("rem", 0.16 + 0.2 * c + rand() * 0.08);
  }
  add("wake", 0.14);
  const T = t;
  const left = X0 + 6, right = X1;
  const xOf = (v) => left + ((right - left) * v) / T;

  // The step trace.
  const pts = [];
  for (const s of segs) {
    const y = L[s.stage];
    pts.push([xOf(s.s), y], [xOf(s.e), y]);
  }
  const rems = segs.filter((s) => s.stage === "rem");
  const dream = rems[rems.length - 1];
  const barH = 10;
  const bars = segs
    .filter((s) => s.stage === "rem" || s.stage === "n3")
    .map((s) => {
      const x0 = xOf(s.s), x1 = xOf(s.e), y = L[s.stage];
      return { s, x0, x1, cx: (x0 + x1) / 2, cy: y, hw: (x1 - x0) / 2, hh: barH / 2 };
    });

  // A small crescent moon above the start of the night.
  const mx = X0 + 16, my = Y0 + 10, mr = 11;
  const ox = mx + 5.5, oy = my - 3.5, or = 9.5;

  g.print((x, y) => {
    let ink = 0, sig = 0;

    // Moon: crescent as one disc minus another, lit from the upper left.
    if (x > mx - 30 && x < mx + 30 && y > my - 30 && y < my + 30) {
      const d = Math.max(Math.hypot(x - mx, y - my) - mr, -(Math.hypot(x - ox, y - oy) - or));
      const shade = 0.95 - 0.25 * clamp((x - mx + y - my + mr * 2) / (mr * 4));
      ink = Math.max(ink, solid(d) * shade + 0.14 * glow(d, 6));
    }

    // Glow along the trace.
    if (x > left - 12 && x < right + 12 && y > L.wake - 14 && y < L.n3 + 14) {
      const near = [];
      for (let i = 0; i < pts.length; i++) if (Math.abs(pts[i][0] - x) < 14 || (i > 0 && (pts[i - 1][0] - x) * (pts[i][0] - x) < 0)) near.push(pts[i]);
      if (near.length > 1) ink = Math.max(ink, 0.24 * glow(sdPolyline(x, y, near), 3.5));
    }

    // Stage blocks: REM bright, deep sleep a quiet pool; the last dream in orange.
    for (const b of bars) {
      if (x < b.x0 - 16 || x > b.x1 + 16 || Math.abs(y - b.cy) > 20) continue;
      const d = sdBox(x, y, b.cx, b.cy, b.hw, b.hh, 1);
      const shade = 1 - 0.25 * clamp((x - b.x0) / Math.max(b.x1 - b.x0, 1));
      if (b.s === dream) sig = Math.max(sig, solid(d) * shade + 0.34 * glow(d, 8));
      else if (b.s.stage === "rem") ink = Math.max(ink, solid(d) * 0.88 * shade + 0.18 * glow(d, 6));
      else {
        const n = fbm(x / 6, y / 6) - 0.5;
        ink = Math.max(ink, solid(d) * clamp(0.3 + 0.2 * n) + 0.08 * glow(d, 5));
      }
    }
    return [ink, sig];
  });

  // Stage guides.
  for (const key of ["wake", "rem", "n1", "n2", "n3"]) {
    g.line(`M${X0} ${num(L[key]) + 0.5}H${X1}`, "faint", { dash: "1 3" });
  }
  // Hour axis.
  const hours = Math.max(6, Math.round(T * 2.4));
  for (let h = 0; h <= hours; h++) {
    const x = Math.round(left + ((right - left) * h) / hours) + 0.5;
    g.line(`M${x} ${axisY}v4`, "soft");
  }
  g.line(`M${X0} ${axisY + 0.5}H${X1}`, "soft");
  // The trace itself, with risers.
  g.line(polyD(pts), "ink", { width: 1.25 });
  // The dream's threshold edge.
  const db = bars.find((b) => b.s === dream);
  g.box(db.x0, db.cy - barH / 2, db.x1 - db.x0, barH, "sig");
}
