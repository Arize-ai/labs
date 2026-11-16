function draw(g, rand, seed, k) {
  // A binary star pair, the smaller pouring light into the larger
  const { clamp, solid, glow, sdPolyline, polyD, num } = k;

  // Barycentre and the tilted orbital frame (6° clockwise, y-down).
  const bx = 192, by = 124;
  const th = (6 * Math.PI) / 180, ct = Math.cos(th), st = Math.sin(th);
  const rot = (px, py) => [bx + px * ct - py * st, by + px * st + py * ct];

  // Orbital phase, varied by up to ±25°; both stars ride their ellipses on opposite sides.
  const t = (rand() * 2 - 1) * (25 * Math.PI / 180);
  const ca = Math.cos(t), sa = Math.sin(t);
  const [ax, ay] = rot(-32 * ca, -10 * sa);
  const [qx, qy] = rot(56 * ca, 18 * sa);
  const rA = 28, rB = 18;
  const glowA = 62, glowB = 40;

  // Highlights, upper left of each disc.
  const hAx = ax - 9, hAy = ay - 9, spanA = rA + Math.hypot(9, 9);
  const hBx = qx - 6, hBy = qy - 6, spanB = rB + Math.hypot(6, 6);

  // Mass-transfer stream: from B's inner limb, bowing upward, onto A's right limb.
  const phiBA = Math.atan2(ay - qy, ax - qx);
  const phiAB = Math.atan2(qy - ay, qx - ax);
  const aS = phiBA + 0.12;
  const S = [qx + rB * Math.cos(aS), qy + rB * Math.sin(aS)];
  const aE = phiAB - 0.3, rE = rA + 2.5;
  const E = [ax + rE * Math.cos(aE), ay + rE * Math.sin(aE)];
  const cxv = E[0] - S[0], cyv = E[1] - S[1], cl = Math.hypot(cxv, cyv);
  const nUp = [-cyv / cl, cxv / cl];
  const C = [(S[0] + E[0]) / 2 + nUp[0] * 13, (S[1] + E[1]) / 2 + nUp[1] * 13];
  const stream = [];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28, v = 1 - u;
    stream.push([v * v * S[0] + 2 * u * v * C[0] + u * u * E[0], v * v * S[1] + 2 * u * v * C[1] + u * u * E[1]]);
  }
  // The partial ring: a quarter turn up over A's shoulder, tightening and thinning.
  const ringR = (s) => rA + 2.5 - 1.5 * s;
  const ringHW = (s) => 2.0 - 0.7 * s;
  const ring = [];
  for (let i = 0; i <= 18; i++) {
    const s = i / 18, ang = aE - s * Math.PI / 2;
    ring.push([ax + ringR(s) * Math.cos(ang), ay + ringR(s) * Math.sin(ang)]);
  }
  const TAU = Math.PI * 2;
  const wrap = (a) => ((a % TAU) + TAU * 1.5) % TAU - Math.PI;

  // Pinprick background stars, sparse, well clear of both glows.
  const pins = [];
  for (let tries = 0; tries < 400 && pins.length < 6; tries++) {
    const px = 100 + rand() * 200, py = 70 + rand() * 110;
    if (Math.hypot(px - ax, py - ay) < glowA + 8) continue;
    if (Math.hypot(px - qx, py - qy) < glowB + 8) continue;
    if (pins.some((p) => Math.hypot(p.x - px, p.y - py) < 28)) continue;
    pins.push({ x: px, y: py, tone: 0.4 + rand() * 0.15, done: false });
  }

  g.print((x, y) => {
    // Background stars: exactly one dot each (first lattice point within reach).
    for (const p of pins) {
      if (Math.abs(x - p.x) < 3.3 && Math.abs(y - p.y) < 3.3 && Math.hypot(x - p.x, y - p.y) < 3.3) {
        if (p.done) return 0;
        p.done = true;
        return p.tone;
      }
    }
    if (x < ax - glowA - 2 || x > qx + glowB + 2 || y < Math.min(ay - glowA, qy - glowB) - 2 || y > Math.max(ay + glowA, qy + glowB) + 2) return 0;

    const dA = Math.hypot(x - ax, y - ay), dB = Math.hypot(x - qx, y - qy);
    let ink = 0;

    // Glows, linear falloff, plus a bridge where they overlap.
    const gaN = clamp(1 - (dA - rA) / (glowA - rA));
    const gbN = clamp(1 - (dB - rB) / (glowB - rB));
    const halo = 0.45 * gaN + 0.35 * gbN + 0.45 * Math.sqrt(gaN * gbN);

    // Sphere shading.
    const shadeA = 1 - 0.25 * clamp(Math.hypot(x - hAx, y - hAy) / spanA);
    const shadeB = 0.85 - 0.25 * clamp(Math.hypot(x - hBx, y - hBy) / spanB);
    const inA = solid(dA - rA), inB = solid(dB - rB);
    ink = Math.max(halo * (1 - Math.max(inA, inB)), shadeA * inA, shadeB * inB);

    // Stream, in orange.
    let org = 0;
    const ds = sdPolyline(x, y, stream) - 2.1;
    org = Math.max(solid(ds), 0.35 * glow(Math.max(ds, 0), 2.5));
    const ang = Math.atan2(y - ay, x - ax);
    const s = clamp(wrap(aE - ang) / (Math.PI / 2));
    const ra = aE - s * Math.PI / 2;
    const dr = Math.hypot(x - (ax + ringR(s) * Math.cos(ra)), y - (ay + ringR(s) * Math.sin(ra))) - ringHW(s);
    org = Math.max(org, solid(dr));

    return [ink, org];
  });

  // Orbit ellipses, faint and dashed.
  const ellipse = (a, b) => {
    const pts = [];
    for (let i = 0; i < 96; i++) {
      const u = (i / 96) * TAU;
      pts.push(rot(a * Math.cos(u), b * Math.sin(u)));
    }
    return polyD(pts, true);
  };
  g.line(ellipse(32, 10), "faint", { dash: "3 3" });
  g.line(ellipse(56, 18), "faint", { dash: "3 3" });

  // Limb outlines.
  const circle = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 0 ${num(cx + r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 0 ${num(cx - r)} ${num(cy)}Z`;
  g.line(circle(ax, ay, rA), "soft");
  g.line(circle(qx, qy, rB), "soft");

  // Barycentre cross.
  g.line(`M${num(bx - 4)} ${num(by)}H${num(bx + 4)}M${num(bx)} ${num(by - 4)}V${num(by + 4)}`, "faint");

  // The stream's spine, full orange, so the gesture survives at thumbnail size.
  g.line(polyD(stream.concat(ring.slice(1))), "sig", { width: 1.2 });
}
