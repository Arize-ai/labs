function draw(g, rand, seed, k) {
  // A heart drawn as a geometric construction, with one orange point at its core
  const { W, H, clamp, solid, glow, sdBox, makeNoise, num } = k;
  const fbm = makeNoise(seed + 11);
  const R2 = Math.SQRT2;

  // Construction: a square turned 45°, with circles on its two upper edges.
  const s = 66 + rand() * 8;
  const h = s / R2;
  const r = s / 2;
  const cx = W / 2;
  const cy = H / 2 + (1.5 * h + r) / 2 - h;
  const T = [cx, cy - h], B = [cx, cy + h], L = [cx - h, cy], R = [cx + h, cy];
  const cl = [cx - h / 2, cy - h / 2], cr = [cx + h / 2, cy - h / 2];
  const top = cy - h / 2 - r, bottom = cy + h;
  const left = cx - h / 2 - r, right = cx + h / 2 + r;

  const core = [cx, cy - h * 0.12];
  const coreR = 3.6;

  const heart = (x, y) => {
    const dx = x - cx, dy = y - cy;
    const u = (dx + dy) / R2, v = (dy - dx) / R2;
    const dd = sdBox(u, v, 0, 0, s / 2, s / 2);
    const dl = Math.hypot(x - cl[0], y - cl[1]) - r;
    const dr = Math.hypot(x - cr[0], y - cr[1]) - r;
    return Math.min(dd, dl, dr);
  };

  g.print((x, y) => {
    if (x < left - 70 || x > right + 70 || y < top - 60 || y > bottom + 60) return 0;
    const d = heart(x, y);
    let ink;
    if (d < 0) {
      // Lit from the upper left: the fill brightens toward that lobe.
      const t = clamp((x - left + (y - top)) / ((right - left) + (bottom - top)));
      ink = solid(d) * (0.97 - 0.4 * t + 0.1 * (fbm(x / 7, y / 7) - 0.5));
    } else {
      ink = 0.24 * glow(d, 8) + 0.07 * glow(d, 28);
    }
    // The core: knocked out of the fill, printed in orange.
    const dc = Math.hypot(x - core[0], y - core[1]) - coreR;
    ink *= clamp((dc - 3) / 3);
    const sig = solid(dc) + 0.35 * glow(dc, 5) * (dc > 0 ? clamp(dc / 3) : 1);
    return [ink, sig];
  });

  const p = ([x, y]) => `${num(x)} ${num(y)}`;
  const circle = ([x, y], rr) =>
    `M${num(x - rr)} ${num(y)}a${num(rr)} ${num(rr)} 0 1 0 ${num(2 * rr)} 0a${num(rr)} ${num(rr)} 0 1 0 ${num(-2 * rr)} 0Z`;

  // Construction guides: the turned square, both circles, the axes through its centre.
  g.line(`M${p(T)}L${p(R)}L${p(B)}L${p(L)}Z`, "faint", { dash: "4 3" });
  g.line(circle(cl, r), "faint", { dash: "1 3" });
  g.line(circle(cr, r), "faint", { dash: "1 3" });
  g.line(`M${num(left - 26)} ${Math.round(cy) + 0.5}H${num(right + 26)}`, "faint", { dash: "1 3" });
  g.line(`M${Math.round(cx) + 0.5} ${num(top - 14)}V${num(bottom + 14)}`, "faint", { dash: "1 3" });

  // Centres of the two circles, as small ticks.
  for (const c of [cl, cr]) {
    g.line(`M${num(c[0] - 3)} ${num(c[1])}H${num(c[0] + 3)}M${num(c[0])} ${num(c[1] - 3)}V${num(c[1] + 3)}`, "soft");
  }

  // The heart's outline: two tangent edges and two semicircles.
  g.line(
    `M${p(B)}L${p(L)}A${num(r)} ${num(r)} 0 0 1 ${p(T)}A${num(r)} ${num(r)} 0 0 1 ${p(R)}Z`,
    "ink",
    { width: 1.25 },
  );
}
