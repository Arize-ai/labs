function draw(g, rand, seed, k) {
  // A single cosmos bloom on a curving stem, botanical plate
  const { clamp, smooth, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const cx = 200, cy = 108, sy = 110 / 130, r0 = 13, diskR = 13, stamenR = 16;
  const DEG = Math.PI / 180;

  // ---- Petals: eight notched teardrops, foreshortened by the tilt ----
  const hw = (t) => 11 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 1.45))), 0.6);
  const baseRot = rand() * Math.PI / 4;
  const petals = [];
  for (let i = 0; i < 8; i++) {
    const a = baseRot + i * Math.PI / 4 + (rand() - 0.5) * 10 * DEG;
    const L = 52 + (rand() - 0.5) * 12;
    const ca = Math.cos(a), sa = Math.sin(a);
    const S = (u, v) => [cx + u * ca - v * sa, cy + (u * sa + v * ca) * sy];
    const left = [], right = [];
    const N = 28;
    for (let j = 0; j <= N; j++) {
      const t = (j / N) * 0.97;
      left.push(S(r0 + L * t, hw(t)));
      right.push(S(r0 + L * t, -hw(t)));
    }
    const pts = [
      ...left,
      S(r0 + L * 0.995, 2.2),
      S(r0 + L - 3.5, 0),
      S(r0 + L * 0.995, -2.2),
      ...right.reverse(),
    ];
    // Upper-left petals catch the light; lower-right fall into shade.
    const dx = ca, dy = sa * sy, n = Math.hypot(dx, dy);
    const lit = (-dx - dy) / (n * Math.SQRT2);
    const tone = 0.6 + 0.15 * lit;
    petals.push({ ca, sa, L, pts, tone, rib: [S(r0 + L * 0.06, 0), S(r0 + L * 0.9, 0)] });
  }

  const petalTone = (x, y) => {
    const lx = x - cx, ly = (y - cy) / sy;
    let best = -1;
    for (const p of petals) {
      const u = lx * p.ca + ly * p.sa;
      const v = -lx * p.sa + ly * p.ca;
      if (u < r0 - 1 || u > r0 + p.L + 1 || Math.abs(v) > 12.5) continue;
      if (!inPolygon(x, y, p.pts)) continue;
      const t = clamp((u - r0) / p.L);
      // Lengthwise: tucked and dim at the root, brightest two-thirds out.
      const f = t < 2 / 3 ? smooth(t * 1.5) : 1 - 0.25 * Math.pow((t - 2 / 3) * 3, 2);
      best = Math.max(best, p.tone * (0.6 + 0.4 * f));
    }
    return best;
  };

  // ---- Stem: a gentle cubic from behind the disk down and right ----
  const c1 = (rand() - 0.5) * 6, c2 = (rand() - 0.5) * 8;
  const P0 = [201, 120], P1 = [202 + c1, 158], P2 = [204 + c2, 186], P3 = [214, 194];
  const stemPts = [];
  for (let j = 0; j <= 48; j++) {
    const t = j / 48, m = 1 - t;
    const b0 = m * m * m, b1 = 3 * m * m * t, b2 = 3 * m * t * t, b3 = t * t * t;
    stemPts.push([
      b0 * P0[0] + b1 * P1[0] + b2 * P2[0] + b3 * P3[0],
      b0 * P0[1] + b1 * P1[1] + b2 * P2[1] + b3 * P3[1],
    ]);
  }

  // ---- Leaf: branches near y = 172, arcing to one side ----
  let bi = 0;
  for (let j = 1; j < stemPts.length; j++)
    if (Math.abs(stemPts[j][1] - 172) < Math.abs(stemPts[bi][1] - 172)) bi = j;
  const B = stemPts[bi];
  const side = rand() < 0.5 ? -1 : 1;
  const T = [B[0] + side * 34, B[1] + 8];
  const llen = Math.hypot(T[0] - B[0], T[1] - B[1]);
  const ld = [(T[0] - B[0]) / llen, (T[1] - B[1]) / llen];
  let ln = [-ld[1], ld[0]];
  if (ln[1] > 0) ln = [-ln[0], -ln[1]]; // "up" normal
  const bulge = 4;
  const leafC = (t) => [
    B[0] + ld[0] * llen * t + ln[0] * bulge * Math.sin(Math.PI * t),
    B[1] + ld[1] * llen * t + ln[1] * bulge * Math.sin(Math.PI * t),
  ];
  const lhw = (t) => 4.5 * Math.pow(Math.sin(Math.PI * t), 0.7);
  const leafUpper = [], leafLower = [], leafRib = [];
  for (let j = 0; j <= 20; j++) {
    const t = j / 20, c = leafC(t), w = lhw(t);
    leafUpper.push([c[0] + ln[0] * w, c[1] + ln[1] * w]);
    leafLower.push([c[0] - ln[0] * w, c[1] - ln[1] * w]);
    if (t > 0.05 && t < 0.92) leafRib.push(c);
  }
  const leafPoly = [...leafUpper, ...leafLower.slice().reverse()];

  g.print((x, y) => {
    const r = Math.hypot(x - cx, y - cy);
    const inBloom = r < 78;
    const inStemBox = x > 160 && x < 255 && y > 115 && y < 200;
    if (!inBloom && !inStemBox) return 0;

    let ink = 0, orange = 0;
    const pt = inBloom ? petalTone(x, y) : -1;
    if (pt > 0) ink = pt;

    if (inBloom) {
      // Stamen ring.
      const band = solid(Math.abs(r - stamenR) - 1.6);
      ink = Math.max(ink, 0.6 * band);
      // Disk and its glow, contained well inside the petal tips.
      const dd = r - diskR;
      const halo = 0.85 * glow(Math.max(dd, 0), 10) * clamp((42 - r) / 12) * (1 - solid(Math.abs(r - stamenR) - 2));
      orange = Math.max(solid(dd), dd > 0 ? halo : 0);
    }

    if (pt <= 0 && r > diskR + 1 && inStemBox) {
      // Leaf.
      if (inPolygon(x, y, leafPoly)) {
        const rx = x - B[0], ry = y - B[1];
        const t = clamp((rx * ld[0] + ry * ld[1]) / llen);
        const s = rx * ln[0] + ry * ln[1] - bulge * Math.sin(Math.PI * t);
        ink = Math.max(ink, 0.26 + 0.14 * clamp(s / 4.5 * 0.5 + 0.5));
      }
      // Stem.
      const sd = sdPolyline(x, y, stemPts);
      if (sd < 4) ink = Math.max(ink, 0.35 * solid(sd - 2.2) * clamp((197 - y) / 13));
    }
    return [ink, orange];
  });

  // ---- Lines ----
  g.line(`M${cx - 70} ${cy}a70 70 0 1 0 140 0a70 70 0 1 0 -140 0`, "faint", { dash: "2 4" });

  // Stem rails, hidden behind the disk and petals, fading into the edge.
  const hidden = (p) => Math.hypot(p[0] - cx, p[1] - cy) < diskR + 1.5 || petalTone(p[0], p[1]) > 0;
  for (const off of [-1.5, 1.5]) {
    let run = [];
    const flush = () => {
      if (run.length > 1) g.fadeLine(polyD(run), "var(--fg)", 0.5, 184, 196);
      run = [];
    };
    for (let j = 0; j < stemPts.length; j++) {
      const a = stemPts[Math.max(0, j - 1)], b = stemPts[Math.min(stemPts.length - 1, j + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      const p = [stemPts[j][0] - (ty / tl) * off, stemPts[j][1] + (tx / tl) * off];
      if (hidden(p)) flush();
      else run.push(p);
    }
    flush();
  }

  g.line(polyD(leafPoly, true), "soft");
  g.line(polyD(leafRib), "faint");

  for (const p of petals) {
    g.line(polyD(p.pts, true), "soft");
    g.line(`M${num(p.rib[0][0])} ${num(p.rib[0][1])}L${num(p.rib[1][0])} ${num(p.rib[1][1])}`, "faint");
  }

  g.line(`M${cx - diskR} ${cy}a${diskR} ${diskR} 0 1 0 ${2 * diskR} 0a${diskR} ${diskR} 0 1 0 ${-2 * diskR} 0`, "ink");
}
