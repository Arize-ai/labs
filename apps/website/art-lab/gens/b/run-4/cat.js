function draw(g, rand, seed, k) {
  // A seated cat silhouetted against a rising full moon
  const { clamp, smooth, solid, glow, sdPolyline, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  const MX = 200, MY = 120, MR = 62, GR = 105;
  const HX = 200, HY = 110, HR = 19;
  const GROUND = 184;

  // Variation
  const tilt = (rand() * 2 - 1) * 6 * Math.PI / 180;
  const tipAng = (-160 + (rand() * 2 - 1) * 20) * Math.PI / 180;
  const tip = [252 + (rand() * 2 - 1) * 8, 164 + (rand() * 2 - 1) * 8];

  const cT = Math.cos(tilt), sT = Math.sin(tilt);
  const rot = (px, py) => [HX + (px - HX) * cT - (py - HY) * sT, HY + (px - HX) * sT + (py - HY) * cT];

  // Body profile: pear, 30 wide at the neck, 66 at y 174, flat on the ground.
  const hw = (y) => {
    if (y < 126) return 15;
    if (y <= 174) return 15 + 18 * smooth((y - 126) / 48);
    const t = (y - 174) / 10;
    return 33 - 1.5 * t * t;
  };
  // Where the body's side meets the head circle.
  let lo = 112, hi = 129;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (hw(m) ** 2 + (m - HY) ** 2 < HR * HR) lo = m; else hi = m;
  }
  const yj = (lo + hi) / 2;

  const ys = [];
  for (let y = yj; y < GROUND; y += 2) ys.push(y);
  ys.push(GROUND);
  const bodyLeft = ys.map((y) => [HX - hw(y), y]);
  const bodyRight = ys.slice().reverse().map((y) => [HX + hw(y), y]);
  const bodyPoly = [[HX - 15, 116], ...bodyLeft, ...bodyRight, [HX + 15, 116]];
  const bodyClosed = [...bodyPoly, bodyPoly[0]];

  // Ears: bases on the head circle, tilted outward, tips rotated with the head.
  const delta = Math.asin(6 / HR);
  const deg = Math.PI / 180;
  const headPt = (a) => [HX + HR * Math.cos(a), HY + HR * Math.sin(a)];
  const ears = [
    { c: -68 * deg + tilt, tip: rot(215, 84) },
    { c: -112 * deg + tilt, tip: rot(185, 84) },
  ].map((e) => ({ hi: e.c + delta, lo: e.c - delta, tip: e.tip }));
  const earTris = ears.map((e) => {
    const tri = [headPt(e.hi), e.tip, headPt(e.lo)];
    return { tri, closed: [...tri, tri[0]] };
  });

  // Union outline of body + head + ears.
  const outline = [...bodyLeft, ...bodyRight];
  const aR = Math.atan2(yj - HY, 15);
  const aEnd = Math.atan2(yj - HY, -15) - 2 * Math.PI;
  const step = 0.08;
  let a = aR, ei = 0;
  while (a > aEnd) {
    if (ei < ears.length && a - step <= ears[ei].hi) {
      outline.push(headPt(ears[ei].hi), ears[ei].tip, headPt(ears[ei].lo));
      a = ears[ei].lo;
      ei++;
      continue;
    }
    a -= step;
    if (a > aEnd) outline.push(headPt(a));
  }

  // Tail: a cubic from inside the base, along the ground, curling up to the tip.
  const dir = [Math.cos(tipAng), Math.sin(tipAng)];
  const P0 = [226, 180.5], P1 = [252, 180.5], P2 = [tip[0] - dir[0] * 14, tip[1] - dir[1] * 14], P3 = tip;
  const tail = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, u = 1 - t;
    tail.push([
      u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0],
      u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1],
    ]);
  }
  const TW = 3.5;
  const tL = [], tR = [];
  for (let i = 0; i < tail.length; i++) {
    const p = tail[i], q = tail[Math.min(i + 1, tail.length - 1)], o = tail[Math.max(i - 1, 0)];
    let tx = q[0] - o[0], ty = q[1] - o[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    tL.push([p[0] - ty * TW, p[1] + tx * TW]);
    tR.push([p[0] + ty * TW, p[1] - tx * TW]);
  }
  const last = tail[tail.length - 1], prev = tail[tail.length - 2];
  const hAng = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const cap = [];
  for (let i = 1; i < 8; i++) {
    const ca = hAng + Math.PI / 2 - (Math.PI * i) / 8;
    cap.push([last[0] + TW * Math.cos(ca), last[1] + TW * Math.sin(ca)]);
  }
  const tailOutline = [...tL, ...cap, ...tR.slice().reverse()];
  let tailGround = 0;
  for (const p of tail) if (p[1] > 179) tailGround = Math.max(tailGround, p[0] + 1);
  const breakL = HX - hw(GROUND), breakR = Math.max(HX + hw(GROUND), tailGround);

  // Eyes and whiskers follow the head's tilt.
  const eyes = [rot(193, 110), rot(207, 110)];

  // Maria: soft mottled patches, placed where the cat won't hide them.
  const maria = [];
  for (let tries = 0; tries < 60 && maria.length < 5; tries++) {
    const ang = rand() * Math.PI * 2, rr = 14 + rand() * 34;
    const px = MX + rr * Math.cos(ang), py = MY + rr * Math.sin(ang);
    if (px > 170 && px < 230 && py > 80) continue;
    maria.push({ x: px, y: py, r: 6 + rand() * 9 });
  }

  const cx0 = 160, cx1 = 275, cy0 = 76, cy1 = 187;

  g.print((x, y) => {
    const r = Math.hypot(x - MX, y - MY);
    const inBand = y > GROUND && y < GROUND + 6.5 && x > breakL - 4 && x < breakR + 4;
    if (r > GR + 1 && !inBand) return 0;

    let ink = 0;
    if (y <= GROUND + 0.5) {
      const d = r - MR;
      if (d < 3) {
        const shade = clamp(((x - MX) + (y - MY)) / (Math.SQRT2 * MR) * 0.8 + 0.3);
        let tone = 0.95 - 0.1 * smooth(shade);
        let m = 0;
        for (const p of maria) {
          const dist = Math.hypot(x - p.x, y - p.y) + (fbm(x / 7, y / 7) - 0.5) * 8;
          m = Math.max(m, smooth(clamp((p.r - dist) / 4)));
        }
        tone -= 0.2 * m * (tone / 0.95);
        ink = tone * solid(d);
      }
      if (d > 0 && d < GR - MR) {
        const t = 1 - d / (GR - MR);
        ink = Math.max(ink, 0.5 * t * t);
      }
    } else if (inBand) {
      const ex = Math.min(smooth(clamp((x - breakL + 4) / 6)), smooth(clamp((breakR + 4 - x) / 6)));
      ink = 0.15 * ex;
    }

    let orange = 0;
    if (x > cx0 && x < cx1 && y > cy0 && y < cy1 && y <= GROUND + 0.5) {
      let dc = Math.hypot(x - HX, y - HY) - HR;
      for (const e of earTris) {
        const s = sdPolyline(x, y, e.closed);
        dc = Math.min(dc, inPolygon(x, y, e.tri) ? -s : s);
      }
      if (y > 114) {
        const s = sdPolyline(x, y, bodyClosed);
        dc = Math.min(dc, inPolygon(x, y, bodyPoly) ? -s : s);
      }
      if (x > 220) dc = Math.min(dc, sdPolyline(x, y, tail) - TW);
      ink *= 1 - solid(dc);

      if (dc < 0) {
        for (const [ex, ey] of eyes) {
          const dd = (Math.hypot((x - ex) / 3.5, (y - ey) / 2.3) - 1) * 2.5;
          orange = Math.max(orange, clamp(solid(dd) + 0.4 * glow(Math.max(dd, 0), 2)));
        }
      }
    }
    return [ink, orange];
  });

  // Moon rim and the dashed outer glow arc (drawn first so the cat covers them).
  g.line(`M${MX - MR} ${MY}A${MR} ${MR} 0 1 1 ${MX + MR} ${MY}A${MR} ${MR} 0 1 1 ${MX - MR} ${MY}Z`, "faint");
  g.line(`M${MX - 90} ${MY}A90 90 0 0 1 ${MX + 90} ${MY}`, "faint", { dash: "4 3" });

  // Horizon, broken where the cat sits.
  g.line(`M96 ${GROUND + 0.5}H${k.num(breakL)}`, "soft");
  g.line(`M${k.num(breakR)} ${GROUND + 0.5}H304`, "soft");

  // Silhouette: body/head/ears, then the tail as an open shape whose fill
  // hides the body outline where they join.
  g.line(polyD(outline, true), "ink", { width: 1.5, fill: true });
  g.line(polyD(tailOutline, false), "ink", { width: 1.5, fill: true });

  // Eyes: crisp orange almonds over the orange dots.
  for (const [ex, ey] of eyes) {
    const p = (dx, dy) => [ex + dx * cT - dy * sT, ey + dx * sT + dy * cT];
    const [a1, b1, t1, u1] = [p(-3, 0), p(3, 0), p(0, -3), p(0, 3)];
    g.line(
      `M${k.num(a1[0])} ${k.num(a1[1])}Q${k.num(t1[0])} ${k.num(t1[1])} ${k.num(b1[0])} ${k.num(b1[1])}` +
      `Q${k.num(u1[0])} ${k.num(u1[1])} ${k.num(a1[0])} ${k.num(a1[1])}Z`,
      "sig", { width: 1 }
    );
  }

  // Whiskers: three per side, fanning from the muzzle.
  for (const s of [-1, 1]) {
    for (const j of [-1, 0, 1]) {
      const fa = j * 0.17;
      const sx = HX + s * 5, sy = 117 + j * 1.8;
      const ex = sx + s * 16 * Math.cos(fa), ey = sy + 16 * Math.sin(fa);
      const A = rot(sx, sy), B = rot(ex, ey);
      g.line(`M${k.num(A[0])} ${k.num(A[1])}L${k.num(B[0])} ${k.num(B[1])}`, "faint");
    }
  }
}
