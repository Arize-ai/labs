function draw(g, rand, seed, k) {
  // A single fiddlehead fern uncurling, studied like a botanical plate
  const { clamp, solid, polyD } = k;
  const TAU = Math.PI * 2;
  const cx = 218, cy = 108;

  // The crozier: a logarithmic spiral band, outer edge at radius 50.
  const turns = 2.25 + rand() * 0.5, T = turns * TAU;
  const rc0 = 42, rcEnd = 8, b = Math.log(rc0 / rcEnd) / T;
  const rcAt = (t) => rc0 * Math.exp(-b * t);
  const wAt = (t) => 4 + 12 * (rcAt(t) - rcEnd) / (rc0 - rcEnd);
  const th0 = Math.atan2(128 - cy, 172 - cx);
  const pt = (t, off) => {
    const r = rcAt(t) + off, a = th0 + t;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const Lx = -Math.SQRT1_2, Ly = -Math.SQRT1_2; // light from upper left
  const tipStart = T - TAU / 4;
  const eA = th0 + T, eR = [Math.cos(eA), Math.sin(eA)], eT = [-Math.sin(eA), Math.cos(eA)];
  const E = pt(T, 0), wE = wAt(T);

  function band(x, y) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1e-6;
    const base = (((Math.atan2(dy, dx) - th0) % TAU) + TAU) % TAU;
    const best = { d: Infinity, t: 0, u: 0, rx: dx / r, ry: dy / r, base, r };
    for (let t = base; t <= T; t += TAU) {
      const rc = rcAt(t), hw = wAt(t) / 2, d = Math.abs(r - rc) - hw;
      if (d < best.d) { best.d = d; best.t = t; best.u = (r - rc) / hw; }
    }
    const qx = x - E[0], qy = y - E[1], dc = Math.hypot(qx, qy) - wE / 2;
    if (dc < best.d) {
      best.d = dc; best.t = T;
      best.u = clamp((qx * eR[0] + qy * eR[1]) / (wE / 2), -1, 1);
    }
    return best;
  }

  // Tucked pinnae along the outside of the outer turn, shrinking inward.
  const pinnae = [];
  for (let i = 0; i < 9; i++) {
    const t = 0.45 + i * (TAU - 1.0 - 0.45) / 8;
    const dia = clamp(7 - 2 * i / 8 + (rand() * 2 - 1) * 1.5, 4.5, 8.5);
    const rad = dia / 2;
    const R = rcAt(t) + wAt(t) / 2 + rad * 0.45, a = th0 + t;
    pinnae.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: rad });
  }

  // The stem: leaves the band's outer end and descends in an S to the ground.
  const S0 = pt(0, 0), x0 = S0[0], y0 = S0[1], xB = 186, yB = 194;
  const sway = 3 + (rand() * 2 - 1) * 8;
  const sOf = (y) => (y - y0) / (yB - y0);
  const xcAt = (s) => x0 + (xB - x0) * s + sway * Math.sin(TAU * s);
  const hwAt = (s) => 5 - 1.5 * s + 3 * Math.pow(Math.max(0, 1 - s / 0.12), 2);

  // Paired leaflet buds, angled upward.
  const buds = [];
  const ba = 50 * Math.PI / 180;
  for (const yb of [150, 170]) {
    const s = sOf(yb), xc = xcAt(s), hw = hwAt(s);
    for (const side of [-1, 1]) {
      const dir = [side * Math.cos(ba), -Math.sin(ba)];
      const c = [xc + side * hw * 0.9 + dir[0] * 3.3, yb + dir[1] * 3.3];
      buds.push({ c, dir, a: 3.5, bb: 2.4 });
    }
  }
  const budD = (x, y, bd) => {
    const qx = x - bd.c[0], qy = y - bd.c[1];
    const u = (qx * bd.dir[0] + qy * bd.dir[1]) / bd.a;
    const v = (-qx * bd.dir[1] + qy * bd.dir[0]) / bd.bb;
    return (Math.hypot(u, v) - 1) * bd.bb;
  };

  g.print((x, y) => {
    if (x < 128 || x > 300 || y < 30 || y > 200) return 0;
    const B = band(x, y);
    let bt = 0, orange = 0;
    if (B.d < 2.5) {
      const f = B.t / T, base = 0.7 + 0.2 * f, amp = 1 - 0.5 * f;
      const s = B.u * (B.rx * Lx + B.ry * Ly);
      const tone = clamp(base + amp * (s > 0 ? 0.15 : 0.25) * s);
      const sd = solid(B.d);
      if (B.t >= tipStart) orange = 0.92 * sd; else bt = tone * sd;
    }
    if (B.d < 0) return [bt, orange];

    let o = 0;
    // Soft glow around the coil, melting into the texture.
    const t1 = B.base, env = rcAt(t1) + wAt(t1) / 2;
    if (B.r > env) {
      const q = clamp(1 - (B.r - env) / 30);
      o = 0.35 * q * q * clamp((TAU - t1) / 0.8);
    }
    for (const p of pinnae) {
      const dd = Math.hypot(x - p.x, y - p.y) - p.r;
      if (dd < 1.5) {
        const dot = ((x - p.x) * Lx + (y - p.y) * Ly) / p.r;
        const tone = 0.625 + 0.125 * clamp(dot * 2.5, -1, 1);
        o = Math.max(o, tone * solid(dd));
      }
    }
    if (y > y0 - 2 && y < yB + 1) {
      const s = clamp(sOf(y)), xc = xcAt(s), hw = hwAt(s);
      const d = Math.abs(x - xc) - hw;
      if (d < 1.5) {
        const tone = 0.55 - 0.25 * s + 0.07 * clamp((xc - x) / hw, -1, 1);
        o = Math.max(o, tone * solid(d));
      }
    }
    for (const bd of buds) o = Math.max(o, 0.4 * solid(budD(x, y, bd)));
    return [Math.max(bt, o), orange];
  });

  const runs = (pts, keep, stroke) => {
    let cur = [];
    for (const p of pts) {
      if (keep(p)) cur.push(p);
      else { if (cur.length > 1) g.line(polyD(cur), stroke); cur = []; }
    }
    if (cur.length > 1) g.line(polyD(cur), stroke);
  };
  const outsideBand = (p) => band(p[0], p[1]).d > 0.3;

  // Spiral edges.
  const N = 360, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const t = T * i / N, hw = wAt(t) / 2;
    outer.push(pt(t, hw));
    inner.push(pt(t, -hw));
  }
  const cap = [];
  for (let j = 1; j <= 16; j++) {
    const a = Math.PI * j / 16;
    const dx = eR[0] * Math.cos(a) + eT[0] * Math.sin(a);
    const dy = eR[1] * Math.cos(a) + eT[1] * Math.sin(a);
    cap.push([E[0] + dx * wE / 2, E[1] + dy * wE / 2]);
  }
  g.line(polyD(outer.concat(cap)), "ink");
  g.line(polyD(inner), "soft");

  // Stem edges.
  const left = [], right = [];
  for (let i = 0; i <= 60; i++) {
    const s = i / 60, y = y0 + (yB - y0) * s, xc = xcAt(s), hw = hwAt(s);
    left.push([xc - hw, y]);
    right.push([xc + hw, y]);
  }
  runs(left, outsideBand, "soft");
  runs(right, outsideBand, "soft");

  // Pinna outlines, only where they stand clear of the band.
  for (const p of pinnae) {
    const c = [];
    for (let j = 0; j <= 28; j++) {
      const a = TAU * j / 28;
      c.push([p.x + p.r * Math.cos(a), p.y + p.r * Math.sin(a)]);
    }
    runs(c, outsideBand, "faint");
  }

  // Bud outlines, outside the stem.
  const outsideStem = (p) => {
    const s = clamp(sOf(p[1]));
    return Math.abs(p[0] - xcAt(s)) > hwAt(s);
  };
  for (const bd of buds) {
    const c = [];
    for (let j = 0; j <= 24; j++) {
      const a = TAU * j / 24, u = bd.a * Math.cos(a), v = bd.bb * Math.sin(a);
      c.push([bd.c[0] + u * bd.dir[0] - v * bd.dir[1], bd.c[1] + u * bd.dir[1] + v * bd.dir[0]]);
    }
    runs(c, outsideStem, "faint");
  }

  // Ground horizon.
  g.line("M120 190.5H290", "faint", { dash: "4 3" });
}
