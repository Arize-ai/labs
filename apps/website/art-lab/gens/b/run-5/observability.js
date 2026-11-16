function draw(g, rand, seed, k) {
  // Skeleton pocket watch, its open movement visible through glass
  const { clamp, smooth, solid, sdBox, sdPolyline, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed);
  const TAU = Math.PI * 2;
  const cx = 200, cy = 138, R = 58, Rb = 52;

  const circ = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;

  // Gears: polar tooth profile, each rotated at random.
  const gears = [
    { x: 190, y: 150, r: 24, n: 18, a: 1.8, tone: 0.55, rimIn: 18, hub: 5.5, spokes: 4, shade: true },
    { x: 224, y: 124, r: 15, n: 12, a: 1.6, tone: 0.45, rimIn: 10, hub: 4, spokes: 3 },
    { x: 214, y: 170, r: 9, n: 8, a: 1.3, tone: 0.45, rimIn: 0, hub: 0, spokes: 0 },
  ];
  for (const gr of gears) {
    gr.rot = rand() * TAU;
    gr.prof = (th) => gr.r - gr.a + 2 * gr.a * smooth(clamp(Math.cos(gr.n * (th - gr.rot)) * 1.6 + 0.5));
    gr.sp = [];
    for (let i = 0; i < gr.spokes; i++) {
      const an = gr.rot + (i * TAU) / gr.spokes + 0.13;
      gr.sp.push([Math.cos(an), Math.sin(an)]);
    }
    const pts = [];
    const m = gr.n * 16;
    for (let i = 0; i < m; i++) {
      const th = (i / m) * TAU;
      const rr = gr.prof(th);
      pts.push([gr.x + rr * Math.cos(th), gr.y + rr * Math.sin(th)]);
    }
    gr.outline = pts;
  }

  // Bridge plate: a Catmull-Rom curve through the gear hubs.
  const via = [[160, 160], [190, 150], [224, 124], [236, 104]];
  const ext = [via[0], ...via, via[via.length - 1]];
  const bridge = [];
  for (let s = 1; s < ext.length - 2; s++) {
    const [p0, p1, p2, p3] = [ext[s - 1], ext[s], ext[s + 1], ext[s + 2]];
    for (let i = 0; i < 14; i++) {
      const t = i / 14, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      bridge.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  bridge.push(via[via.length - 1]);
  const bw = 3;
  const left = [], right = [];
  for (let i = 0; i < bridge.length; i++) {
    const a = bridge[Math.max(0, i - 1)], b = bridge[Math.min(bridge.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    left.push([bridge[i][0] + nx * bw, bridge[i][1] + ny * bw]);
    right.push([bridge[i][0] - nx * bw, bridge[i][1] - ny * bw]);
  }

  // Balance wheel, caught mid-swing.
  const bx = 174, by = 112, br = 14;
  const barA = (20 + (rand() - 0.5) * 30) * Math.PI / 180;
  const bars = [barA, barA + Math.PI / 2].map((a) => [Math.cos(a), Math.sin(a)]);
  const springPhase = rand() * TAU;
  const spring = [];
  for (let i = 0; i <= 180; i++) {
    const t = i / 180, th = springPhase + t * 3 * TAU, rr = 2.6 + t * 7.6;
    spring.push([bx + rr * Math.cos(th), by + rr * Math.sin(th)]);
  }

  const jewels = [[gears[0].x, gears[0].y], [gears[1].x, gears[1].y], [gears[2].x, gears[2].y]];

  g.print((x, y) => {
    const inCrown = x > 186 && x < 214 && y > 48 && y < 82;
    const dxc = x - cx, dyc = y - cy, rc = Math.hypot(dxc, dyc);
    if (rc > R + 3 && !inCrown) return 0;
    let ink = 0, orange = 0;

    // Crown and bow.
    if (inCrown) {
      ink = Math.max(ink, 0.5 * solid(sdBox(x, y, 200, 76, 6, 4, 1.5)));
      ink = Math.max(ink, 0.5 * solid(Math.abs(Math.hypot(x - 200, y - 62) - 11) - 2));
    }

    const t = (dxc + dyc) / (R * 1.414);
    const ul = clamp((1 - t) / 2);

    // Case rim band.
    ink = Math.max(ink, (0.35 + 0.35 * ul) * solid(rc - R) * solid(Rb - rc));

    // Balance wheel: ring, crossbars, inner wash, glow — all orange.
    const dbx = x - bx, dby = y - by, rbw = Math.hypot(dbx, dby);
    if (rbw < br + 34 && rc < R) {
      orange = Math.max(orange, solid(Math.abs(rbw - br) - 2.5));
      if (rbw < br) {
        orange = Math.max(orange, 0.32);
        for (const [c, s] of bars) orange = Math.max(orange, solid(Math.abs(-dbx * s + dby * c) - 1.8));
      }
      const dd = rbw - (br + 2.5);
      if (dd > 0 && rc < Rb) orange = Math.max(orange, 0.4 * Math.pow(clamp(1 - dd / 30), 2));
    }

    // Glass highlight: a crescent inside the bezel, brightest upper left,
    // dimmed where the heartbeat glows so the orange stays legible.
    if (rc < Rb) {
      const radial = smooth(clamp((rc - 30) / 18));
      let glass = (0.15 + 0.35 * ul) * radial * (0.85 + 0.3 * (fbm(x / 8, y / 8) - 0.5));
      glass *= 1 - clamp(orange * 2.5);
      ink = Math.max(ink, glass);
    }

    // Gears.
    for (const gr of gears) {
      const dx = x - gr.x, dy = y - gr.y, rr = Math.hypot(dx, dy);
      if (rr > gr.r + gr.a + 2) continue;
      const outer = solid(rr - gr.prof(Math.atan2(dy, dx)));
      let m;
      if (!gr.rimIn) m = outer;
      else {
        m = Math.max(outer * solid(gr.rimIn - rr), solid(rr - gr.hub));
        for (const [c, s] of gr.sp) {
          const along = dx * c + dy * s;
          if (along > 0 && along < gr.rimIn + 1) m = Math.max(m, solid(Math.abs(-dx * s + dy * c) - 2.2));
        }
      }
      let tone = gr.tone;
      if (gr.shade) tone += 0.12 * clamp(-(dx + dy) / (gr.r * 1.414), -1, 1);
      ink = Math.max(ink, tone * m);
    }

    // Bridge plate.
    if (x > 152 && x < 244 && y > 96 && y < 168) ink = Math.max(ink, 0.6 * solid(sdPolyline(x, y, bridge) - bw));

    // Jewel pivots.
    for (const [jx, jy] of jewels) ink = Math.max(ink, solid(Math.hypot(x - jx, y - jy) - 2));

    return [ink, orange];
  });

  // Case and bezel.
  g.line(circ(cx, cy, R), "ink");
  g.line(circ(cx, cy, Rb), "soft");
  // Crown and bow.
  g.line("M194 80V73.5Q194 72 195.5 72H204.5Q206 72 206 73.5V80", "ink");
  g.line(circ(200, 62, 11), "ink");

  // Gears and spokes.
  for (const gr of gears) {
    g.line(polyD(gr.outline, true), "soft");
    if (gr.rimIn) g.line(circ(gr.x, gr.y, gr.rimIn), "soft");
    if (gr.hub) g.line(circ(gr.x, gr.y, gr.hub), "soft");
    if (gr.shade) {
      for (const [c, s] of gr.sp) {
        g.line(`M${num(gr.x + c * gr.hub)} ${num(gr.y + s * gr.hub)}L${num(gr.x + c * gr.rimIn)} ${num(gr.y + s * gr.rimIn)}`, "faint");
      }
    }
  }

  // Bridge plate edges.
  g.line(polyD([...left, ...right.slice().reverse()], true), "soft");

  // Balance wheel, crossbars, hairspring.
  g.line(circ(bx, by, br), "ink");
  for (const [c, s] of bars) {
    g.line(`M${num(bx - c * br)} ${num(by - s * br)}L${num(bx + c * br)} ${num(by + s * br)}`, "ink");
  }
  g.line(polyD(spring), "faint");

  // Jewels, including the balance staff.
  for (const [jx, jy] of [...jewels, [bx, by]]) g.line(circ(jx, jy, 2), "ink");

  // Glint on the glass.
  g.line("M160 104A36 36 0 0 0 182 88", "faint", { dash: "2 3" });
}
