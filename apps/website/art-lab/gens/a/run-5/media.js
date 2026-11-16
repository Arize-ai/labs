function draw(g, rand, seed, k) {
  // A video player: halftone landscape frame, orange play button, scrubber below
  const { clamp, solid, glow, sdBox, sdPolyline, inPolygon, makeNoise, polyD, num } = k;
  const fbm = makeNoise(seed + 11);

  // Frame and player geometry
  const fx0 = 96, fx1 = 304, fy0 = 60, fy1 = 176;
  const fcx = (fx0 + fx1) / 2, fcy = (fy0 + fy1) / 2, fhw = (fx1 - fx0) / 2, fhh = (fy1 - fy0) / 2;
  const pcx = fcx, pcy = fcy, pr = 17;
  const tri = [[pcx - 6, pcy - 9.5], [pcx - 6, pcy + 9.5], [pcx + 10, pcy]];
  const triClosed = tri.concat([tri[0]]);
  const sdTri = (x, y) => {
    const d = sdPolyline(x, y, triClosed);
    return inPolygon(x, y, tri) ? -d : d;
  };

  // Landscape: sun, back ridge, front ridge
  const ph1 = rand() * 6.28, ph2 = rand() * 6.28;
  const sx = 238 + rand() * 40, sy = 86 + rand() * 8;
  const hb = (x) => 136 - 16 * Math.sin((x - fx0) / 38 + ph1) - 10 * (fbm(x / 18, 3) - 0.5);
  const hf = (x) => 156 - 9 * Math.sin((x - fx0) / 26 + ph2) - 8 * (fbm(x / 14, 9) - 0.5);

  // Scrubber
  const ty = 190, prog = fx0 + (fx1 - fx0) * (0.3 + rand() * 0.3);
  const buf = Math.min(fx1, prog + 30 + rand() * 40);

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // The scrubber knob
    if (Math.abs(y - ty) < 10) {
      const kd = Math.hypot(x - prog, y - ty) - 3;
      ink = Math.max(ink, 0.9 * solid(kd) + 0.18 * glow(kd, 4));
    }
    if (x < fx0 - 2 || x > fx1 + 2 || y < fy0 - 2 || y > fy1 + 2) return [ink, 0];

    const f = solid(sdBox(x, y, fcx, fcy, fhw - 1, fhh - 1));
    const u = (x - fx0) / (fx1 - fx0), v = (y - fy0) / (fy1 - fy0);
    // Sky, brighter toward the upper left
    let t = 0.06 + 0.14 * clamp(1 - (0.6 * u + 0.8 * v));
    const sd = Math.hypot(x - sx, y - sy) - 9;
    t = Math.max(t, 0.7 * solid(sd) + 0.22 * glow(sd, 10));
    const b = hb(x);
    if (y > b) t = 0.42 - 0.12 * clamp((y - b) / 30) - 0.08 * u;
    const fr = hf(x);
    if (y > fr) t = 0.8 - 0.22 * clamp((y - fr) / 40) - 0.1 * u;

    // Clear a disc for the play button
    const dc = Math.hypot(x - pcx, y - pcy) - pr;
    t *= 1 - 0.9 * solid(dc);
    if (dc < 4) {
      const td = sdTri(x, y);
      sig = solid(td) + 0.3 * glow(td, 4) * solid(dc);
    }
    return [Math.max(ink, t * f), sig];
  });

  // Frame
  g.box(fx0, fy0, fx1 - fx0, fy1 - fy0, "ink");

  // Ridge lines, broken around the play button
  const ridge = (fn, stroke) => {
    let seg = [];
    const flush = () => { if (seg.length > 1) g.line(polyD(seg), stroke); seg = []; };
    for (let x = fx0 + 1; x <= fx1 - 1; x += 2) {
      const y = fn(x);
      if (Math.hypot(x - pcx, y - pcy) < pr + 3) flush();
      else seg.push([x, y]);
    }
    flush();
  };
  ridge(hb, "faint");
  ridge(hf, "soft");

  // Play button ring
  const rr = num(pr);
  g.line(`M${num(pcx - pr)} ${num(pcy)}a${rr} ${rr} 0 1 0 ${num(2 * pr)} 0a${rr} ${rr} 0 1 0 ${num(-2 * pr)} 0Z`, "ink", { width: 1.25 });

  // Scrubber: track, buffered, played
  const yl = ty + 0.5;
  g.line(`M${fx0} ${yl}H${fx1}`, "faint");
  g.line(`M${num(prog)} ${yl}H${num(buf)}`, "soft");
  g.line(`M${fx0} ${yl}H${num(prog)}`, "ink", { width: 1.5 });
  g.line(`M${fx0 + 0.5} ${ty - 4}v8M${fx1 - 0.5} ${ty - 4}v8`, "soft");
}
