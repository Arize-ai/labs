function draw(g, rand, seed, k) {
  // A skeleton pocket watch, its glass caseback showing the movement inside
  const { clamp, smooth, solid, glow, sdBox, sdPolyline, polyD, num } = k;
  const TAU = Math.PI * 2;
  const CX = 200, CY = 136, RO = 64, RI = 56;

  const circ = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
  const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const circlePts = (cx, cy, r, n = 64) => {
    const out = [];
    for (let i = 0; i <= n; i++) out.push(pol(cx, cy, r, (i / n) * TAU));
    return out;
  };

  // Gears: barrel, train wheel, escape wheel.
  const gears = [
    { cx: 184, cy: 122, R: 24, n: 20, amp: 2, rin: 18, hub: 5, spokes: 3, sw: 2.5, tone: 0.65 },
    { cx: 222, cy: 112, R: 14, n: 14, amp: 1.6, rin: 10, hub: 3.5, spokes: 4, sw: 2.2, tone: 0.55 },
    { cx: 232, cy: 140, R: 8, n: 12, amp: 1.6, rin: 0, hub: 0, spokes: 4, sw: 0, tone: 0.55, hooked: true },
  ];
  for (const G of gears) {
    G.rot = rand() * (TAU / G.n);
    G.spokeAng = [];
    for (let i = 0; i < G.spokes; i++) G.spokeAng.push(G.rot + (i * TAU) / G.spokes);
    G.spokeCS = G.rin > 0 ? G.spokeAng.map((a) => [Math.cos(a), Math.sin(a)]) : [];
  }
  const gearPts = (G) => {
    const p = TAU / G.n, root = G.R - G.amp, tip = G.R + G.amp, out = [];
    for (let i = 0; i < G.n; i++) {
      const a = G.rot + i * p;
      if (G.hooked) {
        out.push(pol(G.cx, G.cy, root, a), pol(G.cx, G.cy, tip, a + 0.75 * p), pol(G.cx, G.cy, root, a + 0.65 * p));
      } else {
        out.push(
          pol(G.cx, G.cy, root, a),
          pol(G.cx, G.cy, tip, a + 0.2 * p),
          pol(G.cx, G.cy, tip, a + 0.45 * p),
          pol(G.cx, G.cy, root, a + 0.65 * p)
        );
      }
    }
    out.push(out[0]);
    return out;
  };

  // Bridge: a curved arm from (160,150) to (196,104), bowing left over the barrel.
  const bA = [160, 150], bC = [150, 110], bB = [196, 104];
  const bp = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, u = 1 - t;
    bp.push([u * u * bA[0] + 2 * u * t * bC[0] + t * t * bB[0], u * u * bA[1] + 2 * u * t * bC[1] + t * t * bB[1]]);
  }
  const BW = 5;
  const underBridge = (p) => sdPolyline(p[0], p[1], bp) < BW + 0.3;

  // Balance wheel.
  const BX = 208, BY = 164;
  const balRot = rand() * Math.PI;
  const cb = Math.cos(balRot), sb = Math.sin(balRot);
  const springStart = rand() * TAU;

  g.print((x, y) => {
    const dx = x - CX, dy = y - CY, r0 = Math.hypot(dx, dy);
    const inBow = Math.abs(x - 200) < 14 && y < 74 && y > 44;
    if (r0 > 86 && !inBow) return 0;
    let ink = r0 > 63 ? 0.25 * (1 - smooth(clamp((r0 - 64) / 20))) : 0;
    let orange = 0;
    const lay = (t, c) => { if (c > 0) ink = ink * (1 - c) + t * c; };

    if (inBow) {
      lay(0.5, solid(Math.abs(Math.hypot(x - 200, y - 58) - 9) - 2.5));
      lay(0.6, solid(sdBox(x, y, 200, 68, 6, 4)));
    }
    if (r0 < RO + 2) {
      const diag = (dx + dy) / Math.SQRT2;
      const s = clamp((diag / RI + 1) / 2);
      lay(0.4 - 0.25 * s, solid(r0 - RI));
      const lit = clamp((-diag / (r0 || 1) + 1) / 2);
      lay(0.35 + 0.5 * lit, solid(Math.max(r0 - RO, RI - r0)));
    }
    if (r0 < RI) {
      for (const G of gears) {
        const gx = x - G.cx, gy = y - G.cy, rg = Math.hypot(gx, gy);
        if (rg > G.R + 2) continue;
        let m = G.rin - rg;
        if (G.hub) m = Math.min(m, rg - G.hub);
        for (const [c, s] of G.spokeCS) {
          if (gx * c + gy * s > 0) m = Math.min(m, Math.abs(-gx * s + gy * c) - G.sw);
        }
        lay(G.tone, solid(Math.max(m, rg - G.R)));
      }
      if (x > 140 && x < 206 && y > 94 && y < 160) lay(0.8, solid(sdPolyline(x, y, bp) - BW));
      const bx = x - BX, by = y - BY, rb = Math.hypot(bx, by);
      if (rb < 19) {
        let m = Math.max(rb - 17, 13.5 - rb);
        const pr = bx * cb + by * sb;
        if (Math.abs(pr) < 14) m = Math.min(m, Math.abs(-bx * sb + by * cb) - 2.5);
        lay(0.7, solid(m));
      }
      const jd = rb - 3.5;
      if (jd < 10) {
        ink = Math.min(ink, 0.15);
        orange = clamp(solid(jd) + 0.7 * glow(jd, 4));
      }
    }
    return [ink, orange];
  });

  // Draw a polyline, skipping the parts hidden by `hide`.
  const runs = (pts, hide, stroke, opt = {}) => {
    let cur = [];
    const flush = () => { if (cur.length > 1) g.line(polyD(cur), stroke, opt); cur = []; };
    for (const p of pts) { if (hide(p)) flush(); else cur.push(p); }
    flush();
  };
  const seg = (a, b, n = 12) => {
    const out = [];
    for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * (i / n), a[1] + (b[1] - a[1]) * (i / n)]);
    return out;
  };

  // Case.
  g.line(circ(CX, CY, RO), "ink");
  g.line(circ(CX, CY, RI), "soft");
  // Bow and stem.
  const inStem = (p) => sdBox(p[0], p[1], 200, 68, 6, 4) < 0;
  runs(circlePts(200, 58, 11.5, 72), inStem, "ink");
  runs(circlePts(200, 58, 6.5, 48), inStem, "ink");
  g.box(194, 64, 12, 8, "ink");

  // Gears: outlines, then spoke structure.
  for (const G of gears) {
    runs(gearPts(G), underBridge, "soft");
    if (G.rin > 0) {
      runs(circlePts(G.cx, G.cy, G.rin, 48), underBridge, "faint");
      runs(circlePts(G.cx, G.cy, G.hub, 24), underBridge, "faint");
      for (const a of G.spokeAng) {
        const c = Math.cos(a), s = Math.sin(a);
        for (const side of [-1, 1]) {
          const ox = -s * G.sw * side, oy = c * G.sw * side;
          const h0 = Math.sqrt(Math.max(G.hub * G.hub - G.sw * G.sw, 0));
          const h1 = Math.sqrt(G.rin * G.rin - G.sw * G.sw);
          runs(seg([G.cx + c * h0 + ox, G.cy + s * h0 + oy], [G.cx + c * h1 + ox, G.cy + s * h1 + oy]), underBridge, "faint");
        }
      }
    } else {
      g.line(circ(G.cx, G.cy, 2), "faint");
      for (const a of G.spokeAng) {
        const p0 = pol(G.cx, G.cy, 2, a), p1 = pol(G.cx, G.cy, 5.5, a);
        g.line(`M${num(p0[0])} ${num(p0[1])}L${num(p1[0])} ${num(p1[1])}`, "faint");
      }
    }
  }

  // Gear-mesh path: barrel hub, through the train wheel, to the escape wheel.
  const mA = [184, 122], mC = [236, 93], mB = [232, 140], mesh = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, u = 1 - t;
    mesh.push([u * u * mA[0] + 2 * u * t * mC[0] + t * t * mB[0], u * u * mA[1] + 2 * u * t * mC[1] + t * t * mB[1]]);
  }
  runs(mesh, underBridge, "faint", { dash: "2 3" });

  // Bridge outline with round ends.
  const left = [], right = [];
  for (let i = 0; i < bp.length; i++) {
    const a = bp[Math.max(i - 1, 0)], b = bp[Math.min(i + 1, bp.length - 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
    left.push([bp[i][0] - ty * BW, bp[i][1] + tx * BW]);
    right.push([bp[i][0] + ty * BW, bp[i][1] - tx * BW]);
  }
  const cap = (p, from) => {
    const out = [];
    const a0 = Math.atan2(from[1] - p[1], from[0] - p[0]);
    for (let i = 1; i < 12; i++) out.push(pol(p[0], p[1], BW, a0 - (Math.PI * i) / 12));
    return out;
  };
  const outline = [
    ...left,
    ...cap(bp[bp.length - 1], left[left.length - 1]),
    ...right.slice().reverse(),
    ...cap(bp[0], right[0]),
  ];
  g.line(polyD(outline, true), "soft");
  for (const p of [bp[2], bp[bp.length - 3]]) g.line(circ(p[0], p[1], 1.8), "faint");

  // Balance wheel: rim, crossbar, hairspring.
  g.line(circ(BX, BY, 17), "ink");
  g.line(circ(BX, BY, 13.5), "ink");
  for (const side of [-1, 1]) {
    const ox = -sb * 2.5 * side, oy = cb * 2.5 * side;
    const e = Math.sqrt(13.5 * 13.5 - 6.25);
    g.line(`M${num(BX - cb * e + ox)} ${num(BY - sb * e + oy)}L${num(BX + cb * e + ox)} ${num(BY + sb * e + oy)}`, "faint");
  }
  const spring = [];
  const turns = 4, steps = turns * 56;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    spring.push(pol(BX, BY, 4.2 + (11 - 4.2) * t, springStart + t * turns * TAU));
  }
  g.line(polyD(spring), "soft", { width: 0.8 });
  const sEnd = spring[spring.length - 1];
  const sOut = pol(BX, BY, 13.5, springStart + turns * TAU);
  g.line(`M${num(sEnd[0])} ${num(sEnd[1])}L${num(sOut[0])} ${num(sOut[1])}`, "faint");

  // The jewel.
  g.line(circ(BX, BY, 3.5), "sig");
}
