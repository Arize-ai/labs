function draw(g, rand, seed, k) {
  // A magnifying lens over dim trace spans, revealing one slow span.
  const { W, H, X0, X1, Y0, Y1, clamp, smooth, sdBox, sdPolyline, solid, glow, polyD, num } = k;

  // The system: rows of spans, barely visible in the ground.
  const nRows = 6, barH = 8;
  const gap = (Y1 - Y0 - 16) / (nRows - 1);
  const lensRow = 2;
  const cx = W / 2 - 14 + Math.round((rand() - 0.5) * 10);
  const rows = Array.from({ length: nRows }, (_, r) => ({ y: Math.round(Y0 + 8 + r * gap), segs: [] }));
  const cy = rows[lensRow].y;
  const R = 44, m = 1.7;

  for (const row of rows) {
    let x = X0 + rand() * 10;
    while (x < X1 - 10) {
      const len = 12 + rand() * 38;
      const x1 = Math.min(X1, x + len);
      row.segs.push({ x0: x, x1, sig: false });
      x = x1 + 4 + rand() * 10;
    }
  }
  // The anomaly: a long span sitting under the lens.
  const ax0 = cx - 9 - rand() * 4, ax1 = cx + 12 + rand() * 4;
  const ar = rows[lensRow];
  ar.segs = ar.segs.filter((s) => s.x1 < ax0 - 4 || s.x0 > ax1 + 4);
  ar.segs.push({ x0: ax0, x1: ax1, sig: true });

  // Handle, lower right, out of the lens rim.
  const a = Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
  const h0 = [cx + (R + 3) * ca, cy + (R + 3) * sa];
  const h1 = [cx + (R + 40) * ca, cy + (R + 40) * sa];
  const handle = [h0, h1];
  const hw = 4.5;

  // Tone of the spans at a point (in source coordinates), with edge scale s.
  const spans = (x, y, s) => {
    let ink = 0, sig = 0;
    for (const row of rows) {
      const ry = row.y + barH / 2;
      if (Math.abs(y - ry) > barH) continue;
      for (const b of row.segs) {
        if (x < b.x0 - 6 || x > b.x1 + 6) continue;
        const w = b.x1 - b.x0;
        const d = sdBox(x, y, b.x0 + w / 2, ry, w / 2, barH / 2) * s;
        const shade = 1 - 0.25 * clamp((x - b.x0) / Math.max(w, 1));
        if (b.sig) sig = Math.max(sig, solid(d) * shade + 0.35 * glow(d, 7));
        else ink = Math.max(ink, solid(d) * shade);
      }
    }
    return [ink, sig];
  };

  g.print((x, y) => {
    const dl = Math.hypot(x - cx, y - cy) - R;
    let ink = 0, sig = 0;
    if (dl < 0) {
      const sx = cx + (x - cx) / m, sy = cy + (y - cy) / m;
      const [bi, bs] = spans(sx, sy, m);
      ink = 0.9 * bi;
      sig = bs * clamp(-dl / 3);
      // The glass: a rim of light and a soft sheen at the upper left.
      ink = Math.max(ink, 0.22 * Math.exp(dl / 3));
      const sh = Math.hypot(x - (cx - R * 0.5), y - (cy - R * 0.5));
      ink = Math.max(ink, 0.12 * smooth(clamp(1 - sh / (R * 0.45))));
    } else {
      const [bi] = spans(x, y, 1);
      ink = Math.max(0.14 * bi, 0.2 * glow(dl, 7));
    }
    // The handle, lit toward its top-left.
    if (x > h0[0] - 12 && y > h0[1] - 12 && x < h1[0] + 12 && y < h1[1] + 12) {
      const dh = sdPolyline(x, y, handle) - hw;
      const along = clamp(((x - h0[0]) * ca + (y - h0[1]) * sa) / (R + 37));
      ink = Math.max(ink, solid(dh) * (0.92 - 0.3 * along) + 0.15 * glow(dh, 5));
    }
    return [ink, sig];
  });

  // Row guides, broken where the lens covers them.
  for (const row of rows) {
    const y = row.y + barH / 2, dy = y - cy, rr = R + 3;
    const yy = num(Math.round(y) + 0.5);
    if (Math.abs(dy) < rr) {
      const half = Math.sqrt(rr * rr - dy * dy);
      g.line(`M${X0} ${yy}H${num(cx - half)}M${num(cx + half)} ${yy}H${X1}`, "faint", { dash: "1 3" });
    } else g.line(`M${X0} ${yy}H${X1}`, "faint", { dash: "1 3" });
  }

  // Lens rim: a double rule.
  const circle = (r) =>
    `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  g.line(circle(R), "ink", { width: 1.5 });
  g.line(circle(R - 3), "soft");

  // Handle outline.
  const nx = -sa * hw, ny = ca * hw;
  const outline = [
    [h0[0] + nx, h0[1] + ny], [h1[0] + nx, h1[1] + ny],
    [h1[0] - nx, h1[1] - ny], [h0[0] - nx, h0[1] - ny],
  ];
  g.line(polyD(outline, true), "ink");
  // A collar where the handle meets the rim.
  const c0 = [cx + (R + 10) * ca, cy + (R + 10) * sa];
  g.line(polyD([[c0[0] + nx * 1.3, c0[1] + ny * 1.3], [c0[0] - nx * 1.3, c0[1] - ny * 1.3]]), "soft", { width: 1.5 });
}
