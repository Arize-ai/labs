function draw(g, rand, seed, k) {
  // A fern frond with tapered pinnae, its fiddlehead unfurling in orange
  const { clamp, smooth, solid, glow, sdPolyline, polyD, makeNoise, X0, X1, Y0, Y1 } = k;
  const fbm = makeNoise(seed + 11);

  // The rachis: a quadratic arc rising from the ground and bending right.
  const jit = (a) => (rand() - 0.5) * a;
  const B = [145 + jit(8), 194], C = [176 + jit(10), 66 + jit(8)], T = [272 + jit(8), 84 + jit(8)];
  const at = (t) => {
    const u = 1 - t;
    return [u * u * B[0] + 2 * t * u * C[0] + t * t * T[0], u * u * B[1] + 2 * t * u * C[1] + t * t * T[1]];
  };
  const tan = (t) => {
    const dx = 2 * (1 - t) * (C[0] - B[0]) + 2 * t * (T[0] - C[0]);
    const dy = 2 * (1 - t) * (C[1] - B[1]) + 2 * t * (T[1] - C[1]);
    const l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  };
  const stem = Array.from({ length: 41 }, (_, i) => at(i / 40));

  // The fiddlehead: a spiral continuing the rachis, curling to its concave side.
  const [tx, ty] = tan(1);
  const ax = 2 * (B[0] - 2 * C[0] + T[0]), ay = 2 * (B[1] - 2 * C[1] + T[1]);
  const dot = ax * tx + ay * ty;
  let nx = ax - dot * tx, ny = ay - dot * ty;
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl; ny /= nl;
  const R = 9;
  const cc = [T[0] + nx * R, T[1] + ny * R];
  const a0 = Math.atan2(T[1] - cc[1], T[0] - cc[0]);
  const dir = tx * -Math.sin(a0) + ty * Math.cos(a0) > 0 ? 1 : -1;
  const spiral = Array.from({ length: 49 }, (_, i) => {
    const s = i / 48, r = R * (1 - 0.82 * s), a = a0 + dir * s * Math.PI * 2.4;
    return [cc[0] + r * Math.cos(a), cc[1] + r * Math.sin(a)];
  });

  // Pinnae: opposite pairs, shrinking and sweeping forward toward the tip.
  const pinnae = [];
  const nodes = 12 + Math.floor(rand() * 3);
  for (let i = 0; i < nodes; i++) {
    const t = 0.1 + (0.86 * i) / nodes;
    const p = at(t), [dx, dy] = tan(t);
    const L = 50 * Math.pow(1 - t, 0.85) + 5 + jit(4);
    const Wm = 4.6 * (1 - t) + 1.6;
    for (const side of [-1, 1]) {
      const a = side * (1.2 - 0.45 * t + jit(0.1));
      const ca = Math.cos(a), sa = Math.sin(a);
      const ex = dx * ca - dy * sa, ey = dx * sa + dy * ca;
      const off = side * 1.5;
      const A = [p[0] + dx * off, p[1] + dy * off];
      const E = [A[0] + ex * L, A[1] + ey * L];
      const pad = Wm + 8;
      pinnae.push({
        A, E, L, Wm,
        box: [Math.min(A[0], E[0]) - pad, Math.max(A[0], E[0]) + pad, Math.min(A[1], E[1]) - pad, Math.max(A[1], E[1]) + pad],
      });
    }
  }

  const pinnaD = (x, y, q) => {
    const ex = q.E[0] - q.A[0], ey = q.E[1] - q.A[1], wx = x - q.A[0], wy = y - q.A[1];
    const u = clamp((wx * ex + wy * ey) / (q.L * q.L));
    const d = Math.hypot(wx - ex * u, wy - ey * u);
    // Tapered blade with lobed pinnules along its length.
    const w = q.Wm * Math.pow(1 - u, 0.6) * smooth(clamp(u * 5)) * (0.68 + 0.32 * Math.abs(Math.cos((u * q.L * Math.PI) / 5))) + 0.4;
    return d - w;
  };

  const sb = [Math.min(...spiral.map((p) => p[0])) - 18, Math.max(...spiral.map((p) => p[0])) + 18, Math.min(...spiral.map((p) => p[1])) - 18, Math.max(...spiral.map((p) => p[1])) + 18];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Light from the upper left, and the frond thinning into the ground at its base.
    const shade = 1 - 0.28 * clamp((x - X0) / (X1 - X0) * 0.6 + (y - Y0) / (Y1 - Y0) * 0.4);
    const rise = 1 - 0.45 * smooth(clamp((y - 150) / 46));
    for (const q of pinnae) {
      const b = q.box;
      if (x < b[0] || x > b[1] || y < b[2] || y > b[3]) continue;
      const d = pinnaD(x, y, q);
      ink = Math.max(ink, solid(d) * 0.88 * shade * rise + 0.16 * glow(d, 5) * rise);
    }
    if (x > 120 && x < 300 && y > 50 && y < 205) {
      const sd = sdPolyline(x, y, stem) - 1.4;
      ink = Math.max(ink, solid(sd) * 0.8 * rise + 0.12 * glow(sd, 6));
    }
    ink = Math.max(0, ink + 0.06 * (fbm(x / 7, y / 7) - 0.5) * (ink > 0.05 ? 1 : 0));
    if (x > sb[0] && x < sb[1] && y > sb[2] && y < sb[3]) {
      const fd = sdPolyline(x, y, spiral) - 2;
      sig = solid(fd) + 0.38 * glow(fd, 6);
    }
    return [ink, sig];
  });

  // Structure: the rachis emerging from the ground, midribs, the unfurling tip.
  g.fadeLine(polyD(stem), "var(--fg)", 0.85, Y0, 204);
  for (const q of pinnae) {
    const m = [q.A[0] + (q.E[0] - q.A[0]) * 0.82, q.A[1] + (q.E[1] - q.A[1]) * 0.82];
    g.line(polyD([q.A, m]), q.A[1] > 165 ? "faint" : "soft");
  }
  g.line(polyD(spiral), "sig", { width: 1.25 });
  g.line(`M${X0 + 20} ${Y1 + 0.5}H${X1 - 20}`, "faint", { dash: "1 3" });
}
