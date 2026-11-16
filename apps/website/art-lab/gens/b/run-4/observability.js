function draw(g, rand, seed, k) {
  // Pocket watch seen through its glass caseback, movement exposed
  const { clamp, solid, glow, sdBox, sdPolyline, polyD, num } = k;
  const TAU = Math.PI * 2;
  const cx = 200, cy = 132, R = 66, RB = 58;

  // Parts. The brief's escape-wheel centre sits 13 units shy of the main gear,
  // so it slides along the same bearing until the teeth genuinely mesh.
  const gear = { x: 182, y: 142, tip: 28, root: 25, n: 24, a: rand() * TAU };
  const bdx = 46, bdy = -32, bl = Math.hypot(bdx, bdy);
  const esc = { x: gear.x + 41 * bdx / bl, y: gear.y + 41 * bdy / bl, tip: 15, root: 11, n: 15, a: rand() * TAU };
  // Balance pulled 4 units inward so its ring stays inside the glass.
  const bal = { x: 222, y: 156, r: 18, a: rand() * Math.PI };
  const hlLen = (50 + rand() * 30) * Math.PI / 180;
  const hlMid = -2 * Math.PI / 3; // centred between 10 and 12 o'clock
  const pol = (c, r, a) => [c.x + r * Math.cos(a), c.y + r * Math.sin(a)];
  const circ = (x, y, r) => `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0`;

  // Bridge: a crescent on the circle through its start, the main jewel and the balance jewel
  // (the brief's far end lies outside the case, so the arch stops inside the glass).
  const A = [160, 102], B = [gear.x, gear.y], C = [bal.x, bal.y];
  const dd = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  const s2 = (p) => p[0] * p[0] + p[1] * p[1];
  const ux = (s2(A) * (B[1] - C[1]) + s2(B) * (C[1] - A[1]) + s2(C) * (A[1] - B[1])) / dd;
  const uy = (s2(A) * (C[0] - B[0]) + s2(B) * (A[0] - C[0]) + s2(C) * (B[0] - A[0])) / dd;
  const BR = Math.hypot(A[0] - ux, A[1] - uy);
  const aA = Math.atan2(A[1] - uy, A[0] - ux), aC = Math.atan2(C[1] - uy, C[0] - ux);
  const sg = Math.sign(aA - aC) || 1;
  const a0 = aA + 0.06 * sg, a1 = aC - 0.34 * sg;
  const bw = (t) => 10 * Math.pow(Math.sin(Math.PI * clamp(t)), 0.6);
  const bridgeD = (x, y) => {
    const t = (Math.atan2(y - uy, x - ux) - a0) / (a1 - a0);
    if (t < 0 || t > 1) return 99;
    return Math.abs(Math.hypot(x - ux, y - uy) - BR) - bw(t) / 2;
  };
  // A straight arm carries the escape-wheel jewel back to the bridge, so all three jewels sit on it.
  const aArm = a0 + 0.15 * (a1 - a0);
  const Pa = [ux + BR * Math.cos(aArm), uy + BR * Math.sin(aArm)], E = [esc.x, esc.y];
  const armD = (x, y) => sdPolyline(x, y, [Pa, E]) - 4;
  const jewels = [[gear.x, gear.y], E, [bal.x, bal.y]];

  const balD = (x, y) => {
    const px = x - bal.x, py = y - bal.y, br = Math.hypot(px, py);
    const ring = Math.abs(br - bal.r) - 2.6;
    const spoke = br < bal.r ? Math.abs(-Math.sin(bal.a) * px + Math.cos(bal.a) * py) - 2 : 99;
    return Math.min(ring, spoke);
  };

  g.print((x, y) => {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
    const crownD = sdBox(x, y, 200, 61, 7, 5);
    const cd = Math.min(r - R, crownD);
    if (cd > 40) return 0;
    if (crownD < 0 && r > R) return 0.5;
    if (cd > 0) return 0.2 * glow(cd, 12);
    if (r > RB) return 0.55 - 0.2 * (dx + dy) / (r * Math.SQRT2);

    let ink = 0.12;
    // Main gear: rim and hub with four spokes, dark gaps between.
    const gx = x - gear.x, gy = y - gear.y, gr = Math.hypot(gx, gy);
    if (gr < 26.5) {
      ink = 0.45;
      if (gr > 6 && gr < 20.5) {
        let sp = 99;
        for (const t of [gear.a, gear.a + Math.PI / 2]) sp = Math.min(sp, Math.abs(-Math.sin(t) * gx + Math.cos(t) * gy));
        if (sp > 2.6) ink = 0.15;
      }
    }
    if (Math.hypot(x - esc.x, y - esc.y) < 13) ink = 0.5;
    // Bridge plate over the gears.
    const bv = solid(Math.min(bridgeD(x, y), armD(x, y)));
    ink = ink * (1 - bv) + 0.7 * bv;
    // Keep the hairspring hub clear so the orange reads.
    const br = Math.hypot(x - bal.x, y - bal.y);
    if (br < 11) ink = Math.min(ink, 0.25);
    // Glass highlight.
    let du = Math.atan2(dy, dx) - hlMid;
    du = Math.atan2(Math.sin(du), Math.cos(du));
    const u = du / (hlLen / 2);
    if (Math.abs(u) < 1) {
      const tp = 1 - u * u;
      ink = Math.max(ink, Math.sqrt(tp) * Math.exp(-(RB - r) / (1 + 5 * tp)));
    }
    // Jewels.
    let jv = 0;
    for (const j of jewels) jv = Math.max(jv, solid(Math.hypot(x - j[0], y - j[1]) - 3));
    ink = ink * (1 - jv) + 0.9 * jv;

    // The heartbeat: balance ring, crossbar, hairspring.
    let o = 0;
    if (br < 40) {
      const d = balD(x, y);
      o = Math.max(0.9 * solid(d), 0.4 * glow(d, 5), 0.55 * solid(br - 10));
      o *= (1 - jv) * clamp((RB - r) / 2);
    }
    return [ink, o];
  });

  // Split a path into runs that avoid hidden regions.
  const runs = (pts, closed, hide, stroke) => {
    const list = closed ? pts.concat([pts[0]]) : pts;
    let cur = [];
    for (const p of list) {
      if (hide(p[0], p[1])) { if (cur.length > 1) g.line(polyD(cur), stroke); cur = []; }
      else cur.push(p);
    }
    if (cur.length > 1) g.line(polyD(cur), stroke);
  };
  const underBridge = (x, y) => bridgeD(x, y) < -0.8 || armD(x, y) < -0.8;
  const underBal = (x, y) => balD(x, y) < 0;

  // Case, bezel, callout ring.
  g.line(circ(cx, cy, R), "ink");
  g.line(circ(cx, cy, RB), "ink");
  g.line(circ(cx, cy, 76), "faint", { dash: "3 3" });

  // Crown with ribbing.
  g.box(193, 56, 14, 10, "soft");
  for (let i = 1; i < 6; i++) g.line(`M${num(193 + i * 14 / 6)} 57.5V64.5`, "soft");

  // Main gear teeth.
  const gp = [], gs = TAU / gear.n;
  for (let i = 0; i < gear.n; i++) {
    const a = gear.a + i * gs;
    gp.push(pol(gear, gear.root, a), pol(gear, gear.tip, a + 0.15 * gs), pol(gear, gear.tip, a + 0.45 * gs), pol(gear, gear.root, a + 0.6 * gs));
  }
  runs(gp, true, (x, y) => underBridge(x, y) || underBal(x, y), "soft");

  // Escape wheel: hooked teeth.
  const ep = [], es = TAU / esc.n;
  for (let i = 0; i < esc.n; i++) {
    const a = esc.a + i * es;
    ep.push(pol(esc, esc.root, a), pol(esc, esc.tip, a + 0.55 * es), pol(esc, esc.tip - 0.8, a + 0.7 * es), pol(esc, esc.root + 0.6, a + 0.62 * es), pol(esc, esc.root, a + 0.8 * es));
  }
  runs(ep, true, (x, y) => underBridge(x, y) || underBal(x, y), "soft");

  // Bridge edges: crescent and arm, each hidden where the other covers it.
  const bp = [], inner = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, a = a0 + t * (a1 - a0), w = bw(t) / 2;
    bp.push([ux + (BR + w) * Math.cos(a), uy + (BR + w) * Math.sin(a)]);
    inner.push([ux + (BR - w) * Math.cos(a), uy + (BR - w) * Math.sin(a)]);
  }
  runs(bp.concat(inner.reverse()), true, (x, y) => armD(x, y) < -0.8 || underBal(x, y), "soft");
  const vl = Math.hypot(E[0] - Pa[0], E[1] - Pa[1]);
  const vx = (E[0] - Pa[0]) / vl, vy = (E[1] - Pa[1]) / vl, angN = Math.atan2(vx, -vy);
  const ap = [];
  for (let j = 0; j <= 8; j++) { const f = angN - j * Math.PI / 8; ap.push([E[0] + 4 * Math.cos(f), E[1] + 4 * Math.sin(f)]); }
  for (let j = 0; j <= 8; j++) { const f = angN + Math.PI - j * Math.PI / 8; ap.push([Pa[0] + 4 * Math.cos(f), Pa[1] + 4 * Math.sin(f)]); }
  runs(ap, true, (x, y) => bridgeD(x, y) < -0.8, "soft");

  // Hairspring.
  const turns = 3.5, hp = [];
  for (let i = 0; i <= 160; i++) {
    const th = (i / 160) * turns * TAU;
    hp.push(pol(bal, 3.6 + 6.6 * th / (turns * TAU), bal.a + th));
  }
  g.line(polyD(hp), "faint");

  // Jewel settings.
  for (const j of jewels) g.line(circ(j[0], j[1], 3), "soft");
}
