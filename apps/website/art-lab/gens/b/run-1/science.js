function draw(g, rand, seed, k) {
  // A glass prism fanning a single beam onto a measuring screen
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);

  // The prism, apex up.
  const A = [200, 72], B = [150, 170], C = [250, 170];
  const prism = [A, B, C];
  const faceLen = Math.hypot(50, 98);
  const nIn = [98 / faceLen, 50 / faceLen]; // inward normal of the left face
  const leftFaceX = (y) => 200 - 50 * (y - 72) / 98;

  // Incoming beam, angle varied by up to ±3°.
  const entry = [175, 121];
  const baseAng = Math.atan2(9, 85);
  const ang = baseAng + (rand() * 2 - 1) * 3 * Math.PI / 180;
  const bLen = Math.hypot(85, 9);
  const bDir = [Math.cos(ang), Math.sin(ang)];
  const bStart = [entry[0] - bLen * bDir[0], entry[1] - bLen * bDir[1]];
  const beam = [bStart, entry];
  const bNorm = [-bDir[1], bDir[0]];

  // Inner path through the glass.
  const exit = [227, 126];
  const inner = [entry, exit];

  // The fan: middle ray fixed on the landing spot, spread varies, slight unevenness.
  const screenX = 300;
  const spread = 40 + rand() * 20;
  const lands = [0, 1, 2, 3, 4].map((i) =>
    i === 2 ? 148 : 148 + (i - 2) * spread / 4 + (rand() * 2 - 1) * 1.5);
  const rays = lands.map((ly) => [exit, [screenX, ly]]);

  g.print((x, y) => {
    if (x < 70 || x > 308 || y < 64 || y > 192) return 0;
    let ink = 0, orange = 0;

    // Prism body: glass lit from the upper left.
    if (inPolygon(x, y, prism)) {
      const dl = (x - A[0]) * nIn[0] + (y - A[1]) * nIn[1];
      const lowerRight = clamp((x - 175 + y - 120) / 120);
      ink = 0.15 + 0.2 * Math.exp(-dl / 14) - 0.03 * lowerRight + 0.04 * (fbm(x / 8, y / 8) - 0.5);
    }

    // Incoming beam: the brightest mass, with a tight glow.
    if (x < entry[0] + 12) {
      const bd = sdPolyline(x, y, beam) - 3;
      ink = Math.max(ink, 0.95 * glow(bd, 3));
    }

    // Entry glow.
    const er = Math.hypot(x - entry[0], y - entry[1]);
    if (er < 18) { const t = 1 - er / 18; ink = Math.max(ink, 0.8 * t * t); }

    // Inner streak.
    if (x > entry[0] - 4 && x < exit[0] + 4) {
      const id = sdPolyline(x, y, inner) - 2.5;
      ink = Math.max(ink, 0.5 * solid(id));
    }

    // Fan of rays and their landing spots.
    if (x > exit[0] - 2) {
      const t = clamp((x - exit[0]) / (screenX - exit[0]));
      for (let i = 0; i < 5; i++) {
        const rd = sdPolyline(x, y, rays[i]) - 2;
        if (rd < 4) {
          const outer = i === 0 || i === 4;
          const tone = outer ? 0.4 - 0.1 * t : 0.75 - 0.3 * t;
          if (i === 2) orange = Math.max(orange, tone * solid(rd));
          else ink = Math.max(ink, tone * solid(rd));
        }
        const sr = Math.hypot(x - screenX, y - lands[i]);
        if (sr < 12) {
          if (i === 2) {
            const sd = sr - 3;
            orange = Math.max(orange, solid(sd) + 0.5 * glow(sd, 3));
          } else {
            ink = Math.max(ink, 0.5 * Math.exp(-(sr * sr) / 18));
          }
        }
      }
    }

    return [clamp(ink), clamp(orange)];
  });

  // Prism outline and a faint highlight inset along the left face.
  g.line(polyD(prism, true), "ink");
  const h0 = 0.2, h1 = 0.6;
  const hl = [h0, h1].map((s) => [
    A[0] + (B[0] - A[0]) * s + 3 * nIn[0],
    A[1] + (B[1] - A[1]) * s + 3 * nIn[1],
  ]);
  g.line(polyD(hl), "faint");

  // Beam edges, each stopping where it meets the left face.
  for (const s of [-3, 3]) {
    const p0 = [bStart[0] + bNorm[0] * s, bStart[1] + bNorm[1] * s];
    // Solve p0 + t*dir on the face x = leftFaceX(y).
    let lo = 0, hi = bLen * 1.2;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      const px = p0[0] + bDir[0] * mid, py = p0[1] + bDir[1] * mid;
      if (px < leftFaceX(py)) lo = mid; else hi = mid;
    }
    const p1 = [p0[0] + bDir[0] * lo, p0[1] + bDir[1] * lo];
    g.line(polyD([p0, p1]), "soft");
  }

  // Fan centre lines; the measured one in orange.
  for (let i = 0; i < 5; i++) g.line(polyD(rays[i]), i === 2 ? "sig" : "soft");

  // The screen and the ground.
  g.line(`M${num(screenX + 0.5)} 104V190`, "soft");
  g.line(`M120 ${num(176.5)}H320`, "faint", { dash: "4 3" });
}
