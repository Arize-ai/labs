function draw(g, rand, seed, k) {
  // A sliced setting sun over an endless wireframe floor
  const { clamp, smooth, solid } = k;
  const cx = 200, hy = 150, floorY = 194;
  const r = 52 + rand() * 10;
  const s = r / 58;
  const haloR = 100;

  // Slices: scaled to the sun's radius, jittered, then kept ordered so the
  // solid bands between gaps never shrink below a printable sliver.
  const offs = [32, 23, 15, 9, 4];
  const thick = [1.5, 2.5, 3.5, 4.5, 5.5];
  const gaps = offs.map((o, i) => ({
    c: hy - o * s + (rand() * 2 - 1) * 1.5,
    t: Math.max(1.2, thick[i] + (rand() * 2 - 1)),
  }));
  let limit = hy - 1.5; // lowest gap stays just above the horizon
  for (let i = gaps.length - 1; i >= 0; i--) {
    const gp = gaps[i];
    if (gp.c + gp.t / 2 > limit) gp.c = limit - gp.t / 2;
    limit = gp.c - gp.t / 2 - 2.2;
  }
  const inGap = (y) => gaps.some((gp) => Math.abs(y - gp.c) < gp.t / 2);

  // Floor fan geometry.
  const fanHalf = (y) => (140 * (y - hy)) / (floorY - hy);

  g.print((x, y) => {
    if (y < 40 || y > floorY + 2 || x < 50 || x > 350) return 0;
    let ink = 0, orange = 0;

    if (y < hy) {
      const dist = Math.hypot(x - cx, y - hy);
      const d = dist - r;
      // Halo, tapering vertically so the upper sky stays dark.
      if (d > 0 && dist < haloR) {
        orange = 0.45 * clamp(1 - d / (haloR - r)) * clamp((y - 62) / 30);
      }
      // Dome: 1.0 at the top, ~0.85 at the horizon, warmer at upper left.
      if (d < 3) {
        const t = clamp((hy - y) / r);
        const left = clamp((cx - x) / r);
        const tone = clamp(0.85 + 0.12 * t + 0.05 * left * t);
        const dome = inGap(y) ? 0 : tone * solid(d);
        orange = Math.max(orange, dome);
      }
    } else {
      // Light spilling onto the floor just below the horizon.
      if (y <= 154.5 && x > 130 && x < 270) {
        ink = 0.3 * (1 - smooth(clamp((Math.abs(x - cx) - 25) / 45)));
      }
      // Faint floor glow between grid lines, inside the fan only.
      if (Math.abs(x - cx) <= fanHalf(y) && y < 175) {
        ink = Math.max(ink, 0.1 * clamp((175 - y) / 25));
      }
    }
    return [ink, orange];
  });

  // Slice gaps: too thin for the lattice alone, so cut them crisply with
  // background fills, clipped to the dome's width.
  for (const gp of gaps) {
    const y0 = gp.c - gp.t / 2, y1 = gp.c + gp.t / 2;
    const half = Math.sqrt(Math.max(0, r * r - (hy - y1) * (hy - y1))) + 1.5;
    g.line(`M${cx - half} ${y0}H${cx + half}V${y1}H${cx - half}Z`, "faint", { width: 0, fill: true });
  }

  // Sun outline.
  g.line(`M${cx - r} ${hy}A${r} ${r} 0 0 1 ${cx + r} ${hy}`, "soft");

  // Radiating floor lines.
  for (let i = 0; i <= 10; i++) {
    const bx = 60 + 28 * i;
    const outer = i === 0 || i === 10;
    g.line(`M${cx} ${hy}L${bx} ${floorY}`, outer ? "faint" : "soft");
  }

  // Cross-lines, spreading toward the viewer.
  for (const cy of [152, 155, 160, 167, 178, 194]) {
    const h = fanHalf(cy);
    g.line(`M${cx - h} ${cy + 0.5}H${cx + h}`, cy >= 178 ? "soft" : "faint");
  }

  // Sun reflection.
  g.line(`M${cx + 0.5} ${hy}V${floorY}`, "faint", { dash: "1 3" });

  // Horizon.
  g.line(`M84 ${hy + 0.5}H316`, "ink");
}
