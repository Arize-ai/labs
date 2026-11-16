function draw(g, rand, seed, k) {
  // A single flower: radial petals, curved stem, leaf, orange centre.
  const { X0, X1, Y0, Y1, clamp, solid, glow, sdPolyline, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);

  const cx = k.W / 2 + (rand() - 0.5) * 10, cy = Y0 + 42;
  const n = 5 + Math.floor(rand() * 3);
  const rot = rand() * Math.PI * 2 / n - Math.PI / 2;
  const a = 17 + rand() * 2;                 // petal half-length
  const b = n === 5 ? 11 : n === 6 ? 9.5 : 8.5; // petal half-width
  const r0 = 5, R = 9;                       // petal start, centre disc radius
  const reach = r0 + 2 * a;

  const petals = Array.from({ length: n }, (_, i) => {
    const t = rot + (i * Math.PI * 2) / n;
    return { c: Math.cos(t), s: Math.sin(t) };
  });
  // Approximate signed distance to an ellipse petal.
  const petalD = (x, y, p) => {
    const dx = x - cx, dy = y - cy;
    const u = dx * p.c + dy * p.s, v = -dx * p.s + dy * p.c;
    const q = Math.hypot((u - r0 - a) / a, v / b);
    return (q - 1) * b;
  };

  // Stem: a gentle cubic from the head down to the ground.
  const sway = (rand() < 0.5 ? -1 : 1) * (8 + rand() * 8);
  const S = [[cx, cy + R], [cx, cy + 50], [cx + sway, Y1 - 36], [cx + sway * 0.5, Y1]];
  const stemAt = (t) => {
    const u = 1 - t;
    return [0, 1].map((j) => u ** 3 * S[0][j] + 3 * u * u * t * S[1][j] + 3 * u * t * t * S[2][j] + t ** 3 * S[3][j]);
  };
  const stem = Array.from({ length: 31 }, (_, i) => stemAt(i / 30));

  // Leaf: a lens off the stem, pointing up and away from the sway.
  const side = sway > 0 ? -1 : 1;
  const anchor = stemAt(0.58);
  const la = 17, lb = 6;
  const lt = side > 0 ? -0.55 : Math.PI + 0.55;
  const leaf = { c: Math.cos(lt), s: Math.sin(lt) };
  const leafD = (x, y) => {
    const dx = x - anchor[0], dy = y - anchor[1];
    const u = dx * leaf.c + dy * leaf.s, v = -dx * leaf.s + dy * leaf.c;
    return (Math.hypot((u - la) / la, v / lb) - 1) * lb;
  };
  const leafTip = [anchor[0] + leaf.c * 2 * la, anchor[1] + leaf.s * 2 * la];
  const lx0 = Math.min(anchor[0], leafTip[0]) - 14, lx1 = Math.max(anchor[0], leafTip[0]) + 14;
  const ly0 = Math.min(anchor[1], leafTip[1]) - 14, ly1 = Math.max(anchor[1], leafTip[1]) + 14;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    const tex = 0.92 + 0.16 * fbm(x / 6, y / 6);
    // Head.
    if (Math.abs(x - cx) < reach + 22 && Math.abs(y - cy) < reach + 22) {
      let dmin = Infinity;
      for (const p of petals) dmin = Math.min(dmin, petalD(x, y, p));
      // Lit from the upper left; a little darker toward the base.
      const shade = 0.6 + 0.32 * clamp(0.5 - (x - cx + (y - cy)) / (2 * reach));
      const rr = Math.hypot(x - cx, y - cy);
      const base = 0.85 + 0.15 * clamp((rr - R) / (2 * a));
      ink = Math.max(ink, solid(dmin) * shade * base * tex, 0.16 * glow(dmin, 7));
      const rd = rr - R;
      sig = solid(rd) + 0.35 * glow(rd, 5);
    }
    // Stem.
    if (y > cy && x > Math.min(cx, cx + sway) - 30 && x < Math.max(cx, cx + sway) + 30) {
      const d = sdPolyline(x, y, stem);
      ink = Math.max(ink, 0.2 * glow(d, 3));
    }
    // Leaf.
    if (x > lx0 && x < lx1 && y > ly0 && y < ly1) {
      const d = leafD(x, y);
      const shade = 0.75 + 0.25 * clamp(0.5 - (x - anchor[0] + (y - anchor[1])) / 60);
      ink = Math.max(ink, 0.42 * solid(d) * shade * tex, 0.12 * glow(d, 5));
    }
    return [ink, sig];
  });

  // Construction circle around the head, and the ground.
  const gr = reach + 6;
  g.line(`M${num(cx - gr)} ${num(cy)}a${gr} ${gr} 0 1 0 ${num(2 * gr)} 0a${gr} ${gr} 0 1 0 ${num(-2 * gr)} 0Z`, "faint", { dash: "1 3" });
  g.line(`M${X0 + 40} ${Y1 + 0.5}H${X1 - 40}`, "faint", { dash: "1 3" });

  // Stem and leaf.
  g.line(polyD(stem), "ink", { width: 1.5 });
  const leafPts = Array.from({ length: 33 }, (_, i) => {
    const t = (i / 32) * Math.PI * 2, u = la + la * Math.cos(t), v = lb * Math.sin(t);
    return [anchor[0] + u * leaf.c - v * leaf.s, anchor[1] + u * leaf.s + v * leaf.c];
  });
  g.line(polyD(leafPts, true), "soft");
  g.line(polyD([anchor, [anchor[0] + leaf.c * 1.7 * la, anchor[1] + leaf.s * 1.7 * la]]), "faint");

  // Petal outlines and midribs.
  for (const p of petals) {
    const pts = Array.from({ length: 33 }, (_, i) => {
      const t = (i / 32) * Math.PI * 2, u = r0 + a + a * Math.cos(t), v = b * Math.sin(t);
      return [cx + u * p.c - v * p.s, cy + u * p.s + v * p.c];
    });
    g.line(polyD(pts, true), "ink");
    g.line(polyD([[cx + p.c * (R + 3), cy + p.s * (R + 3)], [cx + p.c * (r0 + 1.4 * a), cy + p.s * (r0 + 1.4 * a)]]), "faint");
  }

  // The centre: the point of the flower.
  g.line(`M${num(cx - R)} ${num(cy)}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0Z`, "sig");
}
