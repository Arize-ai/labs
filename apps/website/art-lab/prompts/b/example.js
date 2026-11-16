function draw(g, rand, seed, k) {
  // An hourglass with the last grain falling, in orange
  const { clamp, solid, glow, sdBox, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);
  const cx = 200, top = 62, bottom = 188, neck = 125, half = 46;
  const fill = 0.35 + rand() * 0.3; // how much sand has run through

  // The glass: two triangles meeting at the neck.
  const upper = [[cx - half, top + 8], [cx + half, top + 8], [cx + 3, neck], [cx - 3, neck]];
  const lower = [[cx - 3, neck], [cx + 3, neck], [cx + half, bottom - 8], [cx - half, bottom - 8]];
  // Sand: a shrinking wedge above, a growing heap below.
  const upperSand = neck - (neck - top - 8) * (1 - fill);
  const heapTop = bottom - 8 - (bottom - neck - 16) * fill;
  const grain = [cx, neck + (heapTop - neck) * (0.4 + rand() * 0.3)];

  g.print((x, y) => {
    if (x < cx - half - 20 || x > cx + half + 20) return 0;
    let ink = 0;
    if (y > upperSand && inPolygon(x, y, upper)) ink = 0.9 - 0.25 * clamp((x - cx + half) / (2 * half));
    const heap = heapTop + Math.abs(x - cx) * 0.55;
    if (y > heap && inPolygon(x, y, lower)) ink = 0.85 - 0.25 * clamp((x - cx + half) / (2 * half)) + 0.1 * (fbm(x / 6, y / 6) - 0.5);
    // A faint sheen on the glass, brightest at the upper left.
    if (!ink && (inPolygon(x, y, upper) || inPolygon(x, y, lower))) ink = 0.12 * clamp(1 - (x - (cx - half)) / half);
    // The stream of sand through the neck: at least a dot wide, or it never prints.
    if (Math.abs(x - cx) < 2.5 && y > neck && y < grain[1]) ink = 0.55;
    const gd = Math.hypot(x - grain[0], y - grain[1]) - 2.5;
    return [ink, solid(gd) + 0.4 * glow(gd, 6)];
  });

  g.line(polyD(upper, true), "ink");
  g.line(polyD(lower, true), "ink");
  // Caps, top and bottom, with the frame's posts as faint rules.
  g.box(cx - half - 10, top, 2 * half + 20, 8, "soft");
  g.box(cx - half - 10, bottom - 8, 2 * half + 20, 8, "soft");
  for (const px of [cx - half - 6, cx + half + 6]) g.line(`M${px + 0.5} ${top + 8}V${bottom - 8}`, "faint");
  g.line(`M${cx - half - 30} ${bottom + 0.5}H${cx + half + 30}`, "faint", { dash: "1 3" });
}
