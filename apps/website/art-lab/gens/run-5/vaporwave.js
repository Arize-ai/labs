function draw(g, rand, seed, k) {
  // A striped sunset sun setting over a perspective grid floor.
  const { W, X0, X1, Y0, Y1, clamp, solid, glow, makeNoise, num } = k;
  const fbm = makeNoise(seed + 11);
  const cx = W / 2, hz = 144;
  const r = 50 + rand() * 6, scy = hz - 6;
  const sunTop = scy - r;
  // Slices across the lower half of the sun, widening toward the horizon.
  const nGaps = 4 + Math.floor(rand() * 2);
  const gaps = [];
  for (let i = 0; i < nGaps; i++) {
    const t = (i + 0.5) / nGaps;
    gaps.push({ y: scy - r * 0.55 + t * (hz - (scy - r * 0.55)), hh: 1.6 + 2.4 * t });
  }
  const phase = rand();

  const sunD = (x, y) => {
    let d = Math.hypot(x - cx, y - scy) - r;
    let band = Infinity;
    for (const gp of gaps) band = Math.min(band, Math.abs(y - gp.y) - gp.hh);
    d = Math.max(d, -band);
    return Math.max(d, y - hz);
  };

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (y < hz) {
      if (Math.abs(x - cx) < r + 40 && y > sunTop - 40) {
        const disc = Math.hypot(x - cx, y - scy) - r;
        // Lit from the upper left: brightest at the top-left of the disc.
        const shade = 1 - 0.3 * clamp((y - sunTop) / (hz - sunTop)) - 0.1 * clamp((x - cx + r) / (2 * r));
        sig = solid(sunD(x, y)) * shade + 0.28 * glow(Math.max(disc, 0), 9) * clamp((hz - y) / 6);
      }
      ink = 0.22 * Math.exp(-(hz - y) / 7) * clamp(1 - Math.abs(x - cx) / 130);
    } else if (x > X0 - 10 && x < X1 + 10) {
      const dy = y - hz;
      const side = smoothEdge(x);
      // The floor: a bright band at the horizon and the sun's broken reflection.
      const horizonGlow = 0.42 * Math.exp(-dy / 9);
      const streak = Math.sin(dy * 0.55 - phase * 6) > 0.1 ? 1 : 0.35;
      const refl = 0.4 * Math.exp(-Math.abs(x - cx) / (18 + dy * 0.6)) * Math.exp(-dy / 22) * streak;
      const floor = 0.08 + 0.06 * (fbm(x / 9, y / 9) - 0.5);
      ink = (horizonGlow + refl + floor * clamp((Y1 + 6 - y) / 14)) * side;
    }
    return [ink, sig];
  });

  function smoothEdge(x) {
    return clamp(Math.min(x - (X0 - 10), X1 + 10 - x) / 20);
  }

  // Floor grid: rails converging on the vanishing point, fading toward it.
  for (let i = -6; i <= 6; i++) {
    const bx = cx + i * 46;
    const dx = bx - cx;
    const tMax = dx === 0 ? 1 : Math.min(1, (X1 - cx) / Math.abs(dx));
    const ex = cx + dx * tMax, ey = hz + (Y1 - hz) * tMax;
    const sx = cx + dx * 0.04, sy = hz + (Y1 - hz) * 0.04;
    g.fadeLine(`M${num(ex)} ${num(ey)}L${num(sx)} ${num(sy)}`, "var(--fg)", 0.55, Y1, hz);
  }
  // Cross rules, spaced in perspective and closing up toward the horizon.
  const N = 7;
  for (let j = 1; j <= N; j++) {
    const t = (j - 1 + phase) / N;
    if (t <= 0.02) continue;
    const y = Math.round(hz + (Y1 - hz) * t * t) + 0.5;
    g.line(`M${X0} ${y}H${X1}`, t > 0.45 ? "soft" : "faint");
  }
  // The horizon.
  g.line(`M${X0} ${hz + 0.5}H${X1}`, "ink", { width: 1.25 });
}
