function draw(g, rand, seed, k) {
  // A cat's face in the dark, only its eyes catching the light
  const { clamp, smooth, solid, glow, sdPolyline, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Head and ears, one closed contour.
  const leftSide = [[172, 193], [146, 189], [126, 180], [114, 167], [109, 150], [112, 131], [119, 113]];
  const top = [[128, 100], [138, 56], [172, 84], [186, 81], [200, 80], [214, 81], [228, 84], [262, 56], [272, 100], [281, 113], [288, 131]];
  const lowerRight = [[288, 131], [291, 150], [286, 167], [274, 180], [254, 189], [228, 193], [200, 194]];
  const head = [[200, 194], ...leftSide, ...top, ...lowerRight.slice(1, -1)];
  const halfContour = [[200, 194], ...leftSide, ...top];

  // Ears: outer triangles and inner triangles shrunk toward their centroids.
  const ears = [
    [[128, 100], [138, 56], [172, 84]],
    [[228, 84], [262, 56], [272, 100]],
  ];
  const inner = ears.map((tri) => {
    const c = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3 + 2];
    return tri.map(([px, py]) => [c[0] + (px - c[0]) * 0.58, c[1] + (py - c[1]) * 0.58]);
  });

  // Rim light along the upper-left contour of the left ear and crown.
  const rim = [[110, 140], [113, 125], [120, 111], [128, 100], [138, 56], [172, 84], [186, 81], [200, 80]];

  // Eyes: almonds tilted up at the outer corners.
  const tilt = (8 * Math.PI) / 180;
  const pw = 3 + rand() * 4; // pupil slit width
  const eyes = [[164, 128, -1], [236, 128, 1]].map(([cx, cy, s]) => {
    const e = [s * Math.cos(tilt), -Math.sin(tilt)];
    const n = [s * Math.sin(tilt), Math.cos(tilt)];
    const pt = (u, v) => [cx + u * e[0] + v * n[0], cy + u * e[1] + v * n[1]];
    const outline = [];
    for (let i = 0; i <= 24; i++) {
      const u = -23 + (46 * i) / 24;
      outline.push(pt(u, -13 * (1 - (u / 23) ** 2)));
    }
    for (let i = 23; i >= 1; i--) {
      const u = -23 + (46 * i) / 24;
      outline.push(pt(u, 13 * (1 - (u / 23) ** 2)));
    }
    const pupil = [];
    for (let i = 0; i <= 12; i++) {
      const t = -1 + (2 * i) / 12;
      pupil.push([cx + (pw / 2) * (1 - t * t), cy + 11 * t]);
    }
    for (let i = 11; i >= 1; i--) {
      const t = -1 + (2 * i) / 12;
      pupil.push([cx - (pw / 2) * (1 - t * t), cy + 11 * t]);
    }
    return { cx, cy, e, n, outline, closed: [...outline, outline[0]], pupil };
  });

  const inEye = (eye, x, y) => {
    const dx = x - eye.cx, dy = y - eye.cy;
    const u = dx * eye.e[0] + dy * eye.e[1];
    const v = dx * eye.n[0] + dy * eye.n[1];
    if (Math.abs(u) >= 23) return false;
    return Math.abs(v) < 13 * (1 - (u / 23) ** 2);
  };
  const inPupil = (eye, x, y) => {
    const t = (y - eye.cy) / 11;
    if (Math.abs(t) >= 1) return false;
    return Math.abs(x - eye.cx) < (pw / 2) * (1 - t * t);
  };

  // Nose.
  const nose = [[193, 156], [207, 156], [200, 164]];

  g.print((x, y) => {
    if (x < 100 || x > 300 || y < 50 || y > 200) return 0;
    let ink = 0, orange = 0;

    // Eyes and their glow.
    let eyeGlow = 0;
    for (const eye of eyes) {
      if (Math.abs(x - eye.cx) > 75 || Math.abs(y - eye.cy) > 60) continue;
      if (inEye(eye, x, y)) {
        if (inPupil(eye, x, y)) return [0, 0];
        orange = 0.95;
      } else {
        const d = sdPolyline(x, y, eye.closed);
        eyeGlow = Math.max(eyeGlow, 0.5 * Math.exp(-d / 16));
      }
    }
    if (orange) return [0, orange];

    // Head: a dark mass, melting away to the right and at the chin.
    const inHead = inPolygon(x, y, head) || inPolygon(x, y, ears[0]) || inPolygon(x, y, ears[1]);
    if (inHead) {
      const fade = clamp(1 - 0.85 * smooth(clamp((x - 200) / 85)) - 0.85 * smooth(clamp((y - 160) / 32)));
      ink = (0.1 + 0.03 * (fbm(x / 9, y / 9) - 0.5)) * fade;
      if (inPolygon(x, y, inner[0]) || inPolygon(x, y, inner[1])) ink = Math.max(ink, 0.2 * (0.5 + 0.5 * fade));
      const rd = sdPolyline(x, y, rim);
      ink = Math.max(ink, 0.3 * Math.exp(-rd / 4));
    }

    // Nose highlight on the upper-left facet.
    if (inPolygon(x, y, nose) && x < 201 && y < 160) ink = Math.max(ink, 0.4);

    ink = Math.max(ink, eyeGlow);
    return [ink, 0];
  });

  // Head and ears contour: half strength, faint along the lower right.
  g.line(polyD(halfContour), "soft");
  g.line(polyD(lowerRight), "faint");
  for (const tri of inner) g.line(polyD(tri, true), "faint");

  // Eyes and pupils.
  for (const eye of eyes) {
    g.line(polyD(eye.outline, true), "ink");
    g.line(polyD(eye.pupil, true), "ink");
  }

  // Nose and mouth.
  g.line(polyD(nose, true), "soft");
  g.line("M200 164V169M200 169Q196 175 189 172M200 169Q204 175 211 172", "soft");

  // Whiskers, tapering outward.
  for (const s of [-1, 1]) {
    const base = [-13, -2, 10];
    base.forEach((deg, i) => {
      const a = ((deg + (rand() * 2 - 1) * 6) * Math.PI) / 180;
      const len = 80 + (rand() * 2 - 1) * 10;
      const sx = 200 + s * 16, sy = 164 + i * 3;
      const ex = sx + s * len * Math.cos(a), ey = sy + len * Math.sin(a);
      const mx = (sx + ex) / 2, my = (sy + ey) / 2 + 4;
      const pts = [];
      for (let j = 0; j <= 18; j++) {
        const t = j / 18;
        pts.push([
          (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex,
          (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey,
        ]);
      }
      g.line(polyD(pts.slice(0, 9)), "faint", { width: 1 });
      g.line(polyD(pts.slice(8, 14)), "faint", { width: 0.7 });
      g.line(polyD(pts.slice(13)), "faint", { width: 0.4 });
    });
  }
}
