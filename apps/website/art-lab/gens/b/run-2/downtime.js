function draw(g, rand, seed, k) {
  // A row of five streetlamps at night, the middle one out
  const { clamp, smooth, solid, glow } = k;
  const ground = 172, headY = 90, headR = 6;
  const posts = [110, 155, 200, 245, 290];
  const dark = 2; // index of the failed lamp

  // Per-lamp flicker: halo radius 28 ± 4, peak 0.6 ± 0.1.
  const lamps = posts.map((px, i) => ({
    px,
    hx: px + 10,
    lit: i !== dark,
    R: 28 + (rand() * 2 - 1) * 4,
    peak: 0.6 + (rand() * 2 - 1) * 0.1,
  }));

  // Filament: radius nudged from 2 to 2.5 so it always catches a lattice point.
  const fil = [210, 92], filR = 2.5;
  const filGlow = 0.15 + rand() * 0.25; // cooling instant, 0.15 to 0.4

  // Downward half-disc: inside the circle and below its flat top.
  const sdHead = (x, y, hx) => Math.max(Math.hypot(x - hx, y - headY) - headR, headY - y);

  g.print((x, y) => {
    if (y < 52 || y > 180 || x < 74 || x > 336) return 0;
    let ink = 0, sig = 0;

    for (const L of lamps) {
      if (Math.abs(x - L.hx) > 36) continue;
      if (!L.lit) continue;
      // Head and halo.
      const dh = sdHead(x, y, L.hx);
      const r = Math.hypot(x - L.hx, y - (headY + 2));
      const halo = L.peak * (1 - smooth(clamp(r / L.R)));
      ink = Math.max(ink, solid(dh), halo);
      // Ground pool: flat ellipse 44 × 10, lit a touch more from the left.
      const ex = (x - L.hx) / 22, ey = (y - ground) / 5;
      const e = ex * ex + ey * ey;
      if (e < 1) {
        const pool = (0.45 + 0.08 * -ex) * (1 - e);
        ink = Math.max(ink, pool);
      }
    }

    // The failed lamp: dark head, dark ground, one orange ember.
    const fd = Math.hypot(x - fil[0], y - fil[1]) - filR;
    if (fd < 30) sig = Math.max(solid(fd), filGlow * glow(fd, 5));
    return [ink, sig];
  });

  // Ground line.
  g.line(`M84 ${ground + 0.5}H316`, "ink");

  for (const L of lamps) {
    const { px, hx } = L;
    const p = px + 0.5;
    // Post and arm curving over to the head.
    g.line(`M${p} ${ground}V88Q${p} 84 ${px + 5} 84Q${hx} 84 ${hx} ${headY}`, "ink");
    // Hood: dark lamp keeps a full outline so it still reads as a lamp.
    const hood = `M${hx - headR} ${headY}A${headR} ${headR} 0 0 0 ${hx + headR} ${headY}Z`;
    g.line(hood, L.lit ? "soft" : "ink");
    // Pool rim, or the placeholder where the missing pool would be.
    const rim = `M${hx - 22} ${ground}A22 5 0 1 0 ${hx + 22} ${ground}A22 5 0 1 0 ${hx - 22} ${ground}Z`;
    g.line(rim, "faint", { dash: L.lit ? "2 3" : "4 3" });
  }
}
