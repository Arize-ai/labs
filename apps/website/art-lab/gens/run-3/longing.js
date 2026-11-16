function draw(g, rand, seed, k) {
  // A body reaching toward a distant orange point, falling just short
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, sdPolyline, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);

  // The body: a lit sphere low on the left.
  const A = [X0 + 46 + rand() * 10, Y1 - 44 - rand() * 8], AR = 22;
  // The longed-for point: small, high, far right.
  const B = [X1 - 26 - rand() * 8, Y0 + 26 + rand() * 10], BR = 4.5;

  // The reach: a quadratic arc from the body's rim toward B, bowing upward.
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) - 0.55;
  const S = [A[0] + AR * Math.cos(ang), A[1] + AR * Math.sin(ang)];
  const C = [(S[0] + B[0]) / 2 - 18, Math.min(S[1], B[1]) - 34 - rand() * 10];
  const q = (t) => {
    const u = 1 - t;
    return [u * u * S[0] + 2 * u * t * C[0] + t * t * B[0], u * u * S[1] + 2 * u * t * C[1] + t * t * B[1]];
  };
  const reachEnd = 0.8 + rand() * 0.04, N = 40;
  const reach = Array.from({ length: N + 1 }, (_, i) => q((i / N) * reachEnd));
  const gap = Array.from({ length: 13 }, (_, i) => q(reachEnd + ((1 - reachEnd) * i) / 12));
  const tip = reach[N];

  // Bounding box for the reach's glow.
  const xs = reach.map((p) => p[0]), ys = reach.map((p) => p[1]);
  const bx0 = Math.min(...xs) - 18, bx1 = Math.max(...xs) + 18, by0 = Math.min(...ys) - 18, by1 = Math.max(...ys) + 18;

  g.print((x, y) => {
    let ink = 0;
    // The body, lit from the upper left.
    const dx = x - A[0], dy = y - A[1], r = Math.hypot(dx, dy), d = r - AR;
    if (d < 30) {
      const lit = clamp(0.5 - (0.7 * dx + 0.7 * dy) / (2 * AR));
      ink = solid(d) * (0.55 + 0.42 * lit + 0.06 * (fbm(x / 6, y / 6) - 0.5)) + 0.2 * glow(d, 8);
    }
    // The reach: a glow that thins as it stretches out.
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      let best = Infinity, bi = 0;
      for (let i = 0; i <= N; i += 4) {
        const e = Math.hypot(x - reach[i][0], y - reach[i][1]);
        if (e < best) { best = e; bi = i; }
      }
      const along = bi / N;
      const rd = sdPolyline(x, y, reach.slice(Math.max(0, bi - 5), Math.min(N, bi + 5) + 1));
      ink = Math.max(ink, (0.42 - 0.26 * along) * glow(rd, 3.5 - 1.5 * along));
    }
    // The point, and its faint light spilling back across the gap.
    const bd = Math.hypot(x - B[0], y - B[1]) - BR;
    return [ink, solid(bd) + 0.38 * glow(bd, 9)];
  });

  // The body's rim.
  const c = (cx, cy, rr) => `M${num(cx - rr)} ${num(cy)}a${num(rr)} ${num(rr)} 0 1 0 ${num(2 * rr)} 0a${num(rr)} ${num(rr)} 0 1 0 ${num(-2 * rr)} 0Z`;
  g.line(c(A[0], A[1], AR), "ink");
  g.line(c(A[0], A[1], AR - 2.6), "faint");
  // The reach, firm at the root and softening toward its tip.
  g.line(polyD(reach.slice(0, 28)), "ink", { width: 1.25 });
  g.line(polyD(reach.slice(27)), "soft", { width: 1.25 });
  g.line(`M${num(tip[0])} ${num(tip[1])}h0`, "ink", { width: 2.5 });
  // The distance it cannot cross.
  g.line(polyD(gap), "faint", { dash: "1 3" });
  g.line(c(B[0], B[1], 14), "faint", { dash: "1 3" });
  // The ground the body rests on.
  g.line(`M${num(A[0] - 40)} ${Math.round(A[1] + AR) + 0.5}H${num(A[0] + 52)}`, "faint");
}
