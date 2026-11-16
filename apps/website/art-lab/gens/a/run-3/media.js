function draw(g, rand, seed, k) {
  // A video frame with an orange play button and a scrub timeline
  const { clamp, sdBox, sdPolyline, inPolygon, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);

  // The frame: 16:9, centred in the figure box.
  const cx = 200, cy = 106, hw = 88, hh = 49.5;
  const fx0 = cx - hw, fx1 = cx + hw, fy0 = cy - hh, fy1 = cy + hh;

  // A still on the screen: a low ridge of hills across the lower third.
  const ph = rand() * 6, amp = 6 + rand() * 6;
  const ridge = (x) => fy1 - 26 - amp * Math.sin((x - fx0) / 30 + ph) - 5 * (fbm(x / 14, 3.3) - 0.5) * 2;
  const ridgePts = [];
  for (let x = fx0 + 2; x <= fx1 - 2; x += 2) ridgePts.push([x, ridge(x)]);

  // The play button: a dark disc with an orange triangle.
  const br = 22;
  const tri = [[cx - 7, cy - 12], [cx - 7, cy + 12], [cx + 13, cy]];
  const triClosed = tri.concat([tri[0]]);

  // The timeline under the frame.
  const ty = fy1 + 20;
  const prog = 0.28 + rand() * 0.3;
  const px = fx0 + (fx1 - fx0) * prog;
  const buf = Math.min(fx1, px + 24 + rand() * 30);

  g.print((x, y) => {
    let ink = 0, sig = 0;

    // Screen fill, lit from the upper left.
    const d = sdBox(x, y, cx, cy, hw, hh, 3);
    if (d < 40) {
      const u = (x - fx0) / (2 * hw), v = (y - fy0) / (2 * hh);
      let tone = 0.62 - 0.3 * clamp(0.6 * u + 0.4 * v);
      if (y > ridge(x)) tone = Math.max(0, tone - 0.22 + 0.06 * clamp((y - ridge(x)) / 20));
      const bd = Math.hypot(x - cx, y - cy) - br;
      if (bd < 0) tone = 0.1;
      else tone *= clamp(bd / 4 + 0.2);
      ink = solid(d) * tone + 0.16 * glow(d, 7);
    }

    // The triangle.
    if (Math.abs(x - cx - 3) < 30 && Math.abs(y - cy) < 30) {
      const e = sdPolyline(x, y, triClosed);
      const td = inPolygon(x, y, tri) ? -e : e;
      sig = solid(td) + 0.38 * glow(td, 5);
    }

    // Progress bar and playhead.
    if (Math.abs(y - ty) < 16) {
      const pd = sdBox(x, y, (fx0 + px) / 2, ty, (px - fx0) / 2, 1.4);
      ink = Math.max(ink, 0.85 * solid(pd));
      const hd = Math.hypot(x - px, y - ty) - 3.5;
      ink = Math.max(ink, 0.95 * solid(hd) + 0.25 * glow(hd, 5));
    }
    return [ink, sig];
  });

  // Structure: the frame, an inset, the ridge, the button ring.
  g.box(fx0, fy0, 2 * hw, 2 * hh, "ink");
  g.box(fx0 + 4, fy0 + 4, 2 * hw - 8, 2 * hh - 8, "faint");
  g.line(polyD(ridgePts), "soft");
  g.line(`M${cx - br} ${cy}a${br} ${br} 0 1 0 ${2 * br} 0a${br} ${br} 0 1 0 ${-2 * br} 0Z`, "soft");
  g.line(polyD(tri, true), "sig", { width: 1.25 });

  // Timeline: played, buffered, remaining.
  const ly = Math.round(ty) + 0.5;
  g.line(`M${num(px)} ${ly}H${num(buf)}`, "soft", { dash: "1 3" });
  g.line(`M${num(buf)} ${ly}H${fx1}`, "faint");
  for (let t = 0; t <= 4; t++) {
    const x = Math.round(fx0 + ((fx1 - fx0) * t) / 4) + 0.5;
    g.line(`M${x} ${ly + 5}v3`, "faint");
  }
  g.line(`M${num(px - 3.5)} ${num(ty)}a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z`, "ink");
}
