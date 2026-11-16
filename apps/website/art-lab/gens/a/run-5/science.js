function draw(g, rand, seed, k) {
  // An Erlenmeyer flask of liquid, one orange bubble rising from the neck
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 200;
  const neckTop = 60, shoulder = 102, base = 186;
  const nw = 11, bw = 58;
  // Outline of the flask, with rounded bottom corners
  const outline = [
    [cx - nw, neckTop], [cx - nw, shoulder], [cx - bw + 1, base - 12], [cx - bw, base - 7],
    [cx - bw + 3, base - 2], [cx - bw + 8, base], [cx + bw - 8, base], [cx + bw - 3, base - 2],
    [cx + bw, base - 7], [cx + bw - 1, base - 12], [cx + nw, shoulder], [cx + nw, neckTop],
  ];
  const closed = outline.concat([outline[0]]);
  const level = Math.round(128 + rand() * 14);
  const wallX = (y, side) => cx + side * (nw + (bw - 1 - nw) * clamp((y - shoulder) / (base - 12 - shoulder)));

  // Bubbles suspended in the liquid
  const bubbles = [];
  for (let tries = 0; tries < 60 && bubbles.length < 5; tries++) {
    const r = 1.8 + rand() * 2.4;
    const y = level + 8 + rand() * (base - level - 18);
    const span = wallX(y, 1) - cx - r - 6;
    const x = cx + (rand() * 2 - 1) * span * 0.8;
    if (bubbles.some((b) => Math.hypot(b.x - x, b.y - y) < b.r + r + 5)) continue;
    bubbles.push({ x, y, r });
  }
  // The one that has risen out: the point of the figure
  const ob = { x: cx + (rand() - 0.5) * 4, y: 80 + rand() * 6, r: 3.6 };

  g.print((x, y) => {
    const od = Math.hypot(x - ob.x, y - ob.y) - ob.r;
    const sig = solid(od) + 0.4 * glow(od, 6);
    if (x < cx - bw - 14 || x > cx + bw + 14 || y < neckTop - 12 || y > base + 10) return [0, sig];
    const inside = inPolygon(x, y, outline);
    const dw = sdPolyline(x, y, closed);
    const sd = inside ? -dw : dw;
    let ink = 0;
    if (inside && y >= level - 1) {
      // Liquid, lit from the upper left
      const u = clamp((x - (cx - bw)) / (2 * bw)), v = clamp((y - level) / (base - level));
      let t = solid(Math.max(sd, level - y)) * (0.95 - 0.28 * u - 0.18 * v);
      t += 0.06 * (fbm(x / 7, y / 7) - 0.5);
      for (const b of bubbles) if (Math.hypot(x - b.x, y - b.y) < b.r + 1.2) t = 0;
      ink = t;
    } else if (inside) {
      // Empty glass: light rising off the surface, a highlight on the left wall
      ink = 0.16 * Math.exp(-(level - y) / 10);
      if (x < cx && -sd > 3 && -sd < 6.5 && y > neckTop + 6) ink = Math.max(ink, 0.16);
    } else {
      ink = 0.12 * glow(sd, 5) * clamp((y - level + 20) / 30);
    }
    return [ink, sig];
  });

  const circle = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;

  // Bench
  g.line(`M${k.X0} ${base + 0.5}H${k.X1}`, "faint");
  // Glass, and its lip
  g.line(polyD(outline), "ink", { width: 1.25 });
  g.line(`M${cx - nw - 4} ${neckTop + 0.5}H${cx + nw + 4}`, "ink", { width: 1.5 });
  // Meniscus
  g.line(`M${num(wallX(level, -1) + 1.5)} ${level + 0.5}H${num(wallX(level, 1) - 1.5)}`, "ink");
  // Graduations on the right wall
  for (let y = 120; y <= 170; y += 16) {
    const wx = Math.round(wallX(y, 1)) - 3.5;
    g.line(`M${wx} ${y + 0.5}h${y === 152 ? -12 : -7}`, "soft");
  }
  for (const b of bubbles) g.line(circle(b.x, b.y, b.r), "soft");
  // The rising path and the bubble that got out
  g.line(`M${num(ob.x) }.5 ${level - 3}V${num(ob.y + ob.r + 4)}`, "faint", { dash: "1 3" });
  g.line(circle(ob.x, ob.y, ob.r), "sig");
}
