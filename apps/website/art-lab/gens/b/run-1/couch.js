function draw(g, rand, seed, k) {
  // A three-seat sofa in side-lit elevation, one cushion thrown aside
  const { clamp, solid, sdBox, inPolygon, polyD } = k;

  // Back cushion bulges, each lived-in a little differently.
  const cush = [[128, 173], [173, 227], [227, 272]];
  const bulge = cush.map(() => 1 + rand() * 3);
  const seamX = [173, 227];

  // The throw cushion's pose.
  const th = ((10 + rand() * 18) * Math.PI) / 180;
  const tcx = 154 + (rand() * 2 - 1) * 6, tcy = 128;
  const co = Math.cos(th), si = Math.sin(th);
  const toWorld = (lx, ly) => [tcx + lx * co - ly * si, tcy + lx * si + ly * co];
  const toLocal = (x, y) => {
    const dx = x - tcx, dy = y - tcy;
    return [dx * co + dy * si, -dx * si + dy * co];
  };

  const cushionIndex = (x) => (x < 173 ? 0 : x < 227 ? 1 : 2);
  const topEdge = (x) => {
    const i = cushionIndex(x);
    const [a, c] = cush[i];
    const t = clamp((x - a) / (c - a));
    let y = 98 - bulge[i] * Math.sin(Math.PI * t);
    if (x < 142) { const dx = 142 - x; y = Math.max(y, 112 - Math.sqrt(Math.max(0, 196 - dx * dx))); }
    if (x > 258) { const dx = x - 258; y = Math.max(y, 112 - Math.sqrt(Math.max(0, 196 - dx * dx))); }
    return y;
  };

  const legX = [122, 168, 232, 278];

  g.print((x, y) => {
    if (x < 100 || x > 300 || y < 90 || y > 200) return 0;

    // Floor pool: lamplight, below the dark lift band.
    if (y >= 183) {
      for (const lx of legX) {
        if (y <= 184 && Math.abs(x - lx) < 2) return 0.35;
      }
      const e = ((x - 190) / 120) ** 2 + ((y - 188) / 10) ** 2;
      return e < 1 ? 0.25 * (1 - e) * (1 - e * 0.3) : 0;
    }

    // Throw cushion: the only orange.
    const [lx, ly] = toLocal(x, y);
    const td = sdBox(lx, ly, 0, 0, 12, 12, 2);
    if (td < 0) {
      const lit = clamp(1 - Math.hypot(lx + 12, ly + 12) / 14);
      return [0, 0.8 + 0.2 * lit];
    }

    // Arms, in front of seat and back.
    if (y < 172) {
      if (x >= 108 && x <= 136 && sdBox(x, y, 122, 152, 14, 32, 12) < 0) {
        if (y < 132 || x < 126) return 0.75;
        return 0.4;
      }
      if (x >= 264 && x <= 292 && sdBox(x, y, 278, 152, 14, 32, 12) < 0) {
        if (y < 132) return 0.75;
        return x < 274 ? 0.4 : 0.3;
      }
    }

    // Seat.
    if (sdBox(x, y, 200, 157, 82, 15, 6) < 0) {
      for (const sx of seamX) if (Math.abs(x - sx) < 2.4) return 0.2;
      return y < 151 ? 0.7 : 0.45;
    }

    // Backrest.
    if (x >= 128 && x <= 272 && y < 142) {
      const top = topEdge(x);
      if (y > top) {
        for (const sx of seamX) if (Math.abs(x - sx) < 2.4) return 0.2;
        const [a, c] = cush[cushionIndex(x)];
        const u = clamp((x - a) / (c - a));
        const v = clamp((y - top) / (142 - top));
        if (y - top < 4.5 && u < 0.55) return 0.95;
        return 0.85 - 0.3 * clamp(0.5 * u + 0.5 * v);
      }
    }

    // Legs; the rest of the band under the seat stays dark.
    if (y >= 172) {
      for (const lgx of legX) {
        const hw = 3 - (y - 172) / 12;
        if (Math.abs(x - lgx) < hw + 0.3) return 0.35;
      }
      return 0;
    }
    return 0;
  });

  // ---------- Lines ----------
  const arc = (cx, cy, r, a0, a1, n = 10) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  };
  const aL = -Math.acos(1 / 3);           // where the left arm's inner arc meets x 128
  const aR = -(Math.PI - Math.acos(1 / 3)); // where the right arm's inner arc meets x 272

  // Cushion outline: pinched edges, slightly soft corners.
  const half = 12;
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
  const pillow = [];
  for (let e = 0; e < 4; e++) {
    const [ax, ay] = corners[e], [bx, by] = corners[(e + 1) % 4];
    const nx = -(by - ay) / 24, ny = (bx - ax) / 24; // inward normal
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const pinch = 1.3 * Math.sin(Math.PI * t);
      pillow.push(toWorld(ax + (bx - ax) * t + nx * pinch, ay + (by - ay) * t + ny * pinch));
    }
  }
  const clipPoly = [[-13, -13], [13, -13], [13, 13], [-13, 13]].map(([a, b]) => toWorld(a, b));

  const dense = (pts, step = 1) => {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let j = 1; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
    }
    return out;
  };
  // Draw a polyline, leaving a gap where the throw cushion sits in front.
  const lineAround = (pts, stroke, opts) => {
    let run = [];
    const flush = () => { if (run.length > 1) g.line(polyD(run), stroke, opts); run = []; };
    for (const p of dense(pts)) {
      if (inPolygon(p[0], p[1], clipPoly)) flush();
      else run.push(p);
    }
    flush();
  };

  // Silhouette.
  const sil = [[108, 172], [108, 132]];
  sil.push(...arc(120, 132, 12, Math.PI, 1.5 * Math.PI));
  sil.push(...arc(124, 132, 12, -Math.PI / 2, aL, 4));
  sil.push([128, 112]);
  for (let x = 128; x <= 272; x += 1) sil.push([x, topEdge(x)]);
  sil.push([272, 132 + 12 * Math.sin(aR)]);
  sil.push(...arc(276, 132, 12, aR, -Math.PI / 2, 4));
  sil.push([280, 120]);
  sil.push(...arc(280, 132, 12, -Math.PI / 2, 0));
  sil.push([292, 172]);
  for (const lx of [...legX].reverse()) {
    sil.push([lx + 3, 172], [lx + 2, 184], [lx - 2, 184], [lx - 3, 172]);
  }
  sil.push([108, 172]);
  lineAround(sil, "ink", { width: 1.1 });

  // Arm inner contours, where the arms meet the seat.
  lineAround([...arc(124, 132, 12, aL, 0, 6), [136, 172]], "soft");
  lineAround([...arc(276, 132, 12, aR, -Math.PI, 6), [264, 172]], "soft");
  // Seat top edge.
  lineAround([[136, 142], [264, 142]], "soft");
  // Cushion divisions, seat and back.
  for (const sx of seamX) {
    lineAround([[sx, 142], [sx, 172]], "soft");
    lineAround([[sx, topEdge(sx) + 0.5], [sx, 142]], "soft");
  }

  // Floor horizon, broken by the legs.
  const gaps = [96, ...legX.flatMap((lx) => [lx - 2.5, lx + 2.5]), 304];
  for (let i = 0; i < gaps.length; i += 2) {
    g.line(`M${gaps[i]} 184.5H${gaps[i + 1]}`, "faint", { dash: "4 3" });
  }

  // The throw cushion, on top of everything.
  g.line(polyD(pillow, true), "ink", { width: 1.1 });
  g.line(polyD([toWorld(-7, -2), toWorld(0, 0.6), toWorld(7, -1)]), "soft");
}
