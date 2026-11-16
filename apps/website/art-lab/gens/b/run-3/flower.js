function draw(g, rand, seed, k) {
  // A sunflower head seen from above, its seeds in golden spirals
  const { clamp, smooth, solid, polyD, num } = k;
  const cx = 200, cy = 125;
  const DEG = Math.PI / 180;
  const ga = 137.5 * DEG;
  const rot = (rand() * 2 - 1) * 20 * DEG;
  const R_DISK = 30, R_GLOW = 85, N = 150;
  const R_MAX = 2.4 * Math.sqrt(N);

  // Florets placed by the golden angle.
  const florets = [];
  for (let n = 1; n <= N; n++) {
    const r = 2.4 * Math.sqrt(n);
    const a = n * ga + rot;
    const f = r / R_MAX;
    florets.push({ n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), s: 1.2 + 0.6 * f, t: 0.6 + 0.3 * f, arm: false });
  }

  // One parastichy arm: florets s, s+F, s+2F, ...
  const F = rand() < 0.5 ? 13 : 21;
  const start = 1 + Math.floor(rand() * F);
  let delta = ((F * ga) % (2 * Math.PI));
  if (delta > Math.PI) delta -= 2 * Math.PI;
  const armF = [];
  for (let n = start; n <= N; n += F) { florets[n - 1].arm = true; armF.push(florets[n - 1]); }
  const spiral = [];
  for (let i = 0; i <= 60; i++) {
    const n = (N * i) / 60;
    const r = 2.4 * Math.sqrt(n);
    const a = start * ga + ((n - start) / F) * delta + rot;
    spiral.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }

  // Petals: a front ring of 13 and a back ring offset by half a step.
  const step = (2 * Math.PI) / 13;
  const makePetal = (ang, L) => {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const pts = [];
    const M = 16;
    for (let i = 0; i <= M; i++) {
      const u = (L * i) / M, tt = 2 * u / L - 1, w = 7 * (1 - tt * tt), rr = R_DISK + u;
      pts.push([cx + ux * rr - uy * w, cy + uy * rr + ux * w]);
    }
    for (let i = M - 1; i > 0; i--) {
      const u = (L * i) / M, tt = 2 * u / L - 1, w = 7 * (1 - tt * tt), rr = R_DISK + u;
      pts.push([cx + ux * rr + uy * w, cy + uy * rr - ux * w]);
    }
    const lift = clamp(-(ux + uy) / Math.SQRT2, -1, 1);
    return { ux, uy, L, pts, lift };
  };
  const front = [], back = [];
  for (let i = 0; i < 13; i++) {
    const base = -Math.PI / 2 + rot + i * step;
    front.push(makePetal(base + (rand() * 2 - 1) * 3 * DEG, 36 * (1 + (rand() * 2 - 1) * 0.1)));
    back.push(makePetal(base + step / 2 + (rand() * 2 - 1) * 3 * DEG, 30 * (1 + (rand() * 2 - 1) * 0.1)));
  }
  const inPetal = (p, dx, dy) => {
    const u = dx * p.ux + dy * p.uy - R_DISK;
    if (u < 0 || u > p.L) return -1;
    const v = -dx * p.uy + dy * p.ux;
    const tt = 2 * u / p.L - 1;
    return Math.abs(v) < 7 * (1 - tt * tt) ? u : -1;
  };

  g.print((x, y) => {
    const dx = x - cx, dy = y - cy;
    const r = Math.hypot(dx, dy);
    if (r > R_GLOW) return 0;

    if (r < 31.5) {
      // Seed disk: brightest at the rim, gaps left dark.
      let best = 1e9, bf = null, ba = 1e9, baF = null;
      for (const f of florets) {
        const d = Math.hypot(x - f.x, y - f.y);
        if (d < best) { best = d; bf = f; }
        if (f.arm && d < ba) { ba = d; baF = f; }
      }
      let ink = bf.t * clamp(1.3 - best / (bf.s + 1));
      // The shallow cup where petals meet the disk: dark except on seeds.
      if (r >= 28) ink = best < bf.s + 0.6 ? bf.t : 0.1;
      if (r > R_DISK + 0.5 && best > bf.s + 0.6) ink = 0.1;
      const orange = baF ? solid(ba - (baF.s + 1.0)) : 0;
      return [ink, orange];
    }

    for (const p of front) {
      const u = inPetal(p, dx, dy);
      if (u >= 0) return clamp(0.65 - 0.3 * (u / p.L) + 0.1 * p.lift);
    }
    for (const p of back) if (inPetal(p, dx, dy) >= 0) return 0.3;

    return 0.2 * smooth(clamp((R_GLOW - r) / (R_GLOW - 62)));
  });

  const circ = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0`;

  // Back petal outlines, only where they peek out from behind the front ring.
  const hiddenByFront = (px, py) => {
    const dx = px - cx, dy = py - cy;
    if (Math.hypot(dx, dy) < R_DISK) return true;
    for (const p of front) if (inPetal(p, dx, dy) >= 0) return true;
    return false;
  };
  for (const p of back) {
    const pts = p.pts.concat([p.pts[0]]);
    let run = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      for (let j = 0; j < 4; j++) {
        const t = j / 4;
        const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (hiddenByFront(q[0], q[1])) {
          if (run.length > 1) g.line(polyD(run), "faint");
          run = [];
        } else run.push(q);
      }
    }
    run.push(pts[pts.length - 1]);
    if (run.length > 1 && !hiddenByFront(run[run.length - 1][0], run[run.length - 1][1])) g.line(polyD(run), "faint");
  }

  // Front petals: outline and midrib.
  for (const p of front) {
    g.line(polyD(p.pts, true), "soft");
    const r0 = R_DISK, r1 = R_DISK + (2 * p.L) / 3;
    g.line(`M${num(cx + p.ux * r0)} ${num(cy + p.uy * r0)}L${num(cx + p.ux * r1)} ${num(cy + p.uy * r1)}`, "faint");
  }

  // Disk edge.
  g.line(circ(cx, cy, R_DISK), "ink");

  // Florets as crisp seeds, so the spirals read finer than the screen can.
  for (const f of florets) {
    if (f.arm) continue;
    g.line(circ(f.x, f.y, f.s / 2), "ink", { width: f.s });
  }

  // The measured parastichy: dashed overlay, its seeds in orange.
  g.line(polyD(spiral), "soft", { dash: "3 2" });
  for (const f of armF) g.line(circ(f.x, f.y, f.s / 2), "sig", { width: f.s });
}
