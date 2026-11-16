function draw(g, rand, seed, k) {
  // Binary star pair circling the empty point they share
  const { clamp, solid, polyD, num } = k;
  const cx = 200, cy = 125;
  const rot = (rand() * 2 - 1) * (18 * Math.PI / 180);
  const phase = (rand() * 2 - 1) * 0.22;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const R = (ox, oy) => [cx + ox * cr - oy * sr, cy + ox * sr + oy * cr];

  // Orbits: inner 35 × 12 (large star), outer 58 × 20 (small star), rotated together.
  const ellPt = (a, b, t) => R(a * Math.cos(t), b * Math.sin(t));
  const L = ellPt(35, 12, Math.PI + phase), rL = 20;
  const S = ellPt(58, 20, phase), rS = 12;

  // Unit axis from large star to small star, and its perpendicular.
  const ax = S[0] - L[0], ay = S[1] - L[1], alen = Math.hypot(ax, ay);
  const ux = ax / alen, uy = ay / alen;

  const bg = [[112, 78], [291, 171], [238, 66]].map(([x, y]) => [x + (rand() * 2 - 1) * 10, y + (rand() * 2 - 1) * 10]);

  const coreTone = (x, y, c, r, peak) => {
    // Lit from the upper left: lower-right rim drops by 0.15.
    const p = clamp(((x - c[0]) + (y - c[1])) / (r * Math.SQRT2), -1, 1);
    return peak - 0.075 * (1 + p);
  };

  g.print((x, y) => {
    let ink = 0;
    for (const [bx, by] of bg) if (Math.hypot(x - bx, y - by) < 2.4) ink = 0.5;

    const dL = Math.hypot(x - L[0], y - L[1]);
    const dS = Math.hypot(x - S[0], y - S[1]);
    if (dL > 56 && dS > 39) return ink;

    if (dL < rL + 1.5) {
      const s = solid(dL - rL);
      return Math.max(ink, s * coreTone(x, y, L, rL, 1.0) + (1 - s) * 0.7);
    }
    if (dS < rS + 1.5) {
      const s = solid(dS - rS);
      return Math.max(ink, s * coreTone(x, y, S, rS, 0.9) + (1 - s) * 0.6);
    }

    // Glows: fast falloff near the rim, lingering, reaching zero at their radius.
    const uL = clamp((dL - rL) / (55 - rL)), uS = clamp((dS - rS) / (38 - rS));
    let glowT = 0.7 * (1 - uL) * (1 - uL) + 0.6 * (1 - uS) * (1 - uS);

    // Bridge: a band along the axis between the stars, brightening toward the centre.
    const rx = x - L[0], ry = y - L[1];
    const along = rx * ux + ry * uy, perp = Math.abs(-rx * uy + ry * ux);
    if (along > rL && along < alen - rS) {
      const toC = Math.hypot(x - cx, y - cy);
      const band = Math.exp(-(perp * perp) / (2 * 7 * 7));
      glowT += band * (0.08 + 0.07 * Math.exp(-toC / 18));
      glowT = Math.min(glowT, band > 0.5 ? 0.42 : glowT);
    }

    // The hollow where the orange point sits.
    const dC = Math.hypot(x - cx, y - cy);
    if (dC < 6) glowT = 0.15;
    const orange = solid(dC - 3);

    return [Math.max(ink, glowT), orange];
  });

  // Dashed orbits, broken where they pass behind either star disc.
  const orbit = (a, b) => {
    const n = 160, runs = [];
    let cur = [];
    for (let i = 0; i <= n; i++) {
      const p = ellPt(a, b, (i / n) * Math.PI * 2);
      const hidden = Math.hypot(p[0] - L[0], p[1] - L[1]) < rL + 2.5 || Math.hypot(p[0] - S[0], p[1] - S[1]) < rS + 2.5;
      if (hidden) { if (cur.length > 1) runs.push(cur); cur = []; }
      else cur.push(p);
    }
    if (cur.length > 1) runs.push(cur);
    for (const r of runs) g.line(polyD(r), "soft", { dash: "3 3" });
  };
  orbit(35, 12);
  orbit(58, 20);

  // The axis joining the centres, stopping at each disc's rim.
  const a0 = [L[0] + ux * rL, L[1] + uy * rL], a1 = [S[0] - ux * rS, S[1] - uy * rS];
  g.line(polyD([a0, a1]), "faint");

  // Crosshair at the barycentre.
  g.line(`M${num(cx - 5)} ${num(cy)}H${num(cx + 5)}M${num(cx)} ${num(cy - 5)}V${num(cy + 5)}`, "faint");

  // Crisp outlines of the two cores.
  const circ = (c, r) => `M${num(c[0] - r)} ${num(c[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  g.line(circ(L, rL), "ink");
  g.line(circ(S, rS), "ink");
}
