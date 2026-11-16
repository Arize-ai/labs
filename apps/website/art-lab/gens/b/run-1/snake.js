function draw(g, rand, seed, k) {
  // A sidewinding serpent crossing bare ground, tongue tasting the air
  const { clamp, smooth, solid, glow, sdPolyline, polyD, num } = k;

  // --- Variation ---
  const amp = (rand() * 2 - 1) * 10;
  const ph = (rand() * 2 - 1) * 8;
  const band = 15 + rand() * 6;
  const forkA = ((18 + rand() * 16) * Math.PI) / 180;

  // --- Spine: Catmull-Rom through the brief's control points ---
  const C = [
    [104, 168],
    [150 + ph * 0.5, 130 - amp * 0.3],
    [175 + ph, 98 - amp],
    [225 + ph, 152 + amp],
    [262 + ph * 0.4, 112 - amp * 0.5],
    [276, 104],
  ];
  const ext = [
    [2 * C[0][0] - C[1][0], 2 * C[0][1] - C[1][1]],
    ...C,
    [2 * C[5][0] - C[4][0], 2 * C[5][1] - C[4][1]],
  ];
  const spine = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const n = 28;
    for (let j = 0; j < n || (i === ext.length - 3 && j === n); j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      spine.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const widthAt = (x) => {
    if (x <= 190) return 4 + 20 * smooth(clamp((x - 104) / 86));
    if (x <= 240) return 24;
    return 24 - 8 * smooth(clamp((x - 240) / 36));
  };
  // Samples: x, y, half-width, arc length from tail, normal
  const S = [];
  let acc = 0;
  for (let i = 0; i < spine.length; i++) {
    if (i > 0) acc += Math.hypot(spine[i][0] - spine[i - 1][0], spine[i][1] - spine[i - 1][1]);
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(spine.length - 1, i + 1)];
    const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const tx = (b[0] - a[0]) / tl, ty = (b[1] - a[1]) / tl;
    S.push({ x: spine[i][0], y: spine[i][1], hw: widthAt(spine[i][0]) / 2, s: acc, nx: -ty, ny: tx });
  }
  const LEN = acc;

  const bodyNearest = (x, y, grow) => {
    let best = 1e9, bi = 0;
    for (let i = 0; i < S.length; i++) {
      const d = Math.hypot(x - S[i].x, y - S[i].y) - S[i].hw - grow;
      if (d < best) { best = d; bi = i; }
    }
    return [best, bi];
  };

  // --- Head: blunt wedge superellipse, tilted 15° up ---
  const hc = [286, 100], ha = 13, hp = 2.4;
  const ang = (-15 * Math.PI) / 180;
  const e1 = [Math.cos(ang), Math.sin(ang)], e2 = [-Math.sin(ang), Math.cos(ang)];
  const hb = (u) => 7.5 * (1.0 + 0.13 * clamp(-u / ha, -1, 1));
  const toLocal = (x, y) => {
    const dx = x - hc[0], dy = y - hc[1];
    return [dx * e1[0] + dy * e1[1], dx * e2[0] + dy * e2[1]];
  };
  const toWorld = (u, v) => [hc[0] + u * e1[0] + v * e2[0], hc[1] + u * e1[1] + v * e2[1]];
  const dHead = (x, y) => {
    const [u, v] = toLocal(x, y);
    const b = hb(u);
    return (Math.pow(Math.pow(Math.abs(u / ha), hp) + Math.pow(Math.abs(v / b), hp), 1 / hp) - 1) * 7;
  };

  // --- Eye and tongue ---
  const eye = [290, 96];
  const T0 = [299, 98], T1 = [311, 94];
  const tl = Math.hypot(T1[0] - T0[0], T1[1] - T0[1]);
  const td = [(T1[0] - T0[0]) / tl, (T1[1] - T0[1]) / tl];
  const tine = (s) => {
    const c = Math.cos(s * forkA), sn = Math.sin(s * forkA);
    return [T1[0] + 5 * (td[0] * c - td[1] * sn), T1[1] + 5 * (td[0] * sn + td[1] * c)];
  };
  const tineA = tine(1), tineB = tine(-1);
  const stem = [T0, T1], forkPts = [tineA, T1, tineB];
  const dTongue = (x, y) => Math.min(sdPolyline(x, y, stem), sdPolyline(x, y, forkPts)) - 1.3;

  const L = [-Math.SQRT1_2, -Math.SQRT1_2]; // light from upper left

  g.print((x, y) => {
    if (x < 92 || x > 334 || y < 60 || y > 200) return 0;
    let ink = 0;

    // Ground shadow: body + head, offset 7 down-right, a touch wider
    const [ds] = bodyNearest(x - 7, y - 7, 1.5);
    const dsh = Math.min(ds, dHead(x - 7, y - 7) - 1.5);
    ink = 0.15 * solid(dsh);

    // Body
    const [db, bi] = bodyNearest(x, y, 0);
    const mb = solid(db);
    if (mb > 0) {
      const sp = S[bi];
      const ox = x - sp.x, oy = y - sp.y;
      const c = clamp((ox * L[0] + oy * L[1]) / sp.hw, -1, 1);
      let tone = 0.625 + 0.225 * c;
      const side = clamp((ox * sp.nx + oy * sp.ny) / sp.hw, -1, 1);
      const u = (((LEN - sp.s) / band) % 1 + 1) % 1;
      const diamond = Math.abs(u - 0.5) * 2 + Math.abs(side) < 1 ? 0.9 : 0.6;
      tone = clamp(tone + (diamond - 0.75) * 0.8);
      // Tail fades toward its tip
      const st = sp.s;
      const cap = 0.3 + 0.3 * clamp(st / 60);
      const f = smooth(clamp(st / 80));
      tone = tone * f + cap * (1 - f);
      ink = ink * (1 - mb) + tone * mb;
    }

    // Head
    const dh = dHead(x, y);
    const mh = solid(dh);
    if (mh > 0) {
      const [u, v] = toLocal(x, y);
      const ht = 0.75 + 0.2 * clamp(v / hb(u), -1, 1) * -1;
      ink = ink * (1 - mh) + ht * mh;
    }

    // Soft glow around head and tongue only
    const dt = dTongue(x, y);
    if (dh > 0) ink = Math.max(ink, 0.2 * glow(Math.min(dh, dt), 7));

    // Eye stays dark
    ink *= 1 - solid(Math.hypot(x - eye[0], y - eye[1]) - 2);

    const orange = solid(dt) + 0.25 * glow(dt, 3);
    return [ink, orange];
  });

  // --- Outlines, split so body and head read as one silhouette ---
  const runs = (pts, keep) => {
    const out = [];
    let cur = [];
    for (const p of pts) {
      if (keep(p)) cur.push(p);
      else { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  const left = S.map((p) => [p.x + p.nx * p.hw, p.y + p.ny * p.hw]);
  const right = S.map((p) => [p.x - p.nx * p.hw, p.y - p.ny * p.hw]);
  const bodyLoop = [...left.slice().reverse(), ...right];
  for (const r of runs(bodyLoop, (p) => dHead(p[0], p[1]) > 0.4)) g.line(polyD(r), "ink");

  const headPts = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const ct = Math.cos(t), st = Math.sin(t);
    const u = ha * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / hp);
    const v = hb(u) * Math.sign(st) * Math.pow(Math.abs(st), 2 / hp);
    headPts.push(toWorld(u, v));
  }
  for (const r of runs(headPts, (p) => bodyNearest(p[0], p[1], 0)[0] > 0.4)) g.line(polyD(r), "ink");

  // Spine: neck to two thirds of the way to the tail
  const spinePts = S.filter((p) => p.s >= LEN / 3 && dHead(p.x, p.y) > 1).map((p) => [p.x, p.y]);
  if (spinePts.length > 1) g.line(polyD(spinePts), "soft");

  // Jaw seam
  const jaw = [];
  for (let i = 0; i <= 12; i++) {
    const u = -7 + (19 * i) / 12;
    const v = 2.5 + 1.2 * (1 - Math.pow((u - 2.5) / 9.5, 2));
    jaw.push(toWorld(u, v));
  }
  g.line(polyD(jaw), "soft");

  // Eye ring
  g.line(`M${num(eye[0] - 2)} ${num(eye[1])}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z`, "ink", { fill: true });

  // Tongue, crisp in orange
  g.line(polyD(stem), "sig", { width: 1.5 });
  g.line(polyD(forkPts), "sig", { width: 1.2 });

  // Sidewinder tracks: J strokes along the direction of travel
  const tAng = Math.atan2(104 - 168, 276 - 104);
  const d1 = [Math.cos(tAng), Math.sin(tAng)];
  const d2 = [-Math.sin(tAng), Math.cos(tAng)];
  for (let i = -1; i <= 1; i++) {
    const c = [130 + d2[0] * 16 * i * 0.9, 190 + d2[1] * 16 * i * 0.6];
    const P = (a, b) => `${num(c[0] + d1[0] * a + d2[0] * b)} ${num(c[1] + d1[1] * a + d2[1] * b)}`;
    g.line(`M${P(15, 0)}L${P(-9, 0)}Q${P(-15, 0)} ${P(-14, -5)}`, "faint", { dash: "4 3" });
  }

  // Ground
  g.line(`M140 178.5H260`, "faint");
}
