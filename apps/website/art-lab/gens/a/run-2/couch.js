function draw(g, rand, seed, k) {
  // A sofa in front view, one orange cushion resting on it
  const { clamp, sdBox, solid, glow, polyD, num } = k;
  const n = rand() < 0.5 ? 2 : 3;
  const seatTop = 128, seatBot = 152, baseBot = 174, floorY = 184;
  const ix0 = 118, ix1 = 282;
  const backTop = 74 + Math.round(rand() * 4);

  // Each piece: centre, half sizes, corner radius, tone, and how it's lit.
  const box = (x0, y0, x1, y1, r, tone, sig = false, a = 0) =>
    ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2, r, tone, sig, a });

  const backs = [], seats = [];
  const bw = (ix1 - ix0 - 4) / n;
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(ix0 + 2 + i * bw), x1 = Math.round(ix0 + 2 + (i + 1) * bw);
    backs.push(box(x0, backTop, x1, seatTop + 6, 9, 0.5));
    const sx0 = Math.round(ix0 + ((ix1 - ix0) * i) / n), sx1 = Math.round(ix0 + ((ix1 - ix0) * (i + 1)) / n);
    seats.push(box(sx0, seatTop, sx1, seatBot, 5, 0.86));
  }
  const base = box(ix0 - 4, seatBot - 4, ix1 + 4, baseBot, 0, 0.3);
  const armL = box(90, 98, ix0, baseBot, 10, 0.78);
  const armR = box(ix1, 98, 310, baseBot, 10, 0.72);
  const legs = [box(98, baseBot, 105, floorY, 1, 0.9), box(295, baseBot, 302, floorY, 1, 0.9)];
  const left = rand() < 0.5;
  const pa = (left ? -1 : 1) * (0.14 + rand() * 0.1);
  const pcx = left ? 146 : 254, pcy = 111, ph = 14;
  const pillow = box(pcx - ph, pcy - ph, pcx + ph, pcy + ph, 5, 0.95, true, pa);

  // Front to back.
  const pieces = [pillow, armL, armR, ...legs, ...seats, base, ...backs];
  const ca = Math.cos(pa), sa = Math.sin(pa);
  const sdPiece = (p, x, y) => {
    if (p.a) {
      const dx = x - p.cx, dy = y - p.cy;
      return sdBox(ca * dx + sa * dy, -sa * dx + ca * dy, 0, 0, p.hw, p.hh, p.r);
    }
    return sdBox(x, y, p.cx, p.cy, p.hw, p.hh, p.r);
  };

  g.print((x, y) => {
    if (x < 60 || x > 340 || y < 40 || y > 210) return 0;
    let dmin = Infinity, pd = Infinity;
    for (const p of pieces) {
      const d = sdPiece(p, x, y);
      if (p === pillow) pd = d;
      if (d < 0) {
        // Lit from the upper left.
        const shade = 1 - 0.22 * clamp((x - p.x0) / (p.x1 - p.x0)) - 0.14 * clamp((y - p.y0) / (p.y1 - p.y0));
        const v = p.tone * shade * (0.6 + 0.4 * solid(d));
        return p.sig ? [0, v] : [v, 0.3 * glow(pd, 7)];
      }
      dmin = Math.min(dmin, d);
    }
    // A soft halo around the silhouette and a shadow pooled on the floor.
    const fy = y - floorY, fx = (x - 200) / 120;
    const shadow = fy > -12 ? 0.22 * Math.exp(-(fx * fx) * 2.2 - Math.abs(fy) / 4) : 0;
    return [Math.max(0.16 * glow(dmin, 6), shadow), 0.3 * glow(pd, 7)];
  });

  const h = (v) => Math.round(v) + 0.5;
  const rr = (p) => {
    const x0 = h(p.x0), y0 = h(p.y0), x1 = h(p.x1) - 1, y1 = h(p.y1) - 1, r = p.r;
    return `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}` +
      `H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
  };

  // Back cushions: only their tops show above the seat.
  for (const b of backs) {
    const x0 = h(b.x0), x1 = h(b.x1) - 1, y0 = h(b.y0), r = b.r, sy = h(seatTop);
    g.line(`M${x0} ${sy}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${sy}`, "soft");
  }
  for (const s of seats) {
    g.line(rr(s), "ink");
    // Piping along the cushion front.
    g.line(`M${h(s.x0) + 4} ${h(seatBot - 6)}H${h(s.x1) - 5}`, "faint", { dash: "1 3" });
  }
  g.line(`M${ix0} ${h(baseBot) - 1}H${ix1}`, "soft");
  g.line(rr(armL), "ink");
  g.line(rr(armR), "ink");
  for (const l of legs) g.line(rr(l), "ink");

  // The pillow, rotated, with a tuck across its middle.
  const pts = [];
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  corners.forEach(([sx, sy], c) => {
    for (let s = 0; s <= 4; s++) {
      const t = (c * Math.PI) / 2 + (s / 4) * (Math.PI / 2);
      const lx = sx * (ph - pillow.r) + pillow.r * Math.cos(t), ly = sy * (ph - pillow.r) + pillow.r * Math.sin(t);
      pts.push([pcx + ca * lx - sa * ly, pcy + sa * lx + ca * ly]);
    }
  });
  g.line(polyD(pts, true), "sig", { width: 1.25 });

  g.line(`M84 ${floorY + 0.5}H316`, "faint", { dash: "1 3" });
}
