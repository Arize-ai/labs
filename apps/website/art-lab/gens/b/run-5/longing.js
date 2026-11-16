function draw(g, rand, seed, k) {
  // A far-shore lamp whose reflection stops short of an empty jetty
  const { clamp, smooth, solid, sdBox, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);
  const HZ = 112, LX = 258, LY = 108;

  // Far-shore ridge: gentle rise from x 150, hump near 270, small random bumps, under 8 units tall.
  const ridgePts = [];
  for (let x = 150; x <= 316; x += 4) {
    const rise = smooth(clamp((x - 150) / 26));
    const hump = 4.2 * Math.exp(-Math.pow((x - 270) / 22, 2));
    const bumps = 1.6 * (fbm(x / 9, 3.7) - 0.5) * 2;
    const h = clamp((2.4 + hump + bumps) * rise, 0, 7.6);
    ridgePts.push([x, HZ - h]);
  }
  const ridgeTop = (x) => {
    if (x < 150 || x > 316) return HZ;
    const i = Math.min(ridgePts.length - 2, Math.floor((x - 150) / 4));
    const a = ridgePts[i], b = ridgePts[i + 1];
    const t = clamp((x - a[0]) / (b[0] - a[0]));
    return a[1] + (b[1] - a[1]) * t;
  };

  // Reflection streaks: 11 of them, spacing growing 4 → 8, widening 6 → 44, drifting left to 250.
  const streaks = [];
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const y = 116 + (66 * (t + (t * t) / 2)) / 1.5;
    let cx = 258 - 8 * t + (rand() * 2 - 1) * 4;
    const half = ((6 + 38 * t) * (1 + (rand() * 2 - 1) * 0.25)) / 2;
    // Keep the gap at the jetty's end open: no streak reaches left of x 226.
    cx = Math.max(cx, 226 + half);
    const tone = 0.75 - 0.5 * t;
    let gap = null;
    const splitRoll = rand(), gapPos = rand(), gapW = rand();
    if (splitRoll < 0.4 && half > 5) gap = [cx + (gapPos - 0.5) * half * 0.8, 1.5 + gapW * 2];
    streaks.push({ y, cx, half, tone, gap });
  }

  // Jetty geometry.
  const deck = [[168, 160], [190, 160], [150, 194], [92, 194]];
  const rightSide = [[190, 160], [150, 194], [150, 198], [190, 164]];
  const front = [[92, 194], [150, 194], [150, 198], [92, 198]];
  const post = { x: 186, y0: 148, y1: 160 };

  g.print((x, y) => {
    if (y < 76 || y > 202) return 0;
    let ink = 0, orange = 0;

    // Sky haze hugging the horizon near the lamp.
    if (y < HZ && y > HZ - 10 && x > 200) ink = 0.1 * clamp(1 - Math.abs(x - LX) / 70);

    // Ridge silhouette: flat and dark.
    const onRidge = x >= 150 && x <= 316 && y < HZ && y >= ridgeTop(x);
    if (onRidge) ink = 0.05;

    // Lamp glow.
    const r = Math.hypot(x - LX, y - LY);
    if (r < 34) {
      let gl = r < 26 ? 0.15 + 0.85 * (1 - smooth(clamp((r - 2) / 24))) : 0.15 * (1 - smooth(clamp((r - 26) / 8)));
      if (r > 6) {
        if (onRidge) gl *= 0.4;
        else if (y > HZ) gl *= 0.5;
      }
      ink = Math.max(ink, gl);
      if (r < 9) {
        orange = solid(r - 6);
        if (r < 6) ink = Math.min(ink, 0.9);
      }
    }

    // Reflection streaks.
    if (y > 113 && y < 186 && x > 220 && x < 290) {
      for (const s of streaks) {
        const dy = Math.abs(y - s.y);
        if (dy > 4) continue;
        const dx = Math.abs(x - s.cx);
        if (dx > s.half) continue;
        let v = s.tone * solid(dy - 1.4) * (1 - Math.pow(dx / s.half, 1.6));
        if (s.gap) v *= clamp((Math.abs(x - s.gap[0]) - s.gap[1]) / 4);
        ink = Math.max(ink, clamp(v, 0, 1));
      }
    }

    // Jetty.
    if (x > 88 && x < 194 && y > 144) {
      if (inPolygon(x, y, deck)) {
        ink = 0.4 + 0.1 * clamp((194 - y) / 34) + 0.04 * clamp((150 - x) / 60);
      } else if (inPolygon(x, y, rightSide) || inPolygon(x, y, front)) {
        ink = 0.15;
      }
      // Post: drawn a touch wider in light so it survives the screen.
      const pd = sdBox(x, y, post.x, (post.y0 + post.y1) / 2, 2.2, 6);
      if (pd < 0) ink = x < post.x ? 0.45 : 0.3;
    }

    return [ink, orange];
  });

  // Horizon and ridge.
  g.line(`M84 ${HZ + 0.5}H316`, "ink");
  g.line(polyD(ridgePts), "soft");

  // Ripples, one passing through the gap.
  const ripple = (y, a, b, amp, ph) => {
    const pts = [];
    for (let x = a; x <= b; x += 6) pts.push([x, y + amp * Math.sin(x / 9 + ph)]);
    return polyD(pts);
  };
  g.line(ripple(130, 204, 306, 0.8, rand() * 6), "faint", { dash: "4 3" });
  g.line(ripple(150, 198, 300, 0.9, rand() * 6), "faint", { dash: "4 3" });
  g.line(ripple(173, 196, 246, 0.8, rand() * 6), "faint", { dash: "4 3" });

  // Jetty deck, faces and seams.
  g.line(polyD(rightSide, true), "ink");
  g.line(polyD(front, true), "ink");
  g.line(polyD(deck, true), "ink");
  for (const t of [0.3, 0.56, 0.78]) {
    const yy = 194 - 34 * t;
    g.line(`M${92 + 76 * t} ${yy}L${150 + 40 * t} ${yy}`, "faint");
  }

  // Mooring post.
  g.box(post.x - 1.5, post.y0, 3, post.y1 - post.y0, "ink");
}
