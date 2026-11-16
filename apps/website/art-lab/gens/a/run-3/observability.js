function draw(g, rand, seed, k) {
  // A magnifying lens over a hidden signal, revealing one anomalous spike
  const { X0, X1, Y0, Y1, clamp, smooth, makeNoise, sdPolyline, solid, glow, polyD, num } = k;
  const fbm = makeNoise(seed + 11);

  // The lens and its handle, which runs down and to the right.
  const cx = 186 + Math.round((rand() - 0.5) * 16), cy = 112, R = 44;
  const a = Math.PI / 4, hw = 4.5;
  const h0 = [cx + (R + 3) * Math.cos(a), cy + (R + 3) * Math.sin(a)];
  const h1 = [h0[0] + 40 * Math.cos(a), h0[1] + 40 * Math.sin(a)];
  const handle = [h0, h1];

  // The signal: a quiet line that runs through the lens. Its one spike sits inside.
  const base = cy + 16, phase = rand() * 10;
  const xs = cx + (rand() - 0.5) * 28;
  const bump = (x, c, w, amp) => amp * Math.exp(-(((x - c) / w) ** 2));
  const curve = (x) =>
    base - bump(x, xs, 3.2, 36) + bump(x, xs + 6, 2.4, 9) - bump(x, xs - 22, 6, 5)
    - 3 * Math.sin(x / 11 + phase) - 5 * (fbm(x / 10, phase) - 0.5);
  const pts = [];
  for (let x = X0; x <= X1; x += 1.25) pts.push([x, curve(x)]);
  let tip = pts[0];
  for (const p of pts) if (p[1] < tip[1]) tip = p;

  g.print((x, y) => {
    const dist = Math.hypot(x - cx, y - cy), ld = dist - R;
    let ink = 0, sig = 0;

    // The rim, with a little light spilling around it.
    const rd = Math.abs(ld) - 2;
    ink = Math.max(ink, 0.88 * solid(rd) + 0.14 * glow(rd, 6));

    // The handle, lit from the upper left.
    if (x > h0[0] - 12 && y > h0[1] - 12 && x < h1[0] + 12 && y < h1[1] + 12) {
      const hd = sdPolyline(x, y, handle) - hw;
      const t = clamp((x - h0[0] + y - h0[1]) / 80);
      ink = Math.max(ink, solid(hd) * (0.92 - 0.3 * t) + 0.12 * glow(hd, 5));
    }

    // Inside the glass: the signal becomes visible, with its area beneath.
    if (ld < 0) {
      const u = ((x - cx) + (y - cy)) / (2 * R);
      const glass = 0.1 + 0.12 * (1 - smooth(clamp(u * 0.8 + 0.5)));
      const edge = smooth(clamp(-ld / 4));
      const c = curve(x);
      const area = y > c ? 0.34 * Math.exp(-(y - c) / 18) : 0;
      const near = pts.filter((p) => Math.abs(p[0] - x) < 12);
      const line = near.length > 1 ? 0.42 * glow(sdPolyline(x, y, near), 3) : 0;
      ink = Math.max(ink, (glass + Math.max(area, line)) * edge);

      const td = Math.hypot(x - tip[0], y - tip[1]) - 3.5;
      sig = (solid(td) + 0.42 * glow(td, 6)) * edge;
    }
    return [ink, sig];
  });

  // The trace as rules: dotted where it is unobserved, crisp under the lens.
  const runs = [];
  let cur = null, curIn = null;
  for (const p of pts) {
    const inside = Math.hypot(p[0] - cx, p[1] - cy) < R - 2.5;
    if (inside !== curIn) {
      if (cur) { cur.pts.push(p); runs.push(cur); }
      cur = { inside, pts: cur ? [cur.pts[cur.pts.length - 1], p] : [p] };
      curIn = inside;
    } else cur.pts.push(p);
  }
  if (cur) runs.push(cur);
  for (const r of runs) {
    if (r.pts.length < 2) continue;
    if (r.inside) g.line(polyD(r.pts), "ink", { width: 1.25 });
    else g.line(polyD(r.pts), "faint", { dash: "1 3" });
  }

  // The lens rim, as a double rule.
  const circle = (r) =>
    `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
  g.line(circle(R + 2), "ink");
  g.line(circle(R - 2.5), "soft");

  // The handle's outline.
  const nx = -Math.sin(a) * hw, ny = Math.cos(a) * hw;
  g.line(
    polyD([[h0[0] + nx, h0[1] + ny], [h1[0] + nx, h1[1] + ny], [h1[0] - nx, h1[1] - ny], [h0[0] - nx, h0[1] - ny]], true),
    "ink",
  );

  // A faint baseline the signal rides on.
  g.line(`M${X0} ${Math.round(base + 10) + 0.5}H${X1}`, "faint");
  for (let x = X0; x <= X1; x += 29) g.line(`M${Math.round(x) + 0.5} ${Math.round(base + 10)}v3`, "faint");
}
