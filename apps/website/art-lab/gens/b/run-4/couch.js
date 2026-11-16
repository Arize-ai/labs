function draw(g, rand, seed, k) {
  // A three-seat sofa beside a lit floor lamp
  const { clamp, smooth, solid, glow, sdBox, inPolygon, polyD, makeNoise } = k;
  const fbm = makeNoise(seed);

  // Lamp geometry.
  const lx = 108, bulbY = 87, bulbR = 3.5;
  const shade = [[lx - 8, 62], [lx + 8, 62], [lx + 15, 84], [lx - 15, 84]];
  const R = 60 + rand() * 20;          // glow radius
  const tau = R * 0.74;                // 0.15 near the left arm, ~0 by the middle cushion

  // Sofa geometry.
  const cushions = [182, 220, 258].map((cx) => ({ cx, sag: rand() * 3 }));
  const cushionTop = (c, x) => {
    const u = (x - c.cx) / 18;
    return 136 + c.sag * (1 - u * u);
  };
  const legs = [146, 172, 268, 294];

  g.print((x, y) => {
    if (x < 60 || x > 320 || y < 50 || y > 205) return 0;
    let ink = 0, sig = 0;

    // Soft glow from the bulb.
    const db = Math.hypot(x - lx, y - bulbY);
    const fade = 1 - smooth(clamp((db - R) / (R * 0.8)));
    ink = 0.5 * Math.exp(-db / tau) * fade;

    // Faint pool on the floor, under the lamp and the sofa's left half.
    const poolTop = x < 138 ? 176 : 182;
    if (y > poolTop && x < 240) {
      const depth = 12 * clamp(1 - (x - 80) / 170);
      if (y < 182 + depth) {
        const p = 0.2 * (1 - smooth(clamp((x - 150) / 90)));
        ink = Math.max(ink, p);
      }
    }

    // The sofa, in mid-tones lit from the upper left.
    if (x >= 140 && x <= 300 && y >= 98 && y <= 182) {
      if (y > 172) return 0; // legs and the gap underneath stay dark
      let s = -1;
      if (y >= 158) s = 0.3; // base rail
      else if (sdBox(x, y, 151, 147, 11, 29, 7) <= 0) s = 0.6 - 0.04 * fbm(x / 8, y / 8);
      else if (sdBox(x, y, 289, 147, 11, 29, 7) <= 0) s = 0.35;
      else {
        for (const c of cushions) {
          if (Math.abs(x - c.cx) <= 18) {
            const t = cushionTop(c, x);
            if (y >= t) {
              const shift = 0.05 * clamp((x - 164) / 112);
              s = (y < t + 10 ? 0.65 : 0.4) - shift + 0.05 * (fbm(x / 7, y / 7) - 0.5);
            }
            break;
          }
        }
        if (s < 0 && y < 141 && sdBox(x, y, 220, 124, 72, 24, 8) <= 0) {
          s = 0.55 - 0.15 * clamp((x - 148) / 144);
        }
      }
      if (s >= 0) ink = s;
    }

    // The lamp: shade, base, bulb.
    if (y >= 62 && y <= 84 && inPolygon(x, y, shade)) {
      ink = 0.85 - 0.15 * clamp((x - (lx - 15)) / 30);
    }
    const ex = (x - lx) / 9, ey = (y - 182) / 2.5;
    if (ex * ex + ey * ey < 1) ink = Math.max(ink, 0.75);
    const gd = db - bulbR;
    if (gd < 10) sig = solid(gd) + 0.3 * glow(gd, 3);

    return [ink, sig];
  });

  // Floor.
  g.line("M92 182.5H308", "faint");

  // Cone of light under the shade.
  g.line(`M${lx - 15} 84L78 140`, "faint", { dash: "4 3" });
  g.line(`M${lx + 15} 84L150 130`, "faint", { dash: "4 3" });

  // Lamp: stem, shade, base.
  g.line(`M${lx + 0.5} 84V180`, "ink");
  g.line(polyD(shade, true), "ink");
  g.line(`M${lx - 9} 182A9 2.5 0 1 0 ${lx + 9} 182A9 2.5 0 1 0 ${lx - 9} 182Z`, "soft");

  // Sofa silhouette: backrest top, arms, base rail.
  g.line("M148 118V108A8 8 0 0 1 156 100H284A8 8 0 0 1 292 108V118", "ink");
  g.line("M140 172V125A7 7 0 0 1 147 118H155A7 7 0 0 1 162 125V158", "ink");
  g.line("M300 172V125A7 7 0 0 0 293 118H285A7 7 0 0 0 278 125V158", "ink");
  g.line("M162 158.5H278", "ink");
  g.line("M140 172.5H300", "ink");

  // Cushions: where seat meets backrest, front edges, seams.
  for (const c of cushions) {
    const top = [], front = [];
    for (let i = 0; i <= 12; i++) {
      const x = c.cx - 18 + i * 3;
      const t = cushionTop(c, x);
      top.push([x, t]);
      front.push([x, t + 10]);
    }
    g.line(polyD(top), "soft");
    g.line(polyD(front), "soft");
  }
  g.line("M201 136V158", "soft");
  g.line("M239 136V158", "soft");

  // Tapered legs, dark against the floor.
  for (const x of legs) {
    const leg = [[x - 3, 172.5], [x + 3, 172.5], [x + 1.5, 182], [x - 1.5, 182]];
    g.line(polyD(leg, true), "ink", { fill: true });
  }
}
