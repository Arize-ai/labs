function draw(g, rand, seed, k) {
  // A sidewinder crossing a dune, tongue tasting the air
  const { clamp, smooth, solid, sdPolyline, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Stride variation: bend heights ±10, slight phase shift along x.
  const ph = (rand() - 0.5) * 8;
  const lowY = 158 + (rand() - 0.5) * 20;
  const highY = 112 + (rand() - 0.5) * 20;
  const ctrl = [
    [96, 168],
    [140 + ph, 128 + (rand() - 0.5) * 6],
    [200 + ph, lowY],
    [252 + ph * 0.6, highY],
    [284, 110],
  ];

  // Catmull-Rom spline through the control points.
  const n0 = ctrl.length;
  const ext = [
    [2 * ctrl[0][0] - ctrl[1][0], 2 * ctrl[0][1] - ctrl[1][1]],
    ...ctrl,
    [2 * ctrl[n0 - 1][0] - ctrl[n0 - 2][0], 2 * ctrl[n0 - 1][1] - ctrl[n0 - 2][1]],
  ];
  const pts = [];
  const N = 18;
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    for (let j = 0; j < N; j++) {
      const t = j / N, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(ctrl[n0 - 1].slice());
  const S = pts.length;

  // Arc length, width profile, normals.
  const cum = [0];
  const seg = [];
  for (let i = 0; i < S - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dy) || 1e-6;
    seg.push([dx, dy, l * l, l]);
    cum.push(cum[i] + l);
  }
  const L = cum[S - 1];
  const wid = (t) => {
    if (t < 0.4) return 3 + 15 * smooth(clamp(t / 0.4));
    if (t > 0.78) return 18 - 6 * smooth(clamp((t - 0.78) / 0.22));
    return 18;
  };
  const rad = pts.map((_, i) => wid(cum[i] / L) / 2);
  const nrm = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(S - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [ty / l, -tx / l]; // points "up" when moving right
  });
  const upper = pts.map((p, i) => [p[0] + rad[i] * nrm[i][0], p[1] + rad[i] * nrm[i][1]]);
  const lower = pts.map((p, i) => [p[0] - rad[i] * nrm[i][0], p[1] - rad[i] * nrm[i][1]]);

  // Head: blunt teardrop, widest at the back of the jaw, snout at x 313.
  const hx = 298, hy = 108, ha = 15, hb = 9;
  const prof = (th) => Math.sin(th) * (1 - 0.35 * Math.cos(th));
  let pmax = 0;
  for (let i = 0; i < 200; i++) pmax = Math.max(pmax, prof((i / 200) * Math.PI));
  const headAt = (th) => [hx + ha * Math.cos(th), hy + (hb / pmax) * prof(th)];
  const headPoly = [];
  for (let i = 0; i < 48; i++) headPoly.push(headAt((i / 48) * Math.PI * 2));
  const headClosed = [...headPoly, headPoly[0]];
  const eye = [304, 104];

  // Dune crest.
  const duneY = (x) => {
    const s = clamp((x - 84) / 232);
    return 190 - 18 * (1 - (1 - s) * (1 - s));
  };
  const dunePts = [];
  for (let x = 84; x <= 316; x += 8) dunePts.push([x, duneY(x)]);

  // Tracks: 3–5 J-strokes, 22 apart, centred in x 110–190.
  const nT = 3 + Math.floor(rand() * 3);
  const tracks = [];
  const start = 150 - 11 * (nT - 1);
  for (let i = 0; i < nT; i++) {
    const sx = start + 22 * i;
    tracks.push([[sx + 6, 175], [sx - 1, 182], [sx - 4, 186], [sx - 6, 188], [sx - 9, 187.5], [sx - 11, 186]]);
  }

  const Lx = -0.6, Ly = -0.8; // light from the upper left

  g.print((x, y) => {
    if (x < 80 || x > 340 || y < 80 || y > 215) return 0;

    // Nearest point on the body centreline.
    let best = 1e18, bi = 0, bu = 0;
    for (let i = 0; i < S - 1; i++) {
      const a = pts[i], s = seg[i];
      const u = clamp(((x - a[0]) * s[0] + (y - a[1]) * s[1]) / s[2]);
      const qx = a[0] + u * s[0] - x, qy = a[1] + u * s[1] - y;
      const d2 = qx * qx + qy * qy;
      if (d2 < best) { best = d2; bi = i; bu = u; }
    }
    const dist = Math.sqrt(best);
    const t = (cum[bi] + bu * seg[bi][3]) / L;
    const r = rad[bi] + (rad[bi + 1] - rad[bi]) * bu;
    const cx = pts[bi][0] + bu * seg[bi][0], cy = pts[bi][1] + bu * seg[bi][1];
    const rl = Math.max(r, 2.2);
    const dBody = dist - rl;

    // Head distance (only near the head).
    let inHead = false, dHead = 1e9;
    if (x > 260) {
      inHead = inPolygon(x, y, headPoly);
      dHead = sdPolyline(x, y, headClosed) * (inHead ? -1 : 1);
    }

    if (inHead) {
      if (Math.hypot(x - eye[0], y - eye[1]) < 3.5) return 0; // dark pinhole
      return 0.9 - 0.5 * clamp((y - (hy - hb)) / (2 * hb));
    }

    const body = solid(dBody);
    if (body > 0.5) {
      const ux = (x - cx) / rl, uy = (y - cy) / rl;
      const shade = clamp(0.5 + 0.5 * (ux * Lx + uy * Ly));
      let tone = 0.35 + 0.6 * shade + 0.06 * (fbm(x / 5, y / 5) - 0.5);
      tone *= 0.3 + 0.7 * smooth(clamp(t / 0.2)); // tail fades toward the tip
      return clamp(tone) * body;
    }

    // Cast shadow: a strip under and to the lower right of the body.
    if (t > 0.05 && dBody > 0 && dBody < 8 && ((x - cx) * 0.6 + (y - cy) * 0.8) > 0.25 * dist) return 0;

    let ink = 0;
    // Dune slope just under the crest.
    const dy = y - duneY(x);
    if (x >= 84 && x <= 316 && dy > 0 && dy < 20) ink = 0.15 * (1 - dy / 20) * (0.8 + 0.4 * fbm(x / 9, y / 9));
    // Tracks.
    for (const tr of tracks) {
      if (x < tr[5][0] - 6 || x > tr[0][0] + 6) continue;
      ink = Math.max(ink, 0.2 * solid(sdPolyline(x, y, tr) - 2.2));
    }
    // Awake glow around head and neck.
    const gd = Math.min(dHead, t > 0.8 ? dBody : 1e9);
    if (gd < 24) ink = Math.max(ink, 0.25 * Math.exp(-Math.max(gd, 0) / 6));
    return ink;
  });

  // Single contour: tail tip, upper edge, around the head, lower edge back.
  const tip = [pts[0][0] - (pts[1][0] - pts[0][0]) * 0.3, pts[0][1] - (pts[1][1] - pts[0][1]) * 0.3];
  const headArc = [];
  for (let i = 0; i <= 64; i++) {
    const p = headAt(Math.PI + (i / 64) * Math.PI * 2);
    if (p[0] >= 285) headArc.push(p);
  }
  const contour = [tip, ...upper, ...headArc, ...lower.slice().reverse()];
  g.line(polyD(contour, true), "ink");

  // Belly scale line, 3 units inside the lower edge.
  const belly = [];
  for (let i = 0; i < S; i++) {
    const t = cum[i] / L;
    if (t < 0.2 || t > 0.97) continue;
    const off = rad[i] - 3;
    belly.push([pts[i][0] - off * nrm[i][0], pts[i][1] - off * nrm[i][1]]);
  }
  g.line(polyD(belly), "soft", { dash: "2 3" });

  // Dune crest and tracks.
  g.line(polyD(dunePts), "faint");
  for (const tr of tracks) g.line(polyD(tr), "faint", { dash: "2 2" });

  // Forked tongue in orange.
  const fork = ((25 + rand() * 20) * Math.PI) / 180 / 2;
  const base = Math.atan2(-2, 12);
  const fx = 325, fy = 106;
  const t1 = [fx + 6 * Math.cos(base - fork), fy + 6 * Math.sin(base - fork)];
  const t2 = [fx + 6 * Math.cos(base + fork), fy + 6 * Math.sin(base + fork)];
  g.line(`M313 108L${fx} ${fy}`, "sig", { width: 1.2 });
  g.line(polyD([[fx, fy], t1]), "sig", { width: 1.2 });
  g.line(polyD([[fx, fy], t2]), "sig", { width: 1.2 });
}
