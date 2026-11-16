function draw(g, rand, seed, k) {
  // A short pier pointing at one far light across dark water
  const { clamp, smooth, solid, sdBox, inPolygon, polyD, num } = k;

  const horizon = 110;
  const lx = 244 + rand() * 18, ly = 106;

  // Pier deck: near end off the bottom of the live area, far end short of the light.
  const nL = [140, 194], nR = [206, 194], fL = [206, 140], fR = [224, 140];
  const deck = [nL, nR, fR, fL];
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

  // Pilings: five under each long edge, shrinking toward the far end.
  const posts = [];
  for (const [a, b] of [[nL, fL], [nR, fR]]) {
    for (const u of [0.08, 0.3, 0.52, 0.72, 0.9]) {
      const p = lerp(a, b, u);
      posts.push({ x: p[0], y0: p[1], len: 10 - 7 * u });
    }
  }
  const endTop = fL[1] - 9;

  // Reflection streaks: a broken column under the light, widening downward.
  const streaks = [];
  let sy = 113;
  while (sy < 178) {
    const h = 3.2 + rand() * 1.8;
    const t = clamp((sy - 113) / 65);
    const w = 14 + 16 * t + (rand() - 0.5) * 6;
    const off = (rand() - 0.5) * 6;
    streaks.push({ cy: sy + h / 2, hh: h / 2, hw: w / 2, cx: lx + off, tone: 0.6 - 0.4 * t });
    sy += h + 2.2 + rand() * 3;
  }

  g.print((x, y) => {
    let ink = 0, orange = 0;

    // Faint sky band above the horizon, right of centre only.
    if (y < horizon && y > 80 && x > 190 && x < 310) {
      const hx = smooth(clamp((x - 190) / 25)) * smooth(clamp((310 - x) / 25));
      const vy = smooth(clamp((y - 80) / (horizon - 80)));
      ink = Math.max(ink, 0.15 * hx * vy);
    }

    // The far light: a bright core in a flattened haze.
    const dx = x - lx, dy = (y - ly) * 1.4;
    const r = Math.hypot(dx, dy);
    if (r < 36) {
      const core = solid(Math.hypot(x - lx, y - ly) - 3);
      let halo = r < 5 ? 0.7 : 0.7 * (1 - smooth(clamp((r - 5) / 29)));
      if (y > horizon) halo *= 0.5; // keep the water dark so the reflection reads
      const t = Math.max(core, halo);
      ink = Math.max(ink, t);
      if (r < 12) orange = Math.max(orange, t + 0.05);
    }

    // Reflection column.
    if (y > horizon && y < 182 && Math.abs(x - lx) < 24) {
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        const v = s.tone * solid(sdBox(x, y, s.cx, s.cy, s.hw, s.hh, 1));
        if (v > 0.05) {
          ink = Math.max(ink, v);
          if (i < 2) orange = Math.max(orange, v + 0.05);
        }
      }
    }

    // Pier deck and pilings.
    if (x > 130 && x < 232 && y > 125) {
      if (inPolygon(x, y, deck)) {
        const u = clamp((194 - y) / 54);
        // Lit from the upper left: a touch brighter toward the left edge.
        const across = clamp((x - (nL[0] + (fL[0] - nL[0]) * u)) / (66 - 48 * u + 1));
        let d = 0.35 - 0.15 * u + 0.04 * (1 - across);
        if (y < fL[1] + 5) d = 0.45; // rim facing the light
        ink = Math.max(ink, d);
      }
      for (const p of posts) {
        const v = 0.25 * solid(sdBox(x, y, p.x, p.y0 + p.len / 2, 1.6, p.len / 2));
        ink = Math.max(ink, v);
      }
      ink = Math.max(ink, 0.25 * solid(sdBox(x, y, fL[0], (endTop + fL[1]) / 2, 1.6, 4.5)));
    }

    return orange > ink ? [ink, orange] : ink;
  });

  // Horizon, dissolving at the sides.
  g.line(`M110 ${horizon + 0.5}H290`, "soft");
  g.line(`M84 ${horizon + 0.5}H110`, "faint", { dash: "4 3" });
  g.line(`M290 ${horizon + 0.5}H316`, "faint", { dash: "4 3" });

  // Pilings and end post.
  for (const p of posts) g.line(`M${num(p.x)} ${num(p.y0)}V${num(p.y0 + p.len)}`, "soft");
  g.line(`M${fL[0]} ${fL[1]}V${endTop}`, "soft");

  // Deck edges.
  g.line(polyD([nL, fL]), "ink");
  g.line(polyD([nR, fR]), "ink");
  g.line(polyD([fL, fR]), "ink");

  // Plank seams, crowding toward the far end.
  for (const u of [0.32, 0.57, 0.76, 0.9]) {
    g.line(polyD([lerp(nL, fL, u), lerp(nR, fR, u)]), "faint");
  }

  // Sightline from the end post to the light.
  g.line(`M${fL[0]} ${endTop}L${num(lx - 4)} ${num(ly)}`, "faint", { dash: "1 3" });
}
