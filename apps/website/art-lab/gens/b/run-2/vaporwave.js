function draw(g, rand, seed, k) {
  // A striped setting sun sinking onto an endless wireframe grid
  const { clamp, smooth, num } = k;
  const cx = 200, hy = 150, R = 62;
  const xL = 90, xR = 310, floorB = 194;

  // Slats: tops jittered ±1.5, thicknesses jittered ±0.8 and kept wider toward the bottom.
  const baseTop = [126, 134, 141, 147];
  const baseTh = [1.5, 2.5, 3.5];
  const tops = baseTop.map((t) => t + (rand() * 2 - 1) * 1.5);
  const ths = baseTh.map((t) => Math.max(1, t + (rand() * 2 - 1) * 0.8)).sort((a, b) => a - b);
  tops[3] = Math.min(tops[3], 148); // the last slat always meets the horizon
  const slats = [0, 1, 2].map((i) => [tops[i], tops[i] + ths[i]]);
  slats.push([tops[3], hy]);
  const inSlat = (y) => slats.some(([a, b]) => y >= a && y <= b);

  g.print((x, y) => {
    if (x < xL - 20 || x > xR + 20 || y > floorB) return 0;
    if (y < hy) {
      const r = Math.hypot(x - cx, y - hy);
      if (r <= R) {
        if (inSlat(y)) return 0; // clean cuts
        // Full sun, dipping to 0.85 at the lower right.
        const s = clamp(0.5 * (x - (cx - R)) / (2 * R) + 0.5 * (y - (hy - R)) / R);
        return [0, 1 - 0.15 * s * s];
      }
      const d = r - R;
      if (d > 43) return 0;
      let tone = d < 28 ? 0.5 - 0.35 * (d / 28) : 0.15 * (1 - (d - 28) / 15);
      // Keep the high sky bare: taper the glow above y 85.
      tone *= 1 - smooth(clamp((85 - y) / 22));
      return [tone, 0];
    }
    // Floor: a reflection band under the horizon, brightest beneath the sun.
    if (x < xL || x > xR || y > 175) return 0;
    const t = clamp((y - hy) / 25);
    const off = Math.max(0, Math.abs(x - cx) - 30);
    const xw = 0.35 + 0.65 * (1 - smooth(clamp(off / 60)));
    return [(0.05 + 0.2 * (1 - t)) * xw, 0];
  });

  // Sun outline, then the slats cut through it as background-filled bars.
  g.line(`M${cx - R} ${hy}A${R} ${R} 0 0 1 ${cx + R} ${hy}`, "ink");
  for (const [a, b] of slats) {
    g.line(`M${cx - R - 3} ${num(a)}H${cx + R + 3}V${num(Math.min(b, hy - 0.6))}H${cx - R - 3}Z`, "faint", { width: 0, fill: true });
  }

  // Converging floor lines: soft until the last 4 units, then faint.
  for (let i = 0; i < 11; i++) {
    const xb = cx + (i - 5) * 22;
    const at = (y) => cx + (xb - cx) * (y - hy) / (floorB - hy);
    g.line(`M${num(xb)} ${floorB}L${num(at(hy + 4))} ${hy + 4}`, "soft");
    g.line(`M${num(at(hy + 4))} ${hy + 4}L${cx} ${hy}`, "faint");
  }
  // Cross lines, widening toward the viewer.
  for (const y of [153, 157, 163, 172, 186]) {
    g.line(`M${xL} ${y + 0.5}H${xR}`, y < 160 ? "faint" : "soft");
  }

  // Horizon.
  g.line(`M${xL} ${hy}H${xR}`, "ink");

  // Scanline glints in the upper sky.
  for (const [gx, gy] of [[110, 70], [285, 64], [300, 98]]) {
    const len = 14 + rand() * 12;
    const px = gx + (rand() * 2 - 1) * 6, py = Math.round(gy + (rand() * 2 - 1) * 4) + 0.5;
    g.line(`M${num(px - len / 2)} ${py}H${num(px + len / 2)}`, "faint", { dash: "2 3" });
  }
}
