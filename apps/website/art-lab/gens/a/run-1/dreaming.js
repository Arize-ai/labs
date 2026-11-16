function draw(g, rand, seed, k) {
  // A crescent moon breathing thought bubbles toward one orange dream
  const { clamp, solid, glow, polyD, num, X0, X1, Y0, Y1 } = k;
  const TAU = Math.PI * 2;

  // The moon: a disc with an offset disc cut away, so the crescent opens to the upper right.
  const jx = (rand() - 0.5) * 6, jy = (rand() - 0.5) * 4;
  const M = { x: 150 + jx, y: 136 + jy, r: 46 };
  const C = { x: M.x + 21, y: M.y - 14, r: 41 };

  // Thought bubbles rising from the moon's open side, with the dream in the last.
  const bubbles = [
    { x: 207 + jx, y: 134 + jy, r: 2.6 },
    { x: 221 + jx, y: 122 + jy, r: 4.2 },
    { x: 238 + jx, y: 110 + jy, r: 6.6 },
  ];
  const big = { x: 272 + jx * 0.5, y: 88 + jy * 0.5, r: 23 };
  const a = rand() * TAU;
  const dream = { x: big.x + Math.cos(a) * 4, y: big.y + Math.sin(a) * 3, r: 4.5 };

  // A few stars scattered in the quiet parts of the box.
  const stars = [];
  for (let t = 0; t < 40 && stars.length < 6; t++) {
    const s = { x: X0 + 8 + rand() * (X1 - X0 - 16), y: Y0 + 6 + rand() * (Y1 - Y0 - 12) };
    const far = (o, m) => Math.hypot(s.x - o.x, s.y - o.y) > o.r + m;
    if (far(M, 16) && far(big, 14) && bubbles.every((b) => far(b, 12)) && stars.every((o) => Math.hypot(s.x - o.x, s.y - o.y) > 30)) stars.push(s);
  }

  const circ = (x, y, o) => Math.hypot(x - o.x, y - o.y) - o.r;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Moon: the crescent solid, lit from the upper left; the dark side a faint earthshine.
    if (x > M.x - M.r - 50 && x < M.x + M.r + 50 && y > M.y - M.r - 50 && y < M.y + M.r + 50) {
      const dm = circ(x, y, M), dc = circ(x, y, C);
      const d = Math.max(dm, -dc);
      const shade = 1 - 0.28 * clamp((x - (M.x - M.r) + (y - (M.y - M.r))) / (3 * M.r));
      ink = Math.max(ink, 0.93 * shade * solid(d) + 0.22 * glow(d, 10), 0.13 * solid(dm));
    }
    // Bubbles: pale fills that grow as they rise.
    for (const b of bubbles) {
      const d = circ(x, y, b);
      if (d < 8) ink = Math.max(ink, 0.45 * solid(d));
    }
    const db = circ(x, y, big);
    if (db < 30) ink = Math.max(ink, 0.12 * solid(db) + 0.1 * glow(db, 5));
    // The dream.
    const dd = circ(x, y, dream);
    if (dd < 40) sig = solid(dd) + 0.42 * glow(dd, 7);
    for (const s of stars) {
      const d = Math.hypot(x - s.x, y - s.y) - 1.4;
      if (d < 4) ink = Math.max(ink, 0.6 * solid(d));
    }
    return [ink, sig];
  });

  // Crescent outline: the outer arc of the moon, then the inner arc of the cut.
  const N = 64;
  const ac = Math.atan2(C.y - M.y, C.x - M.x) + Math.PI;
  const outer = [];
  for (let i = 0; i <= N * 2; i++) {
    const t = ac - Math.PI + (TAU * i) / (N * 2);
    const p = [M.x + M.r * Math.cos(t), M.y + M.r * Math.sin(t)];
    if (Math.hypot(p[0] - C.x, p[1] - C.y) >= C.r) outer.push(p);
  }
  const bc = Math.atan2(M.y - C.y, M.x - C.x);
  let inner = [];
  for (let i = 0; i <= N * 2; i++) {
    const t = bc - Math.PI + (TAU * i) / (N * 2);
    const p = [C.x + C.r * Math.cos(t), C.y + C.r * Math.sin(t)];
    if (Math.hypot(p[0] - M.x, p[1] - M.y) <= M.r) inner.push(p);
  }
  const last = outer[outer.length - 1];
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  if (inner.length && dist(last, inner[0]) > dist(last, inner[inner.length - 1])) inner = inner.reverse();
  g.line(polyD(outer.concat(inner), true), "ink", { width: 1.25 });

  // The moon's dark side, as a dotted guide.
  const ring = (o, n = 48) => Array.from({ length: n + 1 }, (_, i) => [o.x + o.r * Math.cos((TAU * i) / n), o.y + o.r * Math.sin((TAU * i) / n)]);
  g.line(polyD(inner.length ? ring(M).filter((p) => dist(p, [C.x, C.y]) < C.r) : []), "faint", { dash: "1 3" });

  // Bubble rules: soft for the small ones, ink for the dream bubble, a dotted orbit inside it.
  for (const b of bubbles) g.line(polyD(ring(b, 24), true), "soft");
  g.line(polyD(ring(big, 64), true), "ink");
  g.line(polyD(ring({ x: big.x, y: big.y, r: big.r - 8 }, 48), true), "faint", { dash: "1 3" });
  g.line(`M${num(dream.x - dream.r - 2.5)} ${num(dream.y)}a${num(dream.r + 2.5)} ${num(dream.r + 2.5)} 0 1 0 ${num(2 * dream.r + 5)} 0a${num(dream.r + 2.5)} ${num(dream.r + 2.5)} 0 1 0 ${num(-2 * dream.r - 5)} 0Z`, "sig");
}
