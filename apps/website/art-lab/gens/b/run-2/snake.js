function draw(g, rand, seed, k) {
  // A single snake mid-glide in a long S-curve, field-guide side view
  const { clamp, smooth, solid, sdPolyline, inPolygon, polyD, num } = k;

  // Posture: each crest and trough wanders by up to ±8.
  const a1 = (rand() * 2 - 1) * 8, a2 = (rand() * 2 - 1) * 8, a3 = (rand() * 2 - 1) * 8;
  const dashF = 0.7 + rand() * 0.6;

  // Head frame: 34 × 20 oval at (292, 98), tilted 10° up to the right.
  const hc = [292, 98];
  const ca = Math.cos(10 * Math.PI / 180), sa = Math.sin(10 * Math.PI / 180);
  const hdir = [ca, -sa], hup = [-sa, -ca];
  const headAt = (u, v) => [hc[0] + u * hdir[0] + v * hup[0], hc[1] + u * hdir[1] + v * hup[1]];
  const head = [];
  for (let i = 0; i < 56; i++) {
    const th = (i / 56) * Math.PI * 2;
    const u = 17 * Math.cos(th);
    const b = 10 * (1 - 0.15 * u / 17); // slightly wider at the jaw: a wedge
    head.push(headAt(u, b * Math.sin(th)));
  }
  const snout = headAt(17, 0);
  const crown = headAt(-3, 5);

  // Spine through the brief's stations, ending just inside the back of the head.
  const neckEnd = headAt(-15, 0);
  const C = [[92, 176], [150, 120 + a1], [215, 162 + a2], [262, 108 + a3], neckEnd];
  const pre = [2 * C[0][0] - C[1][0], 2 * C[0][1] - C[1][1]];
  const post = [neckEnd[0] + hdir[0] * 15, neckEnd[1] + hdir[1] * 15];
  const CP = [pre, ...C, post];
  const S = [];
  const N = 30;
  for (let i = 1; i < CP.length - 2; i++) {
    const p0 = CP[i - 1], p1 = CP[i], p2 = CP[i + 1], p3 = CP[i + 2];
    for (let j = 0; j < N; j++) {
      const t = j / N, t2 = t * t, t3 = t2 * t;
      const f = c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
      S.push([f(0), f(1)]);
    }
  }
  S.push(neckEnd);
  const M = S.length;
  const cum = [0], seg = [], tan = [];
  for (let i = 0; i < M - 1; i++) {
    const ex = S[i + 1][0] - S[i][0], ey = S[i + 1][1] - S[i][1];
    const l = Math.hypot(ex, ey) || 1e-6;
    seg.push(l); tan.push([ex / l, ey / l]);
    cum.push(cum[i] + l);
  }
  tan.push(tan[M - 2]);
  const L = cum[M - 1], sT = cum[2 * N];

  // Thickness: a fine point, swelling to 22 at the trough, 16 at the neck.
  const hw = s => {
    const w = s < sT ? 4 + 18 * smooth(s / sT) : 22 - 6 * smooth((s - sT) / (L - sT));
    return Math.max(0.3, 0.5 * w * Math.min(1, Math.sqrt(s / 14)));
  };

  const bodyAt = (x, y) => {
    let best = 1e12, bi = 0, bt = 0;
    for (let i = 0; i < M - 1; i++) {
      const ax = S[i][0], ay = S[i][1];
      const ex = S[i + 1][0] - ax, ey = S[i + 1][1] - ay;
      let t = ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - ax - ex * t, dy = y - ay - ey * t;
      const dd = dx * dx + dy * dy;
      if (dd < best) { best = dd; bi = i; bt = t; }
    }
    const s = cum[bi] + bt * seg[bi];
    const [tx, ty] = tan[bi];
    const nx = ty, ny = -tx; // up-side normal
    const px = S[bi][0] + (S[bi + 1][0] - S[bi][0]) * bt;
    const py = S[bi][1] + (S[bi + 1][1] - S[bi][1]) * bt;
    const h = hw(s);
    const o = (x - px) * nx + (y - py) * ny;
    return { d: Math.sqrt(best) - h, v: o / h, s, nx, ny };
  };

  // Light from the upper left, a little toward the viewer.
  const Lx = -0.42, Ly = -0.85, Lz = 0.32;

  g.print((x, y) => {
    if (x < 82 || x > 330 || y < 70 || y > 200) return 0;
    let ink = 0;
    const B = bodyAt(x, y);
    if (B.d < 2) {
      const v = clamp(B.v, -1, 1);
      const lam = B.nx * v * Lx + B.ny * v * Ly + Math.sqrt(1 - v * v) * Lz;
      let tone = 0.4 + 0.5 * clamp((lam + 0.85) / 1.7);
      tone = 0.3 + (tone - 0.3) * smooth(clamp(B.s / 25));
      ink = tone * solid(B.d);
    }
    let dH = 99;
    if (Math.hypot(x - hc[0], y - hc[1]) < 34) {
      const dd = sdPolyline(x, y, head);
      dH = inPolygon(x, y, head) ? -dd : dd;
      const tone = 0.7 + 0.3 * clamp(1 - Math.hypot(x - crown[0], y - crown[1]) / 16);
      ink = Math.max(ink, tone * solid(dH));
      if (dH > 0 && dH < 10) ink = Math.max(ink, 0.25 * (1 - dH / 10));
      // The eye: a pinprick hole, wide enough to catch the lattice.
      const e = Math.hypot(x - 300, y - 93) - 3;
      if (e < 1.5) ink *= clamp(e / 1.5);
    }
    // Ground shadow: kept dark beneath the body.
    if (B.d > 0.5 && dH > 0) {
      const Sh = bodyAt(x - 6, y - 6);
      if (Sh.v < 0 && Sh.d > -2 && Sh.d < 8) ink = 0;
    }
    return ink;
  });

  // Edges, clipped where they enter the head.
  const upper = [], lower = [], belly = [], spine = [];
  let upOpen = true, loOpen = true, beOpen = true, spOpen = true;
  for (let i = 0; i < M; i++) {
    const [qx, qy] = S[i];
    const [tx, ty] = tan[i];
    const nx = ty, ny = -tx;
    const h = hw(cum[i]);
    const u = [qx + nx * h, qy + ny * h], lo = [qx - nx * h, qy - ny * h];
    if (upOpen) { upper.push(u); if (inPolygon(u[0], u[1], head)) upOpen = false; }
    if (loOpen) { lower.push(lo); if (inPolygon(lo[0], lo[1], head)) loOpen = false; }
    if (cum[i] > 18 && h > 5 && beOpen) {
      const b = [qx - nx * (h - 4), qy - ny * (h - 4)];
      if (inPolygon(b[0], b[1], head)) beOpen = false; else belly.push(b);
    }
    if (cum[i] > 22 && spOpen) {
      const sp = [qx + nx * h * 0.55, qy + ny * h * 0.55];
      if (Math.hypot(sp[0] - hc[0], sp[1] - hc[1]) < 20) spOpen = false; else spine.push(sp);
    }
  }
  g.line(polyD([...lower.slice().reverse(), ...upper]), "ink");
  g.line(polyD(head, true), "ink");
  if (belly.length > 1) g.line(polyD(belly), "soft");
  if (spine.length > 1) g.line(polyD(spine), "faint", { width: 1.5, dash: `${num(4 * dashF)} ${num(3.5 * dashF)}` });

  // Ground line.
  g.line(`M110 186.5H300`, "faint");

  // The forked tongue: the only orange.
  const fork = [snout[0] + hdir[0] * 8, snout[1] + hdir[1] * 8];
  const prong = sgn => {
    const a = Math.atan2(hdir[1], hdir[0]) + sgn * 22 * Math.PI / 180;
    return [fork[0] + Math.cos(a) * 6, fork[1] + Math.sin(a) * 6];
  };
  const p1 = prong(1), p2 = prong(-1);
  g.line(
    `M${num(snout[0])} ${num(snout[1])}L${num(fork[0])} ${num(fork[1])}` +
    `M${num(fork[0])} ${num(fork[1])}L${num(p1[0])} ${num(p1[1])}` +
    `M${num(fork[0])} ${num(fork[1])}L${num(p2[0])} ${num(p2[1])}`,
    "sig", { width: 1.2 }
  );
}
