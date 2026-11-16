function draw(g, rand, seed, k) {
  // Sliced sun sinking behind an endless wireframe floor
  const { clamp, smooth, solid, num } = k;
  const cx = 200, cy = 128, R = 54, haloR = 85, horizon = 140, floorBottom = 194;

  // Sun slices: jittered positions and thicknesses, kept ordered and apart.
  const base = [[110, 2], [119, 3], [127, 4], [134, 5]];
  const slices = base.map(([y, t]) => [y + (rand() * 2 - 1) * 1.5, Math.max(1.5, t + (rand() * 2 - 1))]);
  for (let i = 1; i < slices.length; i++) {
    // Blinds thicken toward the horizon.
    slices[i][1] = Math.max(slices[i][1], slices[i - 1][1]);
    // Keep at least 2.5 units of sun between consecutive gaps.
    const minY = slices[i - 1][0] + slices[i - 1][1] / 2 + 2.5 + slices[i][1] / 2;
    if (slices[i][0] < minY) slices[i][0] = minY;
  }
  // The last gap must stay clear of the horizon.
  const last = slices[slices.length - 1];
  const maxY = horizon - 1.5 - last[1] / 2;
  if (last[0] > maxY) last[0] = maxY;
  const inSlice = (y) => {
    for (const [sy, st] of slices) if (Math.abs(y - sy) < st / 2) return true;
    return false;
  };

  // Light direction for the dome's slight shading toward the lower right.
  const shadeSpan = 2 * R + (horizon - (cy - R));

  g.print((x, y) => {
    if (y < cy - haloR - 2 || y > floorBottom) return 0;
    if (y < horizon) {
      if (x < cx - haloR - 2 || x > cx + haloR + 2) return 0;
      const d = Math.hypot(x - cx, y - cy) - R;
      if (d > haloR - R) return 0;
      let orange = 0;
      if (d < 2 && !inSlice(y)) {
        const s = clamp(((x - (cx - R)) + (y - (cy - R))) / shadeSpan);
        orange = (0.95 - 0.1 * s) * solid(d);
      }
      let ink = 0;
      if (d > 0) {
        const t = clamp(d / (haloR - R));
        ink = 0.35 * Math.pow(1 - t, 1.6);
      }
      return [ink, orange];
    }
    // Floor glow along the horizon, fading toward the viewer.
    if (x < 84 || x > 316 || y > 175) return 0;
    const t = clamp((y - 141) / 34);
    return 0.05 + 0.25 * (1 - smooth(t));
  });

  // Crisp slice gaps: background-filled bands across the dome.
  for (const [sy, st] of slices) {
    const y0 = sy - st / 2, y1 = sy + st / 2;
    const yn = clamp(cy, y0, y1);
    const hw = Math.sqrt(Math.max(0, R * R - (yn - cy) * (yn - cy))) + 2;
    g.line(`M${num(cx - hw)} ${num(y0)}H${num(cx + hw)}V${num(y1)}H${num(cx - hw)}Z`, "faint", { width: 0, fill: true });
  }

  // Sun outline: the dome's arc above the horizon.
  const chord = Math.sqrt(R * R - (horizon - cy) * (horizon - cy));
  g.line(`M${num(cx - chord)} ${horizon}A${R} ${R} 0 1 1 ${num(cx + chord)} ${horizon}`, "faint");

  // Floor rails: nine, fanning from the vanishing point beneath the sun.
  for (let i = 0; i < 9; i++) {
    const xb = 84 + i * 29;
    const stroke = i < 2 || i > 6 ? "faint" : "soft";
    g.line(`M${cx} ${horizon}L${num(xb)} ${floorBottom}`, stroke);
  }

  // Floor rungs: perspective spacing, scrolled toward the viewer by a random phase.
  const table = [140, 143, 147, 153, 162, 175, 194, 221];
  const Y = (s) => {
    const i = Math.floor(s + 1), f = s + 1 - i;
    return table[i] + (table[i + 1] - table[i]) * f;
  };
  const phase = rand();
  const rungs = [];
  for (let j = -1; j <= 5; j++) {
    const yy = Y(j + phase);
    if (yy > horizon + 1.5 && yy <= floorBottom + 0.01) rungs.push(yy);
  }
  rungs.forEach((yy, idx) => {
    const nearViewer = idx >= rungs.length - 2;
    const d = `M84 ${num(yy + 0.5)}H316`;
    if (nearViewer) g.line(d, "faint", { dash: "4 3" });
    else g.line(d, "soft");
  });

  // Horizon, full and solid, on top of everything.
  g.line(`M84 ${horizon + 0.5}H316`, "ink");
}
