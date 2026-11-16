function draw(g, rand, seed, k) {
  // A snake slithering left to right, its forked tongue in orange
  const { X0, X1, clamp, smooth, solid, glow, polyD, num } = k;

  const cy = 126;
  const phase = 0.6 + rand() * 0.8;
  const waves = 1.45 + rand() * 0.25;
  const N = 160;
  const xa = X0 + 6, xb = X1 - 30;

  // Body radius along t: a long taper to the tail, a slim neck, a wider head, a round snout.
  const radius = (t) =>
    1 + 9 * smooth(clamp(t / 0.55))
    - 1.6 * Math.exp(-(((t - 0.885) / 0.03) ** 2))
    + 3 * Math.exp(-(((t - 0.945) / 0.035) ** 2))
    - 2 * smooth(clamp((t - 0.965) / 0.035));

  // The centerline, with arc length, tangent and normal at each sample.
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const A = 24 * (1 - 0.65 * smooth(clamp((t - 0.6) / 0.4)));
    pts.push({ t, x: xa + t * (xb - xa), y: cy + A * Math.sin(2 * Math.PI * waves * t + phase), r: radius(t), s: 0, nx: 0, ny: 0, dx: 1, dy: 0 });
  }
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const ex = b.x - a.x, ey = b.y - a.y, l = Math.hypot(ex, ey) || 1;
    const p = pts[i];
    p.dx = ex / l; p.dy = ey / l;
    p.nx = -p.dy; p.ny = p.dx;
    if (i > 0) p.s = pts[i - 1].s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
  }

  // The head and the forked tongue.
  const end = pts[N];
  const tip = [end.x + end.dx * end.r, end.y + end.dy * end.r];
  const fork = [tip[0] + end.dx * 11, tip[1] + end.dy * 11];
  const rot = (a, l) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [fork[0] + (end.dx * c - end.dy * s) * l, fork[1] + (end.dx * s + end.dy * c) * l];
  };
  const prongA = rot(-0.5, 6), prongB = rot(0.5, 6);
  const tongue = [[tip[0], tip[1]], fork];

  const Lx = -0.55, Ly = -0.83;

  g.print((x, y) => {
    let best = Infinity, bt = 0, bs = 0, qx = 0, qy = 0, bn = [0, 1];
    for (let i = 1; i <= N; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Math.abs(a.x - x) > 26 && Math.abs(b.x - x) > 26) continue;
      const ex = b.x - a.x, ey = b.y - a.y;
      const u = clamp(((x - a.x) * ex + (y - a.y) * ey) / (ex * ex + ey * ey || 1));
      const px = a.x + ex * u, py = a.y + ey * u;
      const t = a.t + (b.t - a.t) * u;
      const d = Math.hypot(x - px, y - py) - radius(t);
      if (d < best) {
        best = d; bt = t; bs = a.s + (b.s - a.s) * u; qx = px; qy = py;
        bn = [a.nx + (b.nx - a.nx) * u, a.ny + (b.ny - a.ny) * u];
      }
    }
    let ink = 0;
    if (best < 8) {
      const r = radius(bt);
      const ox = (x - qx) / r, oy = (y - qy) / r;
      // Lit from the upper left: round cross-section shading.
      const lambert = clamp(0.5 + 0.5 * (Lx * ox + Ly * oy));
      let tone = 0.28 + 0.68 * lambert;
      // Dorsal diamonds along the back, fading out at the tail and gone on the head.
      if (bt < 0.86) {
        const v = ox * bn[0] + oy * bn[1];
        const f = bs / 11 + 0.5;
        const dia = Math.abs(f - Math.floor(f) - 0.5) * 2 + Math.abs(v) * 0.95;
        tone -= 0.38 * clamp((0.6 - dia) / 0.12) * smooth(clamp(bt / 0.25));
      }
      ink = solid(best) * clamp(tone) + 0.14 * glow(best, 6);
    } else {
      ink = 0.14 * glow(best, 6);
    }
    const td = Math.min(
      k.sdPolyline(x, y, tongue),
      k.sdPolyline(x, y, [fork, prongA]),
      k.sdPolyline(x, y, [fork, prongB]),
    );
    return [ink, 0.42 * glow(td - 0.5, 3)];
  });

  // The outline: one edge forward, round around the snout, the other edge back.
  const left = pts.map((p) => [p.x + p.nx * p.r, p.y + p.ny * p.r]);
  const right = pts.map((p) => [p.x - p.nx * p.r, p.y - p.ny * p.r]).reverse();
  const cap = [];
  for (let a = 1; a < 12; a++) {
    const th = (Math.PI * a) / 12;
    cap.push([end.x + end.r * (end.nx * Math.cos(th) + end.dx * Math.sin(th)), end.y + end.r * (end.ny * Math.cos(th) + end.dy * Math.sin(th))]);
  }
  g.line(polyD(left.concat(cap, right), true), "ink", { width: 1.25 });

  // A dotted spine guide along the body.
  g.line(polyD(pts.filter((p) => p.t > 0.06 && p.t < 0.86).map((p) => [p.x, p.y])), "faint", { dash: "1 3" });

  // The eye, on the upper side of the head.
  const hp = pts[Math.round(N * 0.95)];
  const up = hp.ny < 0 ? 1 : -1;
  const ex = hp.x + up * hp.nx * hp.r * 0.45 + hp.dx * 2;
  const ey = hp.y + up * hp.ny * hp.r * 0.45 + hp.dy * 2;
  const er = 1.9;
  g.line(`M${num(ex - er)} ${num(ey)}a${er} ${er} 0 1 0 ${2 * er} 0a${er} ${er} 0 1 0 ${-2 * er} 0Z`, "ink", { width: 1, fill: true });

  // The forked tongue.
  g.line(polyD([tip, fork, prongA]) + polyD([fork, prongB]), "sig", { width: 1.25 });
}
