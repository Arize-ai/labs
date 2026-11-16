function draw(g, rand, seed, k) {
  // A sofa in front elevation, with one orange throw pillow.
  const { clamp, sdBox, solid, glow, polyD } = k;
  const fbm = k.makeNoise(seed + 11);
  const shapes = [];
  const add = (cx, cy, hw, hh, r, a, tone, stroke, sig = false) =>
    shapes.push({ cx, cy, hw, hh, r, a, c: Math.cos(a), s: Math.sin(a), tone, stroke, sig });
  const sd = (sh, x, y) => {
    const dx = x - sh.cx, dy = y - sh.cy;
    const rx = dx * sh.c + dy * sh.s, ry = -dx * sh.s + dy * sh.c;
    return sdBox(rx, ry, 0, 0, sh.hw, sh.hh, sh.r);
  };

  const floor = 182;
  // Legs, under the arms, slightly tapered by being drawn as narrow posts.
  add(102, floor - 6, 3, 6, 1, 0, 0.85, "ink");
  add(298, floor - 6, 3, 6, 1, 0, 0.85, "ink");
  // Base rail.
  add(200, 161, 86, 11, 3, 0, 0.3, "soft");
  // Back rest, its sides tucked behind the arms.
  const backTop = 66 + Math.round(rand() * 6);
  const backBot = 132;
  add(200, (backTop + backBot) / 2, 88, (backBot - backTop) / 2, 12, 0, 0.5, "soft");
  // Arms.
  add(104, 135, 16, 35, 10, 0, 0.82, "ink");
  add(296, 135, 16, 35, 10, 0, 0.82, "ink");
  // Seat cushions.
  const n = rand() < 0.5 ? 2 : 3;
  const sx0 = 121, sx1 = 279, gap = 3, cw = (sx1 - sx0 - gap * (n - 1)) / n;
  const seams = [];
  for (let i = 0; i < n; i++) {
    const x0 = sx0 + i * (cw + gap);
    add(x0 + cw / 2, 139, cw / 2, 15, 6, 0, 0.92, "ink");
    if (i > 0) seams.push(x0 - gap / 2);
  }
  // The throw pillow, leaning against the back at one end.
  const leftSide = rand() < 0.5;
  const pa = (leftSide ? -1 : 1) * (0.14 + rand() * 0.1);
  add(leftSide ? 142 : 258, 111, 16, 15, 6, pa, 0.95, "sig", true);
  const pillow = shapes[shapes.length - 1];

  g.print((x, y) => {
    if (x < 80 || x > 320 || y < 54 || y > 196) return 0;
    let ink = 0, sig = 0;
    // A soft shadow pooling on the floor beneath the sofa.
    if (y > 168 && x > 92 && x < 308) {
      const edge = clamp((Math.min(x - 92, 308 - x)) / 14);
      ink = 0.2 * Math.exp(-Math.abs(y - floor) / 5) * edge;
    }
    for (const sh of shapes) {
      const d = sd(sh, x, y);
      if (sh.sig && d > 0) sig = Math.max(sig, 0.28 * glow(d, 6) * (ink < 0.4 ? 1 : 0));
      if (d > P_EDGE) continue;
      const m = solid(d);
      const lx = (x - (sh.cx - sh.hw)) / (2 * sh.hw), ly = (y - (sh.cy - sh.hh)) / (2 * sh.hh);
      // Lit from the upper left; cloth gets a touch of texture.
      const shade = 1 - 0.3 * clamp((lx + ly) / 2) + 0.06 * (fbm(x / 6, y / 6) - 0.5);
      const t = sh.tone * shade;
      if (sh.sig) { sig = sig * (1 - m) + t * m; ink *= 1 - m; }
      else { ink = ink * (1 - m) + t * m; sig *= 1 - m; }
    }
    return [ink, sig];
  });

  // Outlines, hidden where a later shape sits in front.
  function perimeter(sh) {
    const raw = [];
    const N = 160;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      const qx = (c >= 0 ? 1 : -1) * (sh.hw - sh.r), qy = (s >= 0 ? 1 : -1) * (sh.hh - sh.r);
      raw.push([qx + sh.r * c, qy + sh.r * s]);
    }
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const a = raw[i], b = raw[(i + 1) % raw.length];
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
      for (let s = 0; s < steps; s++) {
        const t = s / steps, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t;
        out.push([sh.cx + px * sh.c - py * sh.s, sh.cy + px * sh.s + py * sh.c]);
      }
    }
    return out;
  }
  shapes.forEach((sh, idx) => {
    const pts = perimeter(sh);
    const vis = pts.map(([x, y]) => !shapes.slice(idx + 1).some((o) => sd(o, x, y) < -0.6));
    if (vis.every(Boolean)) { g.line(polyD(pts, true), sh.stroke, { width: sh.sig ? 1.25 : 1 }); return; }
    const start = vis.indexOf(false);
    let seg = [];
    for (let s = 1; s <= pts.length; s++) {
      const i = (start + s) % pts.length;
      if (vis[i]) seg.push(pts[i]);
      else { if (seg.length > 1) g.line(polyD(seg), sh.stroke); seg = []; }
    }
    if (seg.length > 1) g.line(polyD(seg), sh.stroke);
  });

  // Back cushion seams above the seat seams, avoiding the pillow.
  for (const sx of seams) {
    const x = Math.round(sx) + 0.5;
    const hit = sd(pillow, x, 110) < 4;
    if (!hit) g.line(`M${x} ${backTop + 8}V124`, "faint", { dash: "1 3" });
  }
  // The floor.
  g.line(`M${k.X0} ${floor + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
}
const P_EDGE = 3.2;
