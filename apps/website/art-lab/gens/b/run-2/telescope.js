function draw(g, rand, seed, k) {
  // A brass refractor on its tripod, aimed at one distant star
  const { clamp, solid, glow, sdBox, sdPolyline, inPolygon, polyD, num } = k;

  // Light comes from the upper left.
  const LX = -0.6, LY = -0.8;

  // A tapered cylinder between two points, with half-thicknesses h0 and h1.
  // test() returns a shade coordinate from -1 (lit side) to 1 (shadow), or null outside.
  const cyl = (p0, p1, h0, h1) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const sg = nx * LX + ny * LY > 0 ? -1 : 1;
    const hw = (t) => h0 + (h1 - h0) * clamp(t / L);
    const at = (t, s) => [p0[0] + ux * t + nx * s, p0[1] + uy * t + ny * s];
    return {
      L, hw, at,
      test(x, y) {
        const px = x - p0[0], py = y - p0[1];
        const t = px * ux + py * uy;
        if (t < 0 || t > L) return null;
        const s = px * nx + py * ny, h = hw(t);
        if (Math.abs(s) > h) return null;
        return (sg * s) / h;
      },
      outline: polyD([at(0, -h0), at(L, -h1), at(L, h1), at(0, h0)], true),
    };
  };

  // Main optical axis, eyepiece end to objective end.
  const A = [132, 166], B = [262, 98];
  const LA = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const ux = (B[0] - A[0]) / LA, uy = (B[1] - A[1]) / LA;
  const nx = -uy, ny = ux; // points to the lower right
  const onAxis = (t, s = 0) => [A[0] + ux * t + nx * s, A[1] + uy * t + ny * s];
  const tubeHW = (t) => 9 + (3 * t) / LA;

  // The dew shield ends at (272, 93), 22 long; the tube runs up to where it begins.
  const shieldEndT = (272 - A[0]) * ux + (93 - A[1]) * uy;
  const shieldStartT = shieldEndT - 22;
  const tube = cyl(A, onAxis(shieldStartT), 9, tubeHW(shieldStartT));
  const shield = cyl(onAxis(shieldStartT), onAxis(shieldEndT), 14, 14);

  // Front lens: 6 wide along the axis, 28 tall across it.
  const lens = [273, 92];
  const lensRot = (Math.atan2(uy, ux) * 180) / Math.PI;

  // Eyepiece stub as briefed, with a short focuser collar bridging it to the tube's end.
  const eyeEnd = [126 - 10 * Math.SQRT1_2, 170 + 10 * Math.SQRT1_2];
  const eyepiece = cyl([126, 170], eyeEnd, 4, 4);
  const focuser = cyl(onAxis(1), [126, 170], 5, 5);

  // Finder: parallel to the tube, lifted so it rides clear of it on visible struts.
  const fT0 = 73, fT1 = 120, fS = -(tubeHW(96) + 9);
  const finder = cyl(onAxis(fT0, fS), onAxis(fT1, fS), 3, 3);
  const struts = [84, 110].map((t) => [onAxis(t, -tubeHW(t)), onAxis(t, fS + 3)]);

  // Mount: a 16-wide block under the balance point whose top meets the tube's underside.
  const edgeY = (x) => {
    const base = onAxis(0, tubeHW(69));
    return base[1] + (uy / ux) * (x - base[0]);
  };
  const mount = [[190, edgeY(190) - 1], [206, edgeY(206) - 1], [206, 155], [190, 155]];

  // Tripod legs.
  const legs = [
    [[194, 155], [152, 190]],
    [[198, 155], [204, 193]],
    [[202, 155], [250, 190]],
  ];

  // Target star, jittered, with its glow radius.
  const sx = 300 + (rand() * 2 - 1) * 8;
  const sy = 66 + (rand() * 2 - 1) * 8;
  const R = 22 + rand() * 12;

  // Pinprick stars in the upper sky, kept away from the instrument and the target.
  const pins = [];
  const nPins = 3 + Math.floor(rand() * 4);
  for (let tries = 0; pins.length < nPins && tries < 200; tries++) {
    const px = 92 + rand() * 216, py = 58 + rand() * 52;
    const rx = px - A[0], ry = py - A[1];
    const t = rx * ux + ry * uy, s = rx * nx + ry * ny;
    if (t > -12 && t < shieldEndT + 14 && s > fS - 14 && s < 40) continue;
    if (Math.hypot(px - sx, py - sy) < R + 8) continue;
    if (Math.hypot(px - lens[0], py - lens[1]) < 30) continue;
    if (pins.some(([qx, qy]) => Math.hypot(px - qx, py - qy) < 24)) continue;
    pins.push([px, py]);
  }

  g.print((x, y) => {
    if (y > 198 || x < 88 || x > 345) return 0;

    // Orange: the star alone.
    const r = Math.hypot(x - sx, y - sy);
    let orange = 0;
    if (r < R + 4) orange = Math.max(solid(r - 3), 0.85 * Math.pow(clamp(1 - r / R), 2));

    let ink = 0;
    // Front lens: dark glass with a bright crescent on its upper-left rim.
    const lx = x - lens[0], ly = y - lens[1];
    const la = (lx * ux + ly * uy) / 3, lb = (lx * nx + ly * ny) / 14;
    let v;
    if (la * la + lb * lb <= 1) {
      const inner = (la / 0.85) ** 2 + ((lb - 0.32) / 1.0) ** 2;
      ink = inner > 1 && lb < 0 ? 0.7 : 0.15;
    } else if ((v = shield.test(x, y)) !== null) {
      ink = 0.65 - 0.15 * v;
    } else if ((v = tube.test(x, y)) !== null) {
      ink = 0.525 - 0.275 * v;
    } else if ((v = finder.test(x, y)) !== null) {
      ink = 0.45 - 0.17 * v;
    } else if ((v = eyepiece.test(x, y)) !== null || (v = focuser.test(x, y)) !== null) {
      ink = 0.45 - 0.17 * v;
    } else if (inPolygon(x, y, mount)) {
      ink = 0.4;
    } else {
      // Legs: barely there, a faint 0.15 under their lines.
      for (const leg of legs) if (sdPolyline(x, y, leg) < 2) ink = 0.15;
      // A very soft gathering glow around the lens.
      const dl = Math.hypot(lx, ly) - 14;
      if (!ink && dl < 40) ink = 0.12 * glow(dl, 9);
      // Pinpricks.
      for (const [px, py] of pins) ink = Math.max(ink, 0.2 * solid(Math.hypot(x - px, y - py) - 3));
    }
    return [ink, orange];
  });

  // Horizon.
  g.line(`M0 190.5H400`, "faint");

  // Tripod legs with foot ticks.
  for (const [top, foot] of legs) {
    g.line(polyD([top, foot]), "soft");
    g.line(`M${num(foot[0] - 3)} ${num(foot[1] + 0.5)}H${num(foot[0] + 3)}`, "soft");
  }

  // Mount, struts, finder, eyepiece.
  g.line(polyD(mount, true), "soft");
  for (const s of struts) g.line(polyD(s), "soft");
  g.line(finder.outline, "soft");
  g.line(focuser.outline, "soft");
  g.line(eyepiece.outline, "soft");

  // Main tube and dew shield.
  g.line(tube.outline, "ink");
  g.line(shield.outline, "ink");

  // Front lens rim.
  const e0 = [lens[0] - nx * 14, lens[1] - ny * 14], e1 = [lens[0] + nx * 14, lens[1] + ny * 14];
  g.line(
    `M${num(e0[0])} ${num(e0[1])}A3 14 ${num(lensRot)} 1 0 ${num(e1[0])} ${num(e1[1])}` +
      `A3 14 ${num(lensRot)} 1 0 ${num(e0[0])} ${num(e0[1])}Z`,
    "ink"
  );

  // Line of sight from the lens to the star.
  const dxs = sx - lens[0], dys = sy - lens[1], ds = Math.hypot(dxs, dys);
  const s0 = [lens[0] + (dxs / ds) * 5, lens[1] + (dys / ds) * 5];
  const s1 = [sx - (dxs / ds) * 5, sy - (dys / ds) * 5];
  g.line(polyD([s0, s1]), "faint", { dash: "2 3" });
}
