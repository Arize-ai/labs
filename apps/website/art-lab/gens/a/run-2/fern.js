function draw(g, rand, seed, k) {
  // A fern frond arching up, its unfurling fiddlehead in orange
  const { clamp, smooth, solid, glow, sdPolyline, polyD, num } = k;

  // The rachis: a cubic arching from the base up and to the right.
  const P0 = [138 + rand() * 8, 200];
  const P1 = [126 + rand() * 10, 138];
  const P2 = [184 + rand() * 12, 68 + rand() * 8];
  const P3 = [262 + rand() * 8, 78 + rand() * 6];
  const bez = (t) => {
    const u = 1 - t;
    return [
      u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
      u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
    ];
  };
  const tan = (t) => {
    const a = bez(Math.max(0, t - 0.005)), b = bez(Math.min(1, t + 0.005));
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const rachis = Array.from({ length: 61 }, (_, i) => bez(i / 60));

  // The fiddlehead: the rachis carries on and curls under, tightening.
  const coil = [P3.slice()];
  {
    const T = tan(1);
    let h = Math.atan2(T[1], T[0]), r = 12, p = P3.slice();
    for (let i = 0; i < 50; i++) {
      const ds = 0.25 * r;
      h += 0.25;
      p = [p[0] + ds * Math.cos(h), p[1] + ds * Math.sin(h)];
      coil.push(p);
      r *= 0.96;
    }
  }
  const cx0 = Math.min(...coil.map((p) => p[0])) - 16, cx1 = Math.max(...coil.map((p) => p[0])) + 16;
  const cy0 = Math.min(...coil.map((p) => p[1])) - 16, cy1 = Math.max(...coil.map((p) => p[1])) + 16;

  // Pinnae: alternating leaflets, longest in the lower third, tapering to the tip.
  const N = 12 + Math.floor(rand() * 3);
  const ang = ((56 + rand() * 8) * Math.PI) / 180;
  const first = rand() < 0.5 ? 1 : -1;
  const pinnae = [];
  for (let i = 0; i < N; i++) {
    const side = i % 2 === 0 ? first : -first;
    const t = 0.13 + (0.8 * i) / (N - 1) + (side > 0 ? 0 : 0.018);
    const A = bez(t), T = tan(t), n = [T[1], -T[0]];
    const L = 40 * Math.pow(1 - t, 0.9) * (0.55 + 0.45 * smooth(clamp(t / 0.35)));
    const dir = [T[0] * Math.cos(ang) + side * n[0] * Math.sin(ang), T[1] * Math.cos(ang) + side * n[1] * Math.sin(ang)];
    const B = [A[0] + dir[0] * L, A[1] + dir[1] * L];
    const w = Math.max(1.6, L * 0.16);
    const m = w + 14;
    pinnae.push({
      A, B, L, w, dir,
      tone: side > 0 ? 0.9 : 0.62,
      bb: [Math.min(A[0], B[0]) - m, Math.max(A[0], B[0]) + m, Math.min(A[1], B[1]) - m, Math.max(A[1], B[1]) + m],
    });
  }

  g.print((x, y) => {
    let ink = 0, sig = 0;
    for (const p of pinnae) {
      const [x0, x1, y0, y1] = p.bb;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const wx = x - p.A[0], wy = y - p.A[1];
      const s = clamp((wx * p.dir[0] + wy * p.dir[1]) / p.L);
      const d = Math.hypot(wx - p.dir[0] * p.L * s, wy - p.dir[1] * p.L * s) - p.w * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * s)), 0.6);
      // Lit from the rachis outward and from the upper left.
      ink = Math.max(ink, solid(d) * p.tone * (1 - 0.2 * s) + 0.16 * glow(d, 5));
    }
    ink = Math.max(ink, 0.3 * glow(sdPolyline(x, y, rachis), 3));
    if (x > cx0 && x < cx1 && y > cy0 && y < cy1) {
      const cd = sdPolyline(x, y, coil);
      sig = solid(cd - 1.6) + 0.4 * glow(cd, 6);
    }
    return [ink, sig];
  });

  // Structure: the stem emerging from the ground, the rachis, midribs, the coil.
  const split = 9;
  g.fadeLine(polyD(rachis.slice(0, split + 1)), "var(--fg)", 0.85, rachis[split][1] - 12, P0[1] + 2);
  g.line(polyD(rachis.slice(split)), "ink", { width: 1.5 });
  for (const p of pinnae) {
    g.line(polyD([p.A, [p.A[0] + p.dir[0] * p.L * 0.85, p.A[1] + p.dir[1] * p.L * 0.85]]), "soft");
  }
  g.line(polyD(coil), "sig", { width: 1.5 });
  g.line(`M${k.X0} ${num(P0[1]) + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
}
