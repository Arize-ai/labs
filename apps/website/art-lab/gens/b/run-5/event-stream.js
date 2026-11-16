function draw(g, rand, seed, k) {
  // Paper lanterns drifting down a winding river at night
  const { clamp, solid, glow, sdBox, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);

  // River centreline: Catmull-Rom through the brief's points, extended past the bottom edge.
  const pts = [[232, 80], [214, 96], [198, 114], [206, 134], [222, 154], [206, 174], [188, 194]];
  const ext = [[250, 64], ...pts, [170, 214], [152, 234]];
  const dense = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    for (let s = 0; s < 16; s++) {
      const t = s / 16, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(ext[ext.length - 2]);
  const cxT = [];
  for (let i = 0, j = 0; i <= 280; i++) {
    const y = 80 + i * 0.5;
    while (j < dense.length - 2 && dense[j + 1][1] < y) j++;
    const a = dense[j], b = dense[j + 1];
    const t = clamp((y - a[1]) / ((b[1] - a[1]) || 1));
    cxT.push(a[0] + (b[0] - a[0]) * t);
  }
  const cxAt = (y) => cxT[Math.max(0, Math.min(280, Math.round((y - 80) * 2)))];
  const wAt = (y) => 8 + Math.max(0, y - 80) / 114 * 162;
  // Water fades out just past the brief's bottom edge rather than stopping dead.
  const fade = (y) => (y <= 194 ? 1 : clamp(1 - (y - 194) / 18));

  // Lanterns, far to near, with jittered spacing and lateral drift.
  const base = [[231, 84, 2], [218, 94, 3], [203, 108, 4], [202, 126, 5], [217, 146, 7], [212, 166, 9], [194, 186, 11]];
  const tones = [0.5, 0.6, 0.75, 0.85, 0.9, 0.95, 1.0];
  const lanterns = base.map(([gx, gy, hw], i) => {
    const gp = i > 0 ? gy - base[i - 1][1] : Infinity;
    const gn = i < base.length - 1 ? base[i + 1][1] - gy : Infinity;
    let y = gy + (rand() * 2 - 1) * 0.075 * Math.min(gp, gn);
    y = Math.max(83, Math.min(187, y));
    const off0 = gx - cxAt(gy);
    const lim = Math.max(1, wAt(y) / 2 - hw - 1.5);
    const off = Math.max(-lim, Math.min(lim, off0 + (rand() * 2 - 1) * 4));
    const x = cxAt(y) + off;
    const len = Math.max(6, 4 * hw * (0.8 + 0.4 * rand()));
    const ry0 = y + hw + 0.5;
    return {
      i, x, y, hw, tone: tones[i], org: i === 4,
      ry0, ry1: ry0 + len, rw: Math.max(2, hw * 0.45),
      per: 5.5 + rand() * 3, ph: rand(), duty: 0.55 + rand() * 0.2,
    };
  });

  g.print((x, y) => {
    if (x < 80 || x > 320 || y < 58 || y > 222) return 0;
    let ink = 0, org = 0;
    if (y < 80) {
      if (x > 90 && x < 310) ink = 0.1 * Math.exp(-(80 - y) / 5) * clamp(Math.min(x - 90, 310 - x) / 20);
    } else {
      const d = Math.abs(x - cxAt(y)) - wAt(y) / 2;
      if (d < 4) {
        const t = (y - 80) / 114;
        let s = t < 0.45 ? 0.25 - 0.1 * (t / 0.45) : 0.15 - 0.05 * clamp((t - 0.45) / 0.55);
        s += 0.04 * (fbm(x / 9, y / 5) - 0.5);
        ink = s * solid(d) * fade(y);
      }
    }
    for (const L of lanterns) {
      const dx = x - L.x, dy = y - L.y;
      let v = 0;
      const R = L.hw * 4 + 3;
      if (Math.abs(dx) < R && Math.abs(dy) < R) {
        const bd = sdBox(x, y, L.x, L.y, L.hw, L.hw, L.hw * 0.35) - Math.max(0, 2.5 - L.hw);
        v = L.tone * solid(bd);
        const gd = Math.hypot(dx, dy) - L.hw;
        if (gd > 0) {
          const ul = clamp(-(dx + dy) / (L.hw * 3), -1, 1);
          v = Math.max(v, 0.5 * L.tone * glow(gd, L.hw * 0.95 * (1 + 0.35 * ul)));
        }
      }
      if (y > L.ry0 && y < L.ry1 && Math.abs(dx) < L.rw + 2.5) {
        const t = (y - L.ry0) / (L.ry1 - L.ry0);
        const wob = 0.7 * Math.sin(y * 0.6 + L.ph * 6.28);
        const ad = Math.abs(dx - wob) - L.rw;
        const ph = ((y - L.ry0) / L.per + L.ph) % 1;
        if (ph < L.duty + 0.3 * (fbm(x / 4 + L.i * 7, y / 3) - 0.5)) {
          v = Math.max(v, 0.4 * (0.75 + 0.25 * L.tone) * (1 - 0.75 * t) * solid(ad) * fade(y));
        }
      }
      if (L.org) org = Math.max(org, v);
      else ink = Math.max(ink, v);
    }
    return [ink, org];
  });

  // Banks: half strength to the bottom edge, then fading out.
  const bank = (side, y0, y1) => {
    const p = [];
    for (let y = y0; y <= y1 + 0.01; y += 2) p.push([cxAt(y) + side * wAt(y) / 2, y]);
    return p;
  };
  for (const side of [-1, 1]) {
    g.line(polyD(bank(side, 80, 194)), "soft");
    g.fadeLine(polyD(bank(side, 194, 214)), "var(--fg)", 0.5, 194, 214);
  }

  // Horizon, broken at the river mouth.
  g.line(`M90 80H${num(cxAt(80) - 4)}`, "faint");
  g.line(`M${num(cxAt(80) + 4)} 80H310`, "faint");

  // Current marks following the S, in the gaps beside the lanterns.
  for (const [y0, y1, off] of [[98, 112, 0.3], [128, 144, -0.32], [150, 166, 0.33], [172, 188, -0.3]]) {
    const p = [];
    for (let y = y0; y <= y1 + 0.01; y += 1.5) p.push([cxAt(y) + off * wAt(y), y]);
    g.line(polyD(p), "faint", { dash: "2 3" });
  }

  // Outlines around the near lanterns; the inspected one keeps its orange.
  const rr = (cx, cy, h, r) =>
    `M${num(cx - h + r)} ${num(cy - h)}H${num(cx + h - r)}A${num(r)} ${num(r)} 0 0 1 ${num(cx + h)} ${num(cy - h + r)}` +
    `V${num(cy + h - r)}A${num(r)} ${num(r)} 0 0 1 ${num(cx + h - r)} ${num(cy + h)}` +
    `H${num(cx - h + r)}A${num(r)} ${num(r)} 0 0 1 ${num(cx - h)} ${num(cy + h - r)}` +
    `V${num(cy - h + r)}A${num(r)} ${num(r)} 0 0 1 ${num(cx - h + r)} ${num(cy - h)}Z`;
  for (const L of lanterns.slice(3)) {
    const h = L.hw + 0.5;
    g.line(rr(L.x, L.y, h, h * 0.35), L.org ? "sig" : "ink");
  }
}
