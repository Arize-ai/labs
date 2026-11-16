function draw(g, rand, seed, k) {
  // A forecast fan opening from a single bright "now"
  const { clamp, smooth, solid, glow, sdPolyline, polyD } = k;
  const ax = 182, ay = 124, ex = 314, span = ex - ax;

  // Past track: (88,152) to the apex, with 7 jittered kinks, rising overall.
  const track = [[88, 152]];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const f = (i + (rand() - 0.5) * 0.6) / (n + 1);
    const x = 88 + (ax - 88) * f;
    const y = 152 + (ay - 152) * f + (rand() * 2 - 1) * 6;
    track.push([x, y]);
  }
  track.push([ax, ay]);
  const tx0 = 84, tx1 = ax + 4;
  let tyMin = Infinity, tyMax = -Infinity;
  for (const p of track) { tyMin = Math.min(tyMin, p[1]); tyMax = Math.max(tyMax, p[1]); }

  // Cone asymmetry: median tilt and edge stretch, kept clear of the ground.
  const medEnd = 108 + rand() * 22;
  const upEnd = Math.max(52, 60 - (rand() * 2 - 1) * 10);
  const loEnd = Math.min(194, 190 + (rand() * 2 - 1) * 10);
  const shift = (medEnd - 118) * 0.5;
  const inUpEnd = 96 + shift, inLoEnd = 152 + shift;
  const medBend = (rand() * 2 - 1) * 4;
  const bow = 7, inBow = 3;

  const lerp = (a, b, t) => a + (b - a) * t;
  const upper = (t) => lerp(ay, upEnd, t) - bow * Math.sin(Math.PI * t);
  const lower = (t) => lerp(ay, loEnd, t) + bow * Math.sin(Math.PI * t);
  const inUp = (t) => lerp(ay, inUpEnd, t) - inBow * Math.sin(Math.PI * t);
  const inLo = (t) => lerp(ay, inLoEnd, t) + inBow * Math.sin(Math.PI * t);
  const median = (t) => lerp(ay, medEnd, t) + medBend * Math.sin(Math.PI * t);

  g.print((x, y) => {
    let ink = 0, org = 0;

    // Present point and its tight orange glow.
    const r = Math.hypot(x - ax, y - ay);
    if (r < 22) {
      if (r <= 4) org = 1;
      else if (r < 14) org = 1 - 0.7 * smooth((r - 4) / 10);
      else org = 0.3 * glow(r - 14, 2);
      org = Math.max(org, solid(r - 4));
    }

    // Past track halo.
    if (x > tx0 && x < tx1 && y > tyMin - 10 && y < tyMax + 10) {
      const d = sdPolyline(x, y, track);
      ink = Math.max(ink, 0.3 * solid(d - 3));
    }

    // The fan.
    if (x >= ax && x <= ex + 3) {
      const t = clamp((x - ax) / span);
      const yu = upper(t), yl = lower(t);
      const dOut = Math.max(yu - y, y - yl);
      if (dOut < 4) {
        const iu = inUp(t), il = inLo(t);
        const dIn = Math.max(iu - y, y - il);
        const ts = smooth(t);
        const innerTone = lerp(0.75, 0.35, ts);
        const outerTone = lerp(0.45, 0.1, ts);
        const sIn = solid(dIn);
        const tone = solid(dOut) * (outerTone + (innerTone - outerTone) * sIn);
        ink = Math.max(ink, tone);
      }
    }

    return [ink, org];
  });

  // Fan edges and median as sampled curves.
  const sample = (fn, t0 = 0) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = t0 + (1 - t0) * (i / 40);
      pts.push([ax + span * t, fn(t)]);
    }
    return pts;
  };
  g.line(polyD(sample(upper)), "soft");
  g.line(polyD(sample(lower)), "soft");
  g.line(polyD(sample(inUp)), "faint");
  g.line(polyD(sample(inLo)), "faint");
  g.line(polyD(sample(median, 9 / span)), "soft", { dash: "4 3" });

  // Ground baseline.
  g.line(`M88 200.5H314`, "faint");

  // Past track.
  g.line(polyD(track), "ink");

  // Present: ring around the disc, in orange.
  g.line(`M${ax + 6} ${ay}A6 6 0 1 0 ${ax - 6} ${ay}A6 6 0 1 0 ${ax + 6} ${ay}Z`, "sig");
}
