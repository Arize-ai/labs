function draw(g, rand, seed, k) {
  // A fishing float on still water, a fish circling unseen below
  const { clamp, smooth, solid, inPolygon, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);

  const wy = 118;                       // waterline
  const fx = 200, fy = 116, fr = 9;     // float
  const antTop = 90, antBot = 107;
  const hook = [200, 166];

  // Ripples: three to five rings, spacing varies with the moment after the nibble.
  const nRings = 3 + Math.floor(rand() * 3);
  const base = [22, 44, 70, 98, 128];
  const maxBase = base[nRings - 1];
  let sp = 0.85 + rand() * 0.3;
  sp = Math.min(sp, 112 / maxBase);
  const rings = [];
  for (let i = 0; i < nRings; i++) {
    const rx = base[i] * sp * (1 + (rand() - 0.5) * 0.06);
    const ry = Math.max(3.5, 4 + (rx - 22) * 0.158);
    const tone = nRings > 1 ? 0.45 - 0.3 * (i / (nRings - 1)) : 0.45;
    rings.push({ rx, ry, tone });
  }
  const outerRx = rings[rings.length - 1].rx;

  // Fish: nose about 14 units right of the hook, head toward it, slight tilt.
  // (The brief's centre would put the nose on the hook; the 14-unit gap wins for legibility.)
  const nose = [214 + rand() * 5, 168 + (rand() - 0.5) * 6];
  const tilt = ((rand() - 0.5) * 16) * Math.PI / 180;
  const ca = Math.cos(tilt), sa = Math.sin(tilt);
  const hOf = (u) => {
    const t = clamp(u / 56);
    return 0.6 + 1.4 * t + 8.4 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.85);
  };
  const local = [];
  for (let u = 0; u <= 56; u += 2) local.push([u, -hOf(u)]);
  local.push([72, -10], [64.5, 0], [72, 10]);
  for (let u = 56; u >= 0; u -= 2) local.push([u, hOf(u)]);
  const toWorld = ([u, v]) => [nose[0] + u * ca - v * sa, nose[1] + u * sa + v * ca];
  const fish = local.map(toWorld);
  let fx0 = 1e9, fx1 = -1e9, fy0 = 1e9, fy1 = -1e9;
  for (const [px, py] of fish) {
    fx0 = Math.min(fx0, px); fx1 = Math.max(fx1, px);
    fy0 = Math.min(fy0, py); fy1 = Math.max(fy1, py);
  }

  g.print((x, y) => {
    if (y < antTop - 4) return 0;
    if (y < wy && (x < fx - outerRx - 8 || x > fx + outerRx + 8)) return 0;
    let ink = 0, org = 0;

    // Depth: a gentle gradient under the waterline.
    if (y > wy && x > 84 && x < 316) {
      const t = clamp((y - wy) / 72);
      const edge = smooth(clamp((x - 84) / 14)) * smooth(clamp((316 - x) / 14));
      ink = Math.max(ink, 0.18 * Math.pow(1 - t, 1.2) * edge);
    }

    // Ripples: thin bands along each ellipse, weakening outward.
    const dx = x - fx, dy = y - wy;
    for (const r of rings) {
      const q = Math.hypot(dx / r.rx, dy / r.ry);
      if (q < 0.6 || q > 1.6) continue;
      const gq = Math.hypot(dx / (r.rx * r.rx), dy / (r.ry * r.ry)) / Math.max(q, 1e-6);
      const d = (q - 1) / Math.max(gq, 1e-6);
      const band = Math.exp(-(d / 2.4) * (d / 2.4));
      ink = Math.max(ink, r.tone * band * (0.92 + 0.16 * fbm(x / 9, y / 3)));
    }

    // Fish: dim, soft, inferred.
    if (x > fx0 - 2 && x < fx1 + 2 && y > fy0 - 2 && y < fy1 + 2 && inPolygon(x, y, fish)) {
      const lx = x - nose[0], ly = y - nose[1];
      const u = lx * ca + ly * sa, v = -lx * sa + ly * ca;
      let tone;
      if (u < 56) {
        const s = clamp((v / hOf(u) + 1) / 2);
        tone = 0.3 - 0.15 * s;
        tone += (0.15 - tone) * smooth(clamp((u - 38) / 18));
      } else tone = 0.15;
      ink = Math.max(ink, tone + 0.04 * (fbm(x / 7, y / 7) - 0.5));
    }

    // Hook glint.
    const hd = Math.hypot(x - hook[0], y - hook[1]) - 2.2;
    if (hd < 4) ink = Math.max(ink, 0.5 * solid(hd));

    // Float: sphere lit from the upper left, with a tight glow.
    const rr = Math.hypot(x - fx, y - fy);
    if (rr < 26) {
      const d = rr - fr;
      if (d < 2) {
        const p = ((x - fx) + (y - fy)) / (fr * Math.SQRT2);
        const shade = (1 - 0.4 * clamp((p + 1) / 2)) * solid(d);
        if (y < wy) org = Math.max(org, shade);
        else ink = Math.max(ink, shade);
      }
      if (d > 0) {
        const halo = 0.5 * (1 - smooth(clamp(d / (26 - fr))));
        ink = Math.max(ink, y < wy ? halo : halo * 0.6);
      }
    }

    // Antenna: the signal, in orange.
    if (Math.abs(x - fx) < 2.2 && y > antTop && y < antBot + 1) org = Math.max(org, 0.9);

    if (org > 0) return [y < wy && rr < fr + 2 ? 0 : ink, org];
    return ink;
  });

  // Ripple lines, broken where the float sits.
  const ellipseSegs = (rx, ry) => {
    const segs = []; let cur = [];
    const n = 160;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = fx + rx * Math.cos(a), py = wy + ry * Math.sin(a);
      if (Math.hypot(px - fx, py - fy) < fr + 1.5) {
        if (cur.length > 1) segs.push(cur);
        cur = [];
      } else cur.push([px, py]);
    }
    if (cur.length > 1) segs.push(cur);
    return segs;
  };
  rings.forEach((r, i) => {
    for (const s of ellipseSegs(r.rx, r.ry)) {
      if (i < 2) g.line(polyD(s), "soft");
      else g.line(polyD(s), "faint", { dash: "2 3" });
    }
  });

  // Waterline, broken across the float.
  g.line(`M84 ${wy + 0.5}H${fx - fr - 1}M${fx + fr + 1} ${wy + 0.5}H316`, "ink");

  // Fishing line above water, toward the unseen rod.
  g.line(`M${fx} ${antTop}L96 58`, "faint");

  // Line below water and the J hook.
  g.line(`M${fx + 0.5} ${fy + fr}V${hook[1]}a2.6 2.6 0 0 1 -5.2 0v-1.8`, "soft");

  // Fish outline: inferred, not seen.
  g.line(polyD(fish, true), "faint", { dash: "3 3" });

  // Float outline and antenna.
  g.line(`M${fx - fr} ${fy}a${fr} ${fr} 0 1 0 ${2 * fr} 0a${fr} ${fr} 0 1 0 ${-2 * fr} 0`, "ink");
  g.line(`M${num(fx + 0.5)} ${antBot}V${antTop}`, "sig", { width: 1.2 });
}
