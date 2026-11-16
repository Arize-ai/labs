function draw(g, rand, seed, k) {
  // A ray of light bending through three stacked layers of medium
  const { clamp, smooth, sdPolyline, polyD, num } = k;

  const sx = 140, sy = 58;
  const L = 110, R = 290;

  // Band thicknesses and tones, jittered; the slab top stays at 95.
  const baseTone = [0.18, 0.30, 0.42];
  const hs = [], tones = [], ys = [95];
  for (let i = 0; i < 3; i++) {
    const h = 25 + (rand() * 8 - 4);
    hs.push(h);
    ys.push(ys[i] + h);
    tones.push(clamp(baseTone[i] + (rand() * 0.1 - 0.05)));
  }
  const bottom = ys[3];

  // Entry point and the original slope (dx per unit dy).
  const ex = 175 + rand() * 20;
  const s0 = (ex - sx) / (95 - sy);

  // Each layer steepens the ray a little more, by a slightly random amount.
  const fac = [0.395, 0.3, 0.2].map((f) => f * (0.9 + rand() * 0.2));
  const ray = [[sx, sy], [ex, 95]];
  let rx = ex;
  for (let i = 0; i < 3; i++) {
    rx += s0 * fac[i] * hs[i];
    ray.push([rx, ys[i + 1]]);
  }
  // Leaves the slab at its original angle.
  const exitY = 195;
  rx += s0 * (exitY - bottom);
  ray.push([rx, exitY]);

  // Ghost ray: the undeviated path from the entry point.
  const ghostEnd = [ex + s0 * 35, 130];

  g.print((x, y) => {
    if (x < 100 || x > 300 || y < 40 || y > 200) return 0;
    let ink = 0;

    // Source: brightest mass on the card, all main ink.
    const sd = Math.hypot(x - sx, y - sy);
    if (sd < 14) ink = smooth(clamp(1 - sd / 14));

    // Bands, lit from the upper left and fading toward the lower right.
    let band = 0;
    if (x >= L && x <= R && y >= 95 && y <= bottom) {
      let i = y < ys[1] ? 0 : y < ys[2] ? 1 : 2;
      const top = ys[i], h = hs[i];
      const edgeTop = clamp(1 - (y - top) / 6);
      const edgeLeft = clamp(1 - (x - L) / 20);
      const lit = 0.08 * Math.max(edgeTop, edgeLeft);
      const fade = 0.05 * (0.5 * (x - L) / (R - L) + 0.5 * (y - top) / h);
      band = clamp(tones[i] + lit - fade);
      ink = Math.max(ink, band);
    }

    // Ray glow in orange: narrow, strongest above and inside the slab.
    let orange = 0;
    const rd = sdPolyline(x, y, ray);
    if (rd < 8) {
      let peak = 0.5;
      if (y > bottom) peak = 0.32;
      else if (band > 0) peak = Math.max(0.5, band + 0.12);
      orange = peak * Math.exp(-rd / 2.2);
    }

    return [ink, orange];
  });

  // Slab surfaces.
  g.line(`M${L} ${num(95.5)}H${R}`, "ink");
  g.line(`M${L} ${num(bottom + 0.5)}H${R}`, "ink");
  g.line(`M${L} ${num(ys[1] + 0.5)}H${R}`, "soft");
  g.line(`M${L} ${num(ys[2] + 0.5)}H${R}`, "soft");
  g.line(`M${L + 0.5} 95V${num(bottom)}`, "faint");
  g.line(`M${R + 0.5} 95V${num(bottom)}`, "faint");

  // Normal at the entry point and the undeviated ghost path.
  g.line(`M${num(ex + 0.5)} 78V112`, "faint", { dash: "2 3" });
  g.line(polyD([[ex, 95], ghostEnd]), "faint", { dash: "4 3" });

  // The ray itself, in orange.
  g.line(polyD(ray), "sig");
}
