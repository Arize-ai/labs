function draw(g, rand, seed, k) {
  // A lighthouse at night with its lamp gone dark
  const { clamp, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed);
  const cx = 200, horizon = 170;

  // Tower: a trapezoid from y 90 (28 wide) to y 168 (44 wide).
  const tTop = 90, tBot = 168;
  const halfAt = (y) => 14 + ((y - tTop) / (tBot - tTop)) * 8;

  // Lamp room, dome, core.
  const lrX0 = 187, lrX1 = 213, lrY0 = 70, lrY1 = 87;
  const domeTop = (x) => { const t = (x - lrX0) / 26; return 70 - 32 * t * (1 - t); };
  const core = [200, 79];

  // Moon.
  const moon = [122, 76], mr = 15;

  // Rock mound: irregular top contour, base just below the horizon.
  const mound = [];
  for (let x = 165; x <= 235; x += 2.5) {
    const t = (x - cx) / 35;
    const h = 10 * Math.pow(clamp(1 - t * t), 0.6) * (0.85 + 0.3 * fbm(x / 5, 3.7));
    mound.push([x, 175 - h]);
  }
  const moundTop = (x) => {
    if (x < 165 || x > 235) return 999;
    const i = Math.min(mound.length - 2, Math.floor((x - 165) / 2.5));
    const a = mound[i], b = mound[i + 1], f = (x - a[0]) / (b[0] - a[0]);
    return a[1] + (b[1] - a[1]) * f;
  };

  // Moon's reflection: broken horizontal clusters in bands one lattice row tall.
  const bands = [];
  for (let y = 172; y < 192; y += 3.2) {
    const t = (y - 172) / 20;
    if (rand() < 0.2 + 0.15 * t) continue; // breaks in the column
    const segs = [];
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      segs.push([moon[0] + (rand() - 0.5) * 16 * (1 + 0.3 * t), 3.5 + rand() * 3.5]);
    }
    bands.push({ y0: y, y1: y + 3.2, tone: 0.5 - 0.4 * t, segs });
  }

  // Ghost beam: varied spread and dashes.
  const spread = (rand() - 0.5) * 8;
  const endA = [306, 62 - spread], endB = [306, 98 + spread];

  g.print((x, y) => {
    // Moon and its glow.
    if (x < 175 && y < 125) {
      const d = Math.hypot(x - moon[0], y - moon[1]) - mr;
      return d <= 0 ? 1 : 0.5 * glow(d, 8);
    }
    // Reflection on the water.
    if (x < 150 && y > 171 && y < 193) {
      for (const b of bands) {
        if (y >= b.y0 && y < b.y1) {
          for (const [sx, hl] of b.segs) {
            if (Math.abs(x - sx) < hl) return b.tone * (0.85 + 0.3 * fbm(x / 4, y / 4));
          }
        }
      }
      return 0;
    }
    if (x < 160 || x > 240 || y < 55 || y > 178) return 0;

    // Lamp room: an unlit hollow, only the ember.
    if (x >= lrX0 && x <= lrX1 && y >= lrY0 && y <= lrY1) {
      const d = Math.hypot(x - core[0], y - core[1]) - 3.5;
      return [0, 0.75 * solid(d)];
    }
    // Dome.
    if (x >= lrX0 && x <= lrX1 && y < lrY0 && y > domeTop(x)) {
      return 0.4 - 0.25 * clamp((x - lrX0) / 26);
    }
    // Gallery ledge.
    if (Math.abs(y - 89.5) < 2.2 && Math.abs(x - cx) < 19) return 0.6;
    // Tower.
    if (y >= tTop && y <= tBot) {
      const h = halfAt(y);
      if (Math.abs(x - cx) <= h) {
        const u = (x - (cx - h)) / (2 * h);
        const fade = u > 0.8 ? 1 - (u - 0.8) * 3 : 1;
        return (0.55 - 0.35 * u) * fade;
      }
    }
    // Rock mound, breaking into pinpricks.
    if (y > moundTop(x) && y < 175) {
      return fbm(x / 2.5, y / 2.5) > 0.5 ? 0.3 : 0.06;
    }
    return 0;
  });

  // Horizon, with a gap where the rock and tower meet it.
  g.line(`M90 ${horizon + 0.5}H165M235 ${horizon + 0.5}H310`, "soft");
  // Mound contour, either side of the tower.
  g.line(polyD(mound.filter((p) => p[0] <= 178)), "soft");
  g.line(polyD(mound.filter((p) => p[0] >= 222)), "soft");

  // Tower edges.
  g.line(`M${cx - 22} ${tBot}L${cx - 14} ${tTop}`, "ink");
  g.line(`M${cx + 22} ${tBot}L${cx + 14} ${tTop}`, "ink");
  // Gallery ledge and lamp room.
  g.box(181, 88, 38, 3, "ink");
  g.box(lrX0, lrY0, lrX1 - lrX0, lrY1 - lrY0, "ink");
  // Glazing bars, leaving the core clear.
  for (const bx of [191.5, 195.5, 204.5, 208.5]) g.line(`M${bx} ${lrY0}V${lrY1}`, "soft");
  // Dome and finial.
  g.line(`M${lrX0} ${lrY0}Q200 54 ${lrX1} ${lrY0}`, "ink");
  g.line(`M200.5 62V57`, "ink");

  // The ember, crisp so it never falls between dots.
  g.line(`M${core[0] - 3} ${core[1]}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`, "sig");

  // Moon outline.
  g.line(`M${moon[0] - mr} ${moon[1]}a${mr} ${mr} 0 1 0 ${2 * mr} 0a${mr} ${mr} 0 1 0 ${-2 * mr} 0`, "soft");

  // Ghost beam: two faint dashed rays from the core.
  for (const e of [endA, endB]) {
    const dx = e[0] - core[0], dy = e[1] - core[1], L = Math.hypot(dx, dy);
    const sx = core[0] + (dx / L) * 5, sy = core[1] + (dy / L) * 5;
    const dash = `${num(2 + rand() * 3)} ${num(3 + rand() * 2)}`;
    g.line(`M${num(sx)} ${num(sy)}L${num(e[0])} ${num(e[1])}`, "faint", { dash });
  }
}
