function draw(g, rand, seed, k) {
  // A forecast fan opening from a single point marked "now"
  const { clamp, smooth, solid, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  const ax = 172, ay = 128, rx = 314;
  const span = rx - ax;
  // Cone and inner band edges as functions of x.
  const coneU = (x) => ay - 66 * (x - ax) / span;
  const coneL = (x) => ay + 62 * (x - ax) / span;
  const bandU = (x) => ay - 28 * (x - ax) / span;
  const bandL = (x) => ay + 28 * (x - ax) / span;

  // Past track: a measured trace with small wobbles, ends pinned.
  const track = [];
  const tn = 36;
  for (let i = 0; i <= tn; i++) {
    const u = i / tn;
    const x = 88 + (ax - 88) * u;
    const taper = Math.sqrt(Math.sin(Math.PI * u));
    const wob = (fbm(i * 0.35, 3.7 + (seed % 17)) - 0.5) * 9 + (rand() - 0.5) * 1.4;
    track.push([x, 158 + (ay - 158) * u + wob * taper]);
  }
  track[tn] = [ax, ay];

  // Seven sample paths, spread across the cone, kept inside it.
  const paths = [];
  for (let i = 0; i < 7; i++) {
    const end = clamp(72 + i * (110 / 6) + (rand() - 0.5) * 10, 70, 184);
    const b1 = (rand() - 0.5) * 14;
    const b2 = (rand() - 0.5) * 6;
    const pts = [];
    for (let x = ax; x <= 310.01; x += 4) {
      const t = (x - ax) / (310 - ax);
      let y = ay + (end - ay) * t + b1 * 4 * t * (1 - t) + b2 * Math.sin(2 * Math.PI * t) * t;
      y = clamp(y, coneU(x) + 1.5, coneL(x) - 1.5);
      pts.push([x, y]);
    }
    pts[0] = [ax, ay];
    paths.push({ pts, rank: Math.abs(i - 3) });
  }

  g.print((x, y) => {
    const r = Math.hypot(x - ax, y - ay);
    const glowInk = r < 14 ? 0.9 * smooth(clamp(1 - r / 14)) : 0;
    const orange = solid(r - 4);
    if (x < ax || x > rx + 4 || y < 58 || y > 194) return [glowInk, orange];

    let ink = 0;
    const t = clamp((x - ax) / span);
    const uC = coneU(x), lC = coneL(x);
    if (y > uC - 3 && y < lC + 3) {
      const dCone = Math.max(uC - y, y - lC) * 0.9;
      ink = (0.45 - 0.33 * t) * solid(dCone);
      const dBand = Math.max(bandU(x) - y, y - bandL(x)) * 0.97;
      const band = (0.7 - 0.4 * t) * solid(dBand);
      ink = Math.max(ink, band);
    }
    return [Math.max(ink, glowInk), orange];
  });

  // Now marker.
  g.line(`M${ax + 0.5} 60V192`, "faint", { dash: "4 3" });
  // Inner band edges.
  g.line(polyD([[ax, ay], [rx, 100]]), "faint");
  g.line(polyD([[ax, ay], [rx, 156]]), "faint");
  // Sample paths, a touch weaker the further from the median.
  for (const p of paths) g.line(polyD(p.pts), "faint", { width: 1 - 0.1 * p.rank });
  // Cone edges.
  g.line(polyD([[ax, ay], [rx, 62]]), "soft");
  g.line(polyD([[ax, ay], [rx, 190]]), "soft");
  // Median path.
  g.line(polyD([[ax, ay], [rx, 126]]), "soft", { dash: "4 3" });
  // Past track.
  g.line(polyD(track), "ink");
  // The present point, crisp in orange over its dots.
  g.line(`M${ax - 4} ${ay}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z`, "sig", { width: 1.5 });
}
