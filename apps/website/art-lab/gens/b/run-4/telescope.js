function draw(g, rand, seed, k) {
  // A small refractor on a tripod, aimed at one bright star
  const { clamp, solid, sdBox, sdPolyline, inPolygon, polyD, num } = k;

  // Star position varies within a small box; the tube re-aims at it.
  const sx = 285 + rand() * 20, sy = 60 + rand() * 14;

  // The tube pivots on its saddle above the mount head and points at the star.
  const pivot = [176, 127];
  let dx0 = sx - pivot[0], dy0 = sy - pivot[1];
  const dl0 = Math.hypot(dx0, dy0);
  const dir = [dx0 / dl0, dy0 / dl0];
  const n = [dir[1], -dir[0]]; // perpendicular, pointing up-left (the lit side)
  const L = 157, UP = 60, SH = 127; // tube length, pivot along tube, dew shield start
  const back = [pivot[0] - dir[0] * UP, pivot[1] - dir[1] * UP];
  const P2 = (u, v) => [back[0] + dir[0] * u + n[0] * v, back[1] + dir[1] * u + n[1] * v];
  const hw = (u) => (u >= SH ? 12 : 8 + 2 * u / L);
  const front = P2(L, 0);

  // Eyepiece: stubby, angled down-left off the back end.
  let ea = [-dir[0] * 1.2 - n[0] * 0.8, -dir[1] * 1.2 - n[1] * 0.8];
  const eal = Math.hypot(ea[0], ea[1]);
  ea = [ea[0] / eal, ea[1] / eal];
  const eb = [ea[1], -ea[0]];
  const ebase = P2(1, -4);
  const ec = [ebase[0] + ea[0] * 5, ebase[1] + ea[1] * 5];
  const rectPts = (c, a, b, hl, hwid) => [
    [c[0] - a[0] * hl - b[0] * hwid, c[1] - a[1] * hl - b[1] * hwid],
    [c[0] + a[0] * hl - b[0] * hwid, c[1] + a[1] * hl - b[1] * hwid],
    [c[0] + a[0] * hl + b[0] * hwid, c[1] + a[1] * hl + b[1] * hwid],
    [c[0] - a[0] * hl + b[0] * hwid, c[1] - a[1] * hl + b[1] * hwid],
  ];
  const eyePts = rectPts(ec, ea, eb, 5, 4);

  // Focuser knob on top, near the back.
  const knob = P2(12, hw(12) + 2.5), kr = 2.5;

  // Finder scope, riding parallel above the tube.
  const fc = P2(92, 15);
  const finderPts = rectPts(fc, dir, n, 20, 3);

  // Mount head, saddle, tripod.
  const head = [178, 140];
  const feet = { left: [128, 188], right: [226, 188], rear: [190, 186] };
  const sa = P2(55, -hw(55)), sb = P2(65, -hw(65));
  const saddle = [sa, sb, [sb[0], 137], [sa[0], 137]];

  // Faint background stars in the upper sky, well clear of the instrument.
  const bg = [];
  const count = 3 + Math.floor(rand() * 3);
  for (let t = 0; t < 80 && bg.length < count; t++) {
    const x = 92 + rand() * 216, y = 56 + rand() * 60;
    const v = (x - back[0]) * n[0] + (y - back[1]) * n[1];
    if (v < 28) continue;
    if (Math.hypot(x - sx, y - sy) < 42) continue;
    if (bg.some((s) => Math.hypot(s[0] - x, s[1] - y) < 26)) continue;
    bg.push([x, y, 0.2 + rand() * 0.1]);
  }

  // Sight line geometry.
  const sv = [sx - front[0], sy - front[1]];
  const sL = Math.hypot(sv[0], sv[1]);
  const su = [sv[0] / sL, sv[1] / sL];

  g.print((x, y) => {
    if (x < 84 || x > 336 || y < sy - 30 || y > 192) return 0;
    let ink = 0, org = 0;

    // The star: core, cross and glow, all in orange.
    const r = Math.hypot(x - sx, y - sy);
    if (r < 26) {
      const core = solid(r - 2.2);
      const halo = 0.75 * Math.pow(clamp(1 - r / 22), 2);
      let ray = 0;
      if (Math.abs(y - sy) < 2 && Math.abs(x - sx) < 14) ray = 0.9 * (1 - Math.abs(x - sx) / 14);
      if (Math.abs(x - sx) < 2 && Math.abs(y - sy) < 14) ray = Math.max(ray, 0.9 * (1 - Math.abs(y - sy) / 14));
      org = Math.max(core, halo, ray);
    }

    // Faint background stars.
    for (const s of bg) {
      const d = Math.hypot(x - s[0], y - s[1]) - 2.5;
      if (d < 3) ink = Math.max(ink, s[2] * solid(d));
    }

    // Ground band just above the horizon.
    if (y > 180 && y < 188 && x > 90 && x < 310) ink = Math.max(ink, 0.1);

    // A barely-there wash along the line of sight.
    const px = x - front[0], py = y - front[1];
    const st = (px * su[0] + py * su[1]) / sL;
    if (st > 0 && st < 1) {
      const pd = Math.abs(px * su[1] - py * su[0]);
      if (pd < 5 + 12 * st) ink = Math.max(ink, 0.08);
    }

    // Tripod: rear leg first (half hidden), then the front legs.
    const legTone = (foot, base) => {
      const d = sdPolyline(x, y, [head, foot]);
      if (d >= 2.2) return 0;
      return base * (1 - 0.25 * clamp((y - head[1]) / (foot[1] - head[1])));
    };
    const rl = legTone(feet.rear, 0.26);
    if (rl) ink = rl;
    const ll = legTone(feet.left, 0.35), rr = legTone(feet.right, 0.35);
    if (ll || rr) ink = Math.max(ll, rr);

    // Mount head and saddle.
    if (sdBox(x, y, head[0], head[1], 7, 5, 2) < 0) ink = 0.42 + 0.08 * clamp((head[0] - x + head[1] - y) / 10 + 0.5);
    if (inPolygon(x, y, saddle)) ink = 0.45;

    // Eyepiece.
    const ex = x - ec[0], ey = y - ec[1];
    const eu = ex * ea[0] + ey * ea[1], ev = ex * eb[0] + ey * eb[1];
    if (Math.abs(eu) < 5 && Math.abs(ev) < 4) ink = 0.42 + 0.08 * clamp((ec[0] - x + ec[1] - y) / 8 + 0.5);

    // Focuser knob.
    if (Math.hypot(x - knob[0], y - knob[1]) < kr + 0.5) ink = 0.48;

    // Finder scope.
    const fx = x - fc[0], fy = y - fc[1];
    const fu = fx * dir[0] + fy * dir[1], fv = fx * n[0] + fy * n[1];
    if (Math.abs(fu) < 20 && Math.abs(fv) < 3.2) ink = fv > 0 ? 0.5 : 0.4;

    // Main tube, dew shield and lip.
    const tx = x - back[0], ty = y - back[1];
    const u = tx * dir[0] + ty * dir[1], v = tx * n[0] + ty * n[1];
    const e = ((u - L) / 5) ** 2 + (v / 12) ** 2;
    if (e < 1) {
      ink = e < 0.6 ? 0.1 : v > 0 ? 0.85 : 0.3;
    } else if (u >= 0 && u <= L) {
      const h = hw(u);
      if (Math.abs(v) < h) {
        const t = v / h;
        ink = t > 0.72 ? 0.8 : t >= 0 ? 0.5 + 0.06 * t : 0.5 - 0.3 * -t;
      }
    }

    return [ink, org];
  });

  const S = (p) => `${num(p[0])} ${num(p[1])}`;

  // Horizon.
  g.line(`M90 188.5H310`, "faint");

  // Tripod legs.
  const legStart = (foot) => [head[0] + (foot[0] - head[0]) * 0.12, head[1] + (foot[1] - head[1]) * 0.12];
  g.line(`M${S(legStart(feet.rear))}L${S(feet.rear)}`, "soft");
  g.line(`M${S(legStart(feet.left))}L${S(feet.left)}`, "ink");
  g.line(`M${S(legStart(feet.right))}L${S(feet.right)}`, "ink");

  // Mount head (rounded) and saddle.
  g.line("M173 135H183Q185 135 185 137V143Q185 145 183 145H173Q171 145 171 143V137Q171 135 173 135Z", "soft");
  g.line(polyD([sa, [sa[0], 135], [sb[0], 135], sb]), "soft");

  // Eyepiece and focuser knob.
  g.line(polyD(eyePts, true), "soft");
  g.line(`M${num(knob[0] - kr)} ${num(knob[1])}a${kr} ${kr} 0 1 0 ${2 * kr} 0a${kr} ${kr} 0 1 0 ${-2 * kr} 0`, "soft");

  // Finder scope and its two brackets.
  g.line(polyD(finderPts, true), "soft");
  for (const bu of [80, 104]) g.line(`M${S(P2(bu, hw(bu)))}L${S(P2(bu, 12))}`, "soft");

  // Tube outline: both long edges with the dew-shield step, and the back end.
  const hs = hw(SH - 0.01);
  g.line(polyD([P2(0, 8), P2(SH, hs), P2(SH, 12), P2(L, 12)]), "ink");
  g.line(polyD([P2(0, -8), P2(SH, -hs), P2(SH, -12), P2(L, -12)]), "ink");
  g.line(`M${S(P2(0, 8))}L${S(P2(0, -8))}`, "ink");

  // Objective lip ellipse, perpendicular to the axis.
  const rot = (Math.atan2(n[1], n[0]) * 180) / Math.PI;
  const l1 = P2(L, 12), l2 = P2(L, -12);
  g.line(`M${S(l1)}A12 5 ${num(rot)} 1 0 ${S(l2)}A12 5 ${num(rot)} 1 0 ${S(l1)}Z`, "ink");

  // Line of sight to the star.
  const sEnd = [sx - su[0] * 4, sy - su[1] * 4];
  g.line(`M${S(front)}L${S(sEnd)}`, "faint", { dash: "4 3" });

  // Crisp diffraction cross in orange.
  g.line(`M${num(sx - 14)} ${num(sy)}H${num(sx + 14)}M${num(sx)} ${num(sy - 14)}V${num(sy + 14)}`, "sig");
}
