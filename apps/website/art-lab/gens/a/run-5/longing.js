function draw(g, rand, seed, k) {
  // A reach toward a distant orange light that thins out before arriving
  const { X0, X1, Y0, Y1, clamp, smooth, sdBox, solid, glow, bezier, polyD, num } = k;

  // The one who longs: a lit block on the ground at the left
  const bs = 30, bx = Math.round(X0 + 18 + rand() * 8), by = Math.round(Y1 - 30);
  const bcx = bx + bs / 2, bcy = by - bs / 2;

  // What is longed for: a small light far up to the right
  const T = [X1 - 22 - rand() * 10, Y0 + 24 + rand() * 18];

  // The reach: a curve leaving the block, carrying light only part of the way
  const A = [bx + bs, by - bs + 7];
  const pts = bezier(A, T, 64);
  const reach = 0.56 + rand() * 0.1;
  const n = pts.length - 1;
  const split = Math.round(n * reach);

  // Segment table, for distance and position along the curve
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [cx, cy] = pts[i];
    segs.push({ ax, ay, ex: cx - ax, ey: cy - ay, t0: (i - 1) / n, x0: Math.min(ax, cx) - 14, x1: Math.max(ax, cx) + 14 });
  }
  const cMinY = Math.min(A[1], T[1]) - 14, cMaxY = Math.max(A[1], T[1]) + 14;

  g.print((x, y) => {
    let ink = 0;

    // The block, lit from the upper left
    const d = sdBox(x, y, bcx, bcy, bs / 2, bs / 2);
    const shade = 1 - 0.3 * clamp((x - bx + (y - (by - bs))) / (2 * bs));
    ink = solid(d) * 0.9 * shade + 0.22 * glow(d, 8);

    // The reach's glow, fading to nothing before the gap
    if (y > cMinY && y < cMaxY) {
      let best = Infinity, bt = 1;
      for (const s of segs) {
        if (x < s.x0 || x > s.x1) continue;
        const wx = x - s.ax, wy = y - s.ay;
        const u = clamp((wx * s.ex + wy * s.ey) / (s.ex * s.ex + s.ey * s.ey || 1));
        const dd = Math.hypot(wx - s.ex * u, wy - s.ey * u);
        if (dd < best) { best = dd; bt = s.t0 + u / n; }
      }
      if (best < Infinity) ink = Math.max(ink, 0.34 * glow(best, 4) * (1 - smooth(clamp(bt / reach))));
    }

    // The distant light
    const td = Math.hypot(x - T[0], y - T[1]) - 5;
    return [ink, solid(td) + 0.4 * glow(td, 9)];
  });

  // The ground the block stands on
  g.line(`M${X0} ${by + 0.5}H${num(bx + bs + 26)}`, "faint");
  g.box(bx, by - bs, bs, bs, "ink");

  // The reach in thinning weights, then only a dotted intention
  const a1 = Math.round(split * 0.45), a2 = Math.round(split * 0.75);
  g.line(polyD(pts.slice(0, a1 + 1)), "ink", { width: 1.25 });
  g.line(polyD(pts.slice(a1, a2 + 1)), "soft", { width: 1.25 });
  g.line(polyD(pts.slice(a2, split + 1)), "faint", { width: 1.25 });
  g.line(polyD(pts.slice(split, n - 3)), "faint", { dash: "1 3" });

  // An envelope around the light, never touched
  const r = 13;
  g.line(`M${num(T[0] - r)} ${num(T[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, "faint", { dash: "1 3" });

  // The distance, measured: a dimension rule under the gap
  const dy = Math.round(Y1 + 6) + 0.5;
  const xa = Math.round(A[0]) + 0.5, xb = Math.round(T[0]) + 0.5;
  g.line(`M${xa} ${dy}H${xb}`, "soft");
  g.line(`M${xa} ${dy - 4}v8M${xb} ${dy - 4}v8`, "soft");
  g.line(`M${xb} ${num(T[1] + r + 4)}V${dy - 5}`, "faint", { dash: "1 3" });
}
