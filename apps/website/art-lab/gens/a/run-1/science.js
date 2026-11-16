function draw(g, rand, seed, k) {
  // An Erlenmeyer flask of bubbling liquid, one bubble rising out in orange
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const cx = 200;
  const neckTop = 72, neckBot = 106, shoulder = 186, base = 192;
  const nw = 12, bw = 64;
  const flask = [
    [cx - nw, neckTop], [cx - nw, neckBot], [cx - bw, shoulder], [cx - bw + 6, base],
    [cx + bw - 6, base], [cx + bw, shoulder], [cx + nw, neckBot], [cx + nw, neckTop],
  ];
  const closed = flask.concat([flask[0]]);
  const hw = (y) => (y < neckBot ? nw : nw + ((y - neckBot) / (shoulder - neckBot)) * (bw - nw));
  const level = 144 + Math.round(rand() * 8);

  // Bubbles in the liquid, and a few rising through the air above it.
  const sunk = [];
  for (let n = 0; n < 7; n++) {
    const y = level + 8 + rand() * (shoulder - level - 14);
    const w = hw(y) - 8;
    sunk.push([cx + (rand() * 2 - 1) * w, y, 1.6 + rand() * 2.4]);
  }
  const rising = [];
  for (let n = 0; n < 3; n++) {
    const y = level - 10 - n * 16 - rand() * 6;
    rising.push([cx + (rand() * 2 - 1) * (hw(y) - 6), y, 2 + rand() * 1.2]);
  }
  const top = [cx + (rand() * 2 - 1) * 3, neckTop - 13, 4.5];

  // A highlight inside the left wall, where the light from the upper left catches the glass.
  const streak = [[cx - nw + 5, neckTop + 6], [cx - nw + 5, neckBot + 2], [cx - bw + 16, shoulder - 10]];

  g.print((x, y) => {
    const td = Math.hypot(x - top[0], y - top[1]) - top[2];
    const sig = solid(td) + 0.4 * glow(td, 7);
    if (x < cx - bw - 30 || x > cx + bw + 30 || y < neckTop - 40 || y > base + 24) return [0, sig];
    const inside = inPolygon(x, y, flask);
    const d = sdPolyline(x, y, closed) * (inside ? -1 : 1);
    let ink;
    if (inside && y > level) {
      // The liquid: lit from the upper left, darker toward its far side and base.
      ink = 0.95 - 0.32 * clamp((x - (cx - bw)) / (2 * bw)) - 0.14 * clamp((y - level) / 46);
      ink += 0.06 * (fbm(x / 7, y / 7) - 0.5);
      for (const [bx, by, br] of sunk) {
        const bd = Math.hypot(x - bx, y - by) - br;
        if (bd < 1.5) ink *= 0.12 + 0.88 * clamp(bd / 1.5);
      }
    } else if (inside) {
      ink = 0.07 + 0.32 * glow(sdPolyline(x, y, streak) - 0.5, 1.6);
    } else {
      ink = 0.14 * glow(d, 7) * clamp((y - neckTop + 10) / 30);
    }
    return [clamp(ink), sig];
  });

  // The glass, its lip, and the bench it stands on.
  g.line(polyD(flask), "ink", { width: 1.25 });
  g.line(`M${cx - nw - 4} ${neckTop + 0.5}H${cx + nw + 4}`, "ink", { width: 1.5 });
  g.line(`M${cx - bw - 24} ${base + 0.5}H${cx + bw + 24}`, "faint");
  // The liquid's surface.
  const lw = hw(level);
  g.line(`M${num(cx - lw + 1)} ${level + 0.5}H${num(cx + lw - 1)}`, "soft");
  // Graduations on the right of the cone.
  for (let y = 124; y <= 178; y += 9) {
    const xr = cx + hw(y) - 3;
    g.line(`M${num(xr - ((y - 124) % 18 === 0 ? 10 : 6))} ${y + 0.5}H${num(xr)}`, "faint");
  }
  // Rising bubbles, outlined in the air above the liquid.
  for (const [bx, by, br] of rising) {
    g.line(`M${num(bx - br)} ${num(by)}a${br} ${br} 0 1 0 ${num(2 * br)} 0a${br} ${br} 0 1 0 ${num(-2 * br)} 0Z`, "soft");
  }
  // A dotted guide from the neck up to the escaping bubble.
  g.line(`M${num(top[0]) + 0.5} ${neckTop - 2}V${num(top[1] + top[2] + 3)}`, "faint", { dash: "1 3" });
}
