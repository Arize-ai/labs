function draw(g, rand, seed, k) {
  // Field-guide plate of a snake gliding in a double S-curve
  const { clamp, smooth, solid, glow, sdPolyline, polyD } = k;

  // Pose: amplitude and phase vary, crests move by at most ±8.
  const amp = (rand() - 0.5) * 10;
  const jit = () => (rand() - 0.5) * 6;
  const ph = (rand() - 0.5) * 8;
  const tail = [98, 172];
  const c1 = [148 + ph, 98 - amp + jit()];
  const tr = [208 + ph * 0.7, 166 + amp + jit()];
  const c2 = [258 + ph * 0.4, 100 - amp + jit()];
  const neck = [276, 112];

  // Hermite segments: horizontal at crests and trough.
  const segs = [
    [tail, c1, [20, -120], [100, 0]],
    [c1, tr, [110, 0], [110, 0]],
    [tr, c2, [105, 0], [90, 0]],
    [c2, neck, [26, 0], [22, 10]],
  ];
  const pts = [tail.slice()];
  for (const [p0, p1, m0, m1] of segs) {
    for (let i = 1; i <= 30; i++) {
      const t = i / 30, t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      pts.push([
        h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
        h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
      ]);
    }
  }
  const S = [0];
  for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = S[S.length - 1];
  // Half-width: 1.5 at tail, 12 mid-body, 9 at neck.
  const hwAt = (s) => {
    const f = s / L;
    return f < 0.5 ? 1.5 + 10.5 * (f / 0.5) : 12 - 3 * smooth(clamp((f - 0.55) / 0.45));
  };

  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    const l = Math.hypot(dx, dy) || 1e-6;
    seg.push({ ax, ay, dx, dy, l, l2: l * l, s0: S[i], nx: -dy / l, ny: dx / l });
  }
  const bodyQ = (x, y) => {
    let best = 1e9, bs = 0, boff = 0, bhw = 1, bnx = 0, bny = 1;
    for (const q of seg) {
      const t = clamp(((x - q.ax) * q.dx + (y - q.ay) * q.dy) / q.l2);
      const px = q.ax + q.dx * t, py = q.ay + q.dy * t;
      const s = q.s0 + q.l * t, hw = hwAt(s);
      const dd = Math.hypot(x - px, y - py) - hw;
      if (dd < best) { best = dd; bs = s; boff = (x - px) * q.nx + (y - py) * q.ny; bhw = hw; bnx = q.nx; bny = q.ny; }
    }
    return { d: best, s: bs, off: boff, hw: bhw, nx: bnx, ny: bny };
  };

  // Head: blunt rounded wedge, 34 × 22, pointing at the snout.
  const hc = [290, 114];
  const hl = Math.hypot(16, -4), hdx = 16 / hl, hdy = -4 / hl, hpx = -hdy, hpy = hdx; // perp points toward jaw
  const hwH = (a) => 11 - 2.5 * smooth(clamp((a + 4) / 21));
  const headQ = (x, y) => {
    const rx = x - hc[0], ry = y - hc[1];
    const a = rx * hdx + ry * hdy, b = rx * hpx + ry * hpy, hw = hwH(a);
    const f = Math.pow(Math.abs(a / 17), 3) + Math.pow(Math.abs(b / hw), 3);
    return { a, b, hw, f, d: (Math.cbrt(f) - 1) * Math.min(hw, 12) };
  };
  const eyes = [[293, 105], [293, 123]];
  const fork = [314, 107];

  // Saddle bands.
  const spacing = 13 + rand() * 6;
  const bandOff = 6 + rand() * spacing;
  const Lx = -0.6, Ly = -0.8;

  // Ghost trail: two shallow S-curves back from the tail.
  const tEnd = [86, 150];
  const tdx = tEnd[0] - tail[0], tdy = tEnd[1] - tail[1], tl = Math.hypot(tdx, tdy);
  const tpx = -tdy / tl, tpy = tdx / tl;
  const trail = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, o = 2.5 * Math.sin(4 * Math.PI * t);
    trail.push([tail[0] + tdx * t + tpx * o, tail[1] + tdy * t + tpy * o]);
  }

  g.print((x, y) => {
    if (x < 74 || x > 334 || y < 68 || y > 202) return 0;
    const q = bodyQ(x, y);
    const h = headQ(x, y);
    let ink = 0;
    const dAll = Math.min(q.d, h.d);
    if (dAll > 0 && dAll < 12) ink = 0.13 * (1 - smooth(dAll / 12));
    const dt = sdPolyline(x, y, trail);
    if (dt < 6) ink = Math.max(ink, 0.08 * solid(dt - 2.5));
    if (q.d < 2) {
      const u = clamp(q.off / q.hw, -1, 1);
      const lit = clamp((u * (q.nx * Lx + q.ny * Ly)) / 0.8, -1, 1);
      let tone = 0.625 + 0.275 * lit;
      tone += 0.12 * Math.exp(-((x - 268) ** 2 + (y - 106) ** 2) / (2 * 14 * 14));
      if (q.s > 8 && q.s < L - 4) {
        const m = (((q.s - bandOff) % spacing) + spacing) % spacing;
        if (m < 5) tone -= 0.25;
      }
      ink = Math.max(ink, clamp(tone) * solid(q.d));
    }
    if (h.d < 2) {
      const ht = 0.8 - 0.3 * smooth(clamp((h.b / h.hw + 1) / 2));
      const s = solid(h.d);
      ink = ink * (1 - s) + ht * s;
    }
    for (const e of eyes) ink *= 1 - solid(Math.hypot(x - e[0], y - e[1]) - 3);
    const fd = Math.hypot(x - fork[0], y - fork[1]);
    const org = fd < 14 ? 0.6 * glow(fd - 0.5, 4) : 0;
    return [ink, org];
  });

  // Split a point list into runs that pass a predicate.
  const runs = (list, keep) => {
    const out = []; let cur = [];
    for (const p of list) {
      if (keep(p)) cur.push(p);
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };

  // Body outline: left flank, neck cap, right flank, tail tip.
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl2 = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl2, ny = tx / tl2, hw = hwAt(S[i]);
    left.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw]);
    right.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw]);
  }
  const t0x = pts[1][0] - pts[0][0], t0y = pts[1][1] - pts[0][1], t0l = Math.hypot(t0x, t0y);
  const tipStart = [tail[0] - (t0x / t0l) * 1.5, tail[1] - (t0y / t0l) * 1.5];
  const n = pts.length - 1;
  const ex = pts[n][0] - pts[n - 1][0], ey = pts[n][1] - pts[n - 1][1], el = Math.hypot(ex, ey);
  const ang0 = Math.atan2(ey / el, ex / el), hwN = hwAt(L);
  const cap = [];
  for (let i = 1; i < 12; i++) {
    const a = ang0 + Math.PI / 2 - (Math.PI * i) / 12;
    cap.push([neck[0] + Math.cos(a) * hwN, neck[1] + Math.sin(a) * hwN]);
  }
  const ring = [tipStart, ...left, ...cap, ...right.slice().reverse(), tipStart];
  for (const r of runs(ring, (p) => headQ(p[0], p[1]).f > 1)) g.line(polyD(r), "ink");

  // Head outline, hidden where it crosses the neck.
  const headRing = [];
  for (let i = 0; i <= 72; i++) {
    const th = (i / 72) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const a = 17 * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3);
    const b = Math.sign(s) * Math.pow(Math.abs(s), 2 / 3) * hwH(a);
    headRing.push([hc[0] + a * hdx + b * hpx, hc[1] + a * hdy + b * hpy]);
  }
  for (const r of runs(headRing, (p) => bodyQ(p[0], p[1]).d > -0.5)) g.line(polyD(r), "ink");

  // Spine, neck to tail.
  for (const r of runs(pts.slice().reverse(), (p) => headQ(p[0], p[1]).f > 1)) g.line(polyD(r), "soft");

  // Ghost trail.
  g.line(polyD(trail), "faint", { dash: "2 3" });

  // Forked tongue.
  g.line(`M306 110L${fork[0]} ${fork[1]}L320 101M${fork[0]} ${fork[1]}L320 111`, "sig", { width: 1.2 });
}
