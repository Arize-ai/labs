function draw(g, rand, seed, k) {
  // A convex lens gathering parallel rays to a single focus
  const { clamp, smooth, solid, inPolygon, polyD, num } = k;
  const cx = 170, cy = 125, lensTop = 63, lensBot = 187, halfT = 13;

  // The lens: two circular arcs meeting in points at top and bottom.
  const h = (lensBot - lensTop) / 2;
  const R = (h * h + halfT * halfT) / (2 * halfT);
  const cxL = cx - halfT + R; // centre of the circle forming the left face
  const cxR = cx + halfT - R; // centre of the circle forming the right face
  const faceL = (y) => cxL - Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
  const faceR = (y) => cxR + Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));

  // Focus, shifted along the axis so each lens has a slightly different strength.
  const fx = 282 + (rand() * 2 - 1) * 8, fy = cy;
  const endX = 308, startX = 92;

  // Rays: 5–9 of them, spread over the beam with jittered spacing.
  const n = 5 + Math.floor(rand() * 5);
  const step = 96 / (n - 1);
  const ys = [];
  for (let i = 0; i < n; i++) {
    const base = 77 + i * step;
    const j = i === (n - 1) / 2 ? 0 : (rand() * 2 - 1) * 3;
    ys.push(clamp(base + j, 72, 178));
  }
  ys.sort((a, b) => a - b);
  const yTop = ys[0], yBot = ys[n - 1];
  const stubY = (y) => fy + (fy - y) * (endX - fx) / (fx - faceR(y));

  // The converging cone: the right face between the outer rays, closing on the focus.
  const cone = [];
  for (let i = 0; i <= 16; i++) {
    const y = yTop + (yBot - yTop) * (i / 16);
    cone.push([faceR(y), y]);
  }
  cone.push([fx, fy]);
  const coneStart = faceR(cy);
  const diverge = [[fx, fy], [endX, stubY(yTop)], [endX, stubY(yBot)]];

  g.print((x, y) => {
    if (x < 86 || x > 316 || y < 60 || y > 190) return 0;
    let ink = 0;

    // Incoming beam: a faint, even wash.
    if (x >= startX && y >= yTop - 1 && y <= yBot + 1 && x < faceL(y)) ink = 0.18;

    // Lens body, shaded like polished glass.
    const dL = R - Math.hypot(x - cxL, y - cy); // depth inside the left face's circle
    const dR = R - Math.hypot(x - cxR, y - cy); // depth inside the right face's circle
    if (dL > 0 && dR > 0) {
      let t = 0.45;
      const crescent = smooth(clamp(1 - dL / 9)) * smooth(clamp(1 - Math.hypot(x - 163, y - 90) / 26));
      t += 0.3 * crescent;
      const rim = smooth(clamp(1 - dR / 8)) * smooth(clamp((y - cy) / 40 + 0.2));
      t -= 0.2 * rim;
      ink = Math.max(ink, t);
    }

    // Converging cone: dots swell as the light concentrates.
    if (x > coneStart - 14 && x <= fx && inPolygon(x, y, cone)) {
      const t = clamp((x - coneStart) / (fx - coneStart));
      ink = Math.max(ink, 0.3 + 0.65 * Math.pow(t, 1.3));
    }

    // Diverging stubs past the focus, dropping away quickly.
    if (x > fx && inPolygon(x, y, diverge)) {
      const t = clamp((x - fx) / (endX - fx));
      ink = Math.max(ink, 0.6 - 0.5 * Math.sqrt(t));
    }

    // Focal glow and the orange core.
    const r = Math.hypot(x - fx, y - fy);
    let orange = 0;
    if (r < 36) {
      ink = Math.max(ink, smooth(clamp(1 - r / 34)));
      orange = solid(r - 9);
      if (orange > 0.5) ink = Math.min(ink, 0.85);
    }
    return [ink, orange];
  });

  // Optical axis, faint and dashed, beneath everything.
  g.line(`M86 ${cy}H314`, "faint", { dash: "4 3" });

  // Rays: half going in, full converging, faint diverging.
  for (const y of ys) {
    const xl = faceL(y), xr = faceR(y);
    g.line(`M${startX} ${num(y)}H${num(xl)}`, "soft");
    g.line(`M${num(xr)} ${num(y)}L${num(fx)} ${fy}`, "ink");
    g.line(`M${num(fx)} ${fy}L${endX} ${num(stubY(y))}`, "faint");
  }

  // Lens outline: two shallow arcs meeting in points.
  g.line(`M${cx} ${lensTop}A${num(R)} ${num(R)} 0 0 0 ${cx} ${lensBot}`, "ink");
  g.line(`M${cx} ${lensTop}A${num(R)} ${num(R)} 0 0 1 ${cx} ${lensBot}`, "ink");

  // The focal point: a small orange dot where every ray agrees.
  g.line(`M${num(fx - 4)} ${fy}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z`, "sig");
}
