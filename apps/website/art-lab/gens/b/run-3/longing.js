function draw(g, rand, seed, k) {
  // A jetty that stops short of a distant light across still water
  const { clamp, solid, sdBox, inPolygon, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);

  const lx = 250, ly = 97, hy = 100;
  const nearY = 194, farY = 138;
  const leftAt = (y) => 160 + (54 * (nearY - y)) / 56;
  const rightAt = (y) => 210 + (24 * (nearY - y)) / 56;
  const deck = [[160, nearY], [214, farY], [234, farY], [210, nearY]];

  // Reflection: a narrowing streak broken into ripple dashes.
  const tip = 128 + rand() * 6;
  const span = tip - 104;
  const n = span >= 27 && rand() < 0.6 ? 5 : 4;
  const gaps = [];
  for (let i = 0; i < n - 1; i++) gaps.push(3 + rand() * 0.6);
  const weights = [];
  for (let i = 0; i < n; i++) weights.push(0.75 + rand() * 0.5);
  const gapSum = gaps.reduce((a, b) => a + b, 0);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const dashLen = span - gapSum;
  const dashes = [];
  let cur = 104;
  for (let i = 0; i < n; i++) {
    const len = (dashLen * weights[i]) / wSum;
    const a = cur, b = i === n - 1 ? tip : cur + len;
    const cy = (a + b) / 2;
    const t = clamp((cy - 104) / span);
    const hw = (4.5 - 2.5 * t) * (0.9 + rand() * 0.3);
    dashes.push({ cx: lx + (rand() - 0.5) * 2.5, cy, hh: (b - a) / 2, hw });
    cur = b + (gaps[i] || 0);
  }

  // Posts under both side edges, every ~11 units along each edge.
  const posts = [];
  const addPosts = (x0, y0, x1, y1, dx) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let s = 3; s <= len - 1; s += 10 + rand() * 2) {
      const f = s / len;
      const px = x0 + (x1 - x0) * f + dx, py = y0 + (y1 - y0) * f;
      const h = 6 - 4 * ((nearY - py) / (nearY - farY));
      posts.push({ x: px, y: py, h });
    }
  };
  addPosts(160, nearY, 214, farY, -0.5);
  addPosts(210, nearY, 234, farY, 0.5);

  g.print((x, y) => {
    let ink = 0, orange = 0;

    // The distant light, its glow, and its reflection.
    if (x > 205 && x < 295 && y > 60 && y < 140) {
      const dx = x - lx, dy = y - ly;
      const below = y > hy;
      const e = Math.hypot(dx / 40, dy / (below ? 22 : 30));
      if (e < 1) ink = Math.max(ink, 0.6 * Math.pow(1 - e, 1.6) * (below ? 0.5 : 1));
      const core = solid(Math.hypot(dx, dy) - 3);
      ink = Math.max(ink, core);
      orange = Math.max(orange, core);

      if (Math.abs(dx) < 12 && y > 100 && y < 138) {
        for (const d of dashes) {
          const s = solid(sdBox(x, y, d.cx, d.cy, d.hw, d.hh));
          if (s <= 0) continue;
          const t = clamp((y - 104) / span);
          const tone = (0.7 - 0.45 * t) * s;
          ink = Math.max(ink, tone);
          if (t < 1 / 3) orange = Math.max(orange, tone + 0.05);
        }
      }
    }

    // The jetty deck and its posts.
    if (x > 150 && x < 245 && y > 132 && y < 204) {
      if (inPolygon(x, y, deck)) {
        const t = clamp((nearY - y) / (nearY - farY));
        const mid = (leftAt(y) + rightAt(y)) / 2;
        const side = x < mid ? 0.05 : -0.05;
        ink = Math.max(ink, 0.45 - 0.2 * t + side + 0.05 * (fbm(x / 7, y / 3) - 0.5));
      }
      for (const p of posts) {
        if (Math.abs(x - p.x) > 4) continue;
        ink = Math.max(ink, 0.2 * solid(sdBox(x, y, p.x, p.y + p.h / 2, 1.2, p.h / 2)));
      }
    }

    return [ink, orange];
  });

  // Horizon, broken around the light.
  g.line(`M84 ${hy + 0.5}H${lx - 20}`, "soft");
  g.line(`M${lx + 20} ${hy + 0.5}H316`, "soft");

  // A crisp orange point so the light always lands.
  g.line(`M${lx - 2} ${ly}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`, "sig", { width: 1.2 });

  // Jetty deck: side edges and far end, near edge left open.
  g.line(polyD(deck), "ink");

  // Posts.
  for (const p of posts) g.line(`M${num(p.x)} ${num(p.y)}V${num(p.y + p.h)}`, "faint");

  // Ripples beside the jetty's end, kept out of the gap.
  const count = 2 + Math.floor(rand() * 3);
  let side = rand() < 0.5 ? 0 : 1;
  const used = [0, 0];
  for (let i = 0; i < count; i++) {
    const slot = used[side]++;
    const y = 139.5 + slot * 4 + rand() * 1.5;
    const w = 10 + rand() * 10;
    let xs, xe;
    if (side === 0) {
      xe = leftAt(y) - 4 - rand() * 6;
      xs = xe - w;
    } else {
      xs = rightAt(y) + 5 + rand() * 12;
      xe = xs + w;
    }
    g.line(`M${num(xs)} ${num(y) + 0.5}H${num(xe)}`, "faint");
    side = 1 - side;
  }

  // The sightline: the path that cannot be walked.
  const sx = 224, sy = farY, ex = lx, ey = ly;
  const L = Math.hypot(ex - sx, ey - sy);
  const ux = (ex - sx) / L, uy = (ey - sy) / L;
  g.line(
    `M${num(sx + ux * 2)} ${num(sy + uy * 2)}L${num(ex - ux * 6)} ${num(ey - uy * 6)}`,
    "faint",
    { dash: "1 8" }
  );
}
