function draw(g, rand, seed, k) {
  // A forecast fan: known past line, widening cone of possible futures.
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, sdPolyline, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const ph = rand() * 10;
  const nowX = Math.round(X0 + (X1 - X0) * (0.42 + rand() * 0.06));
  const base = (Y0 + Y1) / 2 + 8;

  // The past: a measured, slightly noisy line up to now.
  const past = [];
  for (let x = X0; x <= nowX + 0.01; x += 1.5) {
    const u = (x - X0) / (nowX - X0);
    const y = base + 9 * Math.sin((x - X0) / 22 + ph) + 12 * (fbm(x / 14, ph) - 0.5) - 10 * u;
    past.push([x, y]);
  }
  const nowY = past[past.length - 1][1];

  // The future: a median drifting up-right and a cone that widens with time.
  const span = X1 - nowX;
  const slope = -(0.06 + rand() * 0.1);
  const median = (x) => {
    const u = (x - nowX) / span;
    return nowY + slope * (x - nowX) + 5 * u * Math.sin(u * Math.PI * 1.5 + ph);
  };
  const endM = median(X1);
  const wMax = Math.max(26, Math.min(50, endM - (Y0 - 6), Y1 + 2 - endM));
  const width = (x) => 2.5 + (wMax - 2.5) * Math.pow(clamp((x - nowX) / span), 1.15);

  g.print((x, y) => {
    let ink = 0;
    if (x < nowX + 8) {
      const near = past.filter(([px]) => Math.abs(px - x) < 12);
      if (near.length > 1) {
        const fadeIn = smooth(clamp((x - X0) / 50));
        ink = 0.32 * glow(sdPolyline(x, y, near), 4) * fadeIn;
      }
    }
    if (x > nowX && x < X1 + 4) {
      const u = (x - nowX) / span;
      const m = median(x), w = width(x), a = Math.abs(y - m);
      // Lit from the upper left: dimmer further out, brighter on the upper side.
      const shade = (1 - 0.3 * u) * (1 - 0.12 * clamp((y - m) / w, -1, 1));
      const end = solid(x - X1);
      const outer = 0.24 * solid(a - w);
      const inner = 0.24 * solid(a - 0.5 * w);
      const core = 0.22 * glow(a, 3);
      ink = Math.max(ink, (outer + inner + core) * shade * end);
    }
    const nd = Math.hypot(x - nowX, y - nowY) - 3.5;
    return [ink, solid(nd) + 0.42 * glow(nd, 7)];
  });

  // Axis, ticks and the "now" guide.
  g.line(`M${X0} ${Y1 + 0.5}H${X1}`, "faint");
  for (let t = 0; t <= 6; t++) {
    const x = Math.round(X0 + ((X1 - X0) * t) / 6) + 0.5;
    g.line(`M${x} ${Y1}v4`, "faint");
  }
  g.line(`M${nowX + 0.5} ${Y0 - 4}V${Y1}`, "faint", { dash: "1 3" });

  // The past line, fading in from the left.
  const split = past.findIndex(([x]) => x > X0 + 40);
  g.line(polyD(past.slice(0, split + 1)), "faint", { width: 1.25 });
  g.line(polyD(past.slice(split)), "ink", { width: 1.25 });

  // The cone: outer bounds, inner band, and the dashed median.
  const up = [], lo = [], iu = [], il = [], md = [];
  for (let x = nowX; x <= X1 + 0.01; x += 3) {
    const m = median(x), w = width(x);
    up.push([x, m - w]); lo.push([x, m + w]);
    iu.push([x, m - 0.5 * w]); il.push([x, m + 0.5 * w]);
    md.push([x, m]);
  }
  g.line(polyD(up), "soft");
  g.line(polyD(lo), "soft");
  g.line(polyD(iu), "faint", { dash: "1 3" });
  g.line(polyD(il), "faint", { dash: "1 3" });
  g.line(polyD(md), "ink", { width: 1.25, dash: "4 3" });
  g.line(`M${num(X1) + 0.5} ${num(up[up.length - 1][1])}V${num(lo[lo.length - 1][1])}`, "faint");
}
