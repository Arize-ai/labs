function draw(g, rand, seed, k) {
  // A video frame showing a landscape, with a scrubber and an orange playhead
  const { P, clamp, sdBox, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const fx0 = 100, fx1 = 300, fy0 = 58, fy1 = 170;
  const fcx = (fx0 + fx1) / 2, fcy = (fy0 + fy1) / 2, fhw = (fx1 - fx0) / 2, fhh = (fy1 - fy0) / 2;
  const ph = rand() * 50;

  // Two ridgelines, sampled once per unit across the frame.
  const far = [], near = [];
  for (let x = fx0; x <= fx1; x++) {
    far.push(clamp(108 - 44 * (fbm(x / 46 + ph, 3.1) - 0.3), fy0 + 14, fy1));
    near.push(clamp(142 - 34 * (fbm(x / 30 + ph + 9, 7.7) - 0.3), fy0 + 30, fy1));
  }
  const at = (arr, x) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(x - fx0)))];

  // The sun, behind the hills.
  const sx = fx0 + 46 + rand() * 108, sy = fy0 + 24 + rand() * 8, sr = 9;

  // The scrubber below the frame.
  const ty = 186;
  const px = Math.round(fx0 + (fx1 - fx0) * (0.3 + 0.45 * rand()));

  const mix = (a, b, t) => a + (b - a) * t;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    const fd = sdBox(x, y, fcx, fcy, fhw, fhh);
    if (fd < P) {
      const u = clamp((x - fx0) / (fx1 - fx0)), v = clamp((y - fy0) / (fy1 - fy0));
      // Sky, brighter toward the upper left.
      let t = 0.12 + 0.16 * (1 - v) * (1 - 0.5 * u);
      const sd = Math.hypot(x - sx, y - sy) - sr;
      t = Math.max(t, solid(sd) * 0.95 + 0.32 * glow(sd, 8));
      const r1 = at(far, x), r2 = at(near, x);
      t = mix(t, 0.4 * (1 - 0.3 * u), solid(r1 - y));
      // Near hills catch the light at their crest.
      const crest = clamp((y - r2) / 34);
      t = mix(t, (0.78 - 0.3 * crest) * (1 - 0.2 * u), solid(r2 - y));
      ink = t * solid(fd);
    } else {
      ink = 0.1 * glow(fd, 10);
    }
    if (Math.abs(y - ty) < 16) {
      const bd = sdBox(x, y, (fx0 + px) / 2, ty, (px - fx0) / 2, 1.2);
      ink = Math.max(ink, 0.7 * solid(bd));
      const hd = Math.hypot(x - px, y - ty) - 4;
      sig = solid(hd) + 0.4 * glow(hd, 6);
    }
    return [ink, sig];
  });

  // The frame and the near ridge.
  g.box(fx0, fy0, fx1 - fx0, fy1 - fy0, "ink");
  const ridge = near.map((y, i) => [fx0 + i, y]).filter((_, i) => i % 3 === 0 || i === near.length - 1);
  g.line(polyD(ridge), "soft");

  // A play button over the image.
  const r = 15;
  g.line(`M${num(fcx - r)} ${num(fcy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, "soft");
  g.line(`M${num(fcx - 4.5)} ${num(fcy - 7)}L${num(fcx + 7.5)} ${num(fcy)}L${num(fcx - 4.5)} ${num(fcy + 7)}Z`, "ink", { width: 1.25 });

  // The timeline: played part, remaining track, ticks, playhead.
  g.line(`M${fx0} ${ty + 0.5}H${px}`, "soft");
  g.line(`M${px + 6} ${ty + 0.5}H${fx1}`, "faint");
  for (let x = fx0; x <= fx1; x += 25) {
    const xx = Math.round(x) + 0.5;
    g.line(`M${xx} ${ty + 5}v3`, "faint");
  }
  g.line(`M${px - 6.5} ${ty}a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0Z`, "sig");
}
