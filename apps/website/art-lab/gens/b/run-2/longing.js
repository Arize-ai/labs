function draw(g, rand, seed, k) {
  // A pier running out toward one far light across dark water
  const { clamp, smooth, solid, inPolygon, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);

  const cx = 200, horizon = 124;
  const lightY = 122, lightR = 2.5;
  const nearY = 194, farY = 152, nearHW = 52, farHW = 7;

  // Perspective: the side edges converge at a vanishing point on the axis.
  const yv = nearY - (nearY - farY) * nearHW / (nearHW - farHW);
  const hwAt = (y) => nearHW * (y - yv) / (nearY - yv);
  const leftX = (y) => cx - hwAt(y);
  const rightX = (y) => cx + hwAt(y);
  const deck = [[cx - nearHW, nearY], [cx - farHW, farY], [cx + farHW, farY], [cx + nearHW, nearY]];

  // Open water between the pier's tip and the end of the reflection: 3 to 10 units.
  const gap = 3 + rand() * 7;
  const streakTop = 126, streakEnd = farY - gap;
  const streakLen = streakEnd - streakTop;

  // Breaks in the reflection: 1 to 3, each long enough to clear the lattice.
  const nBreaks = 1 + Math.floor(rand() * 3);
  const breaks = [];
  for (let i = 0; i < nBreaks; i++) {
    const c = streakTop + 3 + (streakLen - 6) * ((i + 0.2 + 0.6 * rand()) / nBreaks);
    const len = 3.5 + rand() * 1.5;
    breaks.push([c - len / 2, c + len / 2]);
  }
  // Each run between breaks ripples sideways a little.
  const shifts = [];
  for (let i = 0; i <= nBreaks; i++) shifts.push([(rand() - 0.5) * 2, 2.6 + rand() * 0.9]);

  // Cross-plank banding in perspective: 9 units apart at the front, closing up.
  const dNear = nearY - yv;
  const dz = 9 / (dNear * dNear);

  // Pilings: five per side, 10 tall at the front down to 2 at the back,
  // set just outside the deck's silhouette so the deck never hides them.
  const pu = [0.08, 0.3, 0.52, 0.73, 0.92];
  const pilings = [];
  pu.forEach((u, i) => {
    const py = nearY - (nearY - farY) * u;
    const h = 10 - 2 * i;
    const hw = 2.5 - 0.375 * i;
    pilings.push({ x: leftX(py + h) - 1.5, y0: py, y1: py + h, hw });
    pilings.push({ x: rightX(py + h) + 1.5, y0: py, y1: py + h, hw });
  });

  g.print((x, y) => {
    if (y < 68 || y > 208 || x < 80 || x > 320) return 0;

    // Sky, the far light and its glow: all above the horizon.
    if (y <= horizon + 0.6) {
      const dx = x - cx, dy = y - lightY;
      const r = Math.hypot(dx / 1.2, dy); // wider along the horizon
      let t = r < 34 ? 0.7 * (1 - smooth(clamp(r / 34))) : 0;
      const sky = 0.15 * clamp((y - 70) / (horizon - 70)) * (1 - 0.6 * clamp(Math.abs(dx) / 116));
      t = Math.max(t, sky);
      const rr = Math.hypot(dx, dy);
      t = Math.max(t, solid(rr - lightR));
      // The core of the glow and the dot itself are the only orange.
      if (rr < 8) return [0, Math.max(t, 0.6 * solid(rr - lightR) + t)];
      return t;
    }

    // The reflection: a broken column of dot clusters, in the main ink.
    if (y >= streakTop && y <= streakEnd && Math.abs(x - cx) < 6) {
      let seg = 0, broken = false;
      for (const [a, b] of breaks) {
        if (y >= a && y <= b) broken = true;
        if (y > b) seg++;
      }
      if (broken) return 0;
      const [off, hw] = shifts[seg];
      if (Math.abs(x - cx - off) > hw) return 0;
      const f = (y - streakTop) / streakLen;
      const base = 0.55 - 0.35 * f;
      return clamp(base * (0.85 + 0.3 * fbm(x / 3, y / 3)));
    }

    // The deck.
    if (y >= farY && y <= nearY && inPolygon(x, y, deck)) {
      const u = (nearY - y) / (nearY - farY);
      let t = 0.45 - 0.25 * u;
      t += x < cx ? 0.05 : -0.05; // lit from the upper left
      const d = y - yv;
      const phase = (1 / d) / dz;
      const spacing = dz * d * d;
      const amp = 0.08 * clamp((spacing - 4.5) / 4);
      t += amp * Math.cos(2 * Math.PI * phase);
      return clamp(t);
    }

    // The pilings.
    for (const p of pilings) {
      if (y >= p.y0 && y <= p.y1 && Math.abs(x - p.x) <= p.hw) return 0.3;
    }

    // Everything else below the horizon is the dark distance.
    return 0;
  });

  // Horizon: half strength, faint at the ends, broken around the light.
  const hy = horizon + 0.5;
  g.line(`M84 ${hy}H114`, "faint");
  g.line(`M114 ${hy}H${cx - 8}`, "soft");
  g.line(`M${cx + 8} ${hy}H286`, "soft");
  g.line(`M286 ${hy}H316`, "faint");

  // Plank seams, closing up as they recede.
  for (const u of [0.2, 0.38, 0.53, 0.66, 0.77, 0.86]) {
    const y = nearY - (nearY - farY) * u;
    g.line(`M${num(leftX(y))} ${num(y)}H${num(rightX(y))}`, "faint");
  }

  // Pilings as half-strength stubs.
  for (const p of pilings) {
    g.line(`M${num(p.x)} ${num(p.y0)}V${num(p.y1)}`, "soft");
  }

  // The pier's silhouette: both long edges and the far stub, full strength.
  g.line(polyD([[cx - nearHW, nearY], [cx - farHW, farY], [cx + farHW, farY], [cx + nearHW, nearY]]), "ink");

  // The eye's path: from the tip, up through the reflection, stopping short of the light.
  g.line(`M${cx + 0.5} ${farY}V${num(lightY + lightR + 3)}`, "faint", { dash: "2 3" });
}
