function draw(g, rand, seed, k) {
  // A single five-petalled flower on a curving stem, botanical plate
  const { clamp, smooth, solid, sdPolyline, polyD, num } = k;
  const cx = 200, cy = 112, DEG = Math.PI / 180;
  const rot = (rand() * 16 - 8);
  const baseAngles = [-90, -18, 54, 126, 198];
  const his = [0.72, 0.68, 0.6, 0.8, 0.8]; // upper-left petals brightest, 54° dimmest
  const Lx = -Math.SQRT1_2, Ly = -Math.SQRT1_2; // light from upper left

  const petals = baseAngles.map((ang, i) => {
    const t = (ang + rot + (rand() * 8 - 4)) * DEG;
    const a = 22 * (1 + (rand() * 0.2 - 0.1)), b = 14;
    const c = Math.cos(t), s = Math.sin(t);
    return { a, b, c, s, x: cx + 28 * c, y: cy + 28 * s, hi: his[i] };
  });
  const petalK = (p, x, y) => {
    const dx = x - p.x, dy = y - p.y;
    const u = dx * p.c + dy * p.s, v = -dx * p.s + dy * p.c;
    return Math.hypot(u / p.a, v / p.b);
  };
  const inHead = (x, y, skip = -1) =>
    Math.hypot(x - cx, y - cy) < 13 || petals.some((p, j) => j !== skip && petalK(p, x, y) < 0.995);

  // Stamens: 12 ticks, tip dots at radius 21.
  const stamens = [];
  for (let i = 0; i < 12; i++) {
    const t = (i * 30 + rot + 15) * DEG;
    stamens.push({ c: Math.cos(t), s: Math.sin(t), tx: cx + 21 * Math.cos(t), ty: cy + 21 * Math.sin(t) });
  }

  // Stem: quadratic through the swaying midpoint.
  const sway = (rand() * 2 - 1) * 6;
  const P0 = [200, 125], M = [206 + sway, 158], P2 = [197, 194];
  const C = [2 * M[0] - (P0[0] + P2[0]) / 2, 2 * M[1] - (P0[1] + P2[1]) / 2];
  const stem = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, m = 1 - t;
    stem.push([m * m * P0[0] + 2 * m * t * C[0] + t * t * P2[0], m * m * P0[1] + 2 * m * t * C[1] + t * t * P2[1]]);
  }
  let base = stem[0];
  for (const p of stem) if (Math.abs(p[1] - 168) < Math.abs(base[1] - 168)) base = p;
  const bx = base[0], by = base[1];

  // Leaf: pointed almond from the stem to its tip.
  const tipX = 242, tipY = 150;
  const LL = Math.hypot(tipX - bx, tipY - by);
  const ax = (tipX - bx) / LL, ay = (tipY - by) / LL;
  const nx = ay, ny = -ax; // normal pointing up
  const leafW = q => 7 * 4 * q * (1 - q);

  g.print((x, y) => {
    if (x < 108 || x > 292 || y < 24 || y > 200) return 0;
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    let ink = 0, or = 0, inside = false;

    // Petals, shaded upper-left bright, cupped toward the disc.
    for (const p of petals) {
      const kk = petalK(p, x, y);
      const s = solid((kk - 1) * p.b);
      if (kk < 1) inside = true;
      if (s <= 0) continue;
      const t = clamp(((x - p.x) * Lx + (y - p.y) * Ly) / p.a, -1, 1);
      let tone = 0.45 + (p.hi - 0.45) * (t + 1) / 2;
      const cup = smooth(clamp((r - 13) / 12));
      tone = 0.4 + (tone - 0.4) * cup;
      ink = Math.max(ink, tone * s);
    }

    // Soft glow around the head.
    if (!inside && r < 85) ink = Math.max(ink, 0.3 * smooth(clamp((85 - r) / 35)));

    // Stem.
    if (!inside && y > cy) {
      const ds = sdPolyline(x, y, stem);
      if (ds < 5) ink = Math.max(ink, 0.4 * solid(ds - 2));
    }

    // Leaf, a little brighter on its upper edge.
    const lx = x - bx, ly = y - by;
    const u = lx * ax + ly * ay;
    if (u > -2 && u < LL + 2) {
      const v = lx * nx + ly * ny;
      const d = Math.abs(v) - leafW(clamp(u / LL));
      const s = solid(d);
      if (s > 0) ink = ink * (1 - s) + (0.35 + 0.08 * clamp(v / 7, -1, 1)) * s;
    }

    // Centre disc: the orange heart.
    if (r < 18) {
      const sd = solid(r - 13);
      if (sd > 0) { or = sd; ink *= 1 - sd; }
    }
    // Stamen tip dots.
    if (r > 15 && r < 27) {
      for (const st of stamens) {
        const sd = solid(Math.hypot(x - st.tx, y - st.ty) - 2.6);
        if (sd > or) or = sd;
      }
    }
    return [ink, or];
  });

  // Petal outlines: only the visible union edge.
  petals.forEach((p, i) => {
    let seg = [];
    const flush = () => { if (seg.length > 1) g.line(polyD(seg), "ink"); seg = []; };
    for (let j = 0; j <= 120; j++) {
      const t = (j / 120) * Math.PI * 2;
      const u = p.a * Math.cos(t), v = p.b * Math.sin(t);
      const x = p.x + u * p.c - v * p.s, y = p.y + u * p.s + v * p.c;
      if (inHead(x, y, i)) flush(); else seg.push([x, y]);
    }
    flush();
    // Midrib from disc edge to 70% of the way to the tip.
    const r1 = 13 + 0.7 * (28 + p.a - 13);
    g.line(`M${num(cx + 13 * p.c)} ${num(cy + 13 * p.s)}L${num(cx + r1 * p.c)} ${num(cy + r1 * p.s)}`, "faint");
  });

  // Stamen ticks and tip dots.
  for (const st of stamens) {
    g.line(`M${num(cx + 13 * st.c)} ${num(cy + 13 * st.s)}L${num(cx + 19 * st.c)} ${num(cy + 19 * st.s)}`, "soft");
    g.line(`M${num(st.tx - 2)} ${num(st.ty)}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`, "sig", { width: 1.2 });
  }
  // Centre disc outline.
  g.line(`M${cx - 13} ${cy}a13 13 0 1 0 26 0a13 13 0 1 0 -26 0`, "ink");

  // Stem line, from where it leaves the head, fading into the bottom edge.
  const vis = stem.filter(([x, y]) => !inHead(x, y));
  if (vis.length > 1) g.fadeLine(polyD(vis), "var(--fg)", 1, 178, 196);

  // Leaf outline and dashed vein.
  const upper = [], lower = [];
  for (let i = 0; i <= 24; i++) {
    const q = i / 24, w = leafW(q), u = q * LL;
    upper.push([bx + ax * u + nx * w, by + ay * u + ny * w]);
    lower.push([bx + ax * u - nx * w, by + ay * u - ny * w]);
  }
  g.line(polyD(upper.concat(lower.reverse()), true), "soft");
  g.line(polyD([[bx + ax * 2, by + ay * 2], [bx + ax * LL * 0.9, by + ay * LL * 0.9]]), "faint", { dash: "2 2" });
}
