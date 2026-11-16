function draw(g, rand, seed, k) {
  // A sitting cat silhouetted against a full moon, eyes lit
  const { clamp, solid, glow, inPolygon, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);
  const D = Math.PI / 180;
  const mcx = 200, mcy = 118, mr = 62, horizon = 180;
  const hcx = 200, hcy = 96, hr = 19;

  // Variation
  const tilt = (rand() * 2 - 1) * 8 * D;
  const cv = (rand() * 2 - 1) * 10; // curl angle (sideways shift of the hook)
  const hv = (rand() * 2 - 1) * 10; // hook height
  const hot = [175 + (rand() * 2 - 1) * 6, 95 + (rand() * 2 - 1) * 6];

  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const rot = ([x, y]) => [hcx + (x - hcx) * ct - (y - hcy) * st, hcy + (x - hcx) * st + (y - hcy) * ct];
  const headPt = (deg) => rot([hcx + hr * Math.sin(deg * D), hcy - hr * Math.cos(deg * D)]);

  // Body half-width as a seated teardrop: 22 at the shoulders, 36 at the base.
  const bodyW = (y) => {
    const t = clamp((y - 112) / 68);
    return 22 + 14 * t + 4 * Math.sin(Math.PI * t);
  };

  // Tail centreline via Catmull-Rom through control points.
  const ctrl = [
    [234, 176], [246, 178.4], [256, 178.6], [263, 177],
    [268 + cv * 0.4, 173 + hv * 0.3], [270.5 + cv * 0.8, 167 + hv * 0.7],
    [270 + cv, 162 + hv], [267 + cv, 158.5 + hv], [264 + cv, 159 + hv],
  ];
  const tail = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(i - 1, 0)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(i + 2, ctrl.length - 1)];
    for (let s = 0; s < 5; s++) {
      const t = s / 5, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      tail.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  tail.push(ctrl[ctrl.length - 1]);
  const upperEdge = [], lowerEdge = [];
  for (let i = 0; i < tail.length; i++) {
    const a = tail[Math.max(i - 1, 0)], b = tail[Math.min(i + 1, tail.length - 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const w = 3 - 1.2 * (i / (tail.length - 1));
    const nx = dy, ny = -dx; // left normal: up when heading right
    upperEdge.push([tail[i][0] + nx * w, tail[i][1] + ny * w]);
    lowerEdge.push([tail[i][0] - nx * w, tail[i][1] - ny * w]);
  }

  // One continuous contour: left body, head with ears, right body, tail, base.
  const cat = [];
  for (let y = horizon; y >= 112; y -= 4) cat.push([200 - bodyW(y), y]);
  const angles = [];
  for (let a = -122; a < -58; a += 6) angles.push(a);
  angles.push(-58, "L");
  for (let a = -14; a <= 14; a += 7) angles.push(a);
  angles.push(58, "R");
  angles.splice(angles.indexOf(58), 0); // keep order
  const headSeq = [];
  for (let a = -122; a < -58; a += 6) headSeq.push(headPt(a));
  headSeq.push(headPt(-58), rot([185, 70]), headPt(-14));
  for (let a = -7; a <= 7; a += 7) headSeq.push(headPt(a));
  headSeq.push(headPt(14), rot([215, 70]), headPt(58));
  for (let a = 64; a <= 122; a += 6) headSeq.push(headPt(a));
  cat.push(...headSeq);
  for (let y = 112; y <= 172; y += 4) cat.push([200 + bodyW(y), y]);
  cat.push(...upperEdge);
  for (let i = lowerEdge.length - 1; i >= 0; i--) cat.push(lowerEdge[i]);
  cat.push([200 + bodyW(horizon), horizon]);

  const inCat = (x, y) => x > 150 && x < 290 && y > 60 && y < 185 && inPolygon(x, y, cat);

  // Eyes, enlarged slightly in light so at least a dot lands in each.
  const eyes = [rot([192, 95]), rot([208, 95])];
  const eyeD = (x, y, e) => {
    const dx = x - e[0], dy = y - e[1];
    const u = dx * ct + dy * st, v = -dx * st + dy * ct;
    return (Math.hypot(u / 3.6, v / 2.4) - 1) * 2.4;
  };

  g.print((x, y) => {
    if (x < 96 || x > 304) return 0;
    if (inCat(x, y)) {
      let ink = 0;
      if (y < 138 && !inPolygon(x - 3.5, y - 3.5, cat) && Math.hypot(x - 3.5 - mcx, y - 3.5 - mcy) < mr + 6) ink = 0.4;
      let or = 0;
      for (const e of eyes) {
        const d = eyeD(x, y, e);
        or = Math.max(or, solid(d), 0.3 * glow(Math.max(d, 0), 1.5) * (d < 4 ? 1 : 0));
      }
      if (or > 0.05) ink = 0;
      return [ink, or];
    }
    if (y > horizon) return 0.08;
    const dc = Math.hypot(x - mcx, y - mcy);
    const dm = dc - mr;
    if (dm <= 0) {
      return 1.0 - 0.3 * clamp(Math.hypot(x - hot[0], y - hot[1]) / 96) + 0.05 * (fbm(x / 9, y / 9) - 0.5);
    }
    if (dm < 28) {
      const ux = (x - mcx) / dc, uy = (y - mcy) / dc;
      const ul = (-ux - uy) / Math.SQRT2;
      return 0.35 * (0.55 + 0.45 * ul) * Math.exp(-dm / 9) * (1 - dm / 28);
    }
    return 0;
  });

  // Moon edge: half strength, broken where the cat stands in front of it.
  let seg = [];
  const flush = () => { if (seg.length > 1) g.line(polyD(seg), "soft"); seg = []; };
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * 2 * Math.PI - Math.PI / 2;
    const p = [mcx + mr * Math.cos(a), mcy + mr * Math.sin(a)];
    if (inPolygon(p[0], p[1], cat) || p[1] > horizon) flush();
    else seg.push(p);
  }
  flush();

  // Maria: short faint arcs, away from the cat.
  const maria = [
    [162, 84, 9, 200, 320], [234, 80, 8, 210, 330], [158, 140, 11, 170, 290], [240, 132, 7, 190, 300],
  ];
  for (const [mx, my, r, a0, a1] of maria.slice(0, 3 + (rand() < 0.5 ? 1 : 0))) {
    const ox = mx + (rand() * 2 - 1) * 4, oy = my + (rand() * 2 - 1) * 4;
    const pts = [];
    for (let a = a0; a <= a1; a += 10) pts.push([ox + r * Math.cos(a * D), oy + r * Math.sin(a * D)]);
    g.line(polyD(pts), "faint");
  }

  // Horizon, interrupted by the body and tail.
  const tailEnd = Math.max(...lowerEdge.filter((p) => p[1] > 174).map((p) => p[0]), 266) + 3;
  g.line(`M96 ${horizon + 0.5}H${num(200 - bodyW(horizon))}`, "soft");
  g.line(`M${num(tailEnd)} ${horizon + 0.5}H304`, "soft");

  // Cat outline, one contour.
  g.line(polyD(cat, true), "ink", { width: 1.2 });

  // Eyes: orange almonds with dark slit pupils.
  for (const e of eyes) {
    const pts = [];
    for (let u = -3; u <= 3.001; u += 0.75) pts.push([u, -1.75 * (1 - (u / 3) ** 2)]);
    for (let u = 3; u >= -3.001; u -= 0.75) pts.push([u, 1.75 * (1 - (u / 3) ** 2)]);
    const w = pts.map(([u, v]) => [e[0] + u * ct - v * st, e[1] + u * st + v * ct]);
    g.line(polyD(w, true), "sig");
    const p0 = [e[0] + 1.6 * st, e[1] - 1.6 * ct], p1 = [e[0] - 1.6 * st, e[1] + 1.6 * ct];
    g.line(`M${num(p0[0])} ${num(p0[1])}L${num(p1[0])} ${num(p1[1])}`, "ink", { width: 1 });
  }
}
