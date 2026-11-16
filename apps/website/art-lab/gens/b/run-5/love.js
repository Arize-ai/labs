function draw(g, rand, seed, k) {
  // Binary star pair orbiting one shared, empty centre
  const { clamp, smooth, solid, polyD } = k;
  const cx = 195, cy = 125;
  const phase = (rand() * 2 - 1) * 25 * Math.PI / 180;
  const q = 0.38 + rand() * 0.17; // tilt of the orbital plane (minor-axis ratio)
  const aS = 26, bS = aS * q;     // small orbit (larger star)
  const aL = 70, bL = aL * q;     // large orbit (smaller star)
  const RB = 20, RS = 12;

  // Both stars on the same ray through the centre, opposite sides.
  const cp = Math.cos(phase), sp = Math.sin(phase);
  const big = [cx - aS * cp, cy - bS * sp];
  const small = [cx + aL * cp, cy + bL * sp];

  // Axis of the bridge between the stars.
  const ul = Math.hypot(small[0] - cx, small[1] - cy);
  const ux = (small[0] - cx) / ul, uy = (small[1] - cy) / ul;

  g.print((x, y) => {
    if (x < 100 || x > 312 || y < 48 || y > 202) return 0;
    let ink = 0;

    // Larger star: body and wide glow to radius 62.
    const bx = x - big[0], by = y - big[1];
    const rb = Math.hypot(bx, by), db = rb - RB;
    const lift = 0.08 * clamp(-(bx + by) / (RB * 1.4));
    const bodyB = clamp(0.9 + 0.1 * (1 - clamp(rb / RB)) + lift);
    const glowB = db > 0 ? 0.6 * Math.pow(clamp(1 - db / (62 - RB)), 1.4) : 0;
    const sB = solid(db);
    ink += bodyB * sB + glowB * (1 - sB);

    // Smaller star: body and tighter glow to radius 38.
    const sx = x - small[0], sy = y - small[1];
    const rs = Math.hypot(sx, sy), ds = rs - RS;
    const bodyS = 0.85 - 0.15 * clamp(rs / RS);
    const glowS = ds > 0 ? 0.5 * Math.pow(clamp(1 - ds / (38 - RS)), 1.6) : 0;
    const sS = solid(ds);
    ink = Math.max(ink * (1 - sS), 0) + bodyS * sS + glowS * (1 - sS);

    // The faint bridge of haze between the stars, peaking about 20 past the centre.
    const u = (x - cx) * ux + (y - cy) * uy;
    const v = -(x - cx) * uy + (y - cy) * ux;
    if (sB < 0.5 && sS < 0.5) {
      ink += 0.1 * Math.exp(-((u - 20) ** 2) / (2 * 16 * 16)) * Math.exp(-(v * v) / (2 * 7 * 7));
    }

    // The centre itself carries no ink: a clean dark pocket around the mark.
    const dc = Math.hypot(x - cx, y - cy);
    ink *= smooth(clamp((dc - 3.5) / 4));

    const orange = solid(dc - 3);
    return [clamp(ink), orange];
  });

  // Orbit ellipses, broken where they pass behind a star disc.
  const hidden = (p) =>
    Math.hypot(p[0] - big[0], p[1] - big[1]) < RB + 1.5 ||
    Math.hypot(p[0] - small[0], p[1] - small[1]) < RS + 1.5;

  const orbit = (a, b, classify, draw) => {
    const n = 180;
    let cur = null, run = [];
    const flush = () => { if (cur && run.length > 1) draw(cur, run); };
    for (let i = 0; i <= n; i++) {
      const t = (2 * Math.PI * i) / n;
      const p = [cx + a * Math.cos(t), cy + b * Math.sin(t)];
      const s = hidden(p) ? null : classify(t);
      if (s !== cur) {
        flush();
        run = s ? [p] : [];
        cur = s;
      } else if (s) run.push(p);
    }
    flush();
  };

  orbit(aS, bS, () => "front", (s, pts) => g.line(polyD(pts), "soft"));
  orbit(aL, bL, (t) => (Math.sin(t) < 0 ? "back" : "front"), (s, pts) => {
    if (s === "back") g.line(polyD(pts), "faint", { dash: "2 3" });
    else g.line(polyD(pts), "soft");
  });

  // Rims of both stars, full strength.
  const circle = (c, r) =>
    `M${c[0] - r} ${c[1]}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  g.line(circle(big, RB), "ink");
  g.line(circle(small, RS), "ink");

  // Reticle ticks at the empty centre, in orange.
  const h = 4 * Math.SQRT1_2;
  g.line(`M${cx - h} ${cy - h}L${cx + h} ${cy + h}`, "sig");
  g.line(`M${cx - h} ${cy + h}L${cx + h} ${cy - h}`, "sig");
}
