function draw(g, rand, seed, k) {
  // A conical flask, half full, one orange bubble rising free
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const cx = 200;
  const nl = cx - 13, nr = cx + 13, neckY = 104, baseY = 190, bw = 62;
  const poly = [
    [cx - 17, 60], [cx + 17, 60], [cx + 17, 63], [nr, 65], [nr, neckY],
    [cx + bw, 182], [cx + bw - 5, baseY], [cx - bw + 5, baseY], [cx - bw, 182],
    [nl, neckY], [nl, 65], [cx - 17, 63],
  ];
  const ring = poly.concat([poly[0]]);
  // Wall x on each side at height y (body only).
  const wallL = (y) => nl - ((y - neckY) * (nl - (cx - bw))) / (182 - neckY);
  const wallR = (y) => nr + ((y - neckY) * (cx + bw - nr)) / (182 - neckY);

  const level = 138 + Math.round(rand() * 10);
  const depth = baseY - level;

  // Bubbles suspended in the liquid.
  const bubbles = [];
  for (let n = 0; n < 5 && bubbles.length < 4; n++) {
    const by = level + 10 + rand() * (depth - 20);
    const r = 2.6 + rand() * 1.6;
    const lo = wallL(Math.min(by, 182)) + r + 8, hi = wallR(Math.min(by, 182)) - r - 8;
    const bx = lo + rand() * (hi - lo);
    if (bubbles.every((b) => Math.hypot(b.x - bx, b.y - by) > b.r + r + 6)) bubbles.push({ x: bx, y: by, r });
  }
  // The one that got away: rising through the empty glass above the surface.
  const ob = { x: cx + (rand() - 0.5) * 14, y: level - 16 - rand() * 8, r: 4 };

  g.print((x, y) => {
    const od = Math.hypot(x - ob.x, y - ob.y) - ob.r;
    const sig = solid(od) + 0.4 * glow(od, 6);
    if (x < cx - bw - 24 || x > cx + bw + 24 || y < 48 || y > baseY + 18) return [0, sig];
    const inside = inPolygon(x, y, poly);
    const dist = sdPolyline(x, y, ring);
    const d = inside ? -dist : dist;
    let ink = 0;
    if (y > level) {
      if (inside) {
        // Liquid, lit from the upper left.
        const u = clamp((x - (cx - bw)) / (2 * bw)), v = clamp((y - level) / depth);
        ink = 0.88 - 0.22 * u - 0.2 * v;
        // A brighter band just under the surface.
        ink += 0.08 * Math.exp(-(y - level) / 4);
        for (const b of bubbles) {
          const bd = Math.hypot(x - b.x, y - b.y) - b.r;
          if (bd < 2) ink = Math.min(ink, 0.08 + 0.7 * clamp(bd / 2));
        }
        ink *= solid(d + 1.2);
      } else {
        ink = 0.14 * glow(d, 5);
      }
    } else if (inside) {
      // Empty glass: a faint sheen along the walls, stronger to the left.
      const left = x < cx ? 1 : 0.45;
      ink = 0.22 * left * Math.exp(-dist / 3);
    }
    return [ink, sig];
  });

  const circle = (x, y, r) =>
    `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;

  // Bench under the flask.
  g.line(`M${k.X0} ${baseY + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
  // Graduations on the left wall.
  for (let y = 120; y <= 180; y += 15) {
    const x = wallL(y) + 2;
    g.line(`M${num(x)} ${y + 0.5}h${y % 30 === 0 ? 10 : 6}`, "soft");
  }
  // Highlight inside the neck.
  g.line(`M${nl + 3.5} 70V${neckY - 4}`, "faint");
  // The surface, with a slight meniscus at the walls.
  const sl = wallL(level), sr = wallR(level);
  g.line(polyD([[sl, level - 2], [sl + 5, level + 0.5], [sr - 5, level + 0.5], [sr, level - 2]]), "ink");
  for (const b of bubbles) g.line(circle(b.x, b.y, b.r), "soft");
  // The flask itself.
  g.line(polyD(poly, true), "ink", { width: 1.25 });
  // The bubble's path up from the surface, and the bubble.
  g.line(`M${num(ob.x)} ${level - 3}V${num(ob.y + ob.r + 3)}`, "faint", { dash: "1 3" });
  g.line(circle(ob.x, ob.y, ob.r), "sig");
}
