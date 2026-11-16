function draw(g, rand, seed, k) {
  // A daisy-like flower on a stem, its orange centre the point.
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, Y1 } = k;
  const cx = 200 + (rand() - 0.5) * 10, cy = 110;
  const n = rand() < 0.5 ? 6 : 7;
  const rot = rand() * Math.PI * 2;
  const cr = 10, a = 18, c = cr + a - 3, b = c * Math.tan(Math.PI / n) * 0.9;
  const R = c + a;
  const petals = Array.from({ length: n }, (_, i) => {
    const t = rot + (i * 2 * Math.PI) / n;
    return { cs: Math.cos(t), sn: Math.sin(t) };
  });
  const petalD = (x, y, p) => {
    const dx = x - cx, dy = y - cy;
    const u = dx * p.cs + dy * p.sn, v = -dx * p.sn + dy * p.cs;
    return (Math.hypot((u - c) / a, v / b) - 1) * Math.min(a, b);
  };
  const hidden = (x, y, above) => {
    if (Math.hypot(x - cx, y - cy) < cr + 0.5) return true;
    for (const p of above) if (petalD(x, y, p) < -0.5) return true;
    return false;
  };

  // Stem: a gentle S from the head down to the ground line.
  const sway = (rand() < 0.5 ? -1 : 1) * (10 + rand() * 8);
  const s0 = [cx, cy], s1 = [cx - sway, (cy + Y1) / 2], s2 = [cx + sway * 0.6, Y1];
  const stem = Array.from({ length: 31 }, (_, i) => {
    const t = i / 30, u = 1 - t;
    return [u * u * s0[0] + 2 * u * t * s1[0] + t * t * s2[0], u * u * s0[1] + 2 * u * t * s1[1] + t * t * s2[1]];
  });

  // Leaf: two arcs from a point on the stem, opening away from the sway.
  const base = stem[19], side = sway > 0 ? -1 : 1;
  const tip = [base[0] + side * 32, base[1] - 16];
  const lx = tip[0] - base[0], ly = tip[1] - base[1], ll = Math.hypot(lx, ly);
  const nx = -ly / ll, ny = lx / ll;
  const arc = (s) => Array.from({ length: 13 }, (_, i) => {
    const t = i / 12, u = 1 - t;
    const m = [(base[0] + tip[0]) / 2 + s * nx * 10, (base[1] + tip[1]) / 2 + s * ny * 10];
    return [u * u * base[0] + 2 * u * t * m[0] + t * t * tip[0], u * u * base[1] + 2 * u * t * m[1] + t * t * tip[1]];
  });
  const leafPoly = arc(1).concat(arc(-1).reverse());
  const lxs = leafPoly.map((p) => p[0]), lys = leafPoly.map((p) => p[1]);
  const lb = [Math.min(...lxs) - 10, Math.max(...lxs) + 10, Math.min(...lys) - 10, Math.max(...lys) + 10];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    const dr = Math.hypot(x - cx, y - cy);
    if (dr < R + 24) {
      // Lit from the upper left; petals darken toward the centre.
      const lit = clamp(0.5 - (0.7 * (x - cx) + 0.7 * (y - cy)) / (2 * R));
      let pd = Infinity;
      for (const p of petals) pd = Math.min(pd, petalD(x, y, p));
      const shade = 0.72 + 0.28 * clamp((dr - cr) / (2 * a));
      ink = solid(pd) * (0.42 + 0.55 * lit) * shade + 0.16 * glow(pd, 7);
      const cd = dr - (cr - 1);
      sig = solid(cd) + 0.4 * glow(cd, 6);
    }
    if (Math.abs(x - cx) < 40 && y > cy) {
      const sd = sdPolyline(x, y, stem);
      ink = Math.max(ink, 0.5 * solid(sd - 1.2) + 0.12 * glow(sd, 5));
    }
    if (x > lb[0] && x < lb[1] && y > lb[2] && y < lb[3]) {
      const ed = sdPolyline(x, y, leafPoly), ld = inPolygon(x, y, leafPoly) ? -ed : ed;
      const t = clamp(((x - base[0]) * lx + (y - base[1]) * ly) / (ll * ll));
      ink = Math.max(ink, solid(ld) * (0.38 + 0.3 * (side < 0 ? t : 1 - t) * 0.8 + 0.15 * (1 - t)) + 0.12 * glow(ld, 6));
    }
    return [ink, sig];
  });

  // Draws only the visible runs of a point list.
  const runs = (pts, isHidden, stroke, opts) => {
    let run = [];
    const flush = () => { if (run.length > 1) g.line(polyD(run), stroke, opts); run = []; };
    for (const p of pts) { if (isHidden(p)) flush(); else run.push(p); }
    flush();
  };

  // Stem rule, hidden under the head.
  runs(stem, (p) => hidden(p[0], p[1], petals), "ink", { width: 1.5 });
  // Leaf outline and midrib.
  g.line(polyD(leafPoly, true), "ink");
  g.line(polyD([base, [base[0] + lx * 0.85, base[1] + ly * 0.85]]), "soft");

  // Petal outlines, painter's order: later petals lie over earlier ones.
  petals.forEach((p, i) => {
    const above = petals.slice(i + 1).concat(i === 0 ? [] : []);
    const pts = Array.from({ length: 65 }, (_, j) => {
      const t = Math.PI + (j / 64) * 2 * Math.PI;
      const u = c + a * Math.cos(t), v = b * Math.sin(t);
      return [cx + u * p.cs - v * p.sn, cy + u * p.sn + v * p.cs];
    });
    runs(pts, (q) => hidden(q[0], q[1], above), "ink", { width: 1.25 });
    const m0 = [cx + (cr + 3) * p.cs, cy + (cr + 3) * p.sn], m1 = [cx + (c + a * 0.55) * p.cs, cy + (c + a * 0.55) * p.sn];
    g.line(polyD([m0, m1]), "faint");
  });

  // The centre, a dotted guide around the head, and the ground.
  const ring = (r) => `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
  g.line(ring(cr), "sig", { width: 1.25 });
  g.line(ring(R + 7), "faint", { dash: "1 3" });
  const gx = s2[0];
  g.line(`M${num(gx - 38)} ${Y1 + 0.5}H${num(gx + 38)}`, "faint");
}
