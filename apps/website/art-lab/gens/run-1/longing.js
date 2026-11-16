function draw(g, rand, seed, k) {
  // A curve rising toward an asymptote, never reaching the orange point
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const yA = Y0 + 30 + rand() * 8;
  const base = Y1 - 12;
  const xs = X0 + 14;
  const xe = X1 - 34 - rand() * 6;
  const L = 44 + rand() * 12;
  const target = [X1 - 12, yA];
  const curveY = (x) => yA + (base - yA) * Math.exp(-(x - xs) / L);
  const slope = (x) => (-(base - yA) / L) * Math.exp(-(x - xs) / L);

  const pts = [];
  for (let x = xs; x <= xe; x += 1.5) pts.push([x, curveY(x)]);
  const end = pts[pts.length - 1];

  g.print((x, y) => {
    let ink = 0;
    let sig = 0;
    if (x >= xs - 4 && x <= xe + 4) {
      const cx = clamp(x, xs, xe);
      const cy = curveY(cx);
      const s = slope(cx);
      const d = Math.abs(y - cy) / Math.sqrt(1 + s * s);
      ink = Math.max(ink, 0.32 * glow(d, 3.5));
      if (y > cy && y < Y1 && x >= xs && x <= xe) {
        const u = (x - xs) / (xe - xs);
        const area = 0.46 * Math.exp(-(y - cy) / 30) * (1 - 0.3 * u) * clamp((Y1 - y) / 10);
        ink = Math.max(ink, area + 0.05 * (fbm(x / 8, y / 8) - 0.5));
      }
    }
    const nd = Math.hypot(x - xs, y - base) - 5;
    ink = Math.max(ink, solid(nd) * (0.95 - 0.15 * clamp((x - xs + 5) / 10)) + 0.25 * glow(nd, 6));
    const ed = Math.hypot(x - end[0], y - end[1]) - 2;
    ink = Math.max(ink, solid(ed) * 0.85);
    const td = Math.hypot(x - target[0], y - target[1]) - 4;
    sig = solid(td) + 0.4 * glow(td, 8);
    return [ink, sig];
  });

  const ya = Math.round(yA) + 0.5;
  g.line(`M${X0} ${ya}H${num(target[0] - 8)}`, "soft", { dash: "4 3" });
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
  g.line(`M${X0 + 0.5} ${Y0}V${Y1}`, "faint");
  g.line(polyD(pts), "ink", { width: 1.25 });
  g.line(`M${num(end[0] + 4)} ${num(end[1])}L${num(target[0] - 6)} ${num(target[1])}`, "faint", { dash: "1 3" });
  const tx = Math.round(target[0]) + 0.5;
  g.line(`M${tx} ${num(yA + 8)}V${Y1}`, "faint", { dash: "1 3" });
  const r = 7;
  g.line(
    `M${num(target[0] - r)} ${num(target[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`,
    "sig",
  );
}
