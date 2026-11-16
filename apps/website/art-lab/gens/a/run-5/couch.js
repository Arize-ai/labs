function draw(g, rand, seed, k) {
  // A sofa in front elevation, one orange throw pillow resting on it.
  const { clamp, sdBox, solid, glow, polyD, num, X0, X1 } = k;

  // The sofa's frame: two arms, a back, a front rail, legs and the floor.
  const L = 90, R = 310, armW = 28;
  const backTop = Math.round(64 + rand() * 10);
  const armTop = Math.round(98 + rand() * 6);
  const seatY = 128, seatB = 150, baseB = 166, floor = 177;
  const n = rand() < 0.5 ? 2 : 3;

  // Each part is a rounded box with a tone; they are listed back to front.
  const parts = [];
  const part = (x, y, w, h, r, tone) =>
    parts.push({ x, y, w, h, r, tone, cx: x + w / 2, cy: y + h / 2, hw: w / 2, hh: h / 2 });

  part(L + 18, backTop, R - L - 36, seatY + 6 - backTop, 10, 0.5); // back
  part(L + armW, seatB - 2, R - L - 2 * armW, baseB - seatB + 2, 0, 0.32); // front rail
  const cush = [];
  const sx0 = L + armW + 1, sx1 = R - armW - 1, cw = (sx1 - sx0) / n;
  for (let i = 0; i < n; i++) {
    const x = Math.round(sx0 + i * cw + 1), w = Math.round(cw - 2);
    cush.push([x, w]);
    part(x, seatY, w, seatB - seatY, 4, 0.92);
  }
  part(L, armTop, armW, baseB - armTop, 12, 0.8); // left arm
  part(R - armW, armTop, armW, baseB - armTop, 12, 0.8); // right arm
  part(L + 8, baseB, 6, floor - baseB - 1, 1, 0.85); // legs
  part(R - 14, baseB, 6, floor - baseB - 1, 1, 0.85);

  // The pillow: a rotated rounded square leaning into one corner of the back.
  const left = rand() < 0.5;
  const ang = (left ? -1 : 1) * (0.16 + rand() * 0.1);
  const phw = 14, phh = 12, pr = 5;
  const pcx = left ? sx0 + 26 : sx1 - 26, pcy = seatY - 15;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const pd = (x, y) => {
    const dx = x - pcx, dy = y - pcy;
    return sdBox(ca * dx + sa * dy, -sa * dx + ca * dy, 0, 0, phw, phh, pr);
  };

  g.print((x, y) => {
    if (x < 70 || x > 330 || y < 50 || y > 200) return 0;
    let ink = 0;
    // The sofa's shadow on the floor.
    if (y > floor - 3 && y < floor + 16)
      ink = 0.22 * Math.exp(-Math.abs(y - floor) / 4) * clamp((Math.min(x - L, R - x) + 8) / 22);
    for (const p of parts) {
      if (x < p.x - 3 || x > p.x + p.w + 3 || y < p.y - 3 || y > p.y + p.h + 3) continue;
      const a = solid(sdBox(x, y, p.cx, p.cy, p.hw, p.hh, p.r));
      if (a <= 0) continue;
      // Lit from the upper left.
      const sh = 1 - 0.22 * clamp((x - p.x) / p.w) - 0.18 * clamp((y - p.y) / p.h);
      ink = ink * (1 - a) + p.tone * sh * a;
    }
    const d = pd(x, y);
    const pa = solid(d);
    const psh = 1 - 0.2 * clamp((x - pcx + phw) / (2 * phw)) - 0.15 * clamp((y - pcy + phh) / (2 * phh));
    return [ink * (1 - pa), pa * psh + 0.28 * glow(d, 4) * (1 - pa)];
  });

  // A rounded box as path data, on the half pixel.
  const rr = (x, y, w, h, r) => {
    const a = Math.round(x) + 0.5, b = Math.round(y) + 0.5, c = a + Math.round(w) - 1, e = b + Math.round(h) - 1;
    const A = `A${r} ${r} 0 0 1 `;
    return `M${a + r} ${b}H${c - r}${A}${c} ${b + r}V${e - r}${A}${c - r} ${e}H${a + r}${A}${a} ${e - r}V${b + r}${A}${a + r} ${b}Z`;
  };

  // Floor and the back's tufting seams.
  g.line(`M${X0} ${floor + 0.5}H${X1}`, "faint", { dash: "1 3" });
  for (let i = 1; i < n; i++) {
    const sx = Math.round(sx0 + i * cw) + 0.5;
    g.line(`M${sx} ${backTop + 10}V${seatY - 2}`, "faint", { dash: "1 3" });
  }

  // The back, as an open outline that disappears behind the arms.
  const bl = L + 18 + 0.5, br = R - 18 - 0.5, bt = backTop + 0.5, r = 10;
  g.line(`M${bl} ${armTop}V${bt + r}A${r} ${r} 0 0 1 ${bl + r} ${bt}H${br - r}A${r} ${r} 0 0 1 ${br} ${bt + r}V${armTop}`, "ink");

  // The front rail, the cushions and the arms.
  g.line(`M${L + armW} ${baseB - 0.5}H${R - armW}`, "soft");
  for (const [x, w] of cush) g.line(rr(x, seatY, w, seatB - seatY, 4), "ink");
  g.line(rr(L, armTop, armW, baseB - armTop, 12), "ink");
  g.line(rr(R - armW, armTop, armW, baseB - armTop, 12), "ink");
  g.line(rr(L + 8, baseB, 6, floor - baseB - 1, 1), "soft");
  g.line(rr(R - 14, baseB, 6, floor - baseB - 1, 1), "soft");

  // The pillow's rim: its rounded corners sampled, then rotated into place.
  const pts = [];
  const corners = [[phw - pr, -phh + pr, -Math.PI / 2], [phw - pr, phh - pr, 0], [-phw + pr, phh - pr, Math.PI / 2], [-phw + pr, -phh + pr, Math.PI]];
  for (const [ux, uy, a0] of corners)
    for (let s = 0; s <= 4; s++) {
      const t = a0 + (s / 4) * (Math.PI / 2);
      const u = ux + pr * Math.cos(t), v = uy + pr * Math.sin(t);
      pts.push([pcx + ca * u - sa * v, pcy + sa * u + ca * v]);
    }
  g.line(polyD(pts, true), "sig");
}
