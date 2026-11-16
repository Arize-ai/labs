function draw(g, rand, seed, k) {
  // Two stars of a binary system circling one shared centre
  const { clamp, smooth, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed);
  const cx = 192, cy = 125;
  const tilt = -8 * Math.PI / 180;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const ellPt = (rx, ry, a) => {
    const ex = rx * Math.cos(a), ey = ry * Math.sin(a);
    return [cx + ex * ct - ey * st, cy + ex * st + ey * ct];
  };

  // Orbital phase: both stars advance together, opposite on their ellipses.
  const phase = (rand() * 50 - 25) * Math.PI / 180;
  const rA = 32, rB = 20;
  const [ax, ay] = ellPt(32, 12, Math.PI + phase);
  const [bx, by] = ellPt(76, 28, phase);

  // Axis from A to B.
  const L = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / L, uy = (by - ay) / L;
  const gap = L - rA - rB;

  // Per-plate wobble offsets.
  const oA = rand() * 50, oB = rand() * 50, oW = rand() * 50;

  const ring = (a, ox, oy) => fbm(ox + Math.cos(a) * 1.6, oy + Math.sin(a) * 1.6) - 0.5;

  const starTone = (x, y, sx, sy, r, core, limb, rim, reach, off) => {
    const dx = x - sx, dy = y - sy;
    const d = Math.hypot(dx, dy) - r;
    // Light from the upper left: darker toward the lower-right limb.
    const lr = clamp((dx + dy) / (r * Math.SQRT2));
    const body = (core - (core - limb) * lr) * solid(d);
    let halo = 0;
    if (d > 0) {
      const span = reach * (1 + 0.35 * ring(Math.atan2(dy, dx), off, off + 7));
      halo = rim * (1 - smooth(clamp(d / span)));
    }
    return Math.max(body, halo);
  };

  const bx0 = Math.min(ax - 62, bx - 40), bx1 = Math.max(ax + 62, bx + 40);
  const by0 = Math.min(ay - 62, by - 40), by1 = Math.max(ay + 62, by + 40);

  g.print((x, y) => {
    if (x < bx0 || x > bx1 || y < by0 || y > by1) return 0;
    let ink = Math.max(
      starTone(x, y, ax, ay, rA, 1.0, 0.8, 0.5, 26, oA),
      starTone(x, y, bx, by, rB, 0.85, 0.65, 0.4, 16, oB)
    );

    // The bridge: a stream along the axis, pinched thinnest midway.
    const px = x - ax, py = y - ay;
    const t = px * ux + py * uy;
    const s = (t - rA) / gap;
    if (s > -0.15 && s < 1.15) {
      const perp = Math.abs(-px * uy + py * ux);
      const m = 2 * clamp(s, 0, 1) - 1;
      const hw = 7 * (1 + 1.8 * m * m) * (1 + 0.4 * (fbm(oW + s * 3.5, oW) - 0.5));
      const tone = (0.26 + 0.04 * Math.abs(m)) * solid(perp - hw);
      ink = Math.max(ink, tone);
    }

    // The shared centre: the only orange, and ink yields to it.
    const cd = Math.hypot(x - cx, y - cy) - 4;
    const orange = solid(cd);
    if (cd < 1.5) ink = 0;
    return [ink, orange];
  });

  // Orbits.
  const ellipse = (rx, ry) => {
    const pts = [];
    for (let i = 0; i < 96; i++) pts.push(ellPt(rx, ry, (i / 96) * Math.PI * 2));
    return polyD(pts, true);
  };
  g.line(ellipse(32, 12), "soft");
  g.line(ellipse(76, 28), "soft", { dash: "4 3" });

  // Alignment mark along the axis, about 120 long.
  const ext = (120 - L) / 2;
  const p0 = [ax - ux * ext, ay - uy * ext], p1 = [bx + ux * ext, by + uy * ext];
  g.line(`M${num(p0[0])} ${num(p0[1])}L${num(p1[0])} ${num(p1[1])}`, "faint", { dash: "4 3" });

  // Star edges.
  const circ = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0`;
  g.line(circ(ax, ay, rA), "ink");
  g.line(circ(bx, by, rB), "ink");

  // The shared centre, kept clean over A's limb: a crisp orange dot and a thin ring.
  g.line(circ(cx, cy, 2), "sig", { width: 4 });
  g.line(circ(cx, cy, 9), "sig", { width: 0.5 });
}
