function draw(g, rand, seed, k) {
  // An analyst's couch in profile, empty, waiting for a session
  const { clamp, smooth, solid, glow, sdPolyline, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Variation: where the seat's light ends up at the right, and how the bolster was left.
  const seatEnd = 0.45 + rand() * 0.2;
  const bx = 128 + (rand() * 2 - 1) * 6;
  const tilt = ((rand() * 2 - 1) * 8 * Math.PI) / 180;

  const arc = (cx, cy, r, a0, a1, n) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  };

  // Headrest: a rolled top (circle r 8 at (112,106), crown at (112,98)),
  // then a concave sweep down to the seat at (150,132).
  const roll = arc(112, 106, 8, Math.PI, 2 * Math.PI, 12);
  const hollow = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, u = 1 - t;
    hollow.push([u * u * 120 + 2 * u * t * 121 + t * t * 150, u * u * 106 + 2 * u * t * 128 + t * t * 132]);
  }
  const curveY = (qx) => {
    let best = hollow[0];
    for (const p of hollow) if (Math.abs(p[0] - qx) < Math.abs(best[0] - qx)) best = p;
    return best[1];
  };

  // The full silhouette: headrest flowing into the seat slab, seat corners at radius 4.
  const S = [
    ...roll,
    ...hollow.slice(1),
    [292, 132],
    ...arc(292, 136, 4, -Math.PI / 2, 0, 4).slice(1),
    [296, 148],
    ...arc(292, 148, 4, 0, Math.PI / 2, 4).slice(1),
    [108, 152],
    ...arc(108, 148, 4, Math.PI / 2, Math.PI, 4).slice(1),
  ];
  const Sclosed = [...S, S[0]];

  // Legs: tapered, 6 wide at the top to 3 at the floor.
  const legs = [116, 124, 276, 284].map((lx) => [
    [lx - 3, 152], [lx + 3, 152], [lx + 1.5, 168], [lx - 1.5, 168],
  ]);

  // Bolster: a 26 × 16 ellipse resting in the hollow, a little askew.
  const by = curveY(bx) - 9.5;
  const ca = Math.cos(tilt), sa = Math.sin(tilt);
  const bolsterD = (x, y) => {
    const dx = x - bx, dy = y - by;
    const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
    return (Math.hypot(u / 13, v / 8) - 1) * 8;
  };
  const bolsterPts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * 2 * Math.PI;
    const u = 13 * Math.cos(a), v = 8 * Math.sin(a);
    bolsterPts.push([bx + u * ca - v * sa, by + u * sa + v * ca]);
  }

  const seatTone = (x) => 0.85 + (seatEnd - 0.85) * clamp((x - 104) / 192);

  g.print((x, y) => {
    if (x < 80 || x > 320 || y < 70 || y > 170) return 0;
    let ink = 0;
    const orange = solid(bolsterD(x, y));

    if (inPolygon(x, y, S)) {
      if (y < 132) {
        // Headrest: lit on its upper-left face, darkening down into the hollow.
        const t = clamp((x - 104 + (y - 98)) / 80);
        ink = 0.75 - 0.4 * t + 0.06 * (fbm(x / 7, y / 7) - 0.5);
      } else if (y <= 141) {
        // Seat top catching the light, rolling over into the front face.
        ink = seatTone(x) + (0.4 - seatTone(x)) * smooth(clamp((y - 132) / 9));
      } else {
        // Below the seam, a little darker toward the bottom edge.
        ink = 0.3 - 0.07 * clamp((y - 141) / 11);
      }
    } else if (legs.some((L) => inPolygon(x, y, L))) {
      ink = 0.25;
    } else if (y < 152) {
      // Halo around the silhouette, strongest above the seat, gone before the floor.
      const d = sdPolyline(x, y, Sclosed);
      ink = 0.15 * glow(d, 14) * smooth(clamp((152 - y) / 24));
    }
    // Cast shadow and the gap under the couch stay at 0: bare background.
    return [ink, orange];
  });

  // Silhouette.
  g.line(polyD(S, true), "ink");
  // Upholstery seam.
  g.line(`M110 141.5H290`, "soft");
  // Legs.
  for (const L of legs) g.line(polyD(L, true), "soft");
  // Floor.
  g.line(`M86 168.5H314`, "faint");

  // Stitched welt just inside the hollow, kept clear of the bolster.
  const welt = [];
  for (let i = 1; i < hollow.length - 1; i++) {
    const [px, py] = hollow[i];
    const tx = hollow[i + 1][0] - hollow[i - 1][0], ty = hollow[i + 1][1] - hollow[i - 1][1];
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len, ny = tx / len;
    if (!inPolygon(px + nx * 3, py + ny * 3, S)) { nx = -nx; ny = -ny; }
    welt.push([px + nx * 3, py + ny * 3]);
  }
  let run = [];
  const flush = () => { if (run.length > 1) g.line(polyD(run), "faint", { dash: "2 2" }); run = []; };
  for (const p of welt) {
    if (bolsterD(p[0], p[1]) < 1.5 || p[1] > 129) flush();
    else run.push(p);
  }
  flush();

  // The bolster, outlined in orange: where the head would rest.
  g.line(polyD(bolsterPts, true), "sig");
}
