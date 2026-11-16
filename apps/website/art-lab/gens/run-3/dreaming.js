function draw(g, rand, seed, k) {
  // A thought cloud rising from bubbles, holding a crescent moon and orange star
  const { clamp, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const j = (a) => (rand() - 0.5) * 2 * a;

  // The cloud: a smooth union of lobes.
  const lobes = [
    [192, 116, 25], [220, 92, 30], [258, 93, 26],
    [283, 115, 21], [252, 133, 23], [214, 134, 22],
  ].map(([x, y, r]) => [x + j(2), y + j(2), r + j(2)]);
  const smin = (a, b, kk) => {
    const h = clamp(0.5 + (0.5 * (b - a)) / kk);
    return b + (a - b) * h - kk * h * (1 - h);
  };
  const cloud = (x, y) => {
    let d = Infinity;
    for (const [cx, cy, r] of lobes) d = smin(d === Infinity ? 1e3 : d, Math.hypot(x - cx, y - cy) - r, 8);
    return d;
  };
  const bubbles = [[161, 162, 9], [140, 177, 6], [124, 188, 4]];
  const bubbleD = (x, y) => {
    let d = Infinity;
    for (const [cx, cy, r] of bubbles) d = Math.min(d, Math.hypot(x - cx, y - cy) - r);
    return d;
  };

  // Crescent moon: disc A cut by disc B toward the upper right.
  const A = [222, 112], R = 18;
  const ang = -Math.PI / 4 + j(0.25), off = 10;
  const B = [A[0] + off * Math.cos(ang), A[1] + off * Math.sin(ang)], r2 = 15;
  const moonD = (x, y) => Math.max(Math.hypot(x - A[0], y - A[1]) - R, -(Math.hypot(x - B[0], y - B[1]) - r2));

  // The dream: a four-point star in the cloud's upper right.
  const S = [258 + j(4), 98 + j(3)];
  const starD = (x, y) => {
    const dx = Math.abs(x - S[0]), dy = Math.abs(y - S[1]);
    return (Math.sqrt(dx) + Math.sqrt(dy)) ** 2 - 7;
  };

  g.print((x, y) => {
    if (x < 100 || x > 320 || y < 45 || y > 205) return 0;
    const ds = Math.min(cloud(x, y), bubbleD(x, y));
    // Lit from the upper left: the fill brightens toward its top-left.
    const shade = 1 - 0.4 * clamp((x - 150 + (y - 60)) / 220);
    const inside = solid(ds);
    let ink = inside * (0.28 + 0.08 * (fbm(x / 7, y / 7) - 0.5)) * shade + 0.13 * glow(ds, 7);
    if (Math.abs(x - A[0]) < 34 && Math.abs(y - A[1]) < 34) {
      const dm = moonD(x, y);
      const ms = 1 - 0.25 * clamp((x - A[0] + R + (y - A[1] + R)) / (3 * R));
      ink = Math.max(ink, solid(dm) * 0.92 * ms + 0.22 * glow(dm, 5) * inside);
    }
    let sig = 0;
    if (Math.abs(x - S[0]) < 22 && Math.abs(y - S[1]) < 22) {
      const sd = starD(x, y);
      sig = solid(sd) + 0.4 * glow(sd + 3, 5);
    }
    return [ink, sig];
  });

  // Cloud outline: march rays out from its centre to the zero contour.
  const C = [236, 113], outline = [];
  for (let n = 0; n < 160; n++) {
    const a = (n / 160) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    let lo = 0, hi = 0;
    for (let t = 0; t < 120; t += 1) {
      if (cloud(C[0] + ux * t, C[1] + uy * t) > 0) { hi = t; break; }
      lo = t;
    }
    for (let s = 0; s < 8; s++) {
      const m = (lo + hi) / 2;
      if (cloud(C[0] + ux * m, C[1] + uy * m) > 0) hi = m; else lo = m;
    }
    outline.push([C[0] + ux * lo, C[1] + uy * lo]);
  }
  g.line(polyD(outline, true), "ink", { width: 1.25 });

  const circle = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
  for (const [cx, cy, r] of bubbles) g.line(circle(cx, cy, r), "ink");

  // Crescent outline: outer arc of A, then inner arc of B back.
  const phi = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const aa = (R * R - r2 * r2 + off * off) / (2 * off);
  const alpha = Math.acos(clamp(aa / R, -1, 1));
  const pts = [];
  const N = 40;
  for (let n = 0; n <= N; n++) {
    const t = phi + alpha + ((2 * Math.PI - 2 * alpha) * n) / N;
    pts.push([A[0] + R * Math.cos(t), A[1] + R * Math.sin(t)]);
  }
  const P2 = pts[N], P1 = pts[0];
  const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v));
  const mid = phi + Math.PI;
  const d2 = wrap(Math.atan2(P2[1] - B[1], P2[0] - B[0]) - mid);
  const d1 = wrap(Math.atan2(P1[1] - B[1], P1[0] - B[0]) - mid);
  for (let n = 1; n < N; n++) {
    const t = mid + d2 + ((d1 - d2) * n) / N;
    pts.push([B[0] + r2 * Math.cos(t), B[1] + r2 * Math.sin(t)]);
  }
  g.line(polyD(pts, true), "ink");

  // A dotted guide rising from the sleeper's side up into the cloud.
  g.line(`M${num(112)} ${num(196)}L${num(124)} ${num(188)}`, "faint", { dash: "1 3" });
}
