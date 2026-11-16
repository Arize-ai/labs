function draw(g, rand, seed, k) {
  // A single fern frond uncurling into a fiddlehead spiral
  const { clamp, smooth, solid, sdPolyline, polyD } = k;
  const D = Math.PI / 180, TAU = Math.PI * 2;
  const jit = (a) => (rand() * 2 - 1) * a;

  // The crozier: a spiral of 1.75 turns, radius 24 shrinking to 4.
  const cx = 258, cy = 84, R0 = 24, R1 = 4, TURNS = 1.75;
  const th0 = (200 + jit(20)) * D;
  const rate = (R0 - R1) / (TURNS * TAU);
  const bandHw = (t) => 3.4 - 1.1 * t;
  const NS = 110;
  const coil = [];
  for (let j = 0; j <= NS; j++) {
    const t = j / NS, th = th0 + t * TURNS * TAU, r = R0 - (R0 - R1) * t;
    coil.push([cx + r * Math.cos(th), cy + r * Math.sin(th), t, th, r]);
  }
  const coilPts = coil.map((p) => [p[0], p[1]]);
  const S = coilPts[0];
  let tx = coilPts[1][0] - S[0], ty = coilPts[1][1] - S[1];
  const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;

  // The midrib: a Catmull-Rom curve through the brief's points, arriving tangent to the coil.
  const P0 = [150, 192], P1 = [185, 145], P2 = [225, 100];
  const span = Math.hypot(S[0] - P2[0], S[1] - P2[1]);
  const C = [[2 * P0[0] - P1[0], 2 * P0[1] - P1[1]], P0, P1, P2, S, [P2[0] + 2 * span * tx, P2[1] + 2 * span * ty]];
  const stem = [];
  for (let i = 1; i <= 3; i++) {
    const p0 = C[i - 1], p1 = C[i], p2 = C[i + 1], p3 = C[i + 2];
    for (let j = i === 1 ? 0 : 1; j <= 16; j++) {
      const u = j / 16, u2 = u * u, u3 = u2 * u;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      stem.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const cum = [0];
  for (let j = 1; j < stem.length; j++) cum.push(cum[j - 1] + Math.hypot(stem[j][0] - stem[j - 1][0], stem[j][1] - stem[j - 1][1]));
  const stemLen = cum[cum.length - 1];
  const at = (s) => {
    let j = 1;
    while (j < stem.length - 1 && cum[j] < s) j++;
    const a = stem[j - 1], b = stem[j], u = clamp((s - cum[j - 1]) / (cum[j] - cum[j - 1]));
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return [a[0] + dx * u, a[1] + dy * u, Math.atan2(dy, dx)];
  };

  // Pinnae: lanceolate blades, the lowest six scalloped into pinnules; the last three curled stubs.
  const prof = (f) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(0.06 + 0.94 * f, 0.7))), 0.8);
  const hwAt = (P, f) => {
    let h = (P.w / 2) * prof(f);
    if (P.lobes) {
      const m = smooth(clamp((0.9 - f) / 0.2)) * smooth(clamp(f / 0.08));
      h *= 1 - m * 0.38 * (1 - Math.abs(Math.sin(P.lobes * Math.PI * f)));
    }
    return h;
  };
  const pinnae = [];
  for (let i = 0; i < 22; i++) {
    const prog = i / 21, side = i % 2 ? 1 : -1, stub = i >= 19;
    const [bx, by, ta] = at(14 + (stemLen - 30) * prog);
    const ang = ta + side * ((stub ? 28 : 50) + jit(6)) * D;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    let nx = -uy, ny = ux;
    if (nx + ny > 0) { nx = -nx; ny = -ny; } // normal toward the upper-left edge
    const L = (46 - 34 * prog) * (1 + jit(0.1)), w = 9 - 6 * prog;
    const P = { bx, by, ux, uy, nx, ny, L, w, tone: 0.5 + 0.25 * prog, lobes: i < 6 ? Math.round(clamp(L / 6.2, 5, 7)) : 0 };
    if (stub) {
      const n = 14, step = L / n, curl = [[bx, by]], heads = [ang];
      let h = ang, px = bx, py = by;
      for (let j = 1; j <= n; j++) {
        h += side * 240 * D * ((2 * j) / (n * (n + 1)));
        px += Math.cos(h) * step; py += Math.sin(h) * step;
        curl.push([px, py]); heads.push(h);
      }
      const a = [], b = [];
      curl.forEach((p, j) => {
        const hw = (w / 2) * (1 - 0.75 * (j / n)), qx = -Math.sin(heads[j]), qy = Math.cos(heads[j]);
        a.push([p[0] + qx * hw, p[1] + qy * hw]); b.push([p[0] - qx * hw, p[1] - qy * hw]);
      });
      P.curl = curl; P.outline = a.concat(b.reverse()); P.vein = curl;
    } else {
      const a = [], b = [];
      for (let j = 0; j <= 40; j++) {
        const f = j / 40, h = hwAt(P, f), ax = bx + ux * f * L, ay = by + uy * f * L;
        a.push([ax + nx * h, ay + ny * h]); b.push([ax - nx * h, ay - ny * h]);
      }
      P.outline = a.concat(b.reverse());
      P.vein = [[bx, by], [bx + ux * L * 0.92, by + uy * L * 0.92]];
    }
    P.x0 = Math.min(...P.outline.map((p) => p[0])) - 3; P.x1 = Math.max(...P.outline.map((p) => p[0])) + 3;
    P.y0 = Math.min(...P.outline.map((p) => p[1])) - 3; P.y1 = Math.max(...P.outline.map((p) => p[1])) + 3;
    pinnae.push(P);
  }

  g.print((x, y) => {
    if (x < 70 || x > 325 || y < 20 || y > 205) return 0;
    let ink = 0, org = 0;
    // Midrib, fading out over its bottom 10 units.
    if (x > 135 && x < 250 && y > 65) {
      const d = sdPolyline(x, y, stem) - 2.5;
      if (d < 3) ink = solid(d) * (y > 182 ? 0.5 * clamp((192 - y) / 10) : 0.6);
    }
    // Pinnae, folded along the vein: bright upper-left edge, dim lower-right.
    for (const P of pinnae) {
      if (x < P.x0 || x > P.x1 || y < P.y0 || y > P.y1) continue;
      let v;
      if (P.curl) {
        v = solid(sdPolyline(x, y, P.curl) - 2.4) * (P.tone + 0.05);
      } else {
        const dx = x - P.bx, dy = y - P.by;
        const a = dx * P.ux + dy * P.uy;
        if (a < -2 || a > P.L + 2) continue;
        const c = dx * P.nx + dy * P.ny;
        const hl = Math.max(hwAt(P, clamp(a / P.L)), 2.4);
        v = solid(Math.max(Math.abs(c) - hl, a - P.L, -a)) * clamp(P.tone + 0.175 * clamp(c / hl, -1, 1));
      }
      if (v > ink) ink = v;
    }
    // The crozier: a bright coiled band in a soft halo, the last half-turn and core in orange.
    const rr = Math.hypot(x - cx, y - cy);
    if (rr < 56) {
      ink = Math.max(ink, 0.4 * smooth(clamp((55 - rr) / 29)));
      if (rr < 30) {
        let best = 1e9, bt = 0;
        for (let j = 1; j <= NS; j++) {
          const a = coil[j - 1], b = coil[j], ex = b[0] - a[0], ey = b[1] - a[1];
          const u = clamp(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey));
          const d = Math.hypot(x - a[0] - ex * u, y - a[1] - ey * u);
          if (d < best) { best = d; bt = a[2] + (b[2] - a[2]) * u; }
        }
        const band = solid(best - Math.max(bandHw(bt), 2.4));
        ink = Math.max(ink, 0.9 * band);
        if (bt > 1 - 0.5 / TURNS) org = band;
        org = Math.max(org, solid(rr - 4));
      }
    }
    return [ink, org];
  });

  // Pinna outlines and veins.
  for (const P of pinnae) {
    g.line(polyD(P.outline, true), "soft");
    g.line(polyD(P.vein), "faint");
  }
  // Midrib from base into the coil's centre, its foot fading away.
  const k10 = Math.max(1, cum.findIndex((c) => c >= 10));
  g.fadeLine(polyD(stem.slice(0, k10 + 1)), "var(--fg)", 1, 183, 192);
  g.line(polyD(stem.slice(k10).concat(coilPts.slice(1))), "ink");
  // The coil's outer edge, doubled.
  g.line(polyD(coil.map((p) => {
    const r = p[4] + bandHw(p[2]);
    return [cx + r * Math.cos(p[3]), cy + r * Math.sin(p[3])];
  })), "soft");
  // A quarter-turn further out, dashed: where it will unroll.
  const ext = [];
  for (let j = 0; j <= 14; j++) {
    const phi = (j / 14) * (Math.PI / 2), th = th0 - phi, r = R0 + rate * phi + bandHw(0);
    ext.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  g.line(polyD(ext), "faint", { dash: "4 3" });
}
