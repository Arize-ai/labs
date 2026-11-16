function draw(g, rand, seed, k) {
  // Striped sun setting over an endless wireframe grid
  const { clamp, smooth, solid, num } = k;
  const cx = 200, cy = 132, R = 52, hz = 140;
  const L = 84, Rt = 316, B = 194;

  // Sun stripes: count, positions and thickness all jittered.
  const n = 4 + Math.floor(rand() * 3);
  const h0 = 1.2 + rand() * 0.6, h1 = 4.4 + rand() * 1.0, hp = 0.8 + rand() * 0.6;
  const stripes = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let y = 113 + 25.5 * (1 - Math.pow(1 - t, 1.6)) + (rand() * 2 - 1) * 1.5;
    const h = h0 + (h1 - h0) * Math.pow(t, hp);
    y = Math.min(y, hz - h / 2 + 1);
    stripes.push([y, h]);
  }
  // Gaps must be clean even when thinner than the lattice: dots are cleared
  // over a printable minimum here, and the exact gap is cut with a fill below.
  const inGap = (y) => {
    for (const [sy, h] of stripes) if (Math.abs(y - sy) < Math.max(h / 2, 1.7)) return true;
    return false;
  };

  g.print((x, y) => {
    if (x < 84 || x > 316 || y < 30 || y > 156) return 0;
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    let ink = 0, org = 0;
    if (y < hz) {
      if (r < R + 3) {
        // Sun: a solid orange mass, a touch fuller at the upper left.
        if (!inGap(y)) {
          const ul = clamp(0.5 - (dx + dy) / (4 * R));
          org = solid(r - R) * clamp(0.9 + 0.1 * ul);
        }
      }
      if (r > R - 1 && r < 95) {
        // Halo: 0.5 at the rim, gone by 95, strongest above and to the left.
        const fall = 1 - smooth(clamp((r - R) / (95 - R)));
        const dir = (-0.6 * dx - 0.8 * dy) / Math.max(r, 1);
        ink = Math.max(ink, 0.5 * fall * (0.55 + 0.45 * dir) * (r >= R ? 1 : 0));
      }
    } else if (y < 152 && x > 110 && x < 290) {
      // Haze hugging the horizon, under the sun.
      const v = 1 - smooth(clamp((y - hz) / 12));
      const h = 1 - smooth(clamp(Math.abs(x - cx) / 90));
      ink = 0.35 * v * h;
    }
    return [ink, org];
  });

  // Floor rays from the vanishing point, clipped to the live area.
  for (const xb of [20, 60, 100, 140, 180, 200, 220, 260, 300, 340, 380]) {
    let ex = xb, ey = B;
    if (xb < L || xb > Rt) {
      const edge = xb < L ? L : Rt;
      const t = (edge - cx) / (xb - cx);
      ex = edge; ey = hz + (B - hz) * t;
    }
    const d = `M${cx} ${hz}L${num(ex)} ${num(ey)}`;
    g.line(d, "faint");
    // Extra quarter-strength near the horizon lifts it to half, fading out.
    g.fadeLine(d, "var(--fg)", 0.25, hz + 3, Math.max(hz + 10, ey));
  }

  // Floor crossbars on a geometric perspective spacing, scrolled by a phase.
  const ratio = Math.pow(43 / 2.5, 1 / 5);
  const phase = rand();
  const bars = [];
  for (let i = -2; i < 8; i++) {
    const y = hz + 2.5 * Math.pow(ratio, i + phase - 0.5);
    if (y > hz + 1.8 && y < B - 1) bars.push(y);
  }
  bars.forEach((y, i) => g.line(`M${L} ${num(y)}H${Rt}`, i < 3 ? "soft" : "faint"));

  // Sun outline: the arc above the horizon.
  const hc = Math.sqrt(R * R - (hz - cy) * (hz - cy));
  g.line(`M${num(cx - hc)} ${hz}A${R} ${R} 0 1 1 ${num(cx + hc)} ${hz}`, "soft");

  // Exact stripe gaps, cut cleanly through the sun and its rim.
  for (const [sy, h] of stripes) {
    const top = sy - h / 2, bot = Math.min(sy + h / 2, hz - 0.5);
    if (bot <= top) continue;
    const near = Math.min(Math.abs(top - cy), Math.abs(bot - cy));
    const hw = Math.sqrt(Math.max(0, R * R - near * near)) + 1.5;
    g.line(`M${num(cx - hw)} ${num(top)}H${num(cx + hw)}V${num(bot)}H${num(cx - hw)}Z`, "sig", { width: 0.25, fill: true });
  }

  // Horizon, then the sun's broken reflection on the floor.
  g.line(`M${L} ${hz + 0.5}H${Rt}`, "ink");
  g.line(`M180 147.5H220`, "faint", { dash: "4 3" });
}
