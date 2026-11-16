function draw(g, rand, seed, k) {
  // A crescent moon breathing thought bubbles up to one dream
  const { clamp, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);

  // The moon: a disc with an offset disc cut out, opening to the upper right.
  const c1 = [150 + (rand() - 0.5) * 6, 138], r1 = 46;
  const ang = -0.62 + (rand() - 0.5) * 0.2, off = 24;
  const c2 = [c1[0] + Math.cos(ang) * off, c1[1] + Math.sin(ang) * off], r2 = 40;

  // Thought bubbles rising from the moon's open side, then the dream.
  const jx = (rand() - 0.5) * 6, jy = (rand() - 0.5) * 4;
  const bubbles = [
    { x: 201 + jx * 0.3, y: 113 + jy * 0.3, r: 3.5 },
    { x: 216 + jx * 0.6, y: 99 + jy * 0.6, r: 6 },
  ];
  const dream = { x: 256 + jx, y: 88 + jy, r: 25 };
  const spark = { x: dream.x + 2, y: dream.y + 1, r: 5.5 };

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Crescent.
    const d1 = Math.hypot(x - c1[0], y - c1[1]) - r1;
    const d2 = Math.hypot(x - c2[0], y - c2[1]) - r2;
    const d = Math.max(d1, -d2);
    if (d < 40) {
      // Lit from the upper left; a little surface mottling.
      const t = clamp(((x - c1[0]) + (y - c1[1])) / (2.4 * r1) + 0.5);
      const shade = 0.95 - 0.32 * t - 0.12 * (fbm(x / 7, y / 7) - 0.5);
      ink = Math.max(ink, solid(d) * shade + 0.2 * glow(d, 10));
      // The unlit disc, barely there.
      if (d1 < 0 && d2 < 0) ink = Math.max(ink, 0.07);
    }
    // Small bubbles.
    for (const b of bubbles) {
      const bd = Math.hypot(x - b.x, y - b.y) - b.r;
      if (bd < 20) ink = Math.max(ink, 0.55 * solid(bd) + 0.16 * glow(bd, 4));
    }
    // The dream: a pale pool with the orange spark inside it.
    const dd = Math.hypot(x - dream.x, y - dream.y) - dream.r;
    if (dd < 40) {
      const inner = dd < 0 ? 0.13 + 0.1 * Math.exp(dd / 6) : 0.18 * glow(dd, 8);
      ink = Math.max(ink, inner);
      const sd = Math.hypot(x - spark.x, y - spark.y) - spark.r;
      sig = solid(sd) + 0.4 * glow(sd, 7) * (dd < 0 ? 1 : 0.4);
    }
    return [ink, sig];
  });

  // Crescent outline: the outer arc of the moon, then the inner arc of the cut.
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], dist = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const a = (r1 * r1 - r2 * r2 + dist * dist) / (2 * dist);
  const alpha = Math.acos(clamp(a / r1, -1, 1));
  const N = 64, outer = [];
  for (let i = 0; i <= N; i++) {
    const t = phi + alpha + ((2 * Math.PI - 2 * alpha) * i) / N;
    outer.push([c1[0] + r1 * Math.cos(t), c1[1] + r1 * Math.sin(t)]);
  }
  const beta = Math.acos(clamp((dist - a) / r2, -1, 1));
  let inner = [];
  for (let i = 0; i <= 32; i++) {
    const t = phi + Math.PI - beta + (2 * beta * i) / 32;
    inner.push([c2[0] + r2 * Math.cos(t), c2[1] + r2 * Math.sin(t)]);
  }
  const end = outer[outer.length - 1];
  const dA = Math.hypot(inner[0][0] - end[0], inner[0][1] - end[1]);
  const dB = Math.hypot(inner[32][0] - end[0], inner[32][1] - end[1]);
  if (dB < dA) inner = inner.reverse();
  g.line(polyD(outer.concat(inner), true), "ink", { width: 1.25 });

  // The moon's hidden limb, as a dotted guide.
  const hidden = [];
  for (let i = 0; i <= 24; i++) {
    const t = phi - alpha + (2 * alpha * i) / 24;
    hidden.push([c1[0] + r1 * Math.cos(t), c1[1] + r1 * Math.sin(t)]);
  }
  g.line(polyD(hidden), "faint", { dash: "1 3" });

  // Bubble outlines.
  const circle = (c, r) =>
    `M${num(c.x - r)} ${num(c.y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
  for (const b of bubbles) g.line(circle(b, b.r), "soft");
  g.line(circle(dream, dream.r), "ink");
  g.line(circle(dream, dream.r - 3), "faint");
}
