function draw(g, rand, seed, k) {
  // A flower: halftone petals, rule-drawn stem and leaf, orange heart
  const { X0, X1, Y1, clamp, solid, glow, sdPolyline, inPolygon, polyD } = k;
  const hx = 200 + (rand() - 0.5) * 16, hy = 110;
  const n = 5 + Math.floor(rand() * 3);
  const r0 = 9, base = rand() * Math.PI * 2;
  const petals = Array.from({ length: n }, (_, i) => {
    const th = base + (i * 2 * Math.PI) / n + (rand() - 0.5) * 0.12;
    return { c: Math.cos(th), s: Math.sin(th), a: 20 + rand() * 3, b: 10 + rand() * 2 };
  });
  const R = r0 + 46;

  const petalD = (x, y) => {
    const dx = x - hx, dy = y - hy;
    let d = Infinity;
    for (const p of petals) {
      const px = dx * p.c + dy * p.s - (r0 + p.a), py = -dx * p.s + dy * p.c;
      d = Math.min(d, (Math.hypot(px / p.a, py / p.b) - 1) * p.b);
    }
    return d;
  };

  // Stem: a gentle sway from the head down to the ground.
  const sway = (rand() < 0.5 ? -1 : 1) * (8 + rand() * 6);
  const stem = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    stem.push([hx + sway * Math.sin(t * Math.PI * 0.9) * (1 - 0.4 * t), hy + t * (Y1 - hy)]);
  }
  const visibleStem = stem.filter(([x, y]) => Math.hypot(x - hx, y - hy) > r0 && petalD(x, y) > 1);

  // Leaf: off the stem at about 60%, reaching up and out to one side.
  const side = sway > 0 ? -1 : 1;
  const lb = stem[18];
  const ll = 40 + rand() * 8, la = -0.55 + (rand() - 0.5) * 0.2;
  const ldx = side * Math.cos(la), ldy = Math.sin(la);
  const lw = 9;
  const upper = [], lower = [], rib = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, w = lw * Math.sin(Math.PI * u) * (1 - 0.25 * u);
    const mx = lb[0] + ldx * ll * u, my = lb[1] + ldy * ll * u + 6 * u * u;
    rib.push([mx, my]);
    upper.push([mx - ldy * w, my + ldx * w]);
    lower.push([mx + ldy * w, my - ldx * w]);
  }
  const leaf = upper.concat(lower.slice().reverse());
  const lx0 = Math.min(...leaf.map((p) => p[0])) - 14, lx1 = Math.max(...leaf.map((p) => p[0])) + 14;
  const ly0 = Math.min(...leaf.map((p) => p[1])) - 14, ly1 = Math.max(...leaf.map((p) => p[1])) + 14;
  const leafClosed = leaf.concat([leaf[0]]);

  g.print((x, y) => {
    let ink = 0;
    if (Math.abs(x - hx) < R + 30 && Math.abs(y - hy) < R + 30) {
      const d = petalD(x, y);
      // Lit from the upper left: petals brighten toward it.
      const shade = 1 - 0.32 * clamp(((x - hx) + (y - hy)) / (2 * R) + 0.5);
      ink = Math.max(ink, 0.9 * shade * solid(d) + 0.2 * glow(d, 9));
    }
    if (x > lx0 && x < lx1 && y > ly0 && y < ly1) {
      const e = sdPolyline(x, y, leafClosed);
      const d = inPolygon(x, y, leaf) ? -e : e;
      const shade = 1 - 0.3 * clamp((x - lx0) / (lx1 - lx0));
      ink = Math.max(ink, 0.5 * shade * solid(d) + 0.12 * glow(d, 6));
    }
    if (Math.abs(x - hx) < 40 && y > hy) ink = Math.max(ink, 0.14 * glow(sdPolyline(x, y, stem), 3));
    const rd = Math.hypot(x - hx, y - hy) - r0;
    return [ink, solid(rd) + 0.4 * glow(rd, 6)];
  });

  // Petal outlines and midribs.
  for (const p of petals) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const lx = r0 + p.a + p.a * Math.cos(t), ly = p.b * Math.sin(t);
      pts.push([hx + lx * p.c - ly * p.s, hy + lx * p.s + ly * p.c]);
    }
    g.line(polyD(pts, true), "ink");
    g.line(polyD([[hx + (r0 + 3) * p.c, hy + (r0 + 3) * p.s], [hx + (r0 + p.a * 1.6) * p.c, hy + (r0 + p.a * 1.6) * p.s]]), "faint");
  }

  g.line(polyD(visibleStem), "ink", { width: 1.5 });
  g.line(polyD(leaf, true), "ink");
  g.line(polyD(rib.slice(0, 14)), "soft");
  g.line(`M${hx - r0} ${hy}a${r0} ${r0} 0 1 0 ${2 * r0} 0a${r0} ${r0} 0 1 0 ${-2 * r0} 0Z`, "sig");
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint", { dash: "1 3" });
}
