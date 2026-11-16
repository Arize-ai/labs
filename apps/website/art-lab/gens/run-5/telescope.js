function draw(g, rand, seed, k) {
  // A refracting telescope on a tripod, aimed at one orange star
  const { clamp, sdBox, sdPolyline, solid, glow, polyD, num } = k;
  const th = -((26 + rand() * 6) * Math.PI) / 180;
  const ax = Math.cos(th), ay = Math.sin(th);
  const cx = 186, cy = 136;
  const L = 60;
  const toW = (u, v) => [cx + u * ax + v * ay, cy + u * ay - v * ax];
  const toL = (x, y) => [(x - cx) * ax + (y - cy) * ay, (x - cx) * ay - (y - cy) * ax];
  const hwTube = (u) => 6 + 2.5 * clamp((u + L) / (2 * L));
  const seg = (u, v, u0, u1, hw, off = 0) => sdBox(u, v, (u0 + u1) / 2, off, (u1 - u0) / 2, hw);

  const star = toW(L + 66, 0);
  const hub = toW(0, -hwTube(0) - 5);
  const feet = [[hub[0] - 42, 192], [hub[0] + 38, 192], [hub[0] + 6, 184]];
  const legs = feet.map((f) => [hub, f]);

  // A few faint background stars, away from the instrument.
  const bg = [];
  for (let i = 0; i < 6; i++) {
    const p = [100 + rand() * 200, 62 + rand() * 40];
    if (Math.hypot(p[0] - star[0], p[1] - star[1]) > 24 && toL(p[0], p[1])[1] > 22) bg.push(p);
  }

  g.print((x, y) => {
    let ink = 0, sig = 0;
    const sd = Math.hypot(x - star[0], y - star[1]) - 3;
    if (sd < 40) sig = solid(sd) + 0.42 * glow(sd, 8);
    for (const p of bg) {
      const d = Math.hypot(x - p[0], y - p[1]) - 1.2;
      if (d < 4) ink = Math.max(ink, 0.32 * solid(d));
    }
    if (x < 100 || x > 280 || y < 70 || y > 198) return [ink, sig];
    const [u, v] = toL(x, y);
    const shade = (hw) => 0.72 + 0.25 * clamp((v / hw + 1) / 2);
    const uc = clamp(u, -L, L);
    const dTube = seg(u, v, -L, L, hwTube(uc));
    const dDew = seg(u, v, L - 14, L + 6, 10);
    const dEye = seg(u, v, -L - 14, -L, 3.5);
    const dFoc = seg(u, v, -L - 4, -L + 2, 5);
    const dFind = seg(u, v, -8, 22, 2.6, 15);
    const dHub = Math.hypot(x - hub[0], y - hub[1]) - 4.5;
    const body = Math.min(dTube, dDew, dEye, dFoc, dFind, dHub);
    ink = Math.max(ink, 0.18 * glow(body, 7));
    ink = Math.max(ink, solid(dTube) * 0.82 * shade(hwTube(uc)));
    ink = Math.max(ink, solid(dDew) * 0.95 * shade(10));
    ink = Math.max(ink, solid(dFoc) * 0.75, solid(dEye) * 0.6);
    ink = Math.max(ink, solid(dFind) * 0.55, solid(dHub) * 0.8);
    if (y > hub[1] - 2) {
      let ld = Infinity;
      for (const l of legs) ld = Math.min(ld, sdPolyline(x, y, l));
      ink = Math.max(ink, 0.2 * glow(ld, 3));
    }
    return [ink, sig];
  });

  // Line of sight from the objective to the star.
  const obj = toW(L + 6, 0);
  g.line(polyD([obj, toW(L + 60, 0)]), "faint", { dash: "1 3" });

  // Legs: back leg soft, front legs in ink.
  g.line(polyD(legs[2]), "soft", { width: 1.25 });
  g.line(polyD(legs[0]), "ink", { width: 1.5 });
  g.line(polyD(legs[1]), "ink", { width: 1.5 });

  const rect = (u0, u1, hw0, hw1, off = 0) =>
    polyD([toW(u0, off - hw0), toW(u1, off - hw1), toW(u1, off + hw1), toW(u0, off + hw0)], true);
  g.line(rect(-L, L, hwTube(-L), hwTube(L)), "ink");
  g.line(rect(L - 14, L + 6, 10, 10), "ink");
  g.line(rect(-L - 4, -L + 2, 5, 5), "soft");
  g.line(rect(-L - 14, -L - 4, 3.5, 3.5), "soft");
  g.line(rect(-8, 22, 2.6, 2.6, 15), "soft");
  // Finder brackets and tube bands.
  for (const u of [-2, 16]) g.line(polyD([toW(u, hwTube(u)), toW(u, 12.4)]), "soft");
  for (const u of [-24, 24]) g.line(polyD([toW(u, -hwTube(u)), toW(u, hwTube(u))]), "faint");
  const r = num(4.5);
  g.line(`M${num(hub[0] - 4.5)} ${num(hub[1])}a${r} ${r} 0 1 0 9 0a${r} ${r} 0 1 0 -9 0Z`, "ink", { fill: true });
}
