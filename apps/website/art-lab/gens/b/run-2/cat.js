function draw(g, rand, seed, k) {
  // A cat's eyeshine watching out of the dark
  const { clamp, smooth, solid, glow, inPolygon, sdPolyline, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);
  const cx = 200, cy = 132;

  // Variation: head tilt (±6°) and pupil slit width (2–7).
  const A = (rand() * 2 - 1) * 6 * Math.PI / 180;
  const ca = Math.cos(A), sa = Math.sin(A);
  const pw = 2 + rand() * 5;
  const cutHalf = Math.max(pw, 3.5) / 2; // the screened cut needs to be at least a dot wide
  const toPlate = ([x, y]) => [cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca];
  const mapPts = (pts) => pts.map(toPlate);

  // Head outline, in head-local coordinates: cheeks, ears, crown, as one loop.
  const hw = (y) => y < 150
    ? 68 + 7 * smooth(clamp((y - 100) / 50))
    : 75 * Math.sqrt(Math.max(0, 1 - ((y - 150) / 34) ** 2));
  const outline = [];
  const N = 24;
  for (let i = 0; i <= N; i++) { const y = 184 - (84 * i) / N; outline.push([cx - hw(y), y]); }
  outline.push([140, 58], [168, 84]);
  for (let i = 1; i < 12; i++) { const x = 168 + (64 * i) / 12; outline.push([x, 80 + 4 * ((x - 200) / 32) ** 2]); }
  outline.push([232, 84], [260, 58]);
  for (let i = 0; i <= N; i++) { const y = 100 + (84 * i) / N; outline.push([cx + hw(y), y]); }

  const earL = [[132, 100], [140, 58], [168, 84]];
  const earR = [[232, 84], [260, 58], [268, 100]];

  // Eyes: almonds tilted up at the outer corners.
  const eyes = [{ ex: 168, th: 0.14 }, { ex: 232, th: -0.14 }];
  const almondV = (u) => 9 * Math.pow(Math.max(0, 1 - (u / 18) ** 2), 0.85);
  for (const e of eyes) {
    e.c = Math.cos(e.th); e.s = Math.sin(e.th);
    const pts = [];
    for (let i = 0; i <= 16; i++) { const u = -18 + (36 * i) / 16; pts.push([u, -almondV(u)]); }
    for (let i = 15; i >= 1; i--) { const u = -18 + (36 * i) / 16; pts.push([u, almondV(u)]); }
    e.poly = pts.map(([u, v]) => [e.ex + u * e.c - v * e.s, 128 + u * e.s + v * e.c]);
    const pp = [];
    for (let i = 0; i <= 10; i++) { const v = -8 + (16 * i) / 10; pp.push([e.ex + (pw / 2) * Math.sqrt(Math.max(0, 1 - (v / 8) ** 2)), 128 + v]); }
    for (let i = 9; i >= 1; i--) { const v = -8 + (16 * i) / 10; pp.push([e.ex - (pw / 2) * Math.sqrt(Math.max(0, 1 - (v / 8) ** 2)), 128 + v]); }
    e.pupil = pp;
  }
  const eyeDist = (e, lx, ly) => {
    const dx = lx - e.ex, dy = ly - 128;
    const u = dx * e.c + dy * e.s, v = -dx * e.s + dy * e.c;
    if (Math.abs(u) >= 18) return Math.hypot(Math.abs(u) - 18, v);
    return (Math.abs(v) - almondV(u)) * 0.85;
  };

  // Nose.
  const nose = [[195, 149], [205, 149], [200, 155]];

  // Shoulders (the body does not tilt with the head).
  const sy = (x) => 194 - 18 * (1 - ((x - 200) / 90) ** 2);

  g.print((x, y) => {
    if (x < 96 || x > 304 || y < 46) return 0;
    const dx = x - cx, dy = y - cy;
    const lx = cx + dx * ca + dy * sa, ly = cy - dx * sa + dy * ca;

    const inHead = inPolygon(lx, ly, outline);

    // Shoulders: a whisper below the head.
    if (!inHead) {
      let sh = 0;
      if (Math.abs(x - 200) < 90 && y > sy(x)) sh = 0.1 * clamp(1 - (y - sy(x)) / 14) * clamp((90 - Math.abs(x - 200)) / 20);
      // Eyeshine can still bloom just past the head edge.
      let o = 0;
      for (const e of eyes) { const d = eyeDist(e, lx, ly); if (d < 26) o = Math.max(o, 0.5 * glow(Math.max(d, 0), 7)); }
      return [sh, o];
    }

    // Head fur: very low, except the face between and below the eyes.
    const fx = Math.abs(lx - 200) - 46, fy = Math.abs(ly - 152) - 34;
    const inFace = Math.hypot(Math.max(fx + 16, 0), Math.max(fy + 16, 0)) + Math.min(Math.max(fx + 16, fy + 16), 0) - 16 < 0;
    let ink = inFace ? 0 : 0.1 + 0.05 * (fbm(lx / 8, ly / 8) - 0.5);

    // Ear inner faces.
    if (inPolygon(lx, ly, earL)) ink = 0.3;
    else if (inPolygon(lx, ly, earR)) ink = 0.2;

    // Rim light from the upper left, 6–8 units deep.
    const dist = sdPolyline(lx, ly, outline);
    if (dist < 9) {
      const rx = lx - 200, ry = ly - 120, rl = Math.hypot(rx, ry) || 1;
      const facing = (-0.85 * rx - 0.53 * ry) / rl;
      const rimT = Math.max(0.45 * smooth(clamp((facing - 0.45) / 0.45)), 0.15 * clamp((facing + 0.1) / 0.4));
      ink = Math.max(ink, rimT * solid(dist - 6.5));
    }

    // Nose highlight on its upper left.
    ink = Math.max(ink, 0.35 * solid(Math.hypot(lx - 197.5, ly - 150.5) - 2));

    // Eyes and eyeshine, in orange.
    let o = 0;
    for (const e of eyes) {
      const d = eyeDist(e, lx, ly);
      if (d < 26) {
        const t = d < 0 ? 0.8 + 0.2 * clamp(-d / 7) : 0.5 * glow(d, 7);
        o = Math.max(o, t);
        const px = lx - e.ex, py = ly - 128;
        if (Math.abs(py) < 8 && Math.abs(px) < cutHalf * Math.sqrt(1 - (py / 8) ** 2)) return 0;
      }
    }
    if (o > 0.05 && o > ink) ink = Math.min(ink, 0.04);
    return [ink, o];
  });

  // Head and ears: one continuous half-strength line.
  g.line(polyD(mapPts(outline), true), "soft");

  // Eyes, full strength; pupils faint.
  for (const e of eyes) {
    g.line(polyD(mapPts(e.poly), true), "ink");
    g.line(polyD(mapPts(e.pupil), true), "faint");
  }

  // Nose and mouth.
  g.line(polyD(mapPts(nose), true), "soft");
  g.line(polyD(mapPts([[200, 155], [200, 163]])), "faint");

  // Whiskers: three per side, gently curved, varied per side.
  for (const s of [-1, 1]) {
    const ox = 200 + s * 14, oy = 158;
    const spread = 9 + rand() * 4, lift = (rand() - 0.5) * 6;
    for (let j = 0; j < 3; j++) {
      const exX = 200 + s * (90 + (rand() - 0.5) * 10);
      const exY = oy + (j - 1) * spread + lift + (rand() - 0.5) * 4;
      const mx = (ox + exX) / 2, my = (oy + exY) / 2 - 4 - rand() * 2;
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
        pts.push([a * ox + b * mx + c * exX, a * oy + b * my + c * exY]);
      }
      g.line(polyD(mapPts(pts)), "faint");
    }
  }

  // Shoulders: a faint dashed curve falling away on either side of the head.
  for (const [a, b] of [[110, 158], [242, 290]]) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const x = a + ((b - a) * i) / 12; pts.push([x, sy(x)]); }
    g.line(polyD(pts), "faint", { dash: "4 3" });
  }
}
