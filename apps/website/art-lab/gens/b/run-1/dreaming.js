function draw(g, rand, seed, k) {
  // A still pond reflecting a moon absent from the sky
  const { clamp, solid, polyD } = k;
  const horizon = 118, mx = 200, skyY = 80, ry = 156, R = 24;

  // The reflection: five bands, gaps of dark water between them.
  const bh = 5.6, step = 10.5;
  const bands = [];
  for (let i = 0; i < 5; i++) {
    bands.push({
      cy: ry - R + bh / 2 + i * step,
      dx: (rand() * 2 - 1) * 4,
      sc: 0.9 + rand() * 0.18,
    });
  }

  // Pinprick stars in the upper sky, kept well clear of the ghost circle.
  const stars = [];
  for (let t = 0; t < 400 && stars.length < 6; t++) {
    const sx = 92 + rand() * 216, sy = 60 + rand() * 46;
    if (Math.hypot(sx - mx, sy - skyY) < R + 40) continue;
    if (stars.some(([ax, ay]) => Math.hypot(ax - sx, ay - sy) < 28)) continue;
    stars.push([sx, sy, 0.2 + rand() * 0.1]);
  }

  g.print((x, y) => {
    if (y < horizon) {
      for (const [sx, sy, st] of stars) {
        if (Math.hypot(x - sx, y - sy) < 3.0) return st;
      }
      return 0;
    }
    if (x < 84 || x > 316) return 0;

    // Orange bands of the reflected moon.
    let orange = 0;
    for (const b of bands) {
      const dyd = Math.abs(y - b.cy) - bh / 2;
      if (dyd > 2) continue;
      const half = Math.sqrt(Math.max(0, R * R - (y - ry) * (y - ry))) * b.sc;
      if (half <= 0) continue;
      const dxd = Math.abs(x - (mx + b.dx)) - half;
      const d = Math.max(dxd, dyd) + 0.5;
      const t = clamp((y - (b.cy - bh / 2)) / bh);
      const lx = clamp((x - (mx - R)) / (2 * R));
      orange = Math.max(orange, solid(d) * (1 - 0.14 * t - 0.04 * lx));
    }

    // Inside the disc, only the bands: the gaps stay dark water.
    const rd = Math.hypot(x - mx, y - ry);
    let ink = 0;
    if (rd > R + 3) {
      // Elliptical glow, ~140 wide by 60 tall, falling to nothing at its rim.
      const q = Math.hypot((x - mx) / 70, (y - ry) / 30);
      const q0 = (R + 3) / 70;
      ink = 0.55 * Math.pow(clamp((1 - q) / (1 - q0)), 1.4);
      // The moon-path: a brighter column above and below the reflection.
      if (y > horizon + 2.5) {
        const away = clamp((Math.abs(y - ry) - R) / 24);
        const col = 0.55 * Math.exp(-Math.pow((x - mx) / 13, 2)) * (1 - 0.45 * away);
        ink = Math.max(ink, col);
      }
    }
    // A faint band just under the horizon for the line to sit on.
    if (y > horizon + 1 && y < horizon + 7) ink = Math.max(ink, 0.15);

    return [ink, orange];
  });

  // Ripples: soft near the reflection, faint toward their ends.
  const rows = [130, 140, 150, 162, 172, 182];
  for (const ry0 of rows) {
    const L = 120 - Math.abs(ry0 - ry) * 1.6;
    const c = mx + (rand() * 2 - 1) * 6;
    const amp = 0.6 + rand() * 0.9, ph = rand() * Math.PI * 2, wl = 50 + rand() * 30;
    const yAt = (x) => ry0 + 0.5 + amp * Math.sin((x - c) / wl * Math.PI * 2 + ph);
    const seg = (a, b) => {
      const pts = [];
      const n = Math.max(2, Math.ceil(Math.abs(b - a) / 4));
      for (let i = 0; i <= n; i++) {
        const x = a + (b - a) * i / n;
        pts.push([x, yAt(x)]);
      }
      return polyD(pts);
    };
    const inner = L * 0.3;
    g.line(seg(c - inner, c + inner), "soft");
    g.line(seg(c - L / 2, c - inner), "faint");
    g.line(seg(c + inner, c + L / 2), "faint");
  }

  // The horizon.
  g.line(`M84 ${horizon + 0.5}H316`, "ink");

  // The ghost moon: only its outline, dashed and faint.
  g.line(`M${mx - R} ${skyY}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0`, "faint", { dash: "3 3" });
}
