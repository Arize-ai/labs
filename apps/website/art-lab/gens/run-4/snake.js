function draw(g, rand, seed, k) {
  // A snake slithering right, tube-shaded scales, forked orange tongue
  const { clamp, smooth, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const cy = 128, A = 24 + rand() * 8, phase = rand() * Math.PI * 2, waves = 1.35 + rand() * 0.3;
  const xa = 98, xb = 272, N = 130;

  // Centreline, tangents, radii.
  const radius = (u) => (1.4 + 8.8 * smooth(clamp(u / 0.72))) * (1 - 0.18 * smooth(clamp((u - 0.9) / 0.1)));
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = xa + (xb - xa) * u;
    const settle = 1 - 0.7 * smooth(clamp((u - 0.8) / 0.2));
    const y = cy + A * Math.sin(u * Math.PI * 2 * waves + phase) * (0.55 + 0.45 * u) * settle;
    pts.push({ x, y, u, r: radius(u), tx: 0, ty: 0, s: 0 });
  }
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
    pts[i].tx = dx / l; pts[i].ty = dy / l;
    if (i) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    pts[i].s = s;
  }

  // Head: an ellipse past the neck, along the final direction.
  const end = pts[N], dx = end.tx, dy = end.ty;
  let nx = -dy, ny = dx;
  if (ny > 0) { nx = -nx; ny = -ny; } // upper side
  const ha = 13.5, hb = 8.6;
  const hc = [end.x + dx * 6, end.y + dy * 6];
  const headSd = (x, y) => {
    const px = x - hc[0], py = y - hc[1];
    const lx = px * dx + py * dy, ly = px * nx + py * ny;
    // Snout narrows a little toward the front.
    const bb = hb * (1 - 0.18 * clamp(lx / ha));
    return (Math.hypot(lx / ha, ly / bb) - 1) * bb;
  };

  // Nearest point on the body, culled by x.
  const nearest = (x, y) => {
    let best = Infinity, bu = 0, bs = 0, bqx = 0, bqy = 0, br = 1;
    for (let i = 1; i <= N; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Math.abs(a.x - x) > 18 && Math.abs(b.x - x) > 18) continue;
      const ex = b.x - a.x, ey = b.y - a.y, wx = x - a.x, wy = y - a.y;
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1));
      const qx = a.x + ex * t, qy = a.y + ey * t, r = a.r + (b.r - a.r) * t;
      const d = Math.hypot(x - qx, y - qy) - r;
      if (d < best) { best = d; bu = a.u + (b.u - a.u) * t; bs = a.s + (b.s - a.s) * t; bqx = qx; bqy = qy; br = r; }
    }
    return { d: best, u: bu, s: bs, qx: bqx, qy: bqy, r: br };
  };

  const Lx = -0.6, Ly = -0.8;
  g.print((x, y) => {
    if (x < xa - 20 || x > hc[0] + 30 || y < cy - A - 30 || y > cy + A + 34) return 0;
    const b = nearest(x, y);
    const hd = headSd(x, y);
    let ink = 0;
    if (b.d < 3) {
      // Tube shading: brighter on the side facing the upper-left light.
      const ox = (x - b.qx) / Math.max(b.r, 1), oy = (y - b.qy) / Math.max(b.r, 1);
      const lit = clamp(0.58 + 0.38 * (ox * Lx + oy * Ly));
      // Dorsal bands, darker diamonds along the back.
      const band = 0.5 + 0.5 * Math.cos(b.s / 5.2);
      const back = Math.exp(-(ox * ox + oy * oy) * 2.2);
      const tone = lit * (1 - 0.32 * band * back) + 0.06 * (fbm(x / 4, y / 4) - 0.5);
      ink = Math.max(ink, solid(b.d) * tone);
    }
    if (hd < 3) {
      const px = x - hc[0], py = y - hc[1];
      const lit = clamp(0.62 + 0.34 * ((px * Lx + py * Ly) / hb));
      ink = Math.max(ink, solid(hd) * lit);
    }
    const dd = Math.min(b.d, hd);
    ink = Math.max(ink, 0.2 * glow(dd, 6));
    // A soft cast shadow-light on the ground beneath.
    const under = Math.exp(-((y - (cy + A + 18)) ** 2) / 30) * 0.12 * smooth(clamp((x - xa) / 60)) * clamp((hc[0] + 10 - x) / 30);
    return Math.max(ink, under);
  });

  // Outline: body offsets outside the head, head outline outside the body.
  const runs = (list, keep) => {
    const out = []; let cur = [];
    for (const p of list) {
      if (keep(p)) cur.push(p);
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  const left = pts.map((p) => [p.x - p.ty * p.r, p.y + p.tx * p.r]);
  const right = pts.map((p) => [p.x + p.ty * p.r, p.y - p.tx * p.r]);
  const outsideHead = (p) => headSd(p[0], p[1]) > 0.3;
  for (const side of [left, right]) for (const r of runs(side, outsideHead)) g.line(polyD(r), "ink", { width: 1.25 });
  // Rounded tail tip.
  g.line(polyD([left[0], [pts[0].x - pts[0].tx * pts[0].r, pts[0].y - pts[0].ty * pts[0].r], right[0]]), "ink", { width: 1.25 });

  const ring = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2, lx = Math.cos(a) * ha;
    const bb = hb * (1 - 0.18 * clamp(lx / ha)), ly = Math.sin(a) * bb;
    ring.push([hc[0] + dx * lx + nx * ly, hc[1] + dy * lx + ny * ly]);
  }
  const outsideBody = (p) => nearest(p[0], p[1]).d > 0.3;
  for (const r of runs(ring, outsideBody)) g.line(polyD(r), "ink", { width: 1.25 });

  // Spine as a dotted guide.
  g.line(polyD(pts.slice(4).map((p) => [p.x, p.y])), "faint", { dash: "1 3" });

  // Eye.
  const ex = hc[0] + dx * 4.5 + nx * 3.6, ey = hc[1] + dy * 4.5 + ny * 3.6, er = 1.8;
  g.line(`M${num(ex - er)} ${num(ey)}a${er} ${er} 0 1 0 ${2 * er} 0a${er} ${er} 0 1 0 ${-2 * er} 0Z`, "ink", { fill: true });

  // Forked tongue: the one orange mark.
  const tip = [hc[0] + dx * ha, hc[1] + dy * ha];
  const fork = [tip[0] + dx * 9, tip[1] + dy * 9];
  const f1 = [fork[0] + dx * 5 + nx * 3, fork[1] + dy * 5 + ny * 3];
  const f2 = [fork[0] + dx * 5 - nx * 3, fork[1] + dy * 5 - ny * 3];
  g.line(polyD([tip, fork, f1]) + polyD([fork, f2]), "sig", { width: 1.5 });
}
