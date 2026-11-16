function draw(g, rand, seed, k) {
  // A bare tree on still water, its reflection holding a moon
  const { clamp, smooth, solid, sdBox, sdPolyline, makeNoise, num } = k;
  const fbm = makeNoise(seed);
  const cx = 196, wl = 126, forkY = 92;

  // ---- Grow the tree: trunk, three limbs, branches, then twigs to a target count.
  const segs = []; // { a, b, d, ang }
  const inDome = (p) => ((p[0] - cx) / 53) ** 2 + ((p[1] - wl) / 60) ** 2 <= 1 && p[1] < wl - 6;
  const grow = (p, ang, len, d) => {
    ang = clamp(ang, -Math.PI + 0.2, -0.2);
    let b = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
    while (!inDome(b) && len > 2) {
      len *= 0.88;
      b = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
    }
    const s = { a: p, b, d, ang };
    segs.push(s);
    return s;
  };
  const base = [-2.25, -1.57, -0.89];
  const limbs = base.map((a, i) =>
    grow([cx, forkY], a + (rand() - 0.5) * 0.4, (i === 1 ? 18 : 15) + rand() * 6, 0));
  for (const L of limbs) {
    const n1 = 2 + (rand() < 0.5 ? 1 : 0);
    const sp1 = 0.45 + rand() * 0.3;
    const len1 = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]);
    for (let i = 0; i < n1; i++) {
      const B = grow(L.b, L.ang + sp1 * (i - (n1 - 1) / 2) + (rand() - 0.5) * 0.25, len1 * (0.65 + rand() * 0.25), 1);
      const n2 = 2 + (rand() < 0.35 ? 1 : 0);
      const sp2 = 0.35 + rand() * 0.3;
      for (let j = 0; j < n2; j++) {
        grow(B.b, B.ang + sp2 * (j - (n2 - 1) / 2) + (rand() - 0.5) * 0.3, 6 + rand() * 9, 2);
      }
    }
  }
  const target = 20 + Math.floor(rand() * 16);
  let twigs = segs.filter((s) => s.d >= 2).length, guard = 0;
  while (twigs < target && guard++ < 200) {
    const pool = segs.filter((s) => s.d === 1 || s.d === 2);
    const s = pool[Math.floor(rand() * pool.length)];
    const t = 0.4 + rand() * 0.5;
    const p = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
    const side = rand() < 0.5 ? -1 : 1;
    grow(p, s.ang + side * (0.5 + rand() * 0.4), 4 + rand() * 7, 3);
    twigs++;
  }

  // ---- Distances to the tree (mass = trunk + main limbs; all = every branch).
  const massD = (x, y) => {
    let d = sdBox(x, y, cx, (wl + forkY) / 2, 2.5, (wl - forkY) / 2);
    for (const L of limbs) d = Math.min(d, sdPolyline(x, y, [L.a, L.b]) - 2.3);
    return d;
  };
  const fine = segs.filter((s) => s.d >= 1);
  const allD = (x, y) => {
    let d = massD(x, y);
    for (const s of fine) {
      if (Math.min(s.a[1], s.b[1]) - 3 > y || Math.max(s.a[1], s.b[1]) + 3 < y) continue;
      d = Math.min(d, sdPolyline(x, y, [s.a, s.b]) - (s.d === 1 ? 1.8 : 1.4));
    }
    return d;
  };

  // ---- Reflection mapping, with a small wobble that grows with depth.
  const ph = rand() * 6.28;
  const wob = (ry) => 0.9 * Math.sin((ry - wl) / 3 + ph) * clamp((ry - wl) / 20);
  const refl = (p) => {
    const ry = wl + (wl - p[1]) * 0.9;
    return [p[0] + 2 + wob(ry), ry];
  };

  // ---- Moon and ripples.
  const mx = 232 + (rand() - 0.5) * 20, my = 160 + (rand() - 0.5) * 12, mr = 11;
  const ripples = [];
  const nr = 5 + (rand() < 0.5 ? 1 : 0);
  for (let i = 0; i < nr; i++) {
    const len = 10 + rand() * 20;
    let xc = mx + (rand() - 0.5) * 70;
    const y = clamp(my + (rand() - 0.5) * 40, 140, 180);
    if (Math.abs(y - my) < mr + 3 && Math.abs(xc - mx) < len / 2 + mr + 2) {
      xc = mx + Math.sign(xc - mx || 1) * (len / 2 + mr + 4);
    }
    const x0 = clamp(xc - len / 2, 90, 310 - len);
    ripples.push([x0, x0 + len, Math.round(y)]);
  }

  g.print((x, y) => {
    if (x < 80 || x > 320 || y < 60 || y > 192) return 0;

    // Above the waterline: only the tree's soft silhouette.
    if (y <= wl) {
      if (x < 186 || x > 206) {
        if (x < 140 || x > 256 || y < 62) return 0;
      }
      const d0 = massD(x, y);
      if (d0 > 3) return 0;
      const lit = clamp((d0 - massD(x + 1.5, y + 1.5)) / 2.1);
      return solid(d0) * (0.33 + 0.1 * lit);
    }

    // Water band, fading at the sides and the bottom, broken into streaks.
    const fx = smooth(clamp((x - 84) / 55)) * smooth(clamp((316 - x) / 55));
    const fy = 1 - smooth(clamp((y - 174) / 12));
    const s = ((y - wl) / 9.6 + 0.7 * fbm(x / 25, y / 8)) % 1;
    const water = s < 0.3 ? 0 : 0.12 * fx * fy;

    // Reflected tree, looked up in source coordinates.
    const sy = wl - (y - wl) / 0.9;
    const sx = x - 2 - wob(y);
    const R = sx > 138 && sx < 258 ? solid(massD(sx, sy)) * 0.2 : 0;

    // Moonlight: a flat ellipse, zero at 45 across and 28 tall.
    const e = Math.hypot((x - mx) / 1.6, y - my);
    const md = Math.hypot(x - mx, y - my) - mr;
    let G = 0;
    if (md < 0) G = 0.6;
    else if (e < 28) G = 0.6 * (1 - smooth(clamp((e - mr) / (28 - mr))));

    let ink = Math.max(water, R);
    let org = 0;
    if (G > 0.02 || md < 2) {
      const O = sx > 138 && sx < 258 ? solid(allD(sx, sy)) : 0;
      ink = Math.max(ink, G) * (1 - O) + O * R;
      org = solid(md) * (1 - 0.6 * O);
    }
    return [ink, org];
  });

  // ---- Waterline, fading out at both ends.
  const wy = wl + 0.5;
  g.line(`M104 ${wy}H296`, "ink");
  g.line(`M94 ${wy}H104M296 ${wy}H306`, "soft");
  g.line(`M84 ${wy}H94M306 ${wy}H316`, "faint");

  // ---- Tree lines, tapering by depth.
  const widths = [1.5, 1.0, 0.7, 0.5];
  const seg = (a, b) => `M${num(a[0])} ${num(a[1])}L${num(b[0])} ${num(b[1])}`;
  g.line(`M${cx} ${wl}V${forkY}`, "soft", { width: 2.2 });
  for (const s of segs) g.line(seg(s.a, s.b), "soft", { width: widths[s.d] });

  // ---- Reflected lines: faint, dashed, subdivided so the wobble shows.
  const reflPath = (a, b, n) => {
    let d = "";
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = refl([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      d += `${i ? "L" : "M"}${num(p[0])} ${num(p[1])}`;
    }
    return d;
  };
  g.line(reflPath([cx, wl], [cx, forkY], 6), "faint", { width: 1.8, dash: "3 2" });
  for (const s of segs) g.line(reflPath(s.a, s.b, 3), "faint", { width: widths[s.d] * 0.9, dash: "3 2" });

  // ---- Ripples.
  for (const [x0, x1, y] of ripples) g.line(`M${num(x0)} ${y + 0.5}H${num(x1)}`, "faint");

  // ---- Moon rim, in orange.
  g.line(`M${num(mx - mr)} ${num(my)}a${mr} ${mr} 0 1 0 ${2 * mr} 0a${mr} ${mr} 0 1 0 ${-2 * mr} 0`, "sig");
}
