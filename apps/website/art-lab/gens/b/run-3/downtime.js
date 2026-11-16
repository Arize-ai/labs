function draw(g, rand, seed, k) {
  // Five street lamps in a row, the middle one dark
  const { clamp, smooth, solid, glow, polyD, num } = k;
  const horizon = 172;
  const posts = [112, 156, 200, 244, 288];
  const darkIndex = 2;
  const headY = 102, bulbR = 4;

  // Lit lamps. Heads are 44 apart, so a reach of 26 would merge neighbouring
  // glows. A reach near 20 lets them nearly touch while staying separate,
  // and it keeps the dark middle lamp clean.
  const lamps = posts.map((px, i) => ({
    hx: px + 8,
    hy: headY,
    lit: i !== darkIndex,
    R: 20 + (rand() - 0.5) * 3,
    peak: 0.85 + rand() * 0.15,
  }));
  const lit = lamps.filter((l) => l.lit);
  const poolHalfW = 17, poolHalfH = 3.5, poolY = 173;
  const ember = [208, 103];

  g.print((x, y) => {
    if (y < 70 || y > 182) return 0;
    let ink = 0;
    for (const l of lit) {
      const dx = x - l.hx, dy = y - l.hy;
      const r = Math.hypot(dx, dy);
      if (r < l.R) {
        let t;
        if (r <= bulbR) t = 1;
        else t = smooth(clamp(1 - (r - bulbR) / (l.R - bulbR)));
        // Slightly brighter toward the upper left.
        const bias = r > 0.001 ? 1 + 0.18 * (-(dx + dy) / (r * Math.SQRT2)) : 1;
        ink = Math.max(ink, clamp(l.peak * t * (r <= bulbR ? 1 : bias)));
      }
      // Ground pool: 0.5 at the centre, fading to nothing at the ellipse edge.
      const ex = (x - l.hx) / poolHalfW, ey = (y - poolY) / poolHalfH;
      const e = ex * ex + ey * ey;
      if (e < 1) ink = Math.max(ink, 0.5 * smooth(1 - e));
    }
    // The still-cooling filament in the dead bulb.
    const ed = Math.hypot(x - ember[0], y - ember[1]) - 2.5;
    const orange = ed < 6 ? Math.max(solid(ed), 0.35 * glow(ed, 1.5)) : 0;
    return [ink, orange];
  });

  // Horizon.
  g.line(`M84 ${horizon + 0.5}H316`, "soft");

  // The overhead cable, unbroken through the dark post. Virtual posts at 68
  // and 332 give it lead-in and lead-out spans, clipped to 84 and 316.
  const anchors = [68, ...posts, 332];
  const cable = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    const sag = 8 + (rand() - 0.5) * 4;
    for (let j = 0; j <= 16; j++) {
      const t = j / 16;
      const x = a + (b - a) * t;
      if (x < 84 || x > 316) continue;
      if (j === 0 && i > 0) continue;
      cable.push([x, 96 + 4 * sag * t * (1 - t)]);
    }
  }
  const lead = 1 - (84 - 68) / 44, tail = (316 - 288) / 44;
  cable.unshift([84, 96 + 4 * 8 * (1 - lead) * lead]);
  cable.push([316, 96 + 4 * 8 * tail * (1 - tail)]);
  cable.sort((p, q) => p[0] - q[0]);
  g.line(polyD(cable), "faint");

  // Posts, arms, hoods and bulbs.
  for (const [i, px] of posts.entries()) {
    const x = px + 0.5;
    g.line(`M${num(x)} ${horizon}V98Q${num(x)} 95 ${num(x + 3)} 95H${num(x + 8)}`, "ink");
    const hx = px + 8;
    g.line(`M${num(hx - 5)} 98.5L${num(hx - 3)} 95H${num(hx + 3)}L${num(hx + 5)} 98.5Z`, "ink");
    const bulb = `M${num(hx - bulbR)} ${headY}A${bulbR} ${bulbR} 0 1 0 ${num(hx + bulbR)} ${headY}A${bulbR} ${bulbR} 0 1 0 ${num(hx - bulbR)} ${headY}Z`;
    if (i === darkIndex) g.line(bulb, "faint", { dash: "1.5 2" });
    else g.line(bulb, "soft");
  }
}
