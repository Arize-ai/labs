function draw(g, rand, seed, k) {
  // An Erlenmeyer flask of reagent, one orange bubble rising free
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, makeNoise, P } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 200;
  const hw = (y) => (y < 100 ? 12 : 12 + ((y - 100) * 50) / 84);

  // The flask outline: lip, neck, conical body with rounded foot.
  const outline = [
    [184, 62], [216, 62], [216, 66], [212, 66], [212, 100],
    [262, 184], [258, 190], [142, 190], [138, 184],
    [188, 100], [188, 66], [184, 66], [184, 62],
  ];
  const sd = (x, y) => {
    const d = sdPolyline(x, y, outline);
    return inPolygon(x, y, outline) ? -d : d;
  };

  // Liquid level and bubbles.
  const ly = Math.round(146 + rand() * 12);
  const bubbles = [];
  const nb = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < nb; i++) {
    const by = ly + 8 + rand() * (182 - ly - 8);
    const bx = cx + (rand() * 2 - 1) * (hw(by) - 10);
    bubbles.push({ x: bx, y: by, r: 1.6 + rand() * 2.6 });
  }
  const ob = { x: cx + (rand() - 0.5) * 16, y: ly - 16 - rand() * 6, r: 4.5 };
  const pitch = P || 3.2;

  g.print((x, y) => {
    if (x < 100 || x > 300 || y < 40 || y > 214) return 0;
    const d = sd(x, y);
    const od = Math.hypot(x - ob.x, y - ob.y) - ob.r;
    const sig = solid(od) + 0.4 * glow(od, 7);
    let ink;
    if (d > 0) {
      ink = 0.12 * glow(d, 10);
    } else if (y > ly && d < -1.5) {
      // The reagent: lit from the upper left, brightest at its surface.
      ink = 0.9 - 0.28 * clamp((x - 138) / 124) - 0.12 * clamp((y - ly) / 40)
        + 0.08 * Math.exp(-(y - ly) / 4) + 0.06 * (fbm(x / 7, y / 7) - 0.5);
      for (const b of bubbles) {
        const bd = Math.hypot(x - b.x, y - b.y) - b.r;
        if (bd < 4) ink = Math.min(ink, 0.12 + 0.8 * clamp(bd / pitch + 0.5));
      }
    } else {
      // Empty glass: faint, with a highlight streak down the left wall.
      const wall = x < cx ? glow(Math.abs(d + 5) - 1, 2) : 0;
      ink = 0.07 + 0.28 * wall * clamp((y - 70) / 30);
    }
    return [clamp(ink), sig];
  });

  // Glass, in a crisp rule.
  g.line(polyD(outline, true), "ink", { width: 1.25 });
  // The liquid's surface.
  const s = ly + 0.5;
  g.line(`M${num(cx - hw(ly) + 2)} ${s}H${num(cx + hw(ly) - 2)}`, "soft");
  // Graduations up the left of the body.
  for (let y = 120, i = 0; y <= 180; y += 10, i++) {
    const x = cx - hw(y) + 4;
    g.line(`M${num(x)} ${y + 0.5}h${i % 2 ? 4 : 8}`, y > ly ? "faint" : "soft");
  }
  // Bubble rims.
  for (const b of bubbles) {
    const r = num(b.r);
    g.line(`M${num(b.x - b.r)} ${num(b.y)}a${r} ${r} 0 1 0 ${num(2 * b.r)} 0a${r} ${r} 0 1 0 ${num(-2 * b.r)} 0Z`, "faint");
  }
  // The orange bubble's rim and a dotted trail back to the surface.
  const r = num(ob.r);
  g.line(`M${num(ob.x - ob.r)} ${num(ob.y)}a${r} ${r} 0 1 0 ${num(2 * ob.r)} 0a${r} ${r} 0 1 0 ${num(-2 * ob.r)} 0Z`, "sig");
  g.line(`M${num(ob.x)} ${num(ob.y + ob.r + 3)}V${num(ly - 2)}`, "faint", { dash: "1 3" });
  // The bench it stands on.
  g.line(`M118 194.5H282`, "faint", { dash: "1 3" });
}
