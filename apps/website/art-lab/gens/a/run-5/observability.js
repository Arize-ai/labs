function draw(g, rand, seed, k) {
  // A magnifying lens over a signal, revealing hidden detail and one anomaly.
  const { X0, X1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 186 + (rand() - 0.5) * 24, cy = 112, R = 42;
  const baseY = cy + 4, ph = rand() * 6, ph2 = rand() * 6;
  const spikeX = cx + (rand() - 0.5) * 30;

  // The signal: smooth everywhere, its fine detail only resolved inside the lens.
  const pts = [];
  for (let x = X0; x <= X1; x += 0.75) {
    const b = baseY + 7 * Math.sin(x / 23 + ph) + 3 * Math.sin(x / 9.3 + ph2);
    const dist = Math.hypot(x - cx, b - cy);
    const m = smooth(clamp((R - 4 - dist) / 12));
    const detail = 9 * (fbm(x / 3.5, seed % 89) - 0.5) - 26 * Math.exp(-(((x - spikeX) / 2.4) ** 2));
    pts.push([x, b + m * detail, m]);
  }
  let tip = pts[0];
  for (const p of pts) if (p[2] > 0.5 && p[1] < tip[1]) tip = p;

  // The handle: a capsule leaving the rim down and to the right.
  const u = [Math.SQRT1_2, Math.SQRT1_2], nrm = [-Math.SQRT1_2, Math.SQRT1_2], hw = 5;
  const ha = [cx + u[0] * (R + 2), cy + u[1] * (R + 2)];
  const hb = [cx + u[0] * (R + 40), cy + u[1] * (R + 40)];
  const segD = (x, y, a, b) => {
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const t = clamp(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey));
    return [Math.hypot(x - a[0] - ex * t, y - a[1] - ey * t), t];
  };

  g.print((x, y) => {
    const dx = x - cx, dy = y - cy, dl = Math.hypot(dx, dy) - R;
    let ink = 0, sig = 0;
    // Line glow, culled by x.
    const near = pts.filter((p) => Math.abs(p[0] - x) < 14);
    const ld = near.length > 1 ? sdPolyline(x, y, near) : Infinity;
    if (dl < 0) {
      // The glass, brighter toward the upper left, with the signal lit inside.
      const lit = clamp((-(dx + dy) / (2 * R)) * 0.9 + 0.5);
      ink = 0.06 + 0.1 * lit + 0.42 * glow(ld, 3);
    } else {
      ink = 0.1 * glow(ld, 2.5) + 0.14 * glow(dl, 9);
    }
    // The rim, shaded from the upper left.
    const rd = Math.abs(dl) - 2.6;
    const rs = 0.72 + 0.28 * clamp(-(dx + dy) / (R * 1.414));
    ink = Math.max(ink, 0.92 * solid(rd) * rs);
    // The handle.
    if (x > ha[0] - 10 && y > ha[1] - 10) {
      const [hd, t] = segD(x, y, ha, hb);
      ink = Math.max(ink, solid(hd - hw) * (0.9 - 0.3 * t) + 0.12 * glow(hd - hw, 6));
    }
    const td = Math.hypot(x - tip[0], y - tip[1]) - 3;
    sig = solid(td) + 0.42 * glow(td, 6);
    return [ink, sig];
  });

  // The signal as rules: faint outside the lens, crisp inside.
  let run = [], inside = null;
  const flush = () => { if (run.length > 1) g.line(polyD(run), inside ? "ink" : "faint", { width: inside ? 1.25 : 1 }); };
  for (const p of pts) {
    const isIn = Math.hypot(p[0] - cx, p[1] - cy) < R - 3;
    if (inside !== null && isIn !== inside) { run.push([p[0], p[1]]); flush(); run = []; }
    inside = isIn;
    run.push([p[0], p[1]]);
  }
  flush();

  const circle = (r) => `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
  g.line(circle(R + 3), "ink", { width: 1.25 });
  g.line(circle(R - 5), "soft");
  const P1 = [ha[0] + nrm[0] * hw, ha[1] + nrm[1] * hw], P2 = [hb[0] + nrm[0] * hw, hb[1] + nrm[1] * hw];
  const P3 = [hb[0] - nrm[0] * hw, hb[1] - nrm[1] * hw], P4 = [ha[0] - nrm[0] * hw, ha[1] - nrm[1] * hw];
  g.line(`M${num(P1[0])} ${num(P1[1])}L${num(P2[0])} ${num(P2[1])}A${hw} ${hw} 0 0 0 ${num(P3[0])} ${num(P3[1])}L${num(P4[0])} ${num(P4[1])}`, "ink");
  // A dotted baseline the signal rides on.
  g.line(`M${X0} ${num(baseY) + 0.5}H${X1}`, "faint", { dash: "1 3" });
}
