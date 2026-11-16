function draw(g, rand, seed, k) {
  // Floating lanterns drifting down a winding night river
  const { clamp, smooth, solid, glow, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);

  // Centreline: Catmull-Rom through the brief's points, with ghost ends.
  const pts = [[200, 70], [168, 104], [226, 146], [196, 194]];
  const ext = [[232, 36], ...pts, [166, 242]];
  const samples = [];
  for (let i = 1; i <= 3; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    for (let s = 0; s < 40; s++) {
      const t = s / 40, t2 = t * t, t3 = t2 * t;
      const f = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t +
        (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
        (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      samples.push([f(0), f(1)]);
    }
  }
  samples.push(pts[3]);

  // Table of centre x per integer y from 70 to 194 (the centreline runs downward).
  const Y_TOP = 70, Y_BOT = 194, N = Y_BOT - Y_TOP + 1;
  const cxT = new Array(N);
  let si = 0;
  for (let i = 0; i < N; i++) {
    const y = Y_TOP + i;
    while (si < samples.length - 2 && samples[si + 1][1] < y) si++;
    const a = samples[si], b = samples[si + 1];
    const u = b[1] === a[1] ? 0 : clamp((y - a[1]) / (b[1] - a[1]));
    cxT[i] = a[0] + (b[0] - a[0]) * u;
  }
  const cxAt = (y) => {
    const f = clamp(y - Y_TOP, 0, N - 1), i = Math.floor(f), j = Math.min(N - 1, i + 1);
    return cxT[i] + (cxT[j] - cxT[i]) * (f - i);
  };
  const wAt = (y) => 6 + 70 * Math.pow(clamp((y - Y_TOP) / (Y_BOT - Y_TOP)), 1.4);

  // Curvature sign and strength per row: the inner side of each bend.
  const curv = new Array(N);
  let cmax = 1e-6;
  for (let i = 0; i < N; i++) {
    const a = cxT[Math.max(0, i - 8)], b = cxT[i], c = cxT[Math.min(N - 1, i + 8)];
    curv[i] = a + c - 2 * b;
    cmax = Math.max(cmax, Math.abs(curv[i]));
  }
  const curvAt = (y) => curv[Math.round(clamp(y - Y_TOP, 0, N - 1))] / cmax;

  // Lanterns, jittered along and across the current.
  const spec = [
    [199, 74, 2], [190, 82, 2.5], [176, 94, 3], [170, 108, 3.5], [184, 122, 4.5],
    [208, 134, 5], [228, 148, 6], [220, 166, 8], [200, 184, 10],
  ];
  const SIG = 6;
  const lanterns = spec.map(([x0, y0, r], i) => {
    const dy = i === 0 ? rand() * 1.2 : (rand() - 0.5) * Math.min(4.5, 1 + 0.45 * r);
    const y = Math.min(Y_BOT - 2, y0 + dy);
    const off0 = x0 - cxAt(y0);
    const hw = wAt(y) / 2;
    const lim = Math.max(0, hw - r * 0.6);
    const off = clamp(off0 + (rand() - 0.5) * (0.6 + 0.35 * r), -lim, lim);
    const x = cxAt(y) + off;
    // Reflection streak: rows that are on, dimmed or missing, each nudged sideways.
    const len = Math.max(1.5 * r, 4.5);
    const rows = [];
    for (let j = 0; j < Math.ceil(len / 2.6) + 1; j++) {
      const q = rand();
      rows.push({ on: q < 0.6 ? 1 : q < 0.85 ? 0.55 : 0, shift: (rand() - 0.5) * Math.max(1.2, r * 0.3) });
    }
    return { x, y, r, len, hw: Math.max(r / 4, 2.4), top: y + r * 0.9, rows };
  });

  g.print((x, y) => {
    if (x < 106 || x > 294 || y < 64 || y > 204) return 0;
    let water = 0, inR = 0;
    if (y >= Y_TOP) {
      const c = cxAt(y), hw = wAt(y) / 2;
      inR = solid(Math.abs(x - c) - hw);
      if (inR > 0) {
        const t = clamp((y - Y_TOP) / (Y_BOT - Y_TOP));
        let tone = 0.15 + 0.1 * smooth(clamp(t / 0.35)) + 0.1 * smooth(clamp((t - 0.6) / 0.4));
        const s = (x - c) / hw;
        const cv = curvAt(y);
        tone += 0.1 * clamp(s * Math.sign(cv)) * clamp(Math.abs(cv) * 1.6);
        tone += 0.06 * (fbm(x / 7, y / 5) - 0.5);
        water = tone * inR;
      }
    }
    let lamp = 0, pool = 0, org = 0, refl = 0;
    for (let i = 0; i < lanterns.length; i++) {
      const L = lanterns[i];
      const dx = x - L.x, dy = y - L.y;
      if (Math.abs(dx) > L.r * 4 + 6 || Math.abs(dy) > L.r * 4 + 6 + L.len) continue;
      const d = Math.hypot(dx, dy) - L.r;
      if (i === SIG) {
        org = Math.max(org, solid(d), 0.6 * glow(d, L.r * 1.1));
      } else {
        lamp = Math.max(lamp, solid(d));
        if (d > 0) pool += 0.55 * glow(d, L.r * 1.1) * (0.3 + 0.7 * inR);
      }
      // Rippled reflection streak below.
      const ry = y - L.top;
      if (ry >= 0 && ry <= L.len) {
        const row = L.rows[Math.min(L.rows.length - 1, Math.floor(ry / 2.6))];
        if (row.on && Math.abs(dx - row.shift) < L.hw) refl = Math.max(refl, 0.5 * row.on);
      }
    }
    const ink = Math.max(lamp, refl, clamp(water + pool));
    return [ink, org];
  });

  // Banks: converging half-strength lines.
  const left = [], right = [];
  for (let y = Y_TOP; y <= Y_BOT; y += 2) {
    const c = cxAt(y), hw = wAt(y) / 2;
    left.push([c - hw, y]);
    right.push([c + hw, y]);
  }
  g.line(polyD(left), "soft");
  g.line(polyD(right), "soft");

  // Horizon, broken where the river meets it.
  const hc = cxAt(Y_TOP);
  g.line(`M110 ${Y_TOP + 0.5}H${num(hc - 6)}`, "faint");
  g.line(`M${num(hc + 6)} ${Y_TOP + 0.5}H290`, "faint");

  // Current: faint dashed lines mid-river, broken around lanterns.
  for (const s of [-0.55, -0.15, 0.4]) {
    let seg = [];
    const flush = () => {
      if (seg.length > 2) g.line(polyD(seg), "faint", { dash: "3 4" });
      seg = [];
    };
    for (let y = 84; y <= Y_BOT; y += 2) {
      const p = [cxAt(y) + s * wAt(y) / 2, y];
      const hit = lanterns.some((L) => Math.hypot(p[0] - L.x, p[1] - L.y) < L.r + 3);
      if (hit) flush(); else seg.push(p);
    }
    flush();
  }

  // Lantern outlines, so the sequence survives at thumbnail size.
  lanterns.forEach((L, i) => {
    const d = `M${num(L.x - L.r)} ${num(L.y)}a${num(L.r)} ${num(L.r)} 0 1 0 ${num(2 * L.r)} 0a${num(L.r)} ${num(L.r)} 0 1 0 ${num(-2 * L.r)} 0`;
    g.line(d, i === SIG ? "sig" : "ink");
  });
}
