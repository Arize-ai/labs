function draw(g, rand, seed, k) {
  // Paper lanterns drifting down a winding brook, seen from above
  const { clamp, solid, glow, sdPolyline, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);
  const hw = 18; // half-width of the brook
  const j = (a) => (rand() * 2 - 1) * a;

  // Brook centreline: Catmull-Rom through jittered control points.
  const ctrl = [
    [68, 70 + j(4)],
    [84, 78 + j(8)],
    [160 + j(6), 110 + j(10)],
    [220 + j(6), 118 + j(10)],
    [316, 170 + j(8)],
    [332, 178 + j(4)],
  ];
  const pts = [];
  for (let i = 1; i < ctrl.length - 2; i++) {
    const [p0, p1, p2, p3] = [ctrl[i - 1], ctrl[i], ctrl[i + 1], ctrl[i + 2]];
    for (let s = 0; s < 30; s++) {
      const t = s / 30, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(ctrl[ctrl.length - 2]);
  // Extend a little past both edges so the water runs off the card.
  const a0 = pts[0], a1 = pts[1], z0 = pts[pts.length - 1], z1 = pts[pts.length - 2];
  pts.unshift([a0[0] - 2 * (a1[0] - a0[0]) * 6, a0[1] - 2 * (a1[1] - a0[1]) * 6]);
  pts.push([z0[0] + 2 * (z0[0] - z1[0]) * 6, z0[1] + 2 * (z0[1] - z1[1]) * 6]);

  const yAt = (x) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x >= x0 && x <= x1) return y0 + (y1 - y0) * ((x - x0) / Math.max(1e-6, x1 - x0));
    }
    return x < pts[0][0] ? pts[0][1] : pts[pts.length - 1][1];
  };
  const tangentAt = (x) => {
    const dy = yAt(x + 2) - yAt(x - 2), l = Math.hypot(4, dy);
    return [4 / l, dy / l];
  };

  // Lanterns: uneven spacing, one bunched pair, orange one under the rope.
  const pairC = 196 + j(5), pairS = 14 + rand() * 4;
  const ox = 256 + j(3);
  const xs = [100 + j(3), 128 + j(4), 152 + j(4), pairC - pairS / 2, pairC + pairS / 2, 290 + j(5)];
  const lanterns = xs.map((x) => ({
    x, y: yAt(x),
    r: 4 + rand() * 2,
    core: x < 135 ? 0.6 + rand() * 0.1 : 0.9 + rand() * 0.1,
  }));
  const O = { x: ox, y: yAt(ox), r: 5.5 + rand() * 0.5 };

  // Gauging rope through the orange lantern, at a slight angle across the flow.
  const [tx, ty] = tangentAt(O.x);
  const nx = -ty, ny = tx;
  const ul = Math.hypot(16, 48), ux = 16 / ul, uy = 48 / ul;
  const dot = Math.max(0.35, Math.abs(ux * nx + uy * ny));
  const L = (hw + 4) / dot;
  const A = [O.x - ux * L, O.y - uy * L], B = [O.x + ux * L, O.y + uy * L];

  g.print((x, y) => {
    if (x < 76 || x > 324) return 0;
    const yc = yAt(x);
    if (Math.abs(y - yc) > hw + 44) return 0;
    const d = sdPolyline(x, y, pts);
    const wm = solid(d - hw);
    let ink = 0;
    if (wm > 0) {
      const centre = clamp(1 - (d / hw) ** 2);
      const ul2 = clamp(1 - ((x - 84) / 232) * 0.7 - ((y - 56) / 138) * 0.3);
      ink = wm * (0.27 + 0.09 * centre + 0.05 * ul2 + 0.04 * (fbm(x / 10, y / 10) - 0.5));
    }
    for (const l of lanterns) {
      const dl = Math.hypot(x - l.x, y - l.y) - l.r;
      if (dl > 45) continue;
      const halo = 0.3 * l.core * glow(dl, 14) * wm;
      ink = Math.max(ink + halo, l.core * solid(dl));
    }
    for (const p of [A, B]) ink = Math.max(ink, 0.7 * solid(Math.hypot(x - p[0], y - p[1]) - 3));
    const dO = Math.hypot(x - O.x, y - O.y) - O.r;
    const orange = dO > 70 ? 0 : solid(dO) + 0.6 * glow(dO, 20) * wm;
    return [clamp(ink), clamp(orange)];
  });

  // Banks: offset curves of the centreline, clipped to the subject box.
  const upper = [], lower = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const dx = pts[i + 1][0] - pts[i - 1][0], dy = pts[i + 1][1] - pts[i - 1][1];
    const l = Math.hypot(dx, dy) || 1;
    const qx = -dy / l, qy = dx / l;
    const u = [px - qx * hw, py - qy * hw], w = [px + qx * hw, py + qy * hw];
    if (u[0] >= 84 && u[0] <= 316) upper.push(u);
    if (w[0] >= 84 && w[0] <= 316) lower.push(w);
  }
  g.line(polyD(upper), "soft");
  g.line(polyD(lower), "soft");

  // Current marks: short faint dashes mid-channel in the wider gaps.
  const all = [...lanterns, O].sort((a, b) => a.x - b.x);
  let marks = 0;
  for (let i = 0; i < all.length - 1 && marks < 4; i++) {
    const gap = all[i + 1].x - all[i].x;
    if (gap < 24) continue;
    const mx = (all[i].x + all[i + 1].x) / 2;
    const off = (marks % 2 ? 1 : -1) * (4 + rand() * 3);
    const seg = [];
    for (let x = mx - 7; x <= mx + 7; x += 1) {
      const [sx, sy] = tangentAt(x);
      seg.push([x - sy * off, yAt(x) + sx * off]);
    }
    g.line(polyD(seg), "faint", { dash: "2 3" });
    marks++;
  }

  // Faint rings at each lantern rim.
  const ring = (cx, cy, r) => {
    const c = [];
    for (let i = 0; i < 24; i++) c.push([cx + r * Math.cos((i / 24) * 2 * Math.PI), cy + r * Math.sin((i / 24) * 2 * Math.PI)]);
    return polyD(c, true);
  };
  for (const l of lanterns) g.line(ring(l.x, l.y, l.r + 1), "faint");
  g.line(ring(O.x, O.y, O.r + 1), "faint");

  // The gauging rope, taut and dashed, across the water.
  g.line(polyD([A, B]), "ink", { dash: "4 3" });
}
