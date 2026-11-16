function draw(g, rand, seed, k) {
  // A sitting cat in silhouette, its eyes the one orange mark
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const cx = 200 + (rand() - 0.5) * 6;
  const lean = (rand() - 0.5) * 4;

  const smin = (a, b, r) => {
    const h = clamp(0.5 + (0.5 * (b - a)) / r);
    return b * (1 - h) + a * h - r * h * (1 - h);
  };
  const ell = (x, y, ex, ey, a, b) => (Math.hypot((x - ex) / a, (y - ey) / b) - 1) * Math.min(a, b);
  const sdTri = (x, y, t) => {
    const d = sdPolyline(x, y, [...t, t[0]]);
    return inPolygon(x, y, t) ? -d : d;
  };

  // Geometry
  const hx = cx + lean, hy = 100, ha = 33, hb = 28;
  const bx = cx, by = 158, ba = 42, bb = 38, floor = 193;
  const earL = [[hx - 28, 94], [hx - 24, 55], [hx - 3, 76]];
  const earR = earL.map(([x, y]) => [2 * hx - x, y]);
  const innerL = [[hx - 23, 86], [hx - 21.5, 64], [hx - 9, 78]];
  const innerR = innerL.map(([x, y]) => [2 * hx - x, y]);
  const eyes = [[hx - 12, 99], [hx + 12, 99]];

  // The tail: a curve out from the haunch, curling up.
  const tail = [];
  const tA = [cx + 26, 190], tB = [cx + 82, 196], tC = [cx + 70, 128 + rand() * 10];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, u = 1 - t;
    tail.push([u * u * tA[0] + 2 * u * t * tB[0] + t * t * tC[0], u * u * tA[1] + 2 * u * t * tB[1] + t * t * tC[1]]);
  }
  const tailW = 4.5;

  const bodyD = (x, y) => Math.max(ell(x, y, bx, by, ba, bb), y - floor);
  const catD = (x, y) => {
    let d = smin(ell(x, y, hx, hy, ha, hb), bodyD(x, y), 8);
    d = smin(d, sdTri(x, y, earL), 3);
    d = smin(d, sdTri(x, y, earR), 3);
    return d;
  };
  const eyeD = (x, y) => Math.min(...eyes.map(([ex, ey]) => ell(x, y, ex, ey, 5.5, 3.6)));

  g.print((x, y) => {
    if (x < 140 || x > 300 || y < 40 || y > 210) return 0;
    const d = Math.min(catD(x, y), sdPolyline(x, y, tail) - tailW * (1 - 0.3 * clamp((y - 130) / -10 + 1)));
    const ed = eyeD(x, y);
    // Lit from the upper left: the fill thins toward the lower right.
    const grad = clamp((x - 150 + (y - 50)) / 230);
    let ink = solid(d) * (0.95 - 0.32 * grad) + 0.16 * glow(d, 7);
    // Inner ears and nose are lighter tone, knocked into the fill.
    if (sdTri(x, y, innerL) < 0 || sdTri(x, y, innerR) < 0) ink = Math.min(ink, 0.42);
    if (ell(x, y, hx, 110, 3.2, 2.2) < 0) ink = Math.min(ink, 0.3);
    // A soft shadow on the floor.
    const sh = ell(x, y, cx + 14, 196, 64, 5);
    ink = Math.max(ink, 0.22 * solid(sh) * (y > floor ? 1 : 0));
    if (ed < 1) ink = 0;
    return [ink, solid(ed) + 0.3 * glow(ed, 4)];
  });

  // Silhouette outline: march rays out from inside the body.
  const ox = cx, oy = 132, outline = [];
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180, dx = Math.cos(t), dy = Math.sin(t);
    let last = 0;
    for (let r = 0; r < 110; r += 0.5) if (catD(ox + dx * r, oy + dy * r) < 0) last = r;
    outline.push([ox + dx * last, oy + dy * last]);
  }
  g.line(polyD(outline, true), "ink", { width: 1.25 });

  // Tail edges, only where they leave the body.
  const sides = [1, -1].map((s) => {
    const pts = [];
    for (let i = 0; i < tail.length; i++) {
      const a = tail[Math.max(0, i - 1)], b = tail[Math.min(tail.length - 1, i + 1)];
      const ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1;
      const w = tailW * (1 - 0.3 * clamp((tail[i][1] - 130) / -10 + 1));
      const p = [tail[i][0] + (s * ey * w) / l, tail[i][1] - (s * ex * w) / l];
      if (catD(p[0], p[1]) > 0.5) pts.push(p);
    }
    return pts;
  });
  const tip = tail[tail.length - 1];
  for (const pts of sides) if (pts.length > 1) g.line(polyD(pts), "ink", { width: 1.25 });
  g.line(`M${num(tip[0] - tailW * 0.7)} ${num(tip[1])}A${num(tailW * 0.7)} ${num(tailW * 0.7)} 0 0 1 ${num(tip[0] + tailW * 0.7)} ${num(tip[1])}`, "ink", { width: 1.25 });

  // Slit pupils over the orange eyes.
  for (const [ex, ey] of eyes) g.line(`M${num(ex) + 0.5} ${num(ey - 3)}V${num(ey + 3)}`, "ink", { width: 1.25 });

  // Whiskers reaching out past the face.
  for (const s of [-1, 1]) {
    for (const dy of [-2, 2.5]) {
      const x0 = hx + s * 16, y0 = 112 + dy * 0.6;
      g.line(polyD([[x0, y0], [hx + s * 52, 108 + dy * 3.2]]), "soft");
    }
  }

  // The floor.
  g.line(`M${k.X0} ${floor + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
}
