function draw(g, rand, seed, k) {
  // A ray of light bending through a glass slab
  const { clamp, smooth, solid, sdBox, polyD } = k;

  // Variation: slab tilt and the cloudiness of the glass.
  const tilt = (rand() * 12 - 6) * Math.PI / 180;
  const hazeT = 0.12 + rand() * 0.16;
  const hazeW = 8 + rand() * 8;

  const cx = 200, cy = 135, hw = 80, hh = 30;
  const ca = Math.cos(tilt), sa = Math.sin(tilt);
  const toWorld = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const toLocal = (x, y) => {
    const dx = x - cx, dy = y - cy;
    return [dx * ca + dy * sa, -dx * sa + dy * ca];
  };

  // Fixed source and incoming direction (as in the brief).
  const src = [96, 62], srcR = 5;
  const d0 = [74, 43];
  const d0l = Math.hypot(d0[0], d0[1]);
  const dir = [d0[0] / d0l, d0[1] / d0l];

  // Refractive index chosen so the untilted slab matches the brief exactly.
  const sinI0 = 74 / d0l, sinT0 = 30 / Math.hypot(30, 60);
  const n = sinI0 / sinT0;

  // Work in the slab's frame, where its faces are horizontal.
  const sL = toLocal(src[0], src[1]);
  const dL = [dir[0] * ca + dir[1] * sa, -dir[0] * sa + dir[1] * ca];
  const tIn = (-hh - sL[1]) / dL[1];
  const entL = [sL[0] + dL[0] * tIn, -hh];
  const sinT = clamp(dL[0] / n, -0.99, 0.99);
  const rL = [sinT, Math.sqrt(1 - sinT * sinT)];
  const tR = (2 * hh) / rL[1];
  const exL = [entL[0] + rL[0] * tR, hh];

  const entry = toWorld(entL[0], entL[1]);
  const exit = toWorld(exL[0], exL[1]);
  const outEnd = [exit[0] + dir[0] * 53, exit[1] + dir[1] * 53];
  // Reflection: mirror the local direction about the face.
  const reflL = [entL[0] + dL[0] * 40, entL[1] - dL[1] * 40];
  const reflEnd = toWorld(reflL[0], reflL[1]);
  const contEnd = [entry[0] + dir[0] * 60, entry[1] + dir[1] * 60];
  const nIn = [toWorld(entL[0], entL[1] - 20), toWorld(entL[0], entL[1] + 20)];
  const nOut = [toWorld(exL[0], exL[1] - 20), toWorld(exL[0], exL[1] + 20)];
  const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([u, v]) => toWorld(u, v));

  // Distance to a segment, with the parameter along it.
  const seg = (x, y, a, b) => {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const t = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy));
    return [Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t), t];
  };

  g.print((x, y) => {
    if (x < 58 || x > 300 || y < 26 || y > 212) return 0;
    let ink = 0, org = 0;

    // Point source: bright disc with a generous glow.
    const sd = Math.hypot(x - src[0], y - src[1]);
    ink = Math.max(ink, solid(sd - srcR), 0.75 * (1 - smooth(clamp((sd - srcR) / 25))));

    // Incoming ray.
    const [di] = seg(x, y, src, entry);
    ink = Math.max(ink, 0.7 * solid(di - 3));

    // Slab body.
    const [lu, lv] = toLocal(x, y);
    const inSlab = sdBox(lu, lv, 0, 0, hw, hh);
    if (inSlab < 2) {
      const t = 0.5 * clamp((lu + hw) / (2 * hw)) + 0.5 * clamp((lv + hh) / (2 * hh));
      let body = 0.3 - 0.18 * t;
      if (lv < -hh + 4) body = 0.45;
      const [dr] = seg(x, y, entry, exit);
      body += hazeT * Math.exp(-(dr * dr) / (hazeW * hazeW));
      const m = solid(inSlab);
      ink = Math.max(ink, clamp(body) * m);
      org = 0.9 * solid(dr - 2.5) * m;
    }

    // Outgoing ray, fading toward its end.
    const [dout, tout] = seg(x, y, exit, outEnd);
    ink = Math.max(ink, 0.45 * (1 - 0.75 * tout) * solid(dout - 3));

    // Weak reflection.
    const [drf] = seg(x, y, entry, reflEnd);
    ink = Math.max(ink, 0.2 * solid(drf - 2.5));

    return [ink, org];
  });

  // Slab outline, top face at full strength.
  g.line(polyD(corners, true), "soft");
  g.line(polyD([corners[0], corners[1]]), "ink");

  // Normals and the undeviated path.
  g.line(polyD(nIn), "faint", { dash: "2 3" });
  g.line(polyD(nOut), "faint", { dash: "2 3" });
  g.line(polyD([entry, contEnd]), "faint", { dash: "1 3" });

  // Rays.
  g.line(polyD([src, entry]), "ink");
  g.line(polyD([entry, exit]), "sig", { width: 1.5 });
  g.line(polyD([exit, outEnd]), "soft");
  g.line(polyD([entry, reflEnd]), "faint", { dash: "4 3" });
}
