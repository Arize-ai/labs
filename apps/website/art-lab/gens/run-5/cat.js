function draw(g, rand, seed, k) {
  // A sitting cat in silhouette, tail curled, eyes lit orange
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, X0, X1 } = k;
  const fbm = k.makeNoise(seed + 11);
  const cx = 200, hy = 90, hr = 25;
  const earH = 30 + rand() * 6, earSpread = 4 + rand() * 3;
  const lean = (rand() - 0.5) * 4;

  // Ears: triangles rising from the crown of the head.
  const earL = [[cx - 24, hy - 6], [cx - 20 - earSpread, hy - earH], [cx - 4, hy - 20]];
  const earR = earL.map(([x, y]) => [2 * cx - x, y]);
  const closed = (p) => p.concat([p[0]]);
  const sdTri = (x, y, p) => {
    const d = sdPolyline(x, y, closed(p));
    return inPolygon(x, y, p) ? -d : d;
  };

  // Tail: a cubic sweeping out from the right haunch and curling up.
  const tailEnd = [268 + rand() * 8, 124 + rand() * 16];
  const c0 = [232, 188], c1 = [278, 194], c2 = [294, 158], c3 = tailEnd;
  const tail = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24, u = 1 - t;
    return [
      u ** 3 * c0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * c3[0],
      u ** 3 * c0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * c3[1],
    ];
  });

  const smin = (a, b, w) => -w * Math.log(Math.exp(-a / w) + Math.exp(-b / w));
  const by = 150, bry = 42, groundY = 190;
  const body = (x, y) => {
    const rx = 26 + 15 * clamp((y - 112) / 62);
    const d = (Math.hypot((x - cx - lean) / rx, (y - by) / bry) - 1) * Math.min(rx, bry);
    return Math.max(d, y - groundY);
  };
  const cat = (x, y) => {
    let d = Math.hypot(x - cx, y - hy) - hr;
    d = Math.min(d, sdTri(x, y, earL), sdTri(x, y, earR));
    d = smin(d, body(x, y), 4);
    if (x > 220 && y > 110) d = Math.min(d, sdPolyline(x, y, tail) - 4.5 + 2 * (tail.length && 0));
    return d;
  };

  // Eyes: almonds either side of the head's centre line.
  const eyes = [[cx - 10, hy + 1], [cx + 10, hy + 1]];
  const eyeD = (x, y) => {
    let d = Infinity;
    for (const [ex, ey] of eyes) d = Math.min(d, (Math.hypot((x - ex) / 5.5, (y - ey) / 3.4) - 1) * 3.4);
    return d;
  };

  g.print((x, y) => {
    if (x < 130 || x > 320 || y < 30 || y > 215) return 0;
    const d = cat(x, y);
    // Lit from the upper left: brighter toward the top-left of the figure.
    const shade = 0.98 - 0.32 * clamp((x - 165 + (y - 60)) / 190);
    const n = 0.06 * (fbm(x / 6, y / 6) - 0.5);
    let ink = solid(d) * clamp(shade + n) + 0.2 * glow(d, 8);
    let sig = 0;
    if (y > hy - 8 && y < hy + 10 && Math.abs(x - cx) < 20) {
      const ed = eyeD(x, y);
      sig = solid(ed) + 0.35 * glow(ed, 2.5);
      if (ed < 0) ink = 0;
    }
    return [ink, sig];
  });

  // Pupils: vertical slits ruled over the orange.
  for (const [ex, ey] of eyes) g.line(`M${num(ex) + 0.5} ${num(ey - 3)}V${num(ey + 3)}`, "ink", { width: 1.5 });
  // Whiskers, reaching past the cheeks into the ground.
  for (const s of [-1, 1]) {
    for (const [dy, ty] of [[0, -6], [3, 2], [6, 10]]) {
      const x0 = cx + s * 8, y0 = hy + 10 + dy;
      g.line(`M${num(x0)} ${num(y0)}L${num(cx + s * 52)} ${num(y0 + ty)}`, "soft");
    }
  }
  // The tail's spine, kept crisp, and the floor the cat sits on.
  g.line(polyD(tail), "ink", { width: 1.25 });
  g.line(`M${X0} ${groundY + 0.5}H${X1}`, "faint", { dash: "1 3" });
}
