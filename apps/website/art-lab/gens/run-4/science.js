function draw(g, rand, seed, k) {
  // An Erlenmeyer flask half full, one orange drop falling in.
  const { clamp, smooth, makeNoise, sdPolyline, inPolygon, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 200, neckHW = 13, neckTop = 72, shoulder = 110, baseY = 188, baseHW = 60;
  const slopeEnd = baseY - 6;
  const hwAt = (y) => y < shoulder ? neckHW : neckHW + (baseHW - neckHW) * clamp((y - shoulder) / (slopeEnd - shoulder));
  const poly = [
    [cx - neckHW, neckTop], [cx + neckHW, neckTop], [cx + neckHW, shoulder],
    [cx + baseHW, slopeEnd], [cx + baseHW - 4, baseY], [cx - baseHW + 4, baseY],
    [cx - baseHW, slopeEnd], [cx - neckHW, shoulder],
  ];
  const ring = poly.concat([poly[0]]);
  const level = 140 + rand() * 12;
  const lhw = hwAt(level);

  // Bubbles rising through the liquid.
  const bubbles = [];
  const nb = 5 + Math.floor(rand() * 3);
  for (let b = 0; b < nb && bubbles.length < 12; b++) {
    const y = level + 8 + rand() * (baseY - level - 16);
    const span = hwAt(y) - 12;
    const r = 1.8 + rand() * 2.4;
    const x = cx + (rand() * 2 - 1) * span * 0.8;
    bubbles.push([x, y, r]);
  }

  const drop = [cx, 58 + rand() * 3], dropR = 3.4;

  g.print((x, y) => {
    let sig = 0;
    const dd = Math.hypot(x - drop[0], (y - drop[1]) * 0.85) - dropR;
    if (dd < 30) sig = solid(dd) + 0.4 * glow(dd, 6);
    if (x < cx - baseHW - 30 || x > cx + baseHW + 30 || y < neckTop - 20 || y > baseY + 20) return [0, sig];
    const d = sdPolyline(x, y, ring);
    const inside = inPolygon(x, y, poly);
    const s = inside ? -d : d;
    // Liquid: the glass clipped below the surface, lit from the upper left.
    const ls = Math.max(s, level - y);
    const u = clamp((x - (cx - baseHW)) / (2 * baseHW));
    const v = clamp((y - level) / (baseY - level));
    let liquid = solid(ls) * (0.9 - 0.28 * u - 0.12 * v + 0.08 * (fbm(x / 7, y / 7) - 0.5));
    for (const [bx, by, br] of bubbles) {
      const cd = Math.hypot(x - bx, y - by) - br;
      if (cd < 2) liquid *= 1 - 0.75 * solid(cd);
    }
    let ink = Math.max(liquid, 0.2 * glow(ls, 7));
    if (inside && y < level) {
      // Empty glass: a faint tint and a highlight down the left wall.
      const wall = Math.abs(x - (cx - hwAt(y) + 5));
      ink = Math.max(ink, 0.07 + 0.22 * Math.exp(-wall / 2) * smooth(clamp((y - neckTop) / 20)));
    }
    return [ink, sig];
  });

  const circle = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;

  // Bench, guide from the drop, glass, lip, surface, bubbles, graduations.
  g.line(`M${k.X0} ${baseY + 0.5}H${k.X1}`, "faint");
  g.line(`M${cx + 0.5} ${num(drop[1] + dropR + 3)}V${num(level - 3)}`, "faint", { dash: "1 3" });
  g.line(polyD(poly.slice(1)) , "ink", { width: 1.25 });
  g.line(polyD([poly[7], poly[0]]), "ink", { width: 1.25 });
  g.line(`M${cx - neckHW - 4} ${neckTop + 0.5}H${cx + neckHW + 4}`, "ink", { width: 1.5 });
  g.line(`M${num(cx - lhw + 1)} ${num(level) + 0.5}H${num(cx + lhw - 1)}`, "ink");
  for (const [bx, by, br] of bubbles) g.line(circle(bx, by, br), "soft");
  for (let t = 0; t < 4; t++) {
    const y = Math.round(128 + t * 14) + 0.5;
    const xr = cx + hwAt(y) - 4;
    g.line(`M${num(xr - (t % 2 ? 6 : 10))} ${y}H${num(xr)}`, "soft");
  }
  g.line(circle(drop[0], drop[1], dropR), "sig");
}
