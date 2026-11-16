function draw(g, rand, seed, k) {
  // A sofa in front elevation with one orange throw pillow
  const { clamp, sdBox, solid, glow, polyD, num } = k;
  const n = rand() < 0.5 ? 2 : 3;
  const left = rand() < 0.5;
  const L = 90, R = 310, aw = 30, ix0 = L + aw, ix1 = R - aw;
  const backTop = 64 + Math.round(rand() * 6), armTop = 102 + Math.round(rand() * 4);
  const seatTop = 128, seatBot = 148, baseBot = 170, legBot = 180;

  // Parts, back to front: [x0, y0, x1, y1, r, tone]
  const parts = [];
  parts.push([L + 16, backTop, R - 16, 132, 10, 0.34]); // backrest frame
  const bw = (ix1 - ix0) / n;
  for (let i = 0; i < n; i++) parts.push([ix0 + i * bw + 1, backTop + 12, ix0 + (i + 1) * bw - 1, seatTop + 1, 7, 0.6]);
  parts.push([ix0, seatBot - 2, ix1, baseBot, 2, 0.42]); // base skirt
  for (let i = 0; i < n; i++) parts.push([ix0 + i * bw + 1, seatTop, ix0 + (i + 1) * bw - 1, seatBot, 4, 0.92]);
  parts.push([L, armTop, ix0, baseBot, 9, 0.8], [ix1, armTop, R, baseBot, 9, 0.74]);
  parts.push([L + 10, baseBot - 1, L + 16, legBot, 1, 0.7], [R - 16, baseBot - 1, R - 10, legBot, 1, 0.7]);
  const geo = parts.map(([x0, y0, x1, y1, r, t]) => ({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2, r, t, x0, y0, w: x1 - x0, h: y1 - y0 }));

  // The pillow, leaning into the corner against the arm.
  const phw = 15, phh = 14, ang = (left ? -1 : 1) * (0.1 + rand() * 0.06);
  const pcx = left ? ix0 + phw + 3 : ix1 - phw - 3, pcy = seatTop - phh - 0.5;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pd = (x, y) => {
    const dx = x - pcx, dy = y - pcy;
    return sdBox(ca * dx + sa * dy, -sa * dx + ca * dy, 0, 0, phw, phh, 6);
  };

  g.print((x, y) => {
    if (x < L - 30 || x > R + 30 || y < backTop - 30 || y > legBot + 24) return 0;
    let ink = 0, dmin = Infinity;
    const gx = 1 - 0.18 * clamp((x - L) / (R - L));
    for (const p of geo) {
      const d = sdBox(x, y, p.cx, p.cy, p.hw, p.hh, p.r);
      dmin = Math.min(dmin, d);
      const a = solid(d);
      if (a <= 0) continue;
      const s = (1 - 0.15 * clamp((x - p.x0) / p.w) - 0.2 * clamp((y - p.y0) / p.h)) * gx;
      ink = ink * (1 - a) + p.t * s * a;
    }
    ink = Math.max(ink, 0.16 * glow(dmin, 7));
    const d = pd(x, y), a = solid(d);
    const shade = 1 - 0.2 * clamp((y - (pcy - phh)) / (2 * phh)) - 0.1 * clamp((x - (pcx - phw)) / (2 * phw));
    ink *= 1 - a;
    return [ink, a * 0.95 * shade + (1 - a) * 0.3 * glow(d, 6)];
  });

  const rr = (x0, y0, x1, y1, r) =>
    `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;

  // Backrest: only the part above the arms shows.
  const br = 10, bx0 = L + 16.5, bx1 = R - 16.5, by = backTop + 0.5;
  g.line(`M${bx0} ${armTop}V${by + br}A${br} ${br} 0 0 1 ${bx0 + br} ${by}H${bx1 - br}A${br} ${br} 0 0 1 ${bx1} ${by + br}V${armTop}`, "soft");
  // Back cushions: tops and seams.
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(ix0 + i * bw + 1) + 0.5, x1 = Math.round(ix0 + (i + 1) * bw - 1) - 0.5, y0 = backTop + 12.5, r = 7;
    g.line(`M${x0} ${seatTop}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${seatTop}`, "soft");
  }
  g.line(`M${ix0 + 0.5} ${baseBot - 0.5}H${ix1 - 0.5}`, "soft");
  for (let i = 0; i < n; i++) g.line(rr(Math.round(ix0 + i * bw + 1) + 0.5, seatTop + 0.5, Math.round(ix0 + (i + 1) * bw - 1) - 0.5, seatBot - 0.5, 4), "ink");
  g.line(rr(L + 0.5, armTop + 0.5, ix0 - 0.5, baseBot - 0.5, 9), "ink");
  g.line(rr(ix1 + 0.5, armTop + 0.5, R - 0.5, baseBot - 0.5, 9), "ink");
  g.box(L + 10, baseBot, 6, legBot - baseBot, "soft");
  g.box(R - 16, baseBot, 6, legBot - baseBot, "soft");
  g.line(`M${k.X0} ${legBot + 0.5}H${k.X1}`, "faint", { dash: "1 3" });

  // Pillow outline, rotated rounded rect.
  const pts = [];
  const cr = 6, corners = [[phw - cr, -phh + cr, -Math.PI / 2], [phw - cr, phh - cr, 0], [-phw + cr, phh - cr, Math.PI / 2], [-phw + cr, -phh + cr, Math.PI]];
  for (const [ox, oy, a0] of corners) {
    for (let s = 0; s <= 6; s++) {
      const a = a0 + (s / 6) * (Math.PI / 2);
      const lx = ox + cr * Math.cos(a), ly = oy + cr * Math.sin(a);
      pts.push([pcx + ca * lx - sa * ly, pcy + sa * lx + ca * ly]);
    }
  }
  g.line(polyD(pts, true), "sig", { width: 1.25 });
  void num;
}
