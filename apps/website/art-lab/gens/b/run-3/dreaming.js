function draw(g, rand, seed, k) {
  // A dark house on still water whose reflection has lit windows
  const { clamp, smooth, solid, sdBox, inPolygon, polyD, num } = k;
  const wl = 128;
  const mir = (y) => 2 * wl - y;

  // The house above the water.
  const roof = [[160, 94], [200, 68], [240, 94]];
  const roofY = (x) => 68 + Math.abs(x - 200) * (26 / 40);
  const winL = [183, 110], winR = [217, 110];

  // The reflection below it.
  const rRoof = roof.map(([x, y]) => [x, mir(y)]);
  const rWinL = [183, mir(110)], rWinR = [217, mir(110)];

  // Window light: a solid square, falling to 0.4 at r 14, then to nothing by r 30.
  const winLight = (x, y, c) => {
    const core = solid(sdBox(x, y, c[0], c[1], 6, 6));
    const r = Math.hypot(x - c[0], y - c[1]);
    let inner = 0, outer = 0;
    if (r < 14) inner = 1 - 0.6 * smooth(clamp((r - 6) / 8));
    else if (r < 30) outer = 0.4 * (1 - smooth(clamp((r - 14) / 16)));
    return { inner: Math.max(core, inner), outer };
  };

  g.print((x, y) => {
    if (x < 92 || x > 308 || y < 66 || y > 210) return 0;

    // Above the waterline: the sleeping house, barely there.
    if (y < wl) {
      if (sdBox(x, y, 183, 110, 6, 6) < 0 || sdBox(x, y, 217, 110, 6, 6) < 0) return 0;
      const inWalls = x >= 166 && x <= 234 && y >= 94;
      const inRoof = y >= 68 && y < 94 && inPolygon(x, y, roof);
      const inChim = x >= 218 && x <= 226 && y >= 72 && y <= 84;
      return inWalls || inRoof || inChim ? 0.05 : 0;
    }

    let ink = 0, orange = 0;

    // The water: a faint wash near the house and a soft oval around the image.
    const wx = 1 - smooth(clamp((Math.abs(x - 200) - 40) / 40));
    const wy = 1 - smooth(clamp((y - 185) / 20));
    const e = Math.hypot((x - 200) / 30, (y - 150) / 14) - 1;
    const oval = 0.15 * Math.exp(-Math.max(e, 0) / 0.6);
    ink = Math.max(0.1 * wx * wy, oval);

    // The reflected house, fading as it goes deeper.
    const inWalls = x >= 166 && x <= 234 && y <= 162;
    const inRoof = y > 162 && y <= 188 && inPolygon(x, y, rRoof);
    const inChim = x >= 218 && x <= 226 && y >= mir(84) && y <= mir(72);
    if (inWalls || inRoof || inChim) ink = Math.max(ink, 0.25 - 0.1 * clamp((y - wl) / 60));

    // The lit windows: the right one in ink, the left one's heart in orange.
    const R = winLight(x, y, rWinR);
    ink = Math.max(ink, R.inner, R.outer);
    const L = winLight(x, y, rWinL);
    ink = Math.max(ink, L.outer);
    orange = L.inner;

    return [ink, orange];
  });

  // Waterline.
  g.line(`M92 ${wl + 0.5}H308`, "ink");

  // The upper house, crisp and full.
  g.box(166, 94, 68, 34, "ink");
  g.line(polyD(roof), "ink");
  g.line(`M218 ${num(roofY(218))}V72H226V${num(roofY(226))}`, "ink");
  g.box(winL[0] - 6, winL[1] - 6, 12, 12, "ink");
  g.box(winR[0] - 6, winR[1] - 6, 12, 12, "ink");

  // The reflected outline, dashed and wobbling with the water.
  const amp = 0.6 + rand() * 0.9, freq = 0.18 + rand() * 0.12, phase = rand() * Math.PI * 2;
  const wob = (pts, closed = false) => {
    const src = closed ? [...pts, pts[0]] : pts;
    const out = [];
    for (let i = 0; i < src.length - 1; i++) {
      const [ax, ay] = src[i], [bx, by] = src[i + 1];
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
      for (let j = 0; j < n; j++) {
        const t = j / n, yy = ay + (by - ay) * t;
        out.push([ax + (bx - ax) * t + amp * Math.sin(yy * freq + phase), yy]);
      }
    }
    const [lx, ly] = src[src.length - 1];
    out.push([lx + amp * Math.sin(ly * freq + phase), ly]);
    return polyD(out);
  };
  const dash = { dash: "4 3" };
  g.line(wob([[166, wl], [166, 162], [234, 162], [234, wl]]), "soft", dash);
  g.line(wob(rRoof), "soft", dash);
  g.line(wob([[218, mir(roofY(218))], [218, mir(72)], [226, mir(72)], [226, mir(roofY(226))]]), "soft", dash);
  for (const c of [rWinL, rWinR]) {
    g.line(wob([[c[0] - 6, c[1] - 6], [c[0] + 6, c[1] - 6], [c[0] + 6, c[1] + 6], [c[0] - 6, c[1] + 6]], true), "soft", dash);
  }

  // Ripples across the reflection.
  const ys = [140, 152, 165, 178, 186];
  const count = 3 + Math.floor(rand() * 3);
  const chosen = count >= 5 ? ys : ys.slice(0, 4).sort(() => rand() - 0.5).slice(0, count).sort((a, b) => a - b);
  chosen.forEach((ry, i) => {
    const len = 20 + rand() * 30;
    const side = i % 2 === 0 ? -1 : 1;
    const cxr = 200 + side * (5 + rand() * 15);
    const yy = ry + 0.5 + Math.round((rand() - 0.5) * 2);
    g.line(`M${num(cxr - len / 2)} ${yy}H${num(cxr + len / 2)}`, "faint");
  });
}
