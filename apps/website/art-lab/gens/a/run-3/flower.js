function draw(g, rand, seed, k) {
  // A daisy-like bloom on a curving stem, its orange heart lit
  const { X0, X1, Y1, clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const cx = 200 + (rand() - 0.5) * 10, cy = 106;
  const n = 6 + Math.floor(rand() * 3);
  const rot = rand() * Math.PI * 2;
  const r0 = 10, a = 19, pc = r0 + a;
  const b = Math.min(9.5, ((Math.PI * pc) / n) * 0.85);
  const tipR = pc + a, R = tipR + 4, discR = 9;

  const petals = Array.from({ length: n }, (_, i) => {
    const ang = rot + (i / n) * Math.PI * 2;
    const c = Math.cos(ang), s = Math.sin(ang);
    // Petals facing the upper left catch the light.
    const facing = -(c + s) / Math.SQRT2;
    return { c, s, shade: 0.7 + 0.18 * facing };
  });

  // Stem: a cubic from the disc down to the ground.
  const sx = (rand() - 0.5) * 26;
  const cubic = (p0, p1, p2, p3, m) =>
    Array.from({ length: m + 1 }, (_, j) => {
      const t = j / m, u = 1 - t;
      return [
        u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
        u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
      ];
    });
  const stem = cubic([cx, cy + discR], [cx, cy + 50], [cx + sx, Y1 - 34], [cx + sx, Y1], 32);

  // One leaf off the stem, to the side the stem leans away from.
  const side = sx > 0 ? -1 : 1;
  const base = stem[22];
  const tip = [base[0] + side * 34, base[1] - 16];
  const mx = (base[0] + tip[0]) / 2, my = (base[1] + tip[1]) / 2;
  const lx = tip[0] - base[0], ly = tip[1] - base[1], ll = Math.hypot(lx, ly);
  const nx = -ly / ll, ny = lx / ll, bulge = 9;
  const quad = (p0, c, p1, m) =>
    Array.from({ length: m + 1 }, (_, j) => {
      const t = j / m, u = 1 - t;
      return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
    });
  const leafA = quad(base, [mx + nx * bulge * 2, my + ny * bulge * 2], tip, 14);
  const leafB = quad(tip, [mx - nx * bulge * 2, my - ny * bulge * 2], base, 14);
  const leaf = leafA.concat(leafB.slice(1));
  const lxs = leaf.map((p) => p[0]), lys = leaf.map((p) => p[1]);
  const lb = [Math.min(...lxs) - 14, Math.max(...lxs) + 14, Math.min(...lys) - 14, Math.max(...lys) + 14];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    const dx = x - cx, dy = y - cy, rr = Math.hypot(dx, dy);
    if (rr < R + 26) {
      // Fills brighten toward the top-left of the head.
      const grad = 0.1 * clamp((dx + dy) / (2 * R) + 0.5);
      for (const p of petals) {
        const u = dx * p.c + dy * p.s, v = -dx * p.s + dy * p.c;
        const d = (Math.hypot((u - pc) / a, v / b) - 1) * b;
        ink = Math.max(ink, solid(d) * (p.shade - grad) + 0.2 * glow(d, 7));
      }
      const cd = rr - discR;
      sig = solid(cd) + 0.4 * glow(cd, 6);
    }
    if (y > cy && y < Y1 + 10 && Math.abs(x - cx - sx / 2) < 40) {
      ink = Math.max(ink, 0.28 * glow(sdPolyline(x, y, stem), 3));
    }
    if (x > lb[0] && x < lb[1] && y > lb[2] && y < lb[3]) {
      if (inPolygon(x, y, leaf)) {
        const t = clamp(((x - base[0]) * lx + (y - base[1]) * ly) / (ll * ll));
        ink = Math.max(ink, 0.55 - 0.15 * t);
      } else ink = Math.max(ink, 0.16 * glow(sdPolyline(x, y, leaf), 5));
    }
    return [ink, sig];
  });

  // Petal outlines, broken where they pass under the disc.
  for (const p of petals) {
    let seg = [];
    const flush = () => {
      if (seg.length > 1) g.line(polyD(seg), "ink");
      seg = [];
    };
    for (let j = 0; j <= 48; j++) {
      const t = (j / 48) * Math.PI * 2;
      const u = pc + a * Math.cos(t), v = b * Math.sin(t);
      const pt = [cx + u * p.c - v * p.s, cy + u * p.s + v * p.c];
      if (Math.hypot(pt[0] - cx, pt[1] - cy) < discR + 1.5) flush();
      else seg.push(pt);
    }
    flush();
    // Midrib.
    g.line(polyD([[cx + p.c * (discR + 4), cy + p.s * (discR + 4)], [cx + p.c * (r0 + 1.5 * a), cy + p.s * (r0 + 1.5 * a)]]), "soft");
  }

  // Stem, leaf and its vein.
  g.line(polyD(stem), "ink", { width: 1.5 });
  g.line(polyD(leaf, true), "soft");
  g.line(polyD([base, [base[0] + lx * 0.85, base[1] + ly * 0.85]]), "faint");

  // A dotted guide circle around the head, the disc, and the ground.
  const gr = tipR + 7;
  g.line(`M${num(cx - gr)} ${num(cy)}a${gr} ${gr} 0 1 0 ${2 * gr} 0a${gr} ${gr} 0 1 0 ${-2 * gr} 0Z`, "faint", { dash: "1 3" });
  g.line(`M${num(cx - discR)} ${num(cy)}a${discR} ${discR} 0 1 0 ${2 * discR} 0a${discR} ${discR} 0 1 0 ${-2 * discR} 0Z`, "sig");
  g.line(`M${X0 + 40} ${Y1 + 0.5}H${X1 - 40}`, "faint");
}
