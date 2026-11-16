function draw(g, rand, seed, k) {
  // Sliced sunset sinking behind an endless wireframe grid floor
  const { clamp, smooth, num } = k;
  const cx = 200, hz = 140, r = 48, floorY = 194;
  const cy = 122 + rand() * 12; // how far the sun has sunk
  const sunTop = cy - r;

  // Slices, set relative to the sun's centre (brief values at cy 128), jittered ±1.5.
  const slices = [[-18, 1.5], [-9, 2.5], [-1, 3.5], [6, 4.5]].map(([o, h]) => {
    const y = cy + o + (rand() * 3 - 1.5);
    return { y, h, top: y - h / 2, bot: Math.min(y + h / 2, hz) };
  }).filter(s => s.top < hz);
  const inSlice = (y) => slices.some(s => y >= s.top && y <= s.bot);

  // Reflection column: 30 wide at the horizon, 12 wide at y 180.
  const reflHalf = (y) => 15 - 9 * (y - hz) / 40;
  // Gaps between reflection dashes, each taller than a lattice row so they read.
  const gaps = [[144, 147.5], [151.5, 155.5], [160, 164.5], [169.5, 174.5]];
  const inGap = (y) => gaps.some(([a, b]) => y >= a && y <= b);
  const fanHalf = (y) => 160 * (y - hz) / (floorY - hz);

  g.print((x, y) => {
    const dx = x - cx;
    if (y < hz) {
      if (Math.abs(dx) > 90 || y < cy - 90) return 0;
      const d = Math.hypot(dx, y - cy) - r;
      if (d < 0) {
        if (inSlice(y)) return 0;
        const t = clamp((y - sunTop) / (hz - sunTop));
        return [0, 1 - 0.15 * smooth(t)];
      }
      const t = clamp(d / (85 - r));
      return 0.35 * (1 - smooth(t)) * (1 - t);
    }
    if (y > floorY) return 0;
    let ink = 0, orange = 0;
    if (Math.abs(dx) < fanHalf(y) + 2) ink = 0.08 * (1 - smooth(clamp((y - hz) / 15)));
    const t = (y - hz) / 40;
    if (t < 1 && Math.abs(dx) < reflHalf(y) && !inGap(y)) orange = 0.3 * (1 - t);
    return [ink, orange];
  });

  // Horizon.
  g.line(`M84 ${hz + 0.5}H316`, "ink");

  // Radial grid lines, broken where they cross the reflection, soft near centre, faint outward.
  const bottoms = [40, 72, 104, 136, 168, 200, 232, 264, 296, 328, 360];
  const span = floorY - hz;
  for (const xb of bottoms) {
    const ddx = xb - cx;
    const ax = Math.abs(ddx);
    const xAt = (y) => cx + ddx * (y - hz) / span;
    let yStart;
    if (ax === 0) yStart = 175;
    else {
      const u = 15 / (ax / span + 9 / 40);
      yStart = u < 40 ? hz + u : hz;
    }
    const ySplit = ax > 0 ? Math.min(floorY, hz + 90 * span / ax) : floorY;
    const seg = (y0, y1, stroke) => {
      if (y1 - y0 < 0.5) return;
      g.line(`M${num(xAt(y0))} ${num(y0)}L${num(xAt(y1))} ${num(y1)}`, stroke);
    };
    if (ySplit > yStart) {
      seg(yStart, ySplit, "soft");
      seg(ySplit, floorY, "faint");
    } else seg(yStart, floorY, "faint");
  }

  // Cross grid lines, opened around the reflection.
  const hseg = (x0, x1, y, stroke) => {
    if (x1 - x0 < 0.5) return;
    g.line(`M${num(x0)} ${y + 0.5}H${num(x1)}`, stroke);
  };
  for (const yc of [143, 147, 153, 161, 172, 188]) {
    const s = fanHalf(yc);
    const hw = yc < 180 ? reflHalf(yc) : 0;
    const near = yc <= 147;
    for (const side of [-1, 1]) {
      const a = hw, b = s;
      if (b <= a) continue;
      const pieces = near ? [[a, b, "faint"]]
        : [[a, Math.min(b, 90), "soft"], [Math.max(a, 90), b, "faint"]];
      for (const [p0, p1, st] of pieces) {
        if (p1 <= p0) continue;
        const x0 = side < 0 ? cx - p1 : cx + p0;
        const x1 = side < 0 ? cx - p0 : cx + p1;
        hseg(x0, x1, yc, st);
      }
    }
  }

  // Sun outline over the visible dome.
  const hc = Math.sqrt(Math.max(0, r * r - (hz - cy) * (hz - cy)));
  g.line(`M${num(cx - hc)} ${hz}A${r} ${r} 0 1 1 ${num(cx + hc)} ${hz}`, "faint");

  // Slices carved crisply in background colour: too thin for the screen alone.
  for (const s of slices) {
    const e0 = s.top - cy, e1 = s.bot - cy;
    const ye = e0 <= 0 && e1 >= 0 ? 0 : Math.min(Math.abs(e0), Math.abs(e1));
    const hw = Math.sqrt(Math.max(0, r * r - ye * ye)) + 1.5;
    g.line(`M${num(cx - hw)} ${num(s.top)}H${num(cx + hw)}V${num(s.bot)}H${num(cx - hw)}Z`,
      "faint", { width: 0, fill: true });
  }
}
