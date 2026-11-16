function draw(g, rand, seed, k) {
  // A still lake reflecting a moon that is not in the sky
  const { clamp, solid, polyD, num } = k;

  const horizon = 112;
  const peakY = 88 + (rand() * 2 - 1) * 6;
  const H = horizon - peakY;
  const hillY = (x) => {
    if (x < 100 || x > 210) return horizon;
    const t = (x - 150) / (x < 150 ? 50 : 60);
    return horizon - H * (0.5 + 0.5 * Math.cos(Math.PI * t));
  };

  // The reflected moon, sliced into five ripple bands.
  const mx = 238, my = 158, r = 20;
  const bandStart = 138, bandH = 5.6, pitch = 8.6;
  const bands = [];
  for (let i = 0; i < 5; i++) {
    const t = bandStart + i * pitch;
    const off = (rand() < 0.5 ? -1 : 1) * (1 + rand() * 3);
    const wf = 1 + 0.035 * i + rand() * 0.06;
    const tone = 1 - 0.2 * (Math.abs(i - 2) / 2);
    const mid = t + bandH / 2;
    const hwMid = Math.sqrt(Math.max(0, r * r - (mid - my) ** 2)) * wf;
    const breaks = [];
    const nBreaks = i >= 4 ? 2 : i >= 3 ? 1 : 0;
    for (let j = 0; j < nBreaks; j++) {
      breaks.push([(rand() * 2 - 1) * 0.6 * hwMid, 3.5 + rand() * 1.5]);
    }
    bands.push({ t, b: t + bandH, off, wf, tone, hwMid, breaks });
  }
  const inGap = (y) => {
    const u = (((y - bandStart) % pitch) + pitch) % pitch;
    return u > bandH;
  };

  g.print((x, y) => {
    if (x < 88 || x > 312) return 0;

    // Sky: only the hill lives here. No moon, no glow.
    if (y <= horizon) {
      if (x < 100 || x > 210) return 0;
      const hy = hillY(x);
      if (y < hy) return 0;
      const upperLeft = x < 150 && y < hy + 9 ? 0.32 : 0.25;
      return upperLeft;
    }

    // Water wash, fading toward the bottom.
    let ink = 0.1 * clamp(1 - (y - horizon) / 80);

    // Hill reflection, its lower half broken by the ripple gaps.
    if (x >= 100 && x <= 210) {
      const ry = 2 * horizon - hillY(x);
      if (y < ry) {
        const depth = ry - horizon;
        const broken = y > horizon + depth / 2 && inGap(y);
        if (!broken) ink = Math.max(ink, 0.15);
      }
    }

    // Moon glow: wider sideways than vertically.
    const dx = x - mx, dy = y - my;
    const rr = Math.hypot(dx, dy);
    let orange = 0;
    if (rr < 70) {
      const d = Math.max(0, rr - r);
      const ang = rr > 0 ? Math.abs(dy) / rr : 0;
      const w = 15 * (1 - 0.45 * ang);
      const inDisc = rr < r + 1;
      if (!inDisc) {
        ink = Math.max(ink, 0.5 * Math.exp(-d / w) * k.smooth(clamp(d / 8)));
        orange = 0.5 * Math.exp(-d / 6);
      }

      // The bands themselves.
      for (const b of bands) {
        if (y < b.t || y >= b.b) continue;
        const cxb = mx + b.off;
        const hw = Math.sqrt(Math.max(0, r * r - dy * dy)) * b.wf;
        const dd = Math.abs(x - cxb) - hw;
        let broken = false;
        for (const [c, bw] of b.breaks) if (Math.abs(x - (cxb + c)) < bw / 2) broken = true;
        if (!broken) {
          const s = solid(dd);
          if (s > 0) {
            orange = Math.max(orange, b.tone * s);
            ink = Math.min(ink, 0.1);
          }
        }
      }

      // Gaps and breaks inside the disc stay dark.
      if (inDisc && orange === 0) ink = Math.min(ink, 0.04);
    }

    return [ink, orange];
  });

  // Horizon.
  g.line(`M90 ${horizon + 0.5}H310`, "ink");

  // Hill outline and its dashed mirror.
  const top = [], mirror = [];
  for (let x = 100; x <= 210; x += 2) {
    const hy = hillY(x);
    top.push([x, hy]);
    mirror.push([x, 2 * horizon - hy]);
  }
  g.line(polyD(top), "soft");
  g.line(polyD(mirror), "faint", { dash: "4 3" });

  // A faint rule along the top of each moon band, split at the breaks.
  for (const b of bands) {
    const cxb = mx + b.off;
    const cuts = b.breaks.map(([c, bw]) => [cxb + c - bw / 2, cxb + c + bw / 2]).sort((p, q) => p[0] - q[0]);
    let x0 = cxb - b.hwMid;
    const x1 = cxb + b.hwMid;
    const yy = num(b.t + 0.5);
    for (const [a, c] of cuts) {
      if (a > x0 + 1) g.line(`M${num(x0)} ${yy}H${num(a)}`, "faint");
      x0 = Math.max(x0, c);
    }
    if (x1 > x0 + 1) g.line(`M${num(x0)} ${yy}H${num(x1)}`, "faint");
  }

  // Trailing ripple dashes, clear of the disc.
  const slots = [151, 160, 169, 181];
  const count = rand() < 0.5 ? 3 : 4;
  const order = slots.map((s) => [s, rand()]).sort((a, b) => a[1] - b[1]).slice(0, count);
  for (const [s] of order) {
    const y = Math.round((s + (rand() * 2 - 1) * 1.2) * 2) / 2 + 0.5;
    let xa, xb;
    if (y > 179) {
      const len = 10 + rand() * 15;
      xa = 200 + rand() * (85 - len);
      xb = xa + len;
    } else if (rand() < 0.35) {
      const len = 10 + rand() * 4;
      xb = 213;
      xa = Math.max(200, xb - len);
    } else {
      xa = 262 + rand() * 8;
      const len = Math.min(10 + rand() * 15, 285 - xa);
      xb = xa + len;
    }
    g.line(`M${num(xa)} ${num(y)}H${num(xb)}`, "faint");
  }
}
