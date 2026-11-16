function draw(g, rand, seed, k) {
  // A video frame with a play button and a scrubber, playhead orange
  const { clamp, solid, glow, sdBox, sdPolyline, inPolygon, makeNoise, num } = k;
  const fbm = makeNoise(seed + 11);

  // The screen: 16:9, centred in the figure box.
  const cx = 200, cy = 112, hw = 100, hh = 56, r = 5;
  const sx0 = cx - hw, sx1 = cx + hw, sy0 = cy - hh, sy1 = cy + hh;

  // The placeholder image: two rolling hills across the lower part of the frame.
  const ph = rand() * 6, ph2 = rand() * 6;
  const hillA = (x) => sy1 - 30 - 9 * Math.sin((x - sx0) / 34 + ph);
  const hillB = (x) => sy1 - 16 - 6 * Math.sin((x - sx0) / 22 + ph2);

  // The play button: a ring with a triangle set slightly right of centre.
  const pr = 21;
  const tri = [[cx - 7, cy - 11], [cx + 12, cy], [cx - 7, cy + 11]];
  const triClosed = tri.concat([tri[0]]);

  // The scrubber under the frame, and the playhead.
  const ty = 184, tx0 = sx0, tx1 = sx1;
  const u = 0.32 + rand() * 0.36;
  const hx = tx0 + (tx1 - tx0) * u;

  g.print((x, y) => {
    let ink = 0, sig = 0;

    if (x > sx0 - 30 && x < sx1 + 30 && y > sy0 - 30 && y < sy1 + 30) {
      const d = sdBox(x, y, cx, cy, hw, hh, r);
      // Lit from the upper left: the frame brightens toward its top-left corner.
      const lx = (x - sx0) / (2 * hw), ly = (y - sy0) / (2 * hh);
      const shade = clamp(1 - (0.6 * lx + 0.4 * ly));
      let fill = 0.2 + 0.3 * shade;
      if (y > hillA(x)) fill += 0.18;
      if (y > hillB(x)) fill += 0.14;
      fill += 0.06 * (fbm(x / 14, y / 14) - 0.5);

      // Knock the button out of the frame, then print the triangle solid.
      const dc = Math.hypot(x - cx, y - cy) - pr;
      const hole = solid(dc);
      let screen = solid(d) * fill * (1 - hole);
      if (dc < 2) {
        const td0 = sdPolyline(x, y, triClosed);
        const td = inPolygon(x, y, tri) ? -td0 : td0;
        screen = Math.max(screen, 0.95 * solid(td));
      }
      ink = Math.max(screen, 0.14 * glow(d, 8));
    }

    if (Math.abs(y - ty) < 18) {
      // Played portion of the track as a solid bar.
      const bw = (hx - tx0) / 2;
      const bd = sdBox(x, y, tx0 + bw, ty, bw, 1.2);
      ink = Math.max(ink, 0.85 * solid(bd));
      const pd = Math.hypot(x - hx, y - ty) - 4;
      sig = solid(pd) + 0.4 * glow(pd, 6);
    }
    return [ink, sig];
  });

  // The frame outline, rounded, on the half pixel.
  const a0 = Math.round(sx0) + 0.5, a1 = Math.round(sx1) - 0.5;
  const b0 = Math.round(sy0) + 0.5, b1 = Math.round(sy1) - 0.5;
  g.line(
    `M${a0 + r} ${b0}H${a1 - r}A${r} ${r} 0 0 1 ${a1} ${b0 + r}V${b1 - r}A${r} ${r} 0 0 1 ${a1 - r} ${b1}` +
      `H${a0 + r}A${r} ${r} 0 0 1 ${a0} ${b1 - r}V${b0 + r}A${r} ${r} 0 0 1 ${a0 + r} ${b0}Z`,
    "ink",
  );

  // The play button's ring.
  g.line(`M${cx - pr} ${cy}a${pr} ${pr} 0 1 0 ${2 * pr} 0a${pr} ${pr} 0 1 0 ${-2 * pr} 0Z`, "ink", { width: 1.25 });

  // The scrubber: the unplayed track, the played rule and the chapter ticks.
  const tyl = ty + 0.5;
  g.line(`M${num(hx)} ${tyl}H${tx1}`, "faint", { width: 1.25 });
  g.line(`M${tx0} ${tyl}H${num(hx)}`, "ink", { width: 1.5 });
  const marks = 3 + Math.floor(rand() * 2);
  for (let m = 1; m < marks; m++) {
    const mx = Math.round(tx0 + ((tx1 - tx0) * m) / marks + (rand() - 0.5) * 14) + 0.5;
    g.line(`M${mx} ${ty - 4}v-3`, "soft");
  }

  // A dotted guide from the playhead up to the frame.
  g.line(`M${Math.round(hx) + 0.5} ${ty - 7}V${b1 + 3}`, "faint", { dash: "1 3" });
}
