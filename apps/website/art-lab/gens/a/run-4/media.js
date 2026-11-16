function draw(g, rand, seed, k) {
  // A video frame with a play button, scrubber and orange playhead
  const { clamp, sdBox, sdPolyline, inPolygon, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 200, cy = 108, hw = 80, hh = 48;
  const sx0 = cx - hw, sx1 = cx + hw, sy0 = cy - hh, sy1 = cy + hh;

  // The picture: a ridge line across the frame and a sun to the upper left.
  const ph = rand() * 20;
  const ridge = [];
  for (let x = sx0; x <= sx1 + 0.01; x += 2) {
    const u = (x - sx0) / (2 * hw);
    const y = sy1 - 26 - 22 * fbm(u * 3.2 + ph, 1.7) - 8 * Math.sin(u * 5 + ph) + 6 * u;
    ridge.push([x, clamp(y, sy0 + 20, sy1 - 8)]);
  }
  const ridgeAt = (x) => {
    const f = clamp((x - sx0) / 2, 0, ridge.length - 1), i = Math.floor(f), t = f - i;
    const a = ridge[i][1], b = ridge[Math.min(i + 1, ridge.length - 1)][1];
    return a + (b - a) * t;
  };
  const sun = [sx0 + 30 + rand() * 18, sy0 + 20 + rand() * 6], sunR = 6.5;

  // The play button.
  const pr = 19;
  const tri = [[cx - 7, cy - 11], [cx - 7, cy + 11], [cx + 12, cy]];

  // The scrubber.
  const ty = Math.round(sy1 + 22) + 0.5;
  const prog = 0.3 + rand() * 0.4;
  const px = sx0 + 2 * hw * prog;
  const buffered = Math.min(sx1, px + 20 + rand() * 30);

  g.print((x, y) => {
    let ink = 0, sig = 0;
    if (y < ty + 14) {
      const ds = sdBox(x, y, cx, cy, hw, hh, 2);
      if (ds < 1.6) {
        const u = (x - sx0) / (2 * hw), v = (y - sy0) / (2 * hh);
        // Lit from the upper left.
        const shade = 1 - 0.45 * clamp(0.6 * u + 0.4 * v);
        let t = 0.3 * shade;
        const r = ridgeAt(x);
        if (y > r) t = (0.62 + 0.2 * Math.exp(-(y - r) / 6)) * (0.75 + 0.25 * shade);
        const sd = Math.hypot(x - sun[0], y - sun[1]) - sunR;
        t = Math.max(t, 0.9 * solid(sd) + 0.25 * glow(sd, 5) * (y < r ? 1 : 0));
        // Play button: a knocked-back disc carrying a solid triangle.
        const dc = Math.hypot(x - cx, y - cy) - pr;
        if (dc < 3) {
          const inside = inPolygon(x, y, tri);
          const dt = sdPolyline(x, y, [...tri, tri[0]]) * (inside ? -1 : 1);
          const disc = solid(dc);
          t = t * (1 - disc) + disc * Math.max(0.04, 0.95 * solid(dt));
        }
        ink = t * solid(ds);
      } else ink = 0.14 * glow(ds, 7);
      // Track: played solid, buffered light.
      if (Math.abs(y - ty) < 10) {
        const dp = sdBox(x, y, (sx0 + px) / 2, ty, (px - sx0) / 2, 1.5);
        const db = sdBox(x, y, (px + buffered) / 2, ty, (buffered - px) / 2, 1.5);
        ink = Math.max(ink, 0.85 * solid(dp), 0.3 * solid(db));
        const dh = Math.hypot(x - px, y - ty) - 4;
        sig = solid(dh) + 0.4 * glow(dh, 6);
      }
    }
    return [ink, sig];
  });

  g.box(sx0, sy0, 2 * hw, 2 * hh, "ink");
  g.line(polyD(ridge), "soft");
  const R = num(pr);
  g.line(`M${num(cx - pr)} ${num(cy)}a${R} ${R} 0 1 0 ${num(2 * pr)} 0a${R} ${R} 0 1 0 ${num(-2 * pr)} 0Z`, "soft");
  g.line(polyD(tri, true), "ink");
  g.line(`M${sx0} ${ty}H${sx1}`, "faint");
  for (let c = 1; c < 4; c++) {
    const x = Math.round(sx0 + (2 * hw * c) / 4) + 0.5;
    g.line(`M${x} ${ty + 5}v3`, "soft");
  }
  g.line(`M${num(Math.round(px) + 0.5)} ${sy1 + 3}V${ty - 6}`, "faint", { dash: "1 3" });
}
