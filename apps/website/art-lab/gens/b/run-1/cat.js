function draw(g, rand, seed, k) {
  // A seated cat silhouetted against a rising full moon
  const { clamp, smooth, solid, sdPolyline, inPolygon, polyD, makeNoise, num } = k;
  const fbm = makeNoise(seed);
  const mx = 200, my = 118, mr = 64;
  const hx = 200, hy = 112, hr = 21;

  // Head tilt, up to 6° either way; ears, eyes and whiskers follow it.
  const tilt = (rand() * 2 - 1) * 6 * Math.PI / 180;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const rot = ([x, y]) => [hx + (x - hx) * ct - (y - hy) * st, hy + (x - hx) * st + (y - hy) * ct];

  // The silhouette: pear body, round head and two ears, as one outline.
  const halfW = (y) => { const t = clamp((y - 128) / 60); return 20 + 17 * (1 - (1 - t) * (1 - t)); };
  const cat = [];
  for (let y = 188; y > 128; y -= 3) cat.push([200 - halfW(y), y]);
  cat.push([180, 128], [180, 124]);
  const aStart = Math.PI - Math.asin(8 / 21), aEnd = 2 * Math.PI + Math.asin(8 / 21);
  const onHead = (a) => [hx + hr * Math.cos(a), hy + hr * Math.sin(a)];
  const earH = 7 / 21;
  const ears = [
    { a: Math.atan2(-30, -17) + 2 * Math.PI + tilt, tip: rot([183, 82]) },
    { a: Math.atan2(-30, 17) + 2 * Math.PI + tilt, tip: rot([217, 82]) },
  ];
  let a = aStart;
  const step = 0.07;
  for (const e of ears) {
    while (a < e.a - earH) { cat.push(onHead(a)); a += step; }
    cat.push(onHead(e.a - earH), e.tip, onHead(e.a + earH));
    a = e.a + earH + step;
  }
  while (a < aEnd) { cat.push(onHead(a)); a += step; }
  cat.push(onHead(aEnd));
  cat.push([220, 124], [220, 128]);
  for (let y = 131; y <= 188; y += 3) cat.push([200 + halfW(y), y]);
  const catRing = [...cat, cat[0]];

  // The tail: out from the right hip, curling forward round the paws.
  const P0 = [236, 186];
  const P1 = [266 + rand() * 6 - 3, 176 + rand() * 4 - 2];
  const P2 = [244 + rand() * 6 - 3, 199 + rand() * 4 - 2];
  const P3 = [176, 184];
  const tail = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, m = 1 - t;
    const c0 = m * m * m, c1 = 3 * m * m * t, c2 = 3 * m * t * t, c3 = t * t * t;
    tail.push([c0 * P0[0] + c1 * P1[0] + c2 * P2[0] + c3 * P3[0], c0 * P0[1] + c1 * P1[1] + c2 * P2[1] + c3 * P3[1]]);
  }
  const tl = [], tr = [];
  for (let i = 0; i < tail.length; i++) {
    const p = tail[Math.max(0, i - 1)], q = tail[Math.min(tail.length - 1, i + 1)];
    const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    tl.push([tail[i][0] + nx * 3, tail[i][1] + ny * 3]);
    tr.push([tail[i][0] - nx * 3, tail[i][1] - ny * 3]);
  }
  const pe = tail[tail.length - 1], pp = tail[tail.length - 2];
  const el = Math.hypot(pe[0] - pp[0], pe[1] - pp[1]) || 1;
  const dX = (pe[0] - pp[0]) / el, dY = (pe[1] - pp[1]) / el, nX = -dY, nY = dX;
  const cap = [];
  for (let i = 0; i <= 8; i++) {
    const th = (Math.PI * i) / 8;
    cap.push([pe[0] + 3 * (nX * Math.cos(th) + dX * Math.sin(th)), pe[1] + 3 * (nY * Math.cos(th) + dY * Math.sin(th))]);
  }
  const tailShape = [...tl, ...cap, ...tr.slice().reverse()];

  // Faint maria, kept mostly in the visible upper part of the disc.
  const patches = [];
  for (let i = 0; i < 3; i++) {
    const ang = rand() * Math.PI * 2, rr = rand() * 34;
    patches.push({ x: mx + rr * Math.cos(ang), y: my - 10 + rr * Math.sin(ang) * 0.8, r: 11 + rand() * 8 });
  }

  const eyes = [rot([192, 111]), rot([208, 111])];

  g.print((x, y) => {
    const inTail = x > 165 && x < 268 && y > 170 && y < 200 && sdPolyline(x, y, tail) < 3;
    if (inTail) return 0;
    if (y > 188) {
      if (y > 200 || x < 104 || x > 296) return 0;
      const fade = smooth(clamp((x - 104) / 30)) * smooth(clamp((296 - x) / 30));
      return 0.12 * (1 - (y - 188) / 12) * fade;
    }
    const md = Math.hypot(x - mx, y - my) - mr;
    if (md > 41) return 0;
    const inCat = x > 158 && x < 243 && y > 78 && inPolygon(x, y, cat);
    if (inCat) {
      let orange = 0;
      for (const [ex, ey] of eyes) {
        const dx = x - ex, dy = y - ey;
        const u = dx * ct + dy * st, v = -dx * st + dy * ct;
        const d = (Math.hypot(u / 3.5, v / 1.5) - 1) * 1.5;
        orange = Math.max(orange, solid(d - 1));
      }
      let rim = 0;
      const wgt = smooth(clamp((203 - x) / 12)) * smooth(clamp((170 - y) / 25));
      if (wgt > 0.05 && orange < 0.05 && sdPolyline(x, y, catRing) < 4.5) rim = 0.3 * wgt;
      return [rim, orange];
    }
    if (md <= 0) {
      let tone = 0.9;
      for (const p of patches) {
        const pd = Math.hypot(x - p.x, y - p.y);
        tone -= 0.12 * smooth(clamp(1 - pd / p.r)) * (0.6 + 0.8 * fbm(x / 9, y / 9));
      }
      return clamp(tone, 0.75, 0.9);
    }
    const f = 1 - md / 41;
    return 0.5 * f * f;
  });

  // Horizon, half strength in the middle, fading toward its ends.
  const hy0 = 188.5;
  g.line(`M136 ${hy0}H264`, "soft");
  g.line(`M118 ${hy0}H136M264 ${hy0}H282`, "faint");
  g.line(`M104 ${hy0}H118M282 ${hy0}H296`, "faint", { dash: "1 3" });

  // The moon's edge, only where it shows beside and above the cat.
  let run = [];
  const flush = () => { if (run.length > 1) g.line(polyD(run), "faint"); run = []; };
  for (let i = 0; i <= 360; i++) {
    const th = (i / 360) * Math.PI * 2;
    const p = [mx + mr * Math.cos(th), my + mr * Math.sin(th)];
    const hidden = inPolygon(p[0], p[1], cat) || sdPolyline(p[0], p[1], catRing) < 1.2;
    if (hidden) flush(); else run.push(p);
  }
  flush();

  // The silhouette and paws.
  g.line(polyD(cat, true), "ink");
  g.line("M185 188A5 5 0 0 1 195 188M205 188A5 5 0 0 1 215 188", "ink");

  // The tail over the paws: a background fill hides what it passes in front of.
  g.line(polyD(tailShape, true), "faint", { fill: true });
  g.line(polyD(tl), "ink");
  g.line(polyD(tr), "ink");
  g.line(polyD(cap), "ink");

  // Whiskers, three per side.
  for (const s of [-1, 1]) {
    for (const [y0, y1] of [[116, 113], [117, 117.5], [118, 122]]) {
      const p = rot([200 + 10 * s, y0]), q = rot([200 + 28 * s, y1]);
      g.line(`M${num(p[0])} ${num(p[1])}L${num(q[0])} ${num(q[1])}`, "faint");
    }
  }

  // The eyes: orange almonds, filled with a thick stroke and outlined.
  for (const [ex, ey] of eyes) {
    const toW = (u, v) => [ex + u * ct - v * st, ey + u * st + v * ct];
    const top = [], bot = [];
    for (let i = 0; i <= 12; i++) {
      const u = -3.5 + (7 * i) / 12, v = 1.5 * Math.cos((Math.PI * u) / 7);
      top.push(toW(u, -v));
      bot.push(toW(u, v));
    }
    const a0 = toW(-2.6, 0), a1 = toW(2.6, 0);
    g.line(`M${num(a0[0])} ${num(a0[1])}L${num(a1[0])} ${num(a1[1])}`, "sig", { width: 2.2 });
    g.line(polyD([...top, ...bot.reverse()], true), "sig");
  }
}
