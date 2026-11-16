function draw(g, rand, seed, k) {
  // A small refractor on its tripod, trained on one distant star
  const { clamp, smooth, solid, sdBox, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Axis: pivot on the tube's midpoint so the mount stays put while the tube tilts.
  const L = 159;
  const M = [196.5, 135.5];
  const a = (25.76 + (rand() * 2 - 1) * 4) * Math.PI / 180;
  const dx = Math.cos(a), dy = -Math.sin(a);   // along the axis, toward the objective
  const nx = -Math.sin(a), ny = -Math.cos(a);  // perpendicular, toward the upper left
  const B = [M[0] - dx * L / 2, M[1] - dy * L / 2]; // eyepiece end
  const P = (u, v) => [B[0] + u * dx + v * nx, B[1] + u * dy + v * ny];
  const hw = (u) => 7 + 4 * clamp(u / L);       // tube half-width, 7 at back to 11 at front
  const shieldU = L - 30, shieldH = 13;
  const lensA = 5, lensB = 13;                  // objective ellipse semi-axes (along, across)

  // The star on the extended axis.
  const S = [M[0] + dx * 121.9, M[1] + dy * 121.9];
  const R = 18 + rand() * 12;
  const wobAmt = 0.08 + rand() * 0.1;
  const ox = rand() * 50, oy = rand() * 50;

  // Eyepiece barrel drops square to the axis from the back end; knob beside it.
  const eyeU0 = 2, eyeU1 = 10, eyeV0 = -7, eyeV1 = -25;
  const knob = P(13.5, -12), knobR = 2.5;

  // Mount block tucked under the tube's midpoint.
  const mx = M[0], my = M[1] + 9 * Math.cos(a) + 4;

  g.print((x, y) => {
    // Star: the only orange.
    const sx = x - S[0], sy = y - S[1];
    const sd = Math.hypot(sx, sy);
    if (sd < R * 1.4 + 4) {
      const along = sx * dx + sy * dy, across = sx * nx + sy * ny;
      const re = Math.hypot(along / 1.25, across);
      const th = Math.atan2(across, along);
      const wob = 1 + wobAmt * 2 * (fbm(Math.cos(th) * 1.3 + ox, Math.sin(th) * 1.3 + oy) - 0.5);
      const t = clamp((re - 3) / (R * wob - 3));
      const halo = 0.85 * Math.pow(1 - smooth(t), 1.6);
      return [0, Math.max(solid(sd - 3), halo)];
    }

    let ink = 0;

    // Ground shadow beneath the tripod.
    if (y > 183 && y < 201 && x > 140 && x < 266) {
      ink = 0.15 * solid(sdBox(x, y, 203, 192, 50, 3, 3));
    }

    // Mount block.
    if (Math.abs(x - mx) < 8 && Math.abs(y - my) < 6) ink = y > my + 2 ? 0.25 : 0.45;

    // Tube, shield, lens, eyepiece in the axis frame.
    const px = x - B[0], py = y - B[1];
    const u = px * dx + py * dy, v = px * nx + py * ny;
    if (u > -6 && u < L + 7 && v > -30 && v < 16) {
      const e = ((u - L) / lensA) ** 2 + (v / lensB) ** 2;
      if (e < 1) {
        const rim = (v / lensB) * 0.8 - ((u - L) / lensA) * 0.6;
        return [e > 0.3 && rim > 0.45 ? 0.9 : 0.2, 0];
      }
      if (u >= shieldU && u <= L && Math.abs(v) <= shieldH) {
        return [0.35 + 0.4 * (v + shieldH) / (2 * shieldH), 0];
      }
      const h = hw(u);
      if (u >= 0 && u < shieldU && Math.abs(v) < h) {
        return [0.3 + 0.4 * (v + h) / (2 * h), 0];
      }
      if (u >= eyeU0 && u <= eyeU1 && v <= eyeV0 && v >= eyeV1) {
        return [(u > 6.5 || v < eyeV1 + 3) ? 0.25 : 0.45, 0];
      }
      if (Math.hypot(x - knob[0], y - knob[1]) < knobR) return [0.45, 0];
    }

    return [ink, 0];
  });

  // Horizon.
  g.line(`M96 192.5H304`, "faint");

  // Tripod legs, full strength.
  const legTop = my + 6;
  g.line(polyD([[mx - 5, legTop], [160, 192]]), "ink", { width: 1.2 });
  g.line(polyD([[mx, legTop], [203, 193]]), "ink", { width: 1.2 });
  g.line(polyD([[mx + 5, legTop], [246, 192]]), "ink", { width: 1.2 });

  // Mount.
  g.box(mx - 8, my - 6, 16, 12, "soft");

  // Eyepiece barrel and focuser knob.
  g.line(polyD([P(eyeU0, eyeV0), P(eyeU0, eyeV1), P(eyeU1, eyeV1), P(eyeU1, eyeV0)]), "soft");
  const kp = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    kp.push([knob[0] + knobR * Math.cos(t), knob[1] + knobR * Math.sin(t)]);
  }
  g.line(polyD(kp, true), "soft");

  // Tube body, tapering toward the back.
  g.line(polyD([P(shieldU, hw(shieldU)), P(0, hw(0)), P(0, -hw(0)), P(shieldU, -hw(shieldU))]), "ink");
  // Dew shield, open at the front where the lens sits.
  g.line(polyD([P(L, shieldH), P(shieldU, shieldH), P(shieldU, -shieldH), P(L, -shieldH)]), "ink");
  // Objective ellipse, square to the axis.
  const ep = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    ep.push(P(L + lensA * Math.cos(t), lensB * Math.sin(t)));
  }
  g.line(polyD(ep, true), "ink");

  // Sightlines from the objective's rims converging on the star.
  g.line(polyD([P(L, lensB), S]), "faint", { dash: "2 3" });
  g.line(polyD([P(L, -lensB), S]), "faint", { dash: "2 3" });

  // The observer's line of sight continuing behind the eyepiece.
  g.line(polyD([P(-2, 0), P(-22, 0)]), "soft", { dash: "3 3" });
}
