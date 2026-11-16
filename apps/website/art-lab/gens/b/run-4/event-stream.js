function draw(g, rand, seed, k) {
  // Paper lanterns drifting single file down a winding night river
  const { clamp, solid, sdBox, polyD, num } = k;

  // River banks: keyed by y, smoothed with Catmull-Rom.
  const keysY = [66, 90, 120, 150, 194];
  const LX = [250, 222, 180, 172, 150];
  const RX = [276, 262, 236, 262, 300];
  const cr = (xs, y) => {
    let i = 0;
    while (i < 3 && y > keysY[i + 1]) i++;
    const t = clamp((y - keysY[i]) / (keysY[i + 1] - keysY[i]));
    const p0 = xs[Math.max(i - 1, 0)], p1 = xs[i], p2 = xs[i + 1], p3 = xs[Math.min(i + 2, 4)];
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  };
  const L = [], R = [];
  for (let y = 66; y <= 194; y++) { L[y] = cr(LX, y); R[y] = cr(RX, y); }
  const inRiver = (x, y) => {
    const iy = Math.round(y);
    return iy >= 66 && iy <= 194 && x > L[iy] && x < R[iy];
  };

  // Lanterns, jittered along and across the current.
  const base = [[258, 74, 5], [244, 84, 6], [228, 96, 7], [213, 110, 9], [206, 126, 11], [212, 144, 14], [226, 162, 17], [218, 182, 20]];
  const lanterns = base.map((b, i) => {
    const a = base[Math.max(i - 1, 0)], c = base[Math.min(i + 1, base.length - 1)];
    let tx = c[0] - a[0], ty = c[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const along = (rand() * 2 - 1) * 4, across = (rand() * 2 - 1) * 4;
    const s = b[2] * (1 + (rand() * 2 - 1) * 0.15);
    let x = b[0] + tx * along - ty * across;
    const y = b[1] + ty * along + tx * across;
    const iy = Math.round(clamp(y, 66, 194), 0, 999);
    x = clamp(x, L[iy] + s / 2 + 2, R[iy] - s / 2 - 2);
    return { x, y, s, h: s / 2, r: s * 0.25, rw: Math.max(5, s * 0.6) };
  });
  const SIG = 5;

  // Ripple flecks, placed in the outer parts of the pools so they read.
  const ripples = [];
  const nR = 4 + Math.floor(rand() * 5);
  for (let n = 0; n < nR; n++) {
    for (let tries = 0; tries < 25; tries++) {
      const l = lanterns[2 + Math.floor(rand() * 6)];
      const ang = rand() * Math.PI * 2;
      const dist = (1.4 + rand() * 1.2) * l.s;
      const len = 6 + rand() * 9;
      const cx = l.x + Math.cos(ang) * dist, cy = l.y + Math.sin(ang) * dist;
      const x0 = cx - len / 2, x1 = cx + len / 2;
      if (!inRiver(x0 - 2, cy) || !inRiver(x1 + 2, cy)) continue;
      if (lanterns.some(q => Math.abs(cx - q.x) < q.rw / 2 + len / 2 && cy > q.y - q.h - 3 && cy < q.y + q.h + 1.5 * q.s)) continue;
      ripples.push({ x0, x1, y: cy });
      break;
    }
  }

  g.print((x, y) => {
    if (y < 60 || y > 200 || x < 140 || x > 310) return 0;
    let ink = 0, org = 0;
    if (inRiver(x, y)) {
      let pool = 0, gl = 0, refI = 0, refO = 0;
      for (let i = 0; i < lanterns.length; i++) {
        const l = lanterns[i];
        const d = Math.hypot(x - l.x, y - l.y);
        pool = Math.max(pool, 1 - clamp(d / (3 * l.s)));
        const edge = d - l.h;
        if (edge > 0) {
          const tt = clamp(edge / (2.5 * l.s));
          gl = Math.max(gl, 0.6 * (1 - tt) * (1 - tt));
        }
        const top = l.y + l.h, len = 1.5 * l.s;
        if (Math.abs(x - l.x) < l.rw / 2 && y > top && y < top + len) {
          const f = 0.45 * (1 - (y - top) / len);
          if (i === SIG) refO = Math.max(refO, f); else refI = Math.max(refI, f);
        }
      }
      ink = Math.max(0.12 + 0.13 * pool, gl);
      if (pool > 0.05) {
        for (const r of ripples) {
          if (Math.abs(y - r.y) < 2 && x > r.x0 && x < r.x1) ink = Math.max(ink, 0.3);
        }
      }
      ink = Math.min(0.95, ink + refI);
      if (refO > 0.05) org = Math.min(0.95, ink + refO);
    }
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      if (Math.abs(x - l.x) > l.h + 4 || Math.abs(y - l.y) > l.h + 4) continue;
      const c = solid(sdBox(x, y, l.x, l.y, l.h, l.h, l.r));
      if (i === SIG) org = Math.max(org, c); else ink = Math.max(ink, c);
    }
    return [ink, org];
  });

  // Horizon.
  g.line("M110 66.5H290", "faint");

  // Banks, from the horizon to the foot of the plate.
  const lb = [], rb = [];
  for (let y = 66; y <= 194; y += 2) { lb.push([L[y], y]); rb.push([R[y], y]); }
  g.line(polyD(lb), "soft");
  g.line(polyD(rb), "soft");

  // Centreline as a dashed timeline, broken at each lantern.
  const nodes = [{ x: (L[66] + R[66]) / 2, y: 66, gap: 0 }]
    .concat(lanterns.map(l => ({ x: l.x, y: l.y, gap: l.h * 1.42 + 2.5 })))
    .concat([{ x: (L[194] + R[194]) / 2, y: 194, gap: 0 }]);
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, dl = Math.hypot(dx, dy);
    if (dl <= a.gap + b.gap + 2) continue;
    const ux = dx / dl, uy = dy / dl;
    const ax = a.x + ux * a.gap, ay = a.y + uy * a.gap;
    const bx = b.x - ux * b.gap, by = b.y - uy * b.gap;
    g.line(`M${num(ax)} ${num(ay)}L${num(bx)} ${num(by)}`, "faint", { dash: "3 3" });
  }

  // Rims round the four nearest lanterns.
  const rr = (cx, cy, h, r) => {
    const x0 = cx - h, x1 = cx + h, y0 = cy - h, y1 = cy + h;
    return `M${num(x0 + r)} ${num(y0)}H${num(x1 - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x1)} ${num(y0 + r)}` +
      `V${num(y1 - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x1 - r)} ${num(y1)}` +
      `H${num(x0 + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x0)} ${num(y1 - r)}` +
      `V${num(y0 + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x0 + r)} ${num(y0)}Z`;
  };
  for (let i = 4; i < lanterns.length; i++) {
    const l = lanterns[i], o = 1.5;
    g.line(rr(l.x, l.y, l.h + o, l.r + o), "ink");
  }
}
