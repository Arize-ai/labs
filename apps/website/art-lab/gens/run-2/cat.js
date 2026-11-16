function draw(g, rand, seed, k) {
  // A sitting cat watching an orange laser dot on the floor
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);
  const cx = 200 + Math.round((rand() - 0.5) * 8);
  const floor = 192;
  const lean = (rand() - 0.5) * 4;

  // The silhouette: a hand-drawn polygon, smoothed, with sharp ear tips kept.
  const raw = [
    [-34, 192], [-40, 178], [-40, 160], [-34, 140], [-24, 126], [-26, 120], [-32, 108], [-32, 94],
    [-28, 82], [-30 + lean, 57, 1], [-14, 72], [0, 70], [14, 72], [30 + lean, 57, 1], [28, 82],
    [32, 94], [32, 108], [26, 120], [24, 126], [34, 140], [40, 160], [40, 178], [34, 192],
  ].map(([x, y, s]) => [cx + x, y, s || 0]);
  const chaikin = (pts) => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (a[2]) out.push(a);
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1], 0]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1], 0]);
    }
    return out;
  };
  let body = chaikin(chaikin(raw)).map(([x, y]) => [x, y]);
  // Flatten the base onto the floor.
  body = body.map(([x, y]) => [x, Math.min(y, floor)]);
  const ring = body.concat([body[0]]);
  const bx0 = Math.min(...body.map((p) => p[0])) - 24, bx1 = Math.max(...body.map((p) => p[0])) + 24;
  const by0 = Math.min(...body.map((p) => p[1])) - 24, by1 = floor + 10;

  // The tail, curling up on the floor to the right, tapering.
  const tc = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const a = Math.PI * (1.05 * t);
    tc.push([cx + 30 + 26 * Math.sin(a) + 14 * t, floor - 4 - 26 * (1 - Math.cos(a)) * 0.5 - 8 * t * t]);
  }
  const tw = (t) => 4.6 - 2.2 * t;
  const left = [], right = [];
  tc.forEach((p, i) => {
    const a = tc[Math.max(0, i - 1)], b = tc[Math.min(tc.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const w = tw(i / 20);
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  const tail = left.concat(right.reverse());

  // Face.
  const eyeY = 99, eyes = [[cx - 12, eyeY], [cx + 12, eyeY]];
  const eyeIn = (x, y) => eyes.some(([ex, ey]) => ((x - ex) / 6) ** 2 + ((y - ey) / 3.6) ** 2 < 1);

  // The laser dot, off to the right on the floor.
  const dot = [k.X1 - 18 - rand() * 14, floor - 3];

  g.print((x, y) => {
    let ink = 0;
    if (x > bx0 && x < bx1 + 30 && y > by0 && y < by1) {
      const inside = inPolygon(x, y, body);
      const d = (inside ? -1 : 1) * sdPolyline(x, y, ring);
      // Lit from the upper left.
      const shade = 1 - 0.32 * clamp(((x - cx + 40) / 80) * 0.5 + ((y - 56) / 136) * 0.5);
      const fur = 0.08 * (fbm(x / 6, y / 6) - 0.5);
      ink = solid(d) * (0.86 * shade + fur) + 0.16 * glow(d, 9);
      if (inside && eyeIn(x, y)) ink = 0.04;
      const td = sdPolyline(x, y, tc) - 4;
      ink = Math.max(ink, solid(td) * 0.72 + 0.1 * glow(td, 6));
      // A soft shadow pooling on the floor.
      const sh = ((x - cx - 8) / 60) ** 2 + ((y - floor - 2) / 5) ** 2;
      if (y > floor - 1) ink = Math.max(ink, 0.22 * Math.exp(-sh * 2));
    }
    const dd = Math.hypot(x - dot[0], y - dot[1]) - 3;
    return [ink, solid(dd) + 0.45 * glow(dd, 7)];
  });

  // Floor, and the cat's gaze down to the dot.
  g.line(`M${k.X0} ${floor + 0.5}H${k.X1}`, "faint");
  g.line(`M${num(cx + 18)} ${num(eyeY + 2)}L${num(dot[0] - 5)} ${num(dot[1] - 3)}`, "faint", { dash: "1 3" });

  // Outline, tail, legs.
  g.line(polyD(body, true), "ink", { width: 1.25 });
  g.line(polyD(tail, true), "ink", { width: 1 });
  for (const s of [-1, 1]) {
    const lx = cx + s * 9;
    g.line(`M${num(lx)} ${150}Q${num(lx + s * 1)} ${172} ${num(lx)} ${floor - 4}`, "soft");
    g.line(`M${num(lx)} ${floor - 4}q${num(s * 6)} -3 ${num(s * 12)} 0`, "soft");
  }
  // Inner ears.
  for (const s of [-1, 1]) {
    const tip = raw[s < 0 ? 9 : 13];
    g.line(`M${num(cx + s * 24)} ${82}L${num(tip[0] - s * 3)} ${num(tip[1] + 7)}L${num(cx + s * 13)} ${76}`, "soft");
  }
  // Eyes with slit pupils glancing toward the dot.
  for (const [ex, ey] of eyes) {
    g.line(`M${ex - 6} ${ey}Q${ex} ${ey - 5} ${ex + 6} ${ey}Q${ex} ${ey + 5} ${ex - 6} ${ey}Z`, "ink");
    g.line(`M${ex + 2.5} ${ey - 2.6}V${ey + 2.6}`, "ink", { width: 1.5 });
  }
  // Nose, mouth, whiskers.
  g.line(`M${cx - 3} 107H${cx + 3}L${cx} 110.5Z`, "ink");
  g.line(`M${cx} 110.5v2.5q-3 3 -6 1M${cx} 113q3 3 6 1`, "soft");
  for (const s of [-1, 1]) {
    for (const [dy, ex] of [[-5, 46], [0, 50], [6, 46]]) {
      g.line(`M${num(cx + s * 10)} ${112 + dy * 0.3}Q${num(cx + s * 30)} ${num(110 + dy)} ${num(cx + s * ex)} ${num(108 + dy * 1.8)}`, "faint");
    }
  }
}
