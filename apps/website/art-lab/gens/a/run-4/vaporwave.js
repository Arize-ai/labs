function draw(g, rand, seed, k) {
  // A striped vaporwave sun setting over a perspective grid floor
  const { clamp, smooth, solid, glow, makeNoise, polyD, num } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 200, hy = 142, yB = 200;
  const R = 44 + rand() * 6, cy = hy - 18 - rand() * 6;

  // Sun stripes: gaps that thicken toward the horizon.
  const nGaps = 4 + Math.floor(rand() * 2);
  const gaps = [];
  const gTop = cy - 2, gBot = hy - 2;
  for (let i = 0; i < nGaps; i++) {
    const t = i / (nGaps - 1);
    gaps.push({ c: gTop + (gBot - gTop) * Math.pow(t, 0.8), h: 1.3 + 1.8 * t });
  }

  // Low ridge behind the sun, sampled every 2 units.
  const rx0 = k.X0, rx1 = k.X1, ph = rand() * 20;
  const ridge = [];
  for (let x = rx0; x <= rx1; x += 2) {
    const u = (x - rx0) / (rx1 - rx0);
    const env = Math.pow(Math.sin(Math.PI * u), 0.7);
    ridge.push([x, hy - (4 + 24 * fbm(x / 26 + ph, 3.1)) * env]);
  }
  const ridgeY = (x) => {
    const i = clamp(Math.round((x - rx0) / 2), 0, ridge.length - 1);
    return ridge[i][1];
  };

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // The sun, above the horizon, cut by the gaps.
    if (y < hy + 4 && Math.abs(x - cx) < R + 30 && y > cy - R - 30) {
      const d = Math.hypot(x - cx, y - cy) - R;
      let gd = Infinity;
      for (const gp of gaps) gd = Math.min(gd, Math.abs(y - gp.c) - gp.h);
      const shape = Math.max(d, -gd, y - hy);
      const shade = 1 - 0.28 * clamp(((x - cx) + (y - cy)) / (2.4 * R) + 0.5);
      sig = solid(shape) * shade + (y < hy ? 0.22 * glow(d, 9) : 0);
    }
    // The ridge, faint and lit from the upper left.
    if (x > rx0 && x < rx1 && y < hy) {
      const ry = ridgeY(x);
      if (y > ry) ink = Math.max(ink, 0.2 + 0.1 * clamp(1 - (y - ry) / 14));
    }
    // Haze along the horizon and light on the near floor.
    const xf = smooth(clamp(1 - Math.abs(x - cx) / 128));
    if (y < hy) ink = Math.max(ink, 0.22 * Math.exp(-(hy - y) / 7) * xf);
    else if (y < yB + 6) ink = Math.max(ink, (0.34 * Math.exp(-(y - hy) / 16) + 0.06) * xf * clamp((yB + 6 - y) / 10));
    return [ink, sig];
  });

  // Ridge outline and horizon.
  g.line(polyD(ridge), "faint");
  g.line(`M${cx - 124} ${hy + 0.5}H${cx + 124}`, "ink", { width: 1.25 });

  // The grid: rays to the vanishing point, rungs spaced in depth.
  const half = 128, span = yB - hy;
  let d = "";
  for (let i = -6; i <= 6; i++) {
    const bx = cx + (half * i) / 6;
    d += `M${num(cx + (bx - cx) * 0.04)} ${num(hy + span * 0.04)}L${num(bx)} ${yB}`;
  }
  for (const z of [1, 1.45, 2.1, 3.1, 4.6, 7]) {
    const y = Math.round(hy + span / z) + 0.5, w = (half * (y - hy)) / span;
    d += `M${num(cx - w)} ${y}H${num(cx + w)}`;
  }
  g.fadeLine(d, "var(--fg)", 0.6, yB, hy);
}
