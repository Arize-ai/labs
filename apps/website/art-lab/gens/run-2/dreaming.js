function draw(g, rand, seed, k) {
  // A crescent moon dreaming a thought cloud, with an orange spark inside
  const { clamp, solid, glow, polyD, num } = k;

  // The moon: a crescent cut from one circle by another, opening toward the cloud.
  const jit = (rand() - 0.5) * 6;
  const C = [150, 142 + jit], R = 42;
  const B = [C[0] + 20, C[1] - 14], r = 36;
  const dMoon = (x, y) => Math.max(Math.hypot(x - C[0], y - C[1]) - R, -(Math.hypot(x - B[0], y - B[1]) - r));

  // The cloud: a union of circles.
  const cl = [
    [232, 98, 14], [252, 82, 19], [276, 84, 16], [294, 98, 12],
    [262, 102, 14], [244, 104, 11], [280, 104, 11],
  ].map(([x, y, rr]) => [x + (rand() - 0.5) * 3, y + (rand() - 0.5) * 3, rr]);
  const dCloud = (x, y) => {
    let d = Infinity;
    for (const [cx, cy, rr] of cl) d = Math.min(d, Math.hypot(x - cx, y - cy) - rr);
    return d;
  };

  // The bubbles that rise from the moon to the cloud.
  const bubbles = [[193, 128, 3.5], [205, 118, 5.5]];

  // A few small stars in the night, kept clear of the subject.
  const stars = [];
  for (let n = 0; n < 40 && stars.length < 5; n++) {
    const sx = 96 + rand() * 120, sy = 60 + rand() * 50;
    if (dMoon(sx, sy) > 10 && dCloud(sx, sy) > 12 && Math.hypot(sx - 205, sy - 118) > 14) stars.push([sx, sy]);
  }

  // The dream: one orange spark at the cloud's heart.
  const spark = [262, 93];

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // The moon, lit from the upper left.
    if (x > 90 && x < 210 && y > 80 && y < 205) {
      const d = dMoon(x, y);
      const shade = 1 - 0.3 * clamp(((x - (C[0] - R)) + (y - (C[1] - R))) / (4 * R));
      ink = Math.max(ink, solid(d) * 0.92 * shade + 0.2 * glow(d, 9));
    }
    // The cloud: a pale fill, brighter toward its top left, with a soft halo.
    if (x > 200 && x < 330 && y > 50 && y < 135) {
      const d = dCloud(x, y);
      const shade = 0.2 - 0.08 * clamp(((x - 215) + (y - 62)) / 120);
      ink = Math.max(ink, solid(d) * shade + 0.12 * glow(d, 6));
      const sd = Math.hypot(x - spark[0], y - spark[1]) - 4.5;
      sig = solid(sd) + 0.42 * glow(sd, 7);
    }
    for (const [bx, by, br] of bubbles) {
      const d = Math.hypot(x - bx, y - by) - br;
      if (d < 12) ink = Math.max(ink, solid(d) * 0.45 + 0.1 * glow(d, 4));
    }
    for (const [sx, sy] of stars) {
      const d = Math.hypot(x - sx, y - sy) - 1.4;
      if (d < 8) ink = Math.max(ink, solid(d) * 0.8 + 0.15 * glow(d, 3));
    }
    return [ink, sig];
  });

  // The crescent's outline: its outer arc, then back along the inner arc.
  const dx = B[0] - C[0], dy = B[1] - C[1], dd = Math.hypot(dx, dy);
  const a = (R * R - r * r + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(R * R - a * a, 0));
  const angB = Math.atan2(dy, dx), phi = Math.atan2(h, a), psi = Math.atan2(h, a - dd);
  const pts = [];
  const N = 64;
  for (let n = 0; n <= N; n++) {
    const t = angB + phi + ((2 * Math.PI - 2 * phi) * n) / N;
    pts.push([C[0] + R * Math.cos(t), C[1] + R * Math.sin(t)]);
  }
  for (let n = 0; n <= N; n++) {
    const t = angB + 2 * Math.PI - psi - ((2 * Math.PI - 2 * psi) * n) / N;
    pts.push([B[0] + r * Math.cos(t), B[1] + r * Math.sin(t)]);
  }
  g.line(polyD(pts, true), "ink", { width: 1.25 });

  // The cloud's outline: each circle's arc where no other circle covers it.
  cl.forEach(([cx, cy, rr], i) => {
    const M = 72;
    const keep = [];
    for (let n = 0; n < M; n++) {
      const t = (2 * Math.PI * n) / M, px = cx + rr * Math.cos(t), py = cy + rr * Math.sin(t);
      keep.push(cl.every(([ox, oy, orr], j) => j === i || Math.hypot(px - ox, py - oy) > orr) ? [px, py] : null);
    }
    let start = keep.findIndex((p) => !p);
    if (start < 0) start = 0;
    let run = [];
    for (let s = 1; s <= M + 1; s++) {
      const p = keep[(start + s) % M];
      if (p) run.push(p);
      else {
        if (run.length > 1) g.line(polyD(run), "ink");
        run = [];
      }
    }
    if (run.length > 1) g.line(polyD(run), "ink");
  });

  // The bubbles, outlined.
  for (const [bx, by, br] of bubbles) {
    const rr = num(br);
    g.line(`M${num(bx - br)} ${num(by)}a${rr} ${rr} 0 1 0 ${num(2 * br)} 0a${rr} ${rr} 0 1 0 ${num(-2 * br)} 0Z`, "soft");
  }

  // A dotted horizon the moon rests above.
  g.line(`M${k.X0} ${Math.round(k.Y1) + 0.5}H${k.X1}`, "faint", { dash: "1 3" });
}
