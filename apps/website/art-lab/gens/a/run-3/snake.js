function draw(g, rand, seed, k) {
  // A snake in side view, shaded body and diamonds, orange forked tongue
  const { clamp, smooth, solid, glow, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);
  const ph = rand() * 0.8 - 0.4, freq = 1.45 + rand() * 0.3;
  const N = 90;
  const L = [-0.6, -0.8];

  // Centreline, tail on the left, neck on the right.
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const A = 26 - 15 * t;
    pts.push([96 + 174 * t, 126 + A * Math.sin(2 * Math.PI * freq * t + ph) + 2 * (fbm(t * 6, 3) - 0.5)]);
  }
  const width = (t) => 1 + 8 * smooth(clamp(t / 0.55)) - 1.5 * smooth(clamp((t - 0.82) / 0.18));
  const nrm = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    return [-dy / l, dx / l];
  });
  const segs = [];
  let arc = 0;
  for (let i = 1; i <= N; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey);
    segs.push({ ax, ay, ex, ey, l2: l * l, l, w0: width((i - 1) / N), w1: width(i / N), a0: arc });
    arc += l;
  }
  const total = arc;

  // The head: an ellipse ahead of the neck, along the last direction.
  const end = pts[N], pe = pts[N - 2];
  let dx = end[0] - pe[0], dy = end[1] - pe[1];
  const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
  let up = [-dy, dx]; if (up[1] > 0) up = [dy, -dx];
  const ha = 12, hb = 8.5;
  const hc = [end[0] + dx * 9, end[1] + dy * 9];
  const eye = [hc[0] + dx * 3.5 + up[0] * 3.2, hc[1] + dy * 3.5 + up[1] * 3.2];
  const tip = [hc[0] + dx * ha, hc[1] + dy * ha];

  g.print((x, y) => {
    if (x < 84 || x > 316 || y < 70 || y > 185) return 0;
    // Body: nearest segment, with its interpolated half-width.
    let best = Infinity, bs = 0, ba = 0, bn = null;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const wx = x - s.ax, wy = y - s.ay;
      if (Math.abs(wx) > 40) continue;
      const t = clamp((wx * s.ex + wy * s.ey) / s.l2);
      const px = wx - s.ex * t, py = wy - s.ey * t;
      const w = s.w0 + (s.w1 - s.w0) * t;
      const d = Math.hypot(px, py) - w;
      if (d < best) {
        best = d;
        const n = [-s.ey / s.l, s.ex / s.l];
        bs = clamp((px * n[0] + py * n[1]) / w, -1, 1);
        bn = n; ba = s.a0 + s.l * t;
      }
    }
    // Head.
    const ux = x - hc[0], uy = y - hc[1];
    const u = ux * dx + uy * dy, v = ux * up[0] + uy * up[1];
    const hd = (Math.hypot(u / ha, v / hb) - 1) * hb;

    let ink;
    if (hd < best) {
      const lit = clamp(0.5 + 0.55 * (-(v / hb) * (up[0] * L[0] + up[1] * L[1])) + 0.15 * (-(u / ha)));
      let tone = 0.42 + 0.5 * lit;
      if (Math.hypot(x - eye[0], y - eye[1]) < 2.2) tone = 0;
      ink = solid(hd) * tone + 0.18 * glow(hd, 6);
    } else {
      const lit = clamp(0.5 + 0.6 * bs * (bn[0] * L[0] + bn[1] * L[1]));
      let tone = 0.38 + 0.54 * lit;
      // Dorsal diamonds, fading out toward the tail.
      const q = ((ba + 4) % 15) - 7.5;
      const fade = smooth(clamp(ba / total / 0.35));
      if (Math.abs(q) + Math.abs(bs) * 8 < 5.5) tone *= 1 - 0.7 * fade;
      ink = solid(best) * tone + 0.18 * glow(best, 6);
    }
    return ink;
  });

  // Outline: along one side to the tail and back along the other.
  const side = (sg) => pts.map((p, i) => [p[0] + sg * nrm[i][0] * width(i / N), p[1] + sg * nrm[i][1] * width(i / N)]);
  const neckW = width(1);
  const ext = (sg) => [end[0] + dx * 3.4 + sg * nrm[N][0] * neckW, end[1] + dy * 3.4 + sg * nrm[N][1] * neckW];
  const left = [...side(1), ext(1)], right = [...side(-1), ext(-1)];
  g.line(polyD([...left.reverse(), ...right]), "ink", { width: 1.25 });

  // The head's front arc, meeting the body lines.
  const c = clamp(-Math.sqrt(1 - (neckW / hb) ** 2), -1, 1), th = Math.acos(c);
  const arcPts = [];
  for (let s = 0; s <= 24; s++) {
    const a = -th + (2 * th * s) / 24;
    const uu = ha * Math.cos(a), vv = hb * Math.sin(a);
    const nx = -dy, ny = dx;
    arcPts.push([hc[0] + dx * uu + nx * vv, hc[1] + dy * uu + ny * vv]);
  }
  g.line(polyD(arcPts), "ink", { width: 1.25 });

  // Mouth.
  g.line(polyD([tip, [tip[0] - dx * 7, tip[1] - dy * 7]]), "soft");

  // The forked tongue: the one orange mark.
  const rot = (a) => [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  const t0 = [tip[0] + dx * 1.5, tip[1] + dy * 1.5], fork = [t0[0] + dx * 8, t0[1] + dy * 8];
  const f1 = rot(0.45), f2 = rot(-0.45);
  g.line(
    polyD([t0, fork, [fork[0] + f1[0] * 5, fork[1] + f1[1] * 5]]) + polyD([fork, [fork[0] + f2[0] * 5, fork[1] + f2[1] * 5]]),
    "sig",
    { width: 1.25 },
  );

  // A dotted ground guide beneath it.
  g.line(`M${k.X0} ${num(k.Y1 - 8) + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
}
