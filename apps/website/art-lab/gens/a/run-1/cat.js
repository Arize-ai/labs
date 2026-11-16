function draw(g, rand, seed, k) {
  // A sitting cat watches an orange laser dot on the floor
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const fbm = k.makeNoise(seed + 11);
  const floor = 190;
  const cx = 178 + rand() * 6;
  const tilt = (rand() - 0.5) * 4;

  // Head, body and ears as signed distances.
  const hx = cx + tilt * 0.5, hy = 102, hr = 25;
  const bx = cx, by = 156, brx = 36, bry = 34;
  const earL = [[hx - 21, hy - 10], [hx - 17 + tilt, hy - 40], [hx - 3, hy - 22]];
  const earR = [[hx + 3, hy - 22], [hx + 17 + tilt, hy - 40], [hx + 21, hy - 10]];
  const sdPoly = (x, y, p) => {
    const d = sdPolyline(x, y, p.concat([p[0]]));
    return inPolygon(x, y, p) ? -d : d;
  };
  const smin = (a, b, r) => {
    const h = clamp(0.5 + (0.5 * (b - a)) / r);
    return b + (a - b) * h - r * h * (1 - h);
  };
  const sdEll = (x, y, ex, ey, rx, ry) => (Math.hypot((x - ex) / rx, (y - ey) / ry) - 1) * Math.min(rx, ry);
  const catD = (x, y) => {
    const head = Math.hypot(x - hx, y - hy) - hr;
    const body = sdEll(x, y, bx, by, brx, bry);
    let d = smin(head, body, 12);
    d = smin(d, sdPoly(x, y, earL), 3);
    return smin(d, sdPoly(x, y, earR), 3);
  };

  // The tail: a cubic curling up the right side.
  const cub = (a, b, c, e, t) => {
    const u = 1 - t;
    return [
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * e[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * e[1],
    ];
  };
  const t0 = [cx + 24, floor - 3], t1 = [cx + 68, floor + 4], t2 = [cx + 80, floor - 34], t3 = [cx + 60, floor - 54];
  const tail = Array.from({ length: 25 }, (_, i) => cub(t0, t1, t2, t3, i / 24));
  const tw = (i) => 4.6 - 1.6 * (i / 24);

  // Eyes: almond holes, looking toward the dot.
  const eyes = [[hx - 9, hy - 1], [hx + 9, hy - 1]];
  const dot = [272 + rand() * 26, floor - 1];

  g.print((x, y) => {
    let ink = 0;
    if (x > cx - 70 && x < cx + 110 && y > 45 && y < floor + 12) {
      const d = catD(x, y);
      let tdd = Infinity;
      if (x > cx + 10 && y > floor - 66) {
        for (let i = 1; i < tail.length; i++) {
          const dd = sdPolyline(x, y, [tail[i - 1], tail[i]]) - tw(i);
          if (dd < tdd) tdd = dd;
        }
      }
      const s = Math.min(d, tdd);
      // Lit from the upper left.
      const shade = 0.95 - 0.3 * clamp((x - (cx - 40) + (y - 70)) / 170);
      const fur = 0.06 * (fbm(x / 6, y / 6) - 0.5);
      ink = solid(s) * (shade + fur) + 0.2 * glow(s, 8);
      for (const [ex, ey] of eyes) ink *= 1 - solid(sdEll(x, y, ex, ey, 5, 3.2));
    }
    // Soft pool of light on the floor under the cat.
    if (y > floor) ink = Math.max(ink, 0.18 * Math.exp(-Math.abs(x - cx) / 40) * Math.exp(-(y - floor) / 5));
    const ld = Math.hypot(x - dot[0], y - dot[1]) - 3;
    return [ink, solid(ld) + 0.45 * glow(ld, 7)];
  });

  // Silhouette outline, traced radially from inside the cat.
  const oc = [cx, 128], out = [];
  for (let a = 0; a < 200; a++) {
    const th = (a / 200) * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
    let r = 120;
    while (r > 0 && catD(oc[0] + dx * r, oc[1] + dy * r) > 0) r -= 1;
    let lo = r, hi = r + 1;
    for (let it = 0; it < 8; it++) {
      const m = (lo + hi) / 2;
      if (catD(oc[0] + dx * m, oc[1] + dy * m) < 0) lo = m; else hi = m;
    }
    out.push([oc[0] + dx * lo, Math.min(oc[1] + dy * lo, floor)]);
  }
  g.line(polyD(out, true), "ink", { width: 1.25 });

  // Tail outline: both edges and the rounded tip.
  const edge = (sgn) => tail.map((p, i) => {
    const q = tail[Math.min(i + 1, 24)], o = tail[Math.max(i - 1, 0)];
    const ddx = q[0] - o[0], ddy = q[1] - o[1], l = Math.hypot(ddx, ddy) || 1;
    return [p[0] + (sgn * -ddy * tw(i)) / l, p[1] + (sgn * ddx * tw(i)) / l];
  });
  const a = edge(1), b = edge(-1).reverse();
  g.line(polyD(a.concat(b)), "ink", { width: 1.25 });

  // Face: eyes with slit pupils turned toward the dot, nose, whiskers.
  for (const [ex, ey] of eyes) {
    g.line(`M${num(ex - 5)} ${num(ey)}Q${num(ex)} ${num(ey - 4.6)} ${num(ex + 5)} ${num(ey)}Q${num(ex)} ${num(ey + 4.6)} ${num(ex - 5)} ${num(ey)}Z`, "ink");
    g.line(`M${num(ex + 1.8)} ${num(ey - 2.4)}V${num(ey + 2.4)}`, "ink", { width: 1.5 });
  }
  const nx = hx, ny = hy + 8;
  g.line(`M${num(nx - 2.5)} ${num(ny)}H${num(nx + 2.5)}L${num(nx)} ${num(ny + 2.5)}Z`, "soft", { fill: true });
  for (const s of [-1, 1]) for (const w of [-2, 1.5]) {
    g.line(`M${num(nx + s * 6)} ${num(ny + 3)}L${num(nx + s * 34)} ${num(ny + 3 + w * 2.2)}`, "soft");
  }

  // The floor, and the dotted line of the cat's gaze to the dot.
  g.line(`M${k.X0} ${floor + 0.5}H${k.X1}`, "faint");
  const ge = eyes[1];
  g.line(`M${num(ge[0] + 6)} ${num(ge[1] + 2)}L${num(dot[0] - 5)} ${num(dot[1] - 4)}`, "faint", { dash: "1 3" });
}
