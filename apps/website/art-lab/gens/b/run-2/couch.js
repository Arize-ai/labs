function draw(g, rand, seed, k) {
  // A mid-century sofa in side elevation with one orange cushion
  const { clamp, smooth, solid, sdBox, sdPolyline, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Variation
  const tiltDeg = 8 + rand() * 12;
  const th = (tiltDeg * Math.PI) / 180;
  const cs = Math.cos(th), sn = Math.sin(th);
  const slide = rand() * 10;
  const sag = 0.11 + rand() * 0.08;
  const sagC = [148, 200, 252].map((c) => c + (rand() - 0.5) * 6);
  const hx = 182 + (rand() - 0.5) * 8, hy = 118 + (rand() - 0.5) * 6;

  // Backrest bow
  const topY = (x) => 100 - 3 * (1 - Math.pow(clamp((x - 200) / 72, -1, 1), 2));

  // Cushion: rounded square, half 13, corner radius 5, leaning in the left corner
  const ext = 8 * (cs + sn) + 5;
  const ccx = 135 + ext + slide, ccy = 140 - ext + 3;
  const toWorld = (lx, ly) => [ccx + cs * lx - sn * ly, ccy + sn * lx + cs * ly];
  const cushPts = [];
  const corners = [[8, -8, -Math.PI / 2], [8, 8, 0], [-8, 8, Math.PI / 2], [-8, -8, Math.PI]];
  for (const [ox, oy, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      cushPts.push(toWorld(ox + 5 * Math.cos(a), oy + 5 * Math.sin(a)));
    }
  }
  const cushSd = (x, y) => {
    const dx = x - ccx, dy = y - ccy;
    return sdBox(cs * dx + sn * dy, -sn * dx + cs * dy, 0, 0, 13, 13, 5);
  };

  const legs = [120, 148, 252, 280];
  const arms = [[122, true], [278, false]];

  g.print((x, y) => {
    if (x < 60 || x > 325 || y < 48 || y > 192) return 0;
    const lay = (tone, c) => { ink = ink * (1 - c) + tone * c; };

    // Wall halo: faint pool of lamplight
    const e = Math.hypot((x - hx) / 115, (y - hy) / 65);
    let ink = e < 1 ? 0.2 * (1 - smooth(e)) : 0;
    // Floor shadow: no light at all
    if (Math.hypot((x - 206) / 95, (y - 178) / 4) < 1) ink = 0;

    // Backrest
    if (x > 120 && x < 280 && y > 92 && y < 146) {
      const yAdj = y + (100 - topY(x)) * clamp((130 - y) / 30);
      const d = sdBox(x, yAdj, 200, 120, 72, 20, 4);
      if (d < 3) {
        const t = clamp((y - 100) / 40);
        const tone = 0.75 - 0.3 * t + 0.06 * clamp(1 - (x - 128) / 50) * (1 - t) - 0.05 * clamp((x - 200) / 72);
        lay(tone, solid(d));
      }
    }

    // Seat block
    if (x > 116 && x < 284 && y > 136 && y < 168) {
      const d = sdBox(x, y, 200, 152, 78, 12, 4);
      if (d < 3) {
        let top = 0.6;
        for (const c of sagC) top -= sag * Math.exp(-Math.pow((x - c) / 13, 2));
        const front = 0.35 - 0.04 * clamp((x - 200) / 78);
        const f = smooth(clamp((y - 144) / 5));
        lay(top + (front - top) * f, solid(d));
      }
    }

    // Armrests
    for (const [ax, left] of arms) {
      if (Math.abs(x - ax) > 16 || y < 112) continue;
      const d = Math.min(Math.hypot(x - ax, y - 128) - 12, sdBox(x, y, ax, 146, 12, 18));
      if (d < 3) {
        const u = clamp((x - ax + 12) / 24);
        const crown = 0.8 - 0.12 * u + (left ? 0.06 : -0.04);
        const side = 0.42 - 0.1 * u - (left ? 0 : 0.05);
        const cw = 1 - smooth(clamp((y - 122) / 12));
        lay(side + (crown - side) * cw, solid(d));
      }
    }

    // Legs: tapered, kept at least a dot wide in light
    if (y > 162 && y < 178) {
      for (const lx of legs) {
        if (Math.abs(x - lx) > 5) continue;
        const hw = Math.max(1.6, 2 - (clamp((y - 164) / 12)));
        const d = sdPolyline(x, y, [[lx, 164], [lx, 176]]) - hw;
        lay(0.5, solid(d));
      }
    }

    if (ink > 0.05) ink += 0.04 * (fbm(x / 7, y / 7) - 0.5);

    // Cushion: the only warm thing
    let orange = 0;
    if (Math.abs(x - ccx) < 22 && Math.abs(y - ccy) < 22) {
      const cd = cushSd(x, y);
      const c = solid(cd);
      if (c > 0) {
        const dx = x - ccx, dy = y - ccy;
        const shade = 0.04 * ((-dx - dy) / 18);
        orange = c * clamp(0.85 + shade);
        ink *= 1 - c;
      }
    }
    return [clamp(ink), orange];
  });

  // Helpers for lines
  const arc = (cx, cy, r, a0, a1, n = 12) => {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return p;
  };
  const seg = (a, b, n) => {
    const p = [];
    for (let i = 0; i <= n; i++) p.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
    return p;
  };
  // Draw a polyline, skipping the parts hidden behind the cushion
  const clipped = (pts, stroke) => {
    let cur = [];
    const flush = () => { if (cur.length > 1) g.line(polyD(cur), stroke); cur = []; };
    for (const p of pts) {
      if (cushSd(p[0], p[1]) < 0.5) flush();
      else cur.push(p);
    }
    flush();
  };
  const PI = Math.PI;

  // Outer silhouette
  const sil = [[110, 164], [110, 128]];
  sil.push(...arc(122, 128, 12, PI, (5 * PI) / 3, 16).slice(1));
  sil.push([128, 104]);
  sil.push(...arc(132, 104, 4, PI, (3 * PI) / 2, 6).slice(1));
  for (let x = 134; x <= 266; x += 4) sil.push([x, topY(x)]);
  sil.push(...arc(268, 104, 4, (3 * PI) / 2, 2 * PI, 6));
  sil.push([272, 128 - Math.sqrt(108)]);
  sil.push(...arc(278, 128, 12, (4 * PI) / 3, 2 * PI, 16).slice(1));
  sil.push([290, 164]);
  clipped(sil.concat([[110, 164]]), "ink");

  // Legs
  for (const lx of legs) {
    g.line(polyD([[lx - 2, 164], [lx - 1, 176], [lx + 1, 176], [lx + 2, 164]]), "ink");
  }

  // Inner edges: arm crowns over the backrest, arm fronts, backrest meets seat
  clipped(arc(122, 128, 12, (5 * PI) / 3, 2 * PI, 6).concat(seg([134, 128], [134, 164], 36)), "soft");
  clipped(seg([266, 164], [266, 128], 36).concat(arc(278, 128, 12, PI, (4 * PI) / 3, 6)), "soft");
  clipped(seg([134, 140.5], [266, 140.5], 132), "soft");
  // Cushion seams
  clipped(seg([174.5, 140], [174.5, 164], 24), "soft");
  clipped(seg([226.5, 140], [226.5, 164], 24), "soft");

  // Floor horizon, fading at each end
  g.line(`M108 176.5H292`, "faint");
  for (let i = 0; i < 10; i++) {
    const op = 0.25 * (1 - (i + 0.5) / 10);
    g.fadeLine(`M${108 - 2 * i} 176.5H${106 - 2 * i}`, "var(--fg)", op, 1000, 1001);
    g.fadeLine(`M${292 + 2 * i} 176.5H${294 + 2 * i}`, "var(--fg)", op, 1000, 1001);
  }

  // Floor shadow outline
  g.line(`M111 178a95 4 0 1 0 190 0a95 4 0 1 0 -190 0`, "faint", { dash: "4 3" });

  // Cushion: orange outline and a soft crease from the upper-left corner
  g.line(polyD(cushPts, true), "sig");
  const c0 = toWorld(-9.5, -9.5), c1 = toWorld(-4, -4);
  g.line(polyD([c0, c1]), "soft");
}
