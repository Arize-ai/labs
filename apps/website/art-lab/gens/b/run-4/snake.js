function draw(g, rand, seed, k) {
  // A snake sliding forward out of its own shed skin
  const { clamp, smooth, solid, glow, sdPolyline, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);
  const L = [-Math.SQRT1_2, -Math.SQRT1_2]; // light from the upper left

  // Spine control points, with a slight variation in amplitude and phase.
  const base = [[96, 182], [140, 150], [180, 160], [220, 138], [250, 108], [296, 94]];
  const A = (rand() - 0.5) * 10, ph = rand() * Math.PI * 2;
  const cp = base.map(([x, y]) => {
    const f = (x - 96) / 200;
    return [x, y + A * Math.sin(f * Math.PI * 2 + ph) * f];
  });
  const ext = [[2 * cp[0][0] - cp[1][0], 2 * cp[0][1] - cp[1][1]], ...cp,
    [2 * cp[5][0] - cp[4][0], 2 * cp[5][1] - cp[4][1]]];
  const cr = (a, b, c, d, t) => {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1].map(i => 0.5 * (2 * b[i] + (-a[i] + c[i]) * t +
      (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t2 + (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t3));
  };
  const P = [];
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 48; j++) P.push(cr(ext[i], ext[i + 1], ext[i + 2], ext[i + 3], j / 48));
  P.push(cp[5].slice());

  // Arclength, tangents, normals and how much each normal faces the light.
  const N = P.length, S = [0], T = [], Nm = [], F = [];
  for (let i = 1; i < N; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  for (let i = 0; i < N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    T.push([dx / l, dy / l]);
    Nm.push([-dy / l, dx / l]);
    F.push(-dy / l * L[0] + dx / l * L[1]);
  }
  const nearestTo = (px, py) => {
    let bi = 0, bd = 1e9;
    for (let i = 0; i < N; i++) {
      const d = (P[i][0] - px) ** 2 + (P[i][1] - py) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  const idxAt = s => { let i = 0; while (i < N - 1 && S[i] < s) i++; return i; };

  const sEnd = S[N - 1];
  const sSkin = S[nearestTo(172, 156)];
  const sBody = sSkin + 3;
  const sMid = S[nearestTo(220, 138)];
  const sNeck = sEnd - 26;

  // Widths along the spine.
  const skinHw = s => (8 + 1.3 * (fbm(s / 7, 3.1) - 0.5) * 2) *
    (0.55 + 0.45 * smooth(clamp(s / 22))) + 2 * smooth(clamp((s - (sSkin - 14)) / 14));
  const bodyHw = s => s < sMid
    ? 9 + 2 * smooth(clamp((s - sBody) / (sMid - sBody)))
    : 11 - 4.5 * smooth(clamp((s - sMid) / (sNeck - sMid)));

  // The head: a spade from the neck to the snout.
  const iNeck = idxAt(sNeck);
  const B = P[iNeck], Sn = P[N - 1];
  let dx = Sn[0] - B[0], dy = Sn[1] - B[1];
  const hlen = Math.hypot(dx, dy); dx /= hlen; dy /= hlen;
  const hl = hlen / 2, hc = [(B[0] + Sn[0]) / 2, (B[1] + Sn[1]) / 2];
  const hn = [-dy, dx], hf = hn[0] * L[0] + hn[1] * L[1];
  const bProf = a => {
    const aa = a * 13 / hl;
    return aa < -4 ? 6.5 + 2.5 * smooth(clamp((aa + 13) / 9)) : 9 * Math.sqrt(clamp(1 - ((aa + 4) / 17) ** 2));
  };
  const hp = (a, b) => [hc[0] + dx * a + hn[0] * b, hc[1] + dy * a + hn[1] * b];
  const headOpen = [];
  for (let j = 0; j <= 30; j++) { const a = -hl + 2 * hl * j / 30; headOpen.push(hp(a, bProf(a))); }
  for (let j = 29; j >= 0; j--) { const a = -hl + 2 * hl * j / 30; headOpen.push(hp(a, -bProf(a))); }
  const headClosed = [...headOpen, headOpen[0]];

  // Tongue: a stem of 9, then two prongs of 5.
  const Fk = [Sn[0] + dx * 9, Sn[1] + dy * 9];
  const rot = (ang) => [dx * Math.cos(ang) - dy * Math.sin(ang), dx * Math.sin(ang) + dy * Math.cos(ang)];
  const ra = rot(0.45), rb = rot(-0.45);
  const tA = [Fk[0] + ra[0] * 5, Fk[1] + ra[1] * 5], tB = [Fk[0] + rb[0] * 5, Fk[1] + rb[1] * 5];

  const sj = rand() * 6, wj = rand() * 50;

  g.print((x, y) => {
    if (x < 78 || x > 330 || y < 48 || y > 208) return 0;
    let bi = 0, bd = 1e9;
    for (let i = 0; i < N; i++) {
      const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    const lat = (x - P[bi][0]) * Nm[bi][0] + (y - P[bi][1]) * Nm[bi][1];
    const s = S[bi];
    const onSection = Math.sqrt(bd) - Math.abs(lat) < 2;
    let ink = 0;

    if (onSection && s <= sSkin) {
      // Shed skin: pale papery walls, dark hollow interior.
      const hw = skinHw(s), al = Math.abs(lat);
      if (al < hw) {
        const wall = clamp((al - (hw - 4.5)) / 2.5);
        const patch = fbm(x / 4 + 50, y / 4) > 0.42 ? 1 : 0.45;
        ink = wall * (0.25 + 0.1 * fbm(x / 5, y / 5)) * patch;
      }
    } else if (onSection && s >= sBody && s <= sNeck + 2) {
      // Living body: a round tube lit from the upper left, with diamond scales.
      const hw = bodyHw(s), u = lat / hw;
      if (Math.abs(u) < 1) {
        const t = clamp(u * F[bi] / Math.max(Math.abs(F[bi]), 0.35), -1, 1);
        ink = t > 0 ? 0.7 + 0.15 * t : 0.7 + 0.4 * t;
        const warp = 0.3 * (fbm(s / 18 + wj, 1.7) - 0.5);
        const a1 = (s + sj) / 6 + lat / 4 + warp, a2 = (s + sj) / 6 - lat / 4 + warp;
        const parity = (Math.floor(a1) + Math.floor(a2)) & 1;
        if (parity) ink -= 0.15 * (1 - smooth(clamp((Math.abs(u) - 0.4) / 0.25)));
      }
    }

    // Head and its halo.
    const rh = Math.hypot(x - hc[0], y - hc[1]);
    if (rh < 75) {
      const inside = rh < 20 && inPolygon(x, y, headClosed);
      if (inside) {
        const a = (x - hc[0]) * dx + (y - hc[1]) * dy, b = (x - hc[0]) * hn[0] + (y - hc[1]) * hn[1];
        const side = clamp(b / Math.max(bProf(a), 1), -1, 1) * Math.sign(hf || 1);
        ink = Math.max(ink, 0.95 - 0.45 * smooth(clamp(-side * 1.1)) - 0.06 * smooth(clamp(side)));
      } else {
        const sd = sdPolyline(x, y, headClosed);
        ink = Math.max(ink, 0.5 * Math.exp(-sd / 16));
      }
    }

    // The tongue's faint orange presence.
    let or = 0;
    if (Math.hypot(x - Fk[0], y - Fk[1]) < 25) {
      const dT = Math.min(sdPolyline(x, y, [Sn, Fk, tA]), sdPolyline(x, y, [Fk, tB]));
      or = 0.5 * glow(dT, 2.5) + 0.3 * solid(Math.min(Math.hypot(x - tA[0], y - tA[1]), Math.hypot(x - tB[0], y - tB[1])) - 1.5);
    }
    return [ink, or];
  });

  // Shed skin: dashed half-strength edges.
  const iSkin = idxAt(sSkin);
  const skL = [], skR = [];
  for (let i = 0; i <= iSkin; i++) {
    const hw = skinHw(S[i]);
    skL.push([P[i][0] + Nm[i][0] * hw, P[i][1] + Nm[i][1] * hw]);
    skR.push([P[i][0] - Nm[i][0] * hw, P[i][1] - Nm[i][1] * hw]);
  }
  g.line(polyD(skL), "soft", { dash: "4 3" });
  g.line(polyD(skR), "soft", { dash: "4 3" });

  // Creases across the skin.
  const nc = 4 + Math.floor(rand() * 3);
  for (let c = 0; c < nc; c++) {
    const i = idxAt(8 + rand() * (sSkin - 20));
    const hw = skinHw(S[i]) * 0.85, p = P[i], n = Nm[i], t = T[i];
    const j1 = (rand() - 0.5) * 5, j2 = (rand() - 0.5) * 5, jm = (rand() - 0.5) * 3;
    g.line(polyD([
      [p[0] - n[0] * hw + t[0] * j1, p[1] - n[1] * hw + t[1] * j1],
      [p[0] + t[0] * jm, p[1] + t[1] * jm],
      [p[0] + n[0] * hw + t[0] * j2, p[1] + n[1] * hw + t[1] * j2],
    ]), "faint");
  }

  // The flared mouth of the skin.
  const pm = P[iSkin], nm = Nm[iSkin], tm = T[iSkin], hwm = skinHw(sSkin);
  const ell = [];
  for (let j = 0; j < 36; j++) {
    const th = j / 36 * Math.PI * 2;
    ell.push([pm[0] + nm[0] * hwm * Math.cos(th) + tm[0] * 3.5 * Math.sin(th),
      pm[1] + nm[1] * hwm * Math.cos(th) + tm[1] * 3.5 * Math.sin(th)]);
  }
  g.line(polyD(ell, true), "soft");

  // Living body: solid edges and a faint dashed spine.
  const iBody = idxAt(sBody);
  const bL = [], bR = [], sp = [];
  for (let i = iBody; i <= iNeck; i++) {
    const hw = bodyHw(S[i]);
    bL.push([P[i][0] + Nm[i][0] * hw, P[i][1] + Nm[i][1] * hw]);
    bR.push([P[i][0] - Nm[i][0] * hw, P[i][1] - Nm[i][1] * hw]);
    sp.push(P[i]);
  }
  g.line(polyD(bL), "ink");
  g.line(polyD(bR), "ink");
  g.line(polyD(sp), "faint", { dash: "2 3" });

  // Head outline, open at the neck so it joins the body.
  g.line(polyD(headOpen), "ink");

  // The forked tongue, in orange, with a dot at each tip.
  g.line(`M${k.num(Sn[0])} ${k.num(Sn[1])}L${k.num(Fk[0])} ${k.num(Fk[1])}` +
    `L${k.num(tA[0])} ${k.num(tA[1])}M${k.num(Fk[0])} ${k.num(Fk[1])}L${k.num(tB[0])} ${k.num(tB[1])}`,
    "sig", { width: 1.2 });
  for (const tp of [tA, tB])
    g.line(`M${k.num(tp[0] - 0.8)} ${k.num(tp[1])}a0.8 0.8 0 1 0 1.6 0a0.8 0.8 0 1 0 -1.6 0`, "sig", { width: 1.4 });
}
