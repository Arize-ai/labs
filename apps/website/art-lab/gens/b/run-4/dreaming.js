function draw(g, rand, seed, k) {
  // A closed eye beneath a glowing round window onto a distant horizon
  const { clamp, smooth, solid, sdPolyline, polyD, num } = k;

  // Window
  const wx = 200, wy = 94, wr = 52, hushR = 62;
  const horizonY = 108;
  const chordHalf = Math.sqrt(wr * wr - (horizonY - wy) * (horizonY - wy));

  // Eye: lid is a sagging arc, lowest at (200,170), ends at y 158.
  const lidY = (x) => 158 + 12 * (1 - ((x - 200) / 60) ** 2);
  const lidPts = [];
  for (let x = 140; x <= 260.01; x += 4) lidPts.push([x, lidY(x)]);
  const creasePts = [];
  for (let x = 155; x <= 245.01; x += 4) creasePts.push([x, lidY(x) - 10]);

  // Moon on an arc across the window's upper half.
  const a = rand() * 2 - 1;
  const moon = [200 + 32 * a, 72 + 16 * a * a];
  const moonR = 7;

  // Hill, peak somewhere between 175 and 235, rising to y 100.
  const peakX = 175 + rand() * 60;
  const hillW = 24;
  const hillTop = (x) => horizonY - 8 * Math.exp(-(((x - peakX) / hillW) ** 2));

  // Trail: five dots in a loose S, wandering sideways through the narrow gap
  // between crease and window so each dot has room to print.
  const baseX = [207, 214, 204, 193, 199];
  const radii = [3, 2.6, 2.2, 1.85, 1.5];
  const trail = baseX.map((bx, i) => {
    const y = 155 - i * 1.5;
    const x = bx + (rand() * 2 - 1) * 3.5;
    return [x, y, radii[i]];
  });

  // Sky gradient along the upper-left to lower-right diagonal.
  const diag = 2 * wr * Math.SQRT2;

  g.print((x, y) => {
    if (y > 185) return 0;
    if (x < 100 || x > 300) return 0;
    let ink = 0, orange = 0;

    const dw = Math.hypot(x - wx, y - wy) - wr;
    if (dw < 1.6) {
      const inside = solid(dw);
      let tone;
      if (y < horizonY) {
        const t = clamp(((x - wx) + (y - wy)) / diag + 0.5);
        tone = 0.9 - 0.3 * t;
        // hill above the horizon line
        const ht = hillTop(x);
        if (y > ht) tone = 0.3 + 0.2 * (1 - smooth(clamp((x - peakX + 6) / 12)));
      } else {
        tone = 0.4;
      }
      ink = Math.max(ink, tone * inside);
      const dm = Math.hypot(x - moon[0], y - moon[1]) - moonR;
      if (dm < 2) {
        orange = solid(dm);
        if (orange > 0.5) ink = Math.min(ink, 0.3);
      }
    }

    // Halo around the window, kept out of the gap above the eye.
    if (dw > 0 && dw < 33) {
      let halo = 0.35 * (1 - smooth(dw / 33));
      halo *= 1 - smooth(clamp((y - 132) / 12));
      ink = Math.max(ink, halo);
    }

    // A faint pool of window-light beneath the closed lid.
    if (x > 120 && x < 280 && y > 150) {
      const under = x >= 140 && x <= 260 && y > lidY(x);
      if (under) {
        const d = sdPolyline(x, y, lidPts);
        const fade = 1 - smooth(clamp(d / 30));
        const yCut = 1 - smooth(clamp((y - 178) / 7));
        ink = Math.max(ink, 0.2 * fade * yCut);
      }
    }

    // Trail dots: crisp, no glow; footprint at least a dot wide.
    if (y > 142 && y < 160 && x > 185 && x < 225) {
      for (const [tx, ty, r] of trail) {
        const d = Math.hypot(x - tx, y - ty) - Math.max(r, 2.3);
        if (d < 2) ink = Math.max(ink, 0.7 * solid(d) * (0.55 + 0.45 * r / 3));
      }
    }

    return [ink, orange];
  });

  const circle = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 0 ${num(cx + r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 0 ${num(cx - r)} ${num(cy)}Z`;

  // Hush ring and window outline.
  g.line(circle(wx, wy, hushR), "faint", { dash: "4 3" });
  g.line(circle(wx, wy, wr), "ink");

  // Horizon across the window.
  g.line(`M${num(wx - chordHalf + 1)} ${horizonY + 0.5}H${num(wx + chordHalf - 1)}`, "soft");

  // Hill's top edge, only where it rises off the horizon.
  const hillPts = [];
  for (let x = wx - chordHalf + 2; x <= wx + chordHalf - 2; x += 2) {
    const ht = hillTop(x);
    if (horizonY - ht > 0.4) hillPts.push([x, ht]);
  }
  if (hillPts.length > 1) g.line(polyD(hillPts), "faint");

  // Eye: lid, crease, lashes.
  g.line(polyD(creasePts), "faint");
  g.line(polyD(lidPts), "ink");
  for (let i = 0; i < 7; i++) {
    const x = 160 + (i * 80) / 6;
    const y = lidY(x);
    const s = (x - 200) / 40; // -1..1
    const ang = Math.PI / 2 - s * 0.45; // fan outward
    const len = 9;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    g.line(`M${num(x)} ${num(y)}L${num(ex)} ${num(ey)}`, "soft");
  }
}
