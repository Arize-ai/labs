function draw(g, rand, seed, k) {
  // A single six-petalled anemone, face-on, on a curved stem
  const { clamp, smooth, solid, sdPolyline, polyD, num } = k;
  const cx = 200, cy = 112;
  const rot = (rand() * 2 - 1) * 15 * Math.PI / 180;

  // Petals: ellipses whose base sits 6 from the centre, pointing outward.
  const petals = [];
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + rot + i * Math.PI / 3;
    const len = 50 * (0.9 + 0.2 * rand());
    const wid = 30 * (0.9 + 0.2 * rand());
    const a = len / 2, b = wid / 2;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const lit = -(dx + dy) * Math.SQRT1_2; // light from the upper left
    petals.push({ a, b, len, dx, dy, ex: cx + dx * (6 + a), ey: cy + dy * (6 + a), tip: 0.75 + 0.15 * lit });
  }
  const petalSd = (p, x, y) => {
    const ox = x - p.ex, oy = y - p.ey;
    const u = ox * p.dx + oy * p.dy, v = -ox * p.dy + oy * p.dx;
    return [(Math.hypot(u / p.a, v / p.b) - 1) * Math.min(p.a, p.b), u];
  };
  const petalTone = (p, u) => p.tip * (0.7 + 0.3 * clamp((u + p.a) / p.len));

  // Stamens on a ring of radius 17.
  const stamens = [];
  for (let j = 0; j < 14; j++) {
    const t = rot + j * 2 * Math.PI / 14;
    stamens.push([cx + 17 * Math.cos(t), cy + 17 * Math.sin(t)]);
  }

  // Stem: a quadratic curve from the bloom down and gently left.
  const s0 = [200, 150], s2 = [188, 194], sc = [198 + (rand() * 2 - 1) * 3, 176];
  const stemPts = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, m = 1 - t;
    stemPts.push([m * m * s0[0] + 2 * m * t * sc[0] + t * t * s2[0], m * m * s0[1] + 2 * m * t * sc[1] + t * t * s2[1]]);
  }
  const stemHalf = 2.8;
  const stemXAt = (y) => {
    for (let i = 1; i < stemPts.length; i++) {
      const [x0, y0] = stemPts[i - 1], [x1, y1] = stemPts[i];
      if (y <= y1) return x0 + (x1 - x0) * clamp((y - y0) / Math.max(1e-6, y1 - y0));
    }
    return stemPts[stemPts.length - 1][0];
  };
  const stemOff = (sgn) => stemPts.map((p, i) => {
    const q = stemPts[Math.min(i + 1, stemPts.length - 1)], o = stemPts[Math.max(i - 1, 0)];
    const tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1;
    return [p[0] - sgn * stemHalf * ty / tl, p[1] + sgn * stemHalf * tx / tl];
  });

  // Leaf: a pointed ellipse springing from the stem, angled up-left.
  let lb = stemPts[0];
  for (const p of stemPts) if (Math.abs(p[1] - 172) < Math.abs(lb[1] - 172)) lb = p;
  const leafBase = [lb[0] - 2, lb[1]];
  const la = Math.atan2(160 - 172, 162 - 194) + (rand() * 2 - 1) * 4 * Math.PI / 180;
  const ldx = Math.cos(la), ldy = Math.sin(la), lnx = -ldy, lny = ldx; // n points upward
  const L = 36, LW = 6.5;
  const leafW = (u) => LW * Math.max(0, 1 - (2 * u / L - 1) ** 2);
  const leafLocal = (x, y) => {
    const ox = x - leafBase[0], oy = y - leafBase[1];
    return [ox * ldx + oy * ldy, ox * lnx + oy * lny];
  };
  const leafSd = (x, y) => {
    const [u, v] = leafLocal(x, y);
    if (u < 0 || u > L) return 99;
    return Math.abs(v) - leafW(u);
  };
  const leafPt = (u, v) => [leafBase[0] + u * ldx + v * lnx, leafBase[1] + u * ldy + v * lny];

  g.print((x, y) => {
    if (x < 112 || x > 288 || y < 28 || y > 200) return 0;
    const r = Math.hypot(x - cx, y - cy);
    // Heart: orange disc, then a dark gap before the petals begin.
    if (r < 14) return [r < 11 ? 0 : 0.1, solid(r - 11)];

    let ink = 0.25 * (1 - smooth(clamp((r - 54) / 26)));
    const sds = petals.map((p) => petalSd(p, x, y));
    let top = -1;
    for (let i = 0; i < 6; i++) if (sds[i][0] < 0 && !(sds[(i + 1) % 6][0] < 0)) top = i;
    if (top >= 0) {
      ink = Math.max(ink, petalTone(petals[top], sds[top][1]));
    } else {
      for (let i = 0; i < 6; i++) ink = Math.max(ink, petalTone(petals[i], sds[i][1]) * solid(sds[i][0]));
      if (y > 145) {
        const sd = sdPolyline(x, y, stemPts) - stemHalf;
        if (sd < 3) {
          const side = clamp((stemXAt(y) - x) / stemHalf, -1, 1);
          ink = Math.max(ink, (0.4 + 0.1 * side) * solid(sd));
        }
        const ld = leafSd(x, y);
        if (ld < 3) {
          const [u, v] = leafLocal(x, y);
          const lt = 0.45 - 0.15 * clamp(-v / Math.max(leafW(u), 1));
          const s = solid(ld);
          if (s > 0) ink = ink * (1 - s) + lt * s;
        }
      }
    }

    let orange = 0;
    if (r < 23) for (const [sx, sy] of stamens) orange = Math.max(orange, 0.9 * solid(Math.hypot(x - sx, y - sy) - 2.6));
    return [ink, orange];
  });

  // Split a polyline wherever it is hidden.
  const runs = (pts, hidden) => {
    const out = []; let cur = [];
    for (const p of pts) {
      if (hidden(p)) { if (cur.length > 1) out.push(cur); cur = []; }
      else cur.push(p);
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  const inAnyPetal = ([x, y], m = 0.5) => petals.some((p) => petalSd(p, x, y)[0] < m);

  // Measuring ring, behind the stem and leaf.
  const ring = [];
  for (let i = 0; i <= 180; i++) {
    const t = i / 180 * 2 * Math.PI;
    ring.push([cx + 72 * Math.cos(t), cy + 72 * Math.sin(t)]);
  }
  for (const run of runs(ring, ([x, y]) => sdPolyline(x, y, stemPts) < stemHalf + 2 || leafSd(x, y) < 2))
    g.line(polyD(run), "faint", { dash: "2 3" });

  // Stem edges, hidden under the bloom.
  for (const sgn of [-1, 1])
    for (const run of runs(stemOff(sgn), (p) => inAnyPetal(p)))
      g.line(polyD(run), "soft");

  // Leaf outline and midrib.
  const upper = [], lower = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24 * L;
    upper.push(leafPt(u, leafW(u)));
    lower.push(leafPt(u, -leafW(u)));
  }
  g.line(polyD(upper.concat(lower.reverse()), true), "soft");
  g.line(polyD([leafPt(1, 0), leafPt(L - 3, 0)]), "faint");

  // Petal outlines and midribs, each petal tucked under the next.
  petals.forEach((p, i) => {
    const next = petals[(i + 1) % 6];
    const hidden = ([x, y]) => Math.hypot(x - cx, y - cy) < 14 || petalSd(next, x, y)[0] < 0;
    const toWorld = (u, v) => [p.ex + u * p.dx - v * p.dy, p.ey + u * p.dy + v * p.dx];
    const outline = [];
    for (let j = 0; j <= 96; j++) {
      const t = j / 96 * 2 * Math.PI;
      outline.push(toWorld(p.a * Math.cos(t), p.b * Math.sin(t)));
    }
    for (const run of runs(outline, hidden)) g.line(polyD(run), "ink");
    const rib = [];
    for (let j = 0; j <= 20; j++) rib.push(toWorld(-p.a + (2 * p.a - 5) * j / 20, 0));
    for (const run of runs(rib, ([x, y]) => Math.hypot(x - cx, y - cy) < 21 || petalSd(next, x, y)[0] < 0))
      g.line(polyD(run), "faint");
  });

  // Centre disc outline and the stamens, crisp.
  const circ = (x, y, rr) => `M${num(x - rr)} ${num(y)}a${rr} ${rr} 0 1 0 ${2 * rr} 0a${rr} ${rr} 0 1 0 ${-2 * rr} 0`;
  g.line(circ(cx, cy, 11), "soft");
  for (const [sx, sy] of stamens) g.line(circ(sx, sy, 1.5), "sig");
}
