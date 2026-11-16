function draw(g, rand, seed, k) {
  // Paper lanterns drifting down a winding river, seen from above
  const { clamp, solid, polyD, num, sdPolyline } = k;
  const HW = 17; // river half-width
  const j = (a) => (rand() * 2 - 1) * a;

  // Centreline: cubic with slightly jittered controls.
  const p0 = [84, 72], c1 = [175 + j(10), 58 + j(10)], c2 = [230 + j(10), 192 + j(10)], p3 = [316, 180];
  const bz = (t) => {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]];
  };
  const N = 160;
  const pts = [], cum = [0], nrm = [];
  for (let i = 0; i <= N; i++) pts.push(bz(i / N));
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    nrm.push([-(b[1] - a[1]) / l, (b[0] - a[0]) / l]); // points roughly down-right of flow
  }
  const L = cum[N];
  const pointAt = (s, off = 0) => {
    s = clamp(s, 0, L);
    let i = 0;
    while (i < N - 1 && cum[i + 1] < s) i++;
    const f = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1);
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
    const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const n = nrm[i];
    return [x + n[0] * off, y + n[1] * off];
  };
  const nearestIdx = (x, y) => {
    let bi = 0, bd = 1e9;
    for (let i = 0; i <= N; i++) {
      const dx = x - pts[i][0], dy = y - pts[i][1], d = dx * dx + dy * dy;
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };

  // Lanterns: projected onto the stream, then jittered along and across it.
  const targets = [[100, 72], [124, 73], [138, 75], [171, 92], [205, 128], [232, 152], [262, 168], [280, 172], [304, 178]];
  const FEAT = 4;
  const clusterAlong = j(6), clusterSide = j(4);
  const lanterns = targets.map((t, i) => {
    const s = cum[nearestIdx(t[0], t[1])];
    let along, side;
    if (i === FEAT) { along = 0; side = 0; }
    else if (i === 1 || i === 2) { along = clusterAlong + (i === 2 ? j(2) : 0); side = clusterSide + j(1.5); }
    else { along = j(6); side = j(5); }
    const [x, y] = pointAt(s + along, side);
    return { x, y, r: i === FEAT ? 7 : 4.5 + rand() * 1.5 };
  });
  const feat = lanterns[FEAT];
  const ordinary = lanterns.filter((_, i) => i !== FEAT);

  g.print((x, y) => {
    if (x < 70 || x > 330 || y < 36 || y > 214) return 0;
    const i = nearestIdx(x, y);
    const dx = x - pts[i][0], dy = y - pts[i][1];
    const dist = Math.hypot(dx, dy);
    if (dist > HW + 3) return 0;
    const o = dx * nrm[i][0] + dy * nrm[i][1];
    const up = clamp(-o / HW, -1, 1); // +1 toward the upper-left bank

    // Water: soft ribbon lit from the upper left.
    const bend = Math.exp(-(((x - 145) / 28) ** 2));
    let water = 0.3 + 0.08 * bend * (0.5 + 0.5 * up) - 0.08 * clamp(-up) - 0.08 * clamp((x - 240) / 76);
    water = clamp(water, 0.2, 0.4);

    // Ordinary lantern glows sum where they crowd together.
    let halo = 0;
    for (const l of ordinary) {
      const h = Math.hypot(x - l.x, y - l.y);
      if (h > 18) continue;
      const d = h - l.r;
      halo += d <= 0 ? 0.9 : 0.9 * Math.exp(-d / 9) * clamp((18 - h) / 4);
    }
    // Featured lantern: wider ink glow, orange core.
    const fh = Math.hypot(x - feat.x, y - feat.y);
    const fd = fh - feat.r;
    if (fd > 0 && fh < 24) halo += 0.85 * Math.exp(-fd / 11) * clamp((24 - fh) / 5);

    halo = clamp(halo);
    let ink = water + (1 - water) * halo;
    ink *= solid(dist - HW); // land stays bare
    return [ink, solid(fd)];
  });

  // Banks.
  for (const sgn of [-1, 1]) {
    g.line(polyD(pts.map((p, i) => [p[0] + nrm[i][0] * HW * sgn, p[1] + nrm[i][1] * HW * sgn])), "ink");
  }

  // Current lines, parallel to the flow.
  const currents = [[0.1, 40, -8], [0.36, 34, 8], [0.6, 46, -7], [0.8, 32, 6]];
  for (const [f, len, off] of currents) {
    const s0 = f * L + j(6), seg = [];
    for (let s = s0; s <= s0 + len; s += 3) seg.push(pointAt(s, off + j(1)));
    g.line(polyD(seg), "faint", { dash: "4 3" });
  }

  // Ripples around the featured lantern, kept on the water.
  const ring = (r, broken) => {
    const phase = rand() * 40;
    let run = [];
    const flush = () => { if (run.length > 2) g.line(polyD(run), "sig"); run = []; };
    for (let a = 0; a <= 360; a += 3) {
      const t = (a * Math.PI) / 180;
      const p = [feat.x + r * Math.cos(t), feat.y + r * Math.sin(t)];
      const onWater = sdPolyline(p[0], p[1], pts) < HW - 1.5;
      const inArc = !broken || ((a + phase) % 40) < 24;
      if (onWater && inArc) run.push(p); else flush();
    }
    flush();
  };
  ring(13, false);
  ring(20, true);

  // Faint outlines around ordinary lanterns.
  for (const l of ordinary) {
    const r = l.r + 0.5;
    g.line(`M${num(l.x - r)} ${num(l.y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`, "faint");
  }
}
