function draw(g, rand, seed, k) {
  // A hanging light bulb just switched off, filament still faintly glowing
  const { clamp, smooth, solid, sdPolyline, inPolygon, polyD } = k;

  // Variation: how far it has cooled, and how far it still sways.
  const th = (rand() * 2 - 1) * 4 * Math.PI / 180;
  const peak = 0.25 + rand() * 0.2;
  const R = 30 + rand() * 14;
  const c = Math.cos(th), s = Math.sin(th);
  const px = 200, py = 40; // pivot at the cord's top
  const rot = ([x, y]) => [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
  const rotAll = (pts) => pts.map(rot);

  // Local geometry (unrotated).
  const cx = 200, cy = 140, r = 48;
  const cubic = (p0, p1, p2, p3, n = 16) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, m = 1 - t;
      out.push([
        m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
        m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
    return out;
  };
  const jx = Math.sqrt(r * r - 30 * 30); // half-width of the circle at y 110
  const B = [cx - jx, 110];
  const tan = [30 / r, -jx / r]; // circle tangent at B, heading up toward the cap
  const neckL = cubic([188, 92], [188, 100], [B[0] + 6 * tan[0], B[1] + 6 * tan[1]], B);
  const neckR = neckL.map(([x, y]) => [400 - x, y]).reverse();
  const aL = Math.atan2(-30, -jx) + 2 * Math.PI, aR = Math.atan2(-30, jx);
  const arc = [];
  for (let i = 1; i < 72; i++) {
    const a = aL + (aR - aL) * (i / 72);
    arc.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const sil = [...neckL, ...arc, ...neckR];

  // Filament: six peaks strung between the support tips.
  const coil = [];
  for (let i = 0; i <= 12; i++) {
    const y = i === 0 || i === 12 ? 138 : 138 + (i % 2 ? -3.5 : 3.5);
    coil.push([186 + (i * 28) / 12, y]);
  }
  const fx = 200, fy = 138;

  // Highlight crescent, concentric with the glass, through (178, 118).
  const hr = Math.hypot(178 - cx, 118 - cy);
  const ha = Math.atan2(118 - cy, 178 - cx);
  const hspan = 18 / hr / 2;

  const ridges = [75.5, 81, 86.5];

  g.print((x, y) => {
    const dx = x - px, dy = y - py;
    const lx = px + dx * c + dy * s, ly = py - dx * s + dy * c;
    if (lx < 145 || lx > 255 || ly < 38 || ly > 194) return 0;

    // Cord
    if (ly < 70) return 0.3 * solid(Math.abs(lx - 200) - 1.5);

    // Screw cap
    if (ly <= 92) {
      if (lx < 188 || lx > 212) return 0;
      let t = 0.45 - 0.25 * clamp((lx - 188) / 24) - 0.04 * clamp((ly - 70) / 22);
      for (const ry of ridges) {
        const ya = ry + 1 - (2 * (lx - 188)) / 24;
        t += 0.1 * solid(Math.abs(ly - ya) - 1.2);
      }
      return clamp(t);
    }

    if (!inPolygon(lx, ly, sil)) return 0;

    // Dark glass, darkest at the lower right.
    const diag = ((lx - cx) + (ly - cy)) / (r * 1.414);
    let ink = 0.12 - 0.04 * clamp((diag + 1) / 2);

    // Residual glow around the coil.
    const rg = Math.max(0, Math.hypot(lx - fx, ly - fy) - 6);
    const gl = peak * (1 - smooth(clamp(rg / R)));
    ink = Math.max(ink, gl);

    // Highlight crescent, brightest at its upper end.
    const hd = Math.abs(Math.hypot(lx - cx, ly - cy) - hr) - 3;
    const da = Math.atan2(ly - cy, lx - cx) - ha;
    if (Math.abs(da) < hspan + 0.08) {
      const u = clamp((da + hspan) / (2 * hspan));
      const along = clamp(1 - (Math.abs(da) - hspan) / 0.08);
      ink = Math.max(ink, 0.55 * (0.3 + 0.7 * u) * solid(hd) * along);
    }

    // Orange: the coil and the warm core of its glow.
    const dc = sdPolyline(lx, ly, coil);
    let org = solid(dc - 1.5);
    if (dc < 10) org = Math.max(org, gl * 1.05 + 0.5 * (1 - dc / 10));
    return [ink, org];
  });

  // Cord
  g.line(polyD(rotAll([[200, 40], [200, 70]])), "soft");
  // Bulb silhouette
  g.line(polyD(rotAll(sil)), "ink");
  // Cap and its threads
  g.line(polyD(rotAll([[188, 70], [212, 70], [212, 92], [188, 92]]), true), "ink");
  for (const ry of ridges) g.line(polyD(rotAll([[188, ry + 1], [212, ry - 1]])), "ink");
  // Support wires
  g.line(polyD(rotAll([[197, 92], [186, 138]])), "soft");
  g.line(polyD(rotAll([[203, 92], [214, 138]])), "soft");
  // Filament coil
  g.line(polyD(rotAll(coil)), "sig", { width: 1.2 });
  // Base reflection, lower right, radius 44, about 40 degrees
  const refl = [];
  const a0 = Math.PI / 4, half = (20 * Math.PI) / 180;
  for (let i = 0; i <= 20; i++) {
    const a = a0 - half + (2 * half * i) / 20;
    refl.push([cx + 44 * Math.cos(a), cy + 44 * Math.sin(a)]);
  }
  g.line(polyD(rotAll(refl)), "faint", { dash: "2 3" });
}
