function draw(g, rand, seed, k) {
  // A heart built from two circles and a square, construction lines showing
  const { W, H, clamp, solid, glow, sdBox, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const S2 = Math.SQRT2;

  // The classic construction: a square on its point, two circles on its upper edges.
  const h = 54 + rand() * 4;             // centre to vertex of the turned square
  const a = h / S2;                       // the square's half side
  const r = h / S2;                       // the lobes' radius (half the side)
  const cx = W / 2;
  const height = 1.5 * h + r;
  const cy = 125 + height / 2 - h;        // centre the whole heart in the box
  const L = [cx - h / 2, cy - h / 2], R = [cx + h / 2, cy - h / 2];
  const cusp = [cx, cy - h];

  const bx0 = cx - h / 2 - r - 14, bx1 = cx + h / 2 + r + 14;
  const by0 = cy - h / 2 - r - 14, by1 = cy + h + 14;
  const span = (bx1 - bx0) + (by1 - by0);

  const heartD = (x, y) => {
    const dx = x - cx, dy = y - cy;
    const u = (dx + dy) / S2, v = (dy - dx) / S2;
    const sq = sdBox(u, v, 0, 0, a, a);
    const c1 = Math.hypot(x - L[0], y - L[1]) - r;
    const c2 = Math.hypot(x - R[0], y - R[1]) - r;
    return Math.min(sq, c1, c2);
  };

  g.print((x, y) => {
    const od = Math.hypot(x - cusp[0], y - cusp[1]) - 3.5;
    const sig = solid(od) + 0.4 * glow(od, 6);
    if (x < bx0 - 30 || x > bx1 + 30 || y < by0 - 30 || y > by1 + 30) return [0, sig];
    const d = heartD(x, y);
    // Lit from the upper left: the fill brightens toward its top-left.
    const shade = 1 - 0.32 * clamp(((x - bx0) + (y - by0)) / span);
    const n = 0.06 * (fbm(x / 8, y / 8) - 0.5);
    const ink = d < 2 * k.P
      ? solid(d) * clamp(0.9 * shade + n) + 0.2 * glow(d, 9)
      : 0.2 * glow(d, 9);
    return [ink, sig];
  });

  // Construction guides: the square on its point and both full circles.
  const sq = `M${num(cx)} ${num(cy - h)}L${num(cx + h)} ${num(cy)}L${num(cx)} ${num(cy + h)}L${num(cx - h)} ${num(cy)}Z`;
  g.line(sq, "faint", { dash: "1 3" });
  const circle = (c) => {
    const rr = num(r);
    return `M${num(c[0] - r)} ${num(c[1])}a${rr} ${rr} 0 1 0 ${num(2 * r)} 0a${rr} ${rr} 0 1 0 ${num(-2 * r)} 0Z`;
  };
  g.line(circle(L) + circle(R), "faint", { dash: "1 3" });
  // The axis of symmetry, as a threshold rule.
  g.line(`M${Math.round(cx) + 0.5} ${num(by0 - 4)}V${num(by1 + 2)}`, "faint", { dash: "4 3" });

  // The outline: two straight sides and two half circles meeting at the cusp.
  const rr = num(r);
  const outline =
    `M${num(cx)} ${num(cy + h)}L${num(cx - h)} ${num(cy)}` +
    `A${rr} ${rr} 0 0 1 ${num(cusp[0])} ${num(cusp[1])}` +
    `A${rr} ${rr} 0 0 1 ${num(cx + h)} ${num(cy)}Z`;
  g.line(outline, "ink", { width: 1.25 });
}
