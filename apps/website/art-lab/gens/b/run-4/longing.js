function draw(g, rand, seed, k) {
  // A jetty over still water, stopping short of a distant light
  const { clamp, solid, polyD, num } = k;

  // --- The distant light ---
  const lx = 250 + rand() * 28, ly = 113, hz = 118;
  const haloR = 34, spread = 1.2; // a little wider along the horizon, as through haze

  // --- Reflection streaks ---
  const rTop = 121, rBot = 186;
  const n = 8 + Math.floor(rand() * 3);
  const step = (rBot - rTop) / n;
  const streaks = [];
  for (let i = 0; i < n; i++) {
    const yc = rTop + (i + 0.5) * step;
    const f = (yc - rTop) / (rBot - rTop);
    const w = 6 + 20 * f;
    const half = Math.max(2.5, w / 2 + (rand() - 0.5) * 8);
    const cx = lx + (rand() - 0.5) * 8;
    streaks.push({ yc, half, cx, tone: 0.85 - 0.5 * f });
  }
  const streakHalfT = Math.min(1.9, step * 0.28);

  // --- The jetty ---
  const nearY = 194, farY = 140, span = nearY - farY;
  const NL = [96, 194], NR = [150, 194], FL = [196, 140], FR = [208, 140];
  const uOf = (y) => (nearY - y) / span;
  const xl = (y) => NL[0] + (FL[0] - NL[0]) * uOf(y);
  const xr = (y) => NR[0] + (FR[0] - NR[0]) * uOf(y);

  // Five pairs of posts, shrinking with distance.
  const postU = [0.03, 0.26, 0.49, 0.72, 0.95];
  const posts = [];
  postU.forEach((u, i) => {
    const y = nearY - span * u;
    const h = 14 - 11 * (i / 4);
    const lyy = y, x1 = NL[0] + (FL[0] - NL[0]) * u, x2 = NR[0] + (FR[0] - NR[0]) * u;
    posts.push({ x: x1, y: lyy, h }, { x: x2, y: lyy, h });
  });

  g.print((x, y) => {
    let ink = 0, orange = 0;

    // Light, halo and water band: only near the light.
    if (x > lx - 50 && x < lx + 50 && y > ly - 40 && y < 130) {
      const r = Math.hypot(x - lx, y - ly);
      const e = Math.hypot((x - lx) / spread, y - ly);
      if (y < hz && e < haloR) ink = Math.max(ink, 0.7 * Math.pow(1 - e / haloR, 2));
      if (y > hz + 0.5 && y < hz + 7 && e < haloR + 6) ink = Math.max(ink, 0.1);
      orange = Math.max(solid(r - 2.5), 0.8 * solid(r - 5));
    }

    // Reflection column.
    if (y > rTop - 3 && y < rBot + 3 && x > lx - 24 && x < lx + 24) {
      for (const s of streaks) {
        const dy = Math.abs(y - s.yc);
        if (dy > streakHalfT + 2) continue;
        const dx = Math.abs(x - s.cx) / s.half;
        if (dx > 1.2) continue;
        const along = clamp(1 - 0.6 * dx * dx);
        const t = s.tone * along * solid(dy - streakHalfT) * solid((dx - 1) * s.half);
        ink = Math.max(ink, t);
      }
    }

    // The jetty deck and its posts.
    if (x > 88 && x < 215 && y > 136 && y < 212) {
      if (y >= farY && y <= nearY) {
        const a = xl(y), b = xr(y);
        if (x >= a && x <= b) {
          const u = uOf(y);
          const across = clamp((x - a) / Math.max(1, b - a));
          const t = (0.4 - 0.2 * u) * (1.12 - 0.24 * across);
          ink = Math.max(ink, t);
        }
      }
      for (const p of posts) {
        if (y > p.y && y < p.y + p.h && Math.abs(x - p.x) < 2.5) ink = Math.max(ink, 0.15);
      }
    }

    return [ink, orange];
  });

  // --- Lines ---
  // Horizon: soft under the halo, faint elsewhere.
  const hA = Math.max(84, lx - 52), hB = Math.min(316, lx + 38);
  const hy = num(hz + 0.5);
  if (hA > 84) g.line(`M84 ${hy}H${num(hA)}`, "faint");
  g.line(`M${num(hA)} ${hy}H${num(hB)}`, "soft");
  if (hB < 316) g.line(`M${num(hB)} ${hy}H316`, "faint");

  // Jetty edges.
  g.line(polyD([NL, FL]), "ink");
  g.line(polyD([NR, FR]), "ink");
  g.line(polyD([[NL[0], NL[1] - 0.5], [NR[0], NR[1] - 0.5]]), "ink");
  g.line(polyD([[FL[0], FL[1] + 0.5], [FR[0], FR[1] + 0.5]]), "ink", { width: 1.3 });

  // Plank seams, closer together as they recede.
  const seams = 7;
  for (let i = 1; i <= seams; i++) {
    const s = i / (seams + 1);
    const u = 1 - Math.pow(1 - s, 1.6);
    const y = nearY - span * u;
    g.line(polyD([[xl(y), y], [xr(y), y]]), "faint");
  }

  // Posts.
  for (const p of posts) {
    const px = num(p.x);
    g.line(`M${px} ${num(p.y)}V${num(p.y + p.h)}`, "soft");
  }

  // Reflection guide.
  const gx = num(lx + 0.5);
  g.line(`M${gx} ${rTop}V${rBot}`, "faint", { dash: "2 3" });
}
