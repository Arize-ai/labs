function draw(g, rand, seed, k) {
  // A seated cat watching a single orange laser dot on the floor
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num, X0, X1 } = k;
  const cx = 168 + rand() * 10, headY = 96, headR = 23, floor = 190;
  const bodyY = 152, rx = 32, ry = 38;
  const lean = (rand() - 0.5) * 4;

  const earL = [[cx - 22, headY - 6], [cx - 17 + lean, headY - 37], [cx - 3, headY - 20]];
  const earR = [[cx + 22, headY - 6], [cx + 17 + lean, headY - 37], [cx + 3, headY - 20]];
  const sdTri = (x, y, t) => {
    const d = sdPolyline(x, y, [t[0], t[1], t[2], t[0]]);
    return inPolygon(x, y, t) ? -d : d;
  };

  // The tail, curling up from the floor, smoothed by corner cutting.
  const curl = 14 + rand() * 10;
  let tail = [[cx + 18, floor - 3], [cx + 44, floor - 2], [cx + 60, floor - 10], [cx + 64, floor - 24], [cx + 58 - curl * 0.3, floor - 26 - curl]];
  for (let r = 0; r < 3; r++) {
    const out = [tail[0]];
    for (let i = 0; i < tail.length - 1; i++) {
      const [ax, ay] = tail[i], [bx, by] = tail[i + 1];
      out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    out.push(tail[tail.length - 1]);
    tail = out;
  }

  const smin = (a, b, s) => {
    const h = clamp(0.5 + (0.5 * (b - a)) / s);
    return b + (a - b) * h - s * h * (1 - h);
  };
  const eyes = [[cx - 9, headY - 1], [cx + 9, headY - 1]];
  const dot = [cx + 92 + rand() * 22, floor - 3];

  const bx0 = cx - 50, bx1 = cx + 80, by0 = headY - 48, by1 = floor + 14;
  g.print((x, y) => {
    let ink = 0;
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      const dh = Math.hypot(x - cx, y - headY) - headR;
      const ex = (x - cx) / rx, ey = (y - bodyY) / ry;
      let db = (Math.hypot(ex, ey) - 1) * rx;
      db = Math.max(db, y - floor); // flat where it sits
      let d = smin(dh, db, 8);
      d = Math.min(d, sdTri(x, y, earL), sdTri(x, y, earR));
      d = smin(d, sdPolyline(x, y, tail) - 4.5, 3);
      const shade = 1 - 0.32 * clamp((x - (cx - 40) + (y - (headY - 35))) / 190);
      ink = solid(d) * 0.95 * shade + 0.14 * glow(d, 8);
      for (const [px, py] of eyes) {
        const de = Math.hypot((x - px) / 1.4, (y - py) / 1) - 3.2;
        if (de < 0) ink = Math.min(ink, 0.1);
      }
    }
    // A soft pool of light on the floor under the dot.
    const dd = Math.hypot(x - dot[0], y - dot[1]) - 3.5;
    const pool = y > floor - 6 ? 0.16 * glow(Math.abs(x - dot[0]), 14) * glow(Math.abs(y - floor), 4) : 0;
    return [Math.max(ink, pool), solid(dd) + 0.42 * glow(dd, 7)];
  });

  g.line(`M${X0} ${floor + 0.5}H${X1}`, "faint");
  // Whiskers, reaching past the head.
  for (const s of [-1, 1]) {
    for (let w = 0; w < 3; w++) {
      const y0 = headY + 6 + w * 2.5, y1 = headY + 1 + w * 6;
      g.line(`M${num(cx + s * 11)} ${num(y0)}L${num(cx + s * 42)} ${num(y1)}`, "soft");
    }
  }
  // The gaze, a dotted guide from eye to dot.
  g.line(`M${num(eyes[1][0] + 4)} ${num(eyes[1][1] + 2)}L${num(dot[0] - 5)} ${num(dot[1] - 3)}`, "faint", { dash: "1 3" });
  g.line(polyD(earL, true), "ink");
  g.line(polyD(earR, true), "ink");
}
