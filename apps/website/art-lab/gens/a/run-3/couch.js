function draw(g, rand, seed, k) {
  // A sofa face-on, lit from upper left, one orange throw pillow
  const { clamp, sdBox, solid, glow, num } = k;
  const fbm = k.makeNoise(seed + 11);

  const n = rand() < 0.5 ? 2 : 3;
  const L = 90, R = 310, inL = 114, inR = 286;
  const parts = [];
  const add = (x, y, w, h, r, tone, stroke) =>
    parts.push({ x, y, w, h, r, tone, stroke, cx: x + w / 2, cy: y + h / 2, hw: w / 2, hh: h / 2 });

  // Front to back, so the first hit is what is seen.
  add(98, 176, 8, 9, 1.5, 0.85, "ink");
  add(294, 176, 8, 9, 1.5, 0.85, "ink");
  add(L, 98, inL - L, 80, 9, 0.72, "ink");
  add(inR, 98, R - inR, 80, 9, 0.6, "ink");
  const seatW = (inR - inL - 2 * (n - 1)) / n;
  for (let i = 0; i < n; i++) add(inL + i * (seatW + 2), 126, seatW, 22, 4, 0.82, "ink");
  add(108, 148, 184, 28, 3, 0.34, "soft");
  const backParts = [];
  for (let i = 0; i < n; i++) {
    add(inL + i * (seatW + 2), 80, seatW, 48, 7, 0.52, "ink");
    backParts.push(parts[parts.length - 1]);
  }
  add(108, 70, 184, 60, 11, 0.22, "soft");
  const nFront = 2 + 2 + n + 1; // pillow sits behind these, in front of the back

  // The pillow: a rotated rounded square leaning on one back cushion.
  const host = backParts[Math.floor(rand() * n)];
  const pc = [host.cx + (rand() - 0.5) * host.w * 0.3, 111];
  const ang = (rand() < 0.5 ? -1 : 1) * (0.18 + rand() * 0.14);
  const ca = Math.cos(ang), sa = Math.sin(ang), phw = 14, pr = 5;
  const pillowD = (x, y) => {
    const dx = x - pc[0], dy = y - pc[1];
    return sdBox(ca * dx + sa * dy, -sa * dx + ca * dy, 0, 0, phw, phw, pr);
  };

  g.print((x, y) => {
    if (x < 82 || x > 318 || y < 62 || y > 198) return 0;
    for (let i = 0; i < parts.length; i++) {
      if (i === nFront) {
        const pd = pillowD(x, y);
        if (pd < k.P / 2) {
          const u = clamp((x - pc[0] + phw) / (2 * phw)), v = clamp((y - pc[1] + phw) / (2 * phw));
          return [0, solid(pd) * (1 - 0.22 * u - 0.2 * v) + 0.3 * glow(pd, 6)];
        }
      }
      const p = parts[i];
      if (x < p.x - 3 || x > p.x + p.w + 3 || y < p.y - 3 || y > p.y + p.h + 3) continue;
      const d = sdBox(x, y, p.cx, p.cy, p.hw, p.hh, p.r);
      if (d > k.P / 2) continue;
      const u = clamp((x - p.x) / p.w), v = clamp((y - p.y) / p.h);
      const shade = 1 - 0.18 * u - 0.28 * v + 0.06 * (fbm(x / 6, y / 6) - 0.5);
      return solid(d) * p.tone * shade;
    }
    // Pillow light spilling over the cushion behind it is handled above;
    // here, the soft shadow pooling on the floor.
    const fy = (y - 187) / 5, fx = (x - 200) / 125;
    const shadow = y > 178 ? 0.2 * Math.exp(-fy * fy - fx * fx * fx * fx) : 0;
    const halo = 0.06 * glow(sdBox(x, y, 200, 124, 110, 55, 10), 8);
    return Math.max(shadow, halo);
  });

  const rr = (p) => {
    const x = Math.round(p.x) + 0.5, y = Math.round(p.y) + 0.5;
    const w = Math.round(p.w) - 1, h = Math.round(p.h) - 1, r = Math.min(p.r, w / 2, h / 2);
    return `M${num(x + r)} ${y}H${num(x + w - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w)} ${num(y + r)}` +
      `V${num(y + h - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w - r)} ${num(y + h)}` +
      `H${num(x + r)}A${num(r)} ${num(r)} 0 0 1 ${x} ${num(y + h - r)}` +
      `V${num(y + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + r)} ${y}Z`;
  };

  // Back to front so nearer outlines sit on top.
  for (let i = parts.length - 1; i >= 0; i--) {
    if (i === nFront - 1) {
      const pts = [];
      for (let c = 0; c < 4; c++) {
        const sx = c === 0 || c === 3 ? 1 : -1, sy = c < 2 ? 1 : -1;
        const a0 = (c * Math.PI) / 2;
        for (let s = 0; s <= 4; s++) {
          const a = a0 + (s / 4) * (Math.PI / 2);
          const lx = sx * (phw - pr) + pr * Math.cos(a), ly = sy * (phw - pr) + pr * Math.sin(a);
          pts.push([pc[0] + ca * lx - sa * ly, pc[1] + sa * lx + ca * ly]);
        }
      }
      g.line(k.polyD(pts, true), "sig");
    }
    g.line(rr(parts[i]), parts[i].stroke);
  }
  // Tufting buttons as short seams on the back cushions.
  for (const b of backParts) g.line(`M${num(b.cx - 6)} ${num(b.cy + 2)}H${num(b.cx + 6)}`, "faint");
  // The floor.
  g.line(`M70 186.5H330`, "faint", { dash: "1 3" });
}
