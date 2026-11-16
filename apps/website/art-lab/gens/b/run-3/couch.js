function draw(g, rand, seed, k) {
  // An analyst's chaise longue in profile, lit by a reading lamp
  const { clamp, smooth, inPolygon, polyD, num } = k;

  const cubic = (p0, p1, p2, p3, n = 24) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, s = 1 - t;
      out.push([
        s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0],
        s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
    return out;
  };

  // Seat geometry: crowned top, 2 units higher at the middle.
  const xl = 112, xr = 292, xm = (xl + xr) / 2, hw = (xr - xl) / 2;
  const topY = (x) => 142 - 2 * (1 - Math.pow((x - xm) / hw, 2));
  const seamY = (x) => topY(x) + 5;
  const under = 162;

  // Headrest scroll: convex sweep from the seat at x 150 to the crest, then down to x 112.
  const hA = cubic([150, topY(150)], [146, 120], [136, 98], [122, 98]);
  const hB = cubic([122, 98], [114, 98], [112, 118], [112, 142]).slice(1);
  const headPoly = [...hA, ...hB, [112, seamY(112)], [150, seamY(150)]];

  // Bolster: semicircle r 9 at (283, 136), sitting on the seat.
  const bc = [283, 136], br = 9;
  const arc = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI; // 0 → right, π → left, over the top
    arc.push([bc[0] + br * Math.cos(a), bc[1] - br * Math.sin(a)]);
  }

  // Seat top from the bolster back to the headrest.
  const seatTop = [];
  for (let x = 274; x >= 150; x -= 4) seatTop.push([x, topY(x)]);
  seatTop.push([150, topY(150)]);

  // Full outline of the chaise.
  const outline = [
    ...hA, ...hB,
    [112, under], [292, under], [292, topY(292)], [292, 136],
    ...arc.slice(1),
    [274, topY(274)],
    ...seatTop.slice(1, -1),
  ];

  // Legs: tapered, splayed outward.
  const legs = [122, 160, 244, 282].map((cx) => {
    const sp = cx < xm ? -2 : 2;
    return [[cx - 1.5, 162], [cx + 1.5, 162], [cx + sp + 1, 176], [cx + sp - 1, 176]];
  });

  // Pillow: oval 26 × 12, tilted to follow the headrest.
  const tilt = ((15 + rand() * 20) * Math.PI) / 180;
  const pc = [140 + (rand() * 2 - 1) * 4, 117 + (rand() * 2 - 1) * 4];
  const prx = 13, pry = 6, pcs = Math.cos(tilt), psn = Math.sin(tilt);
  const pillowPts = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const lx = prx * Math.cos(a), ly = pry * Math.sin(a);
    pillowPts.push([pc[0] + lx * pcs - ly * psn, pc[1] + lx * psn + ly * pcs]);
  }
  const inPillow = (x, y) => {
    const dx = x - pc[0], dy = y - pc[1];
    const lx = dx * pcs + dy * psn, ly = -dx * psn + dy * pcs;
    return (lx * lx) / (prx * prx) + (ly * ly) / (pry * pry) <= 1;
  };

  // Lamp shade: cone with its mouth facing down and to the right.
  const sc = [108, 68];
  const ang = Math.PI / 6;
  const dir = [Math.sin(ang), Math.cos(ang)];
  const nrm = [Math.cos(ang), -Math.sin(ang)];
  const tc = [sc[0] - 5 * dir[0], sc[1] - 5 * dir[1]];
  const mc = [sc[0] + 5 * dir[0], sc[1] + 5 * dir[1]];
  const shade = [
    [tc[0] - 4 * nrm[0], tc[1] - 4 * nrm[1]],
    [tc[0] + 4 * nrm[0], tc[1] + 4 * nrm[1]],
    [mc[0] + 11 * nrm[0], mc[1] + 11 * nrm[1]],
    [mc[0] - 11 * nrm[0], mc[1] - 11 * nrm[1]],
  ];
  const rimR = shade[2], rimL = shade[3];

  // Beam axis from the mouth toward the headrest.
  const spread = 1 + (rand() * 2 - 1) * 0.1;
  const tgt = [137, 137];
  const bl = Math.hypot(tgt[0] - mc[0], tgt[1] - mc[1]);
  const u = [(tgt[0] - mc[0]) / bl, (tgt[1] - mc[1]) / bl];
  const beam = (x, y) => {
    const dx = x - mc[0], dy = y - mc[1];
    const a = dx * u[0] + dy * u[1];
    if (a < -2) return 0;
    const p = dx * u[1] - dy * u[0];
    const w = spread * (4 + Math.max(a, 0) * 0.32);
    const cone = Math.exp(-(p * p) / (w * w));
    const along = a < 60 ? 1 - 0.5 * (Math.max(a, 0) / 60) : 0.5 * clamp(1 - (a - 60) / 45);
    const fade = smooth(clamp((200 - x) / 50)) * smooth(clamp((150 - y) / 12));
    return cone * along * fade;
  };

  g.print((x, y) => {
    if (x < 88 || x > 300 || y < 52 || y > 180) return 0;

    // Lamp shade outer surface.
    if (inPolygon(x, y, shade)) return 0.35;

    // Pillow: the warm point.
    if (inPillow(x, y)) return [0.2, 0.8];

    // Legs.
    for (const L of legs) if (inPolygon(x, y, L)) return 0.2;

    if (inPolygon(x, y, outline)) {
      const seam = seamY(x);
      if (y >= seam) return 0.25; // seat front face
      if (x < 150 && inPolygon(x, y, headPoly)) {
        // Headrest: bright crest and lit face, darker along the lower inner curve.
        const s = clamp(((y - 100) / 40) * 0.7 + ((x - 112) / 38) * 0.3);
        return 0.75 - 0.35 * smooth(s);
      }
      if (x > 274 && y < topY(x)) {
        return x < bc[0] && y < bc[1] ? 0.3 : 0.15; // bolster
      }
      // Seat top band, sitting in the lamp's falloff.
      return 0.6 - 0.3 * clamp((x - xl) / (xr - xl));
    }

    // Air: the lamp's cone of light.
    return beam(x, y);
  });

  // Chaise outline and seam.
  g.line(polyD(outline, true), "ink");
  const seamPts = [];
  for (let x = 112; x <= 292; x += 6) seamPts.push([x, seamY(x)]);
  seamPts.push([292, seamY(292)]);
  g.line(polyD(seamPts), "soft");

  // Legs.
  for (const L of legs) g.line(polyD(L, true), "soft");

  // Tufting marks on the seat front.
  for (const tx of [180, 210, 240]) {
    const ty = (seamY(tx) + under) / 2 - 2.5;
    g.line(`M${num(tx + 0.5)} ${num(ty)}V${num(ty + 5)}`, "faint");
  }

  // Floor line.
  g.line(`M88 176.5H312`, "faint");

  // Lamp: stem and arm, then the shade.
  g.line(`M98.5 176V74`, "soft");
  g.line(`M98.5 74Q98.5 ${num(tc[1])} ${num(tc[0])} ${num(tc[1])}`, "soft");
  g.line(polyD(shade, true), "ink");

  // Beam edges, dashed rays from the rim.
  const ray = (a, b, f = 0.85) => [a, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]];
  g.line(polyD(ray(rimR, [150, 140])), "faint", { dash: "4 3" });
  g.line(polyD(ray(rimL, [125, 135])), "faint", { dash: "4 3" });

  // Pillow outline in orange, last so it sits on top.
  g.line(polyD(pillowPts, true), "sig");
}
