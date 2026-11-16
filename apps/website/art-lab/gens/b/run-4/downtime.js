function draw(g, rand, seed, k) {
  // A lighthouse with its lamp dark, set against a rising moon
  const { clamp, solid, glow, sdBox, sdPolyline, inPolygon, polyD, num } = k;

  // Moon, with its height varying by up to 8 units either way.
  const mcx = 232, R = 40;
  const mcy = 104 + (rand() * 2 - 1) * 8;
  const horizon = 170;

  // The ember's brightness, a moment earlier or later in the outage.
  const ember = 0.8 + rand() * 0.2;
  const ex = 178, ey = 81;

  // Tower silhouette parts.
  const tower = [[161, 170], [195, 170], [189, 94], [167, 94]];
  const domePts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    // Two quadratic halves: (169,72) to (178,62) to (187,72).
    let x, y;
    if (t <= 0.5) {
      const s = t * 2;
      x = (1 - s) * (1 - s) * 169 + 2 * (1 - s) * s * 169 + s * s * 178;
      y = (1 - s) * (1 - s) * 72 + 2 * (1 - s) * s * 63 + s * s * 62;
    } else {
      const s = (t - 0.5) * 2;
      x = (1 - s) * (1 - s) * 178 + 2 * (1 - s) * s * 187 + s * s * 187;
      y = (1 - s) * (1 - s) * 62 + 2 * (1 - s) * s * 63 + s * s * 72;
    }
    domePts.push([x, y]);
  }
  const domePoly = domePts.concat([[187, 73], [169, 73]]);

  // Rocks: an irregular mound across x 143 to 213, at most 10 tall.
  const rockXs = [143, 150, 157, 165, 173, 181, 189, 197, 205, 213];
  const rockTop = rockXs.map((x, i) => {
    if (i === 0 || i === rockXs.length - 1) return [x, horizon];
    const t = (x - 143) / 70;
    const h = 8.5 * Math.pow(Math.sin(Math.PI * t), 0.6) + (rand() - 0.5) * 3;
    return [x + (rand() - 0.5) * 2, horizon - clamp(h, 1.5, 10)];
  });
  const rockPoly = rockTop.slice();
  // The faces that slope down to the right catch the moonlight.
  const catchSegs = [];
  for (let i = 0; i < rockTop.length - 1; i++) {
    const p = rockTop[i], q = rockTop[i + 1];
    if (q[1] >= p[1] && p[0] > 170) catchSegs.push([p, q]);
  }

  // Moon-path dashes: rows below the horizon, widening and dimming with depth.
  const dashes = [];
  let ry = 173 + rand() * 1.2;
  while (ry < 193) {
    const t = clamp((ry - 172) / 20);
    const halfW = 20 + 15 * t;
    const tone = 0.5 - 0.35 * t;
    let x = mcx - halfW + rand() * 4;
    while (x < mcx + halfW - 6) {
      const len = 7 + rand() * 10;
      const x1 = Math.min(x + len, mcx + halfW);
      if (x1 - x >= 6.5) dashes.push([ry, x, x1, tone]);
      x = x1 + 2.5 + rand() * 5;
    }
    ry += 3.3 + rand() * 1.4;
  }
  const inSilhouette = (x, y) => {
    if (y > 171 || y < 56) return false;
    if (y >= 94 && inPolygon(x, y, tower)) return true;
    if (sdBox(x, y, 178, 91, 15, 3) < 0.8) return true;   // gallery and rail band
    if (sdBox(x, y, 178, 80, 9, 8) < 0.8) return true;    // lantern room
    if (y < 73 && inPolygon(x, y, domePoly)) return true; // dome
    if (Math.abs(x - 178) < 1.5 && y >= 57 && y < 63) return true; // finial
    return false;
  };

  g.print((x, y) => {
    if (x < 86 || x > 314) return 0;

    // The ember: the only orange, held at least a dot's reach wide.
    let orange = 0;
    const edist = Math.hypot(x - ex, y - ey) - 1.5;
    if (edist < 8) orange = ember * (solid(edist) + 0.5 * glow(Math.max(edist, 0), 2.5));

    // Tower, gallery, lantern and dome: dark, so they read as a silhouette.
    if (inSilhouette(x, y)) return [0, orange];

    let ink = 0;

    // Moon and its glow, in the sky only.
    if (y < horizon - 1) {
      const dm = Math.hypot(x - mcx, y - mcy) - R;
      if (dm < 50) {
        const u = ((x - mcx) + (y - mcy)) / (R * 2.83);
        const shade = 0.875 + 0.15 * clamp(u, -0.5, 0.5) * -1;
        const halo = dm > 0 ? 0.4 * Math.pow(clamp(1 - dm / 45), 1.6) : 0;
        ink = Math.max(solid(dm) * shade, halo);
      }
    }

    // Rocks.
    if (y > 158 && y <= horizon + 0.5 && x > 142 && x < 214 && inPolygon(x, y, rockPoly)) {
      ink = 0.1;
      for (const s of catchSegs) {
        if (sdPolyline(x, y, s) < 4) { ink = 0.22; break; }
      }
    }

    // Moon-path: broken horizontal dashes on the water.
    if (y > horizon + 1 && Math.abs(x - mcx) < 38) {
      for (const [dy, x0, x1, tone] of dashes) {
        if (Math.abs(y - dy) < 2 && x >= x0 && x <= x1) { ink = tone; break; }
      }
    }

    return [ink, orange];
  });

  // Moon rim, faint, drawn first so the tower can hide it.
  g.line(`M${num(mcx - R)} ${num(mcy)}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0`, "faint");

  // Horizon, broken where the rocks and tower stand.
  g.line(`M90 ${horizon + 0.5}H${num(rockTop[0][0])}`, "soft");
  g.line(`M${num(rockTop[rockTop.length - 1][0])} ${horizon + 0.5}H310`, "soft");

  // Swell lines on the open water, clear of the moon-path.
  const slots = [177, 180, 183, 186, 189];
  for (let i = 0; i < 6; i++) {
    const sy = slots[i % slots.length] + (rand() - 0.5) * 1.5;
    const halfW = 20 + 15 * clamp((sy - 172) / 20);
    const len = 20 + rand() * 20;
    let x0;
    if (i % 2 === 0) {
      const lo = 92, hi = mcx - halfW - 6 - len;
      x0 = lo + rand() * Math.max(hi - lo, 0);
    } else {
      const lo = mcx + halfW + 6, hi = 308 - len;
      x0 = lo + rand() * Math.max(hi - lo, 0);
    }
    g.line(`M${num(x0)} ${num(sy)}H${num(x0 + len)}`, "faint", { dash: "4 3" });
  }

  // Rock silhouette top edge.
  g.line(polyD(rockTop), "soft");

  // Tower shaft: fill hides the moon rim behind it, then the outline.
  g.line(polyD(tower, true), "ink", { fill: true });

  // Gallery platform and its low rail.
  g.line(`M163 92H193V94H163Z`, "ink", { fill: true });
  g.line(`M163.5 88.5H192.5`, "ink");
  for (let px = 163.5; px <= 193; px += 5) g.line(`M${px} 88.5V92`, "ink");

  // Lantern room with its three panes, left dark except for the ember.
  g.box(169, 72, 18, 16, "ink");
  g.line(`M175.5 72V88`, "ink");
  g.line(`M181.5 72V88`, "ink");

  // Dome and finial.
  g.line(`M169 72Q169 63 178 62Q187 63 187 72`, "ink", { fill: true });
  g.line(`M178 62V58`, "ink");
}
