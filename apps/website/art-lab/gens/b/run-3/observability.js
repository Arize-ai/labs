function draw(g, rand, seed, k) {
  // Cloud chamber viewed from above, particle tracks crossing its glowing mist
  const { clamp, smooth, solid, sdPolyline, polyD, num } = k;
  const cx = 200, cy = 125, R = 64, RB = 72, RR = 63;
  const deg = Math.PI / 180;
  const jit = (a) => (rand() * 2 - 1) * a;

  // A straight line through (px, py) at angle ang, clipped to the inside of the rim.
  function chord(px, py, ang, fallback) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const fx = px - cx, fy = py - cy;
    const b = fx * ux + fy * uy, c = fx * fx + fy * fy - RR * RR;
    const disc = b * b - c;
    if (disc <= 4) return fallback ? chord(fallback[0], fallback[1], fallback[2]) : null;
    const s = Math.sqrt(disc), t1 = -b - s, t2 = -b + s;
    return { a: [px + t1 * ux, py + t1 * uy], b: [px + t2 * ux, py + t2 * uy], u: [ux, uy] };
  }

  // Long track: rim to rim.
  const longBase = [148, 87, Math.atan2(65, 110)];
  const long = chord(148 + jit(10), 87 + jit(10), longBase[2] + jit(15 * deg), longBase);
  const longSeg = [long.a, long.b];

  // Alpha track: 30 units in from the rim, short and fat.
  const alphaBase = [147, 155, Math.atan2(-15, 25)];
  const ach = chord(147 + jit(10), 155 + jit(10), alphaBase[2] + jit(15 * deg), alphaBase);
  const alphaSeg = [ach.a, [ach.a[0] + 30 * ach.u[0], ach.a[1] + 30 * ach.u[1]]];

  // Faint track near the bottom.
  const faintBase = [175, 183, Math.atan2(-8, 65)];
  const fch = chord(175 + jit(10), 183 + jit(10), faintBase[2] + jit(15 * deg), faintBase);
  const faintSeg = [fch.a, fch.b];

  // Zero to two extra faint dashed tracks.
  const extras = [];
  const nExtra = Math.floor(rand() * 3);
  for (let i = 0; i < nExtra; i++) {
    const a = rand() * Math.PI * 2, rr = 15 + rand() * 30;
    const c = chord(cx + rr * Math.cos(a), cy + rr * Math.sin(a), rand() * Math.PI);
    if (c) extras.push([c.a, c.b]);
  }

  // Spiral: enters at the rim, comes in tangentially, then tightens from r16 to r3.
  const sc = [214 + jit(8), 118 + jit(8)];
  const turns = 2.5 + rand();
  const dir = rand() < 0.5 ? 1 : -1;
  const ea = Math.atan2(88 - cy, 252 - cx);
  const E = [cx + RR * Math.cos(ea), cy + RR * Math.sin(ea)];
  const th0 = Math.atan2(E[1] - sc[1], E[0] - sc[0]);
  const ths = th0 + dir * Math.PI / 2;
  const S = [sc[0] + 16 * Math.cos(ths), sc[1] + 16 * Math.sin(ths)];
  const tan = [-dir * Math.sin(ths), dir * Math.cos(ths)];
  const C = [S[0] - tan[0] * 22, S[1] - tan[1] * 22];
  const path = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, m = 1 - t;
    path.push([m * m * E[0] + 2 * m * t * C[0] + t * t * S[0], m * m * E[1] + 2 * m * t * C[1] + t * t * S[1]]);
  }
  const N = Math.ceil(turns * 72);
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    const th = ths + dir * u * turns * Math.PI * 2;
    const r = 16 * Math.pow(3 / 16, u);
    path.push([sc[0] + r * Math.cos(th), sc[1] + r * Math.sin(th)]);
  }
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
  for (const [px, py] of path) {
    bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px);
    by0 = Math.min(by0, py); by1 = Math.max(by1, py);
  }
  bx0 -= 22; bx1 += 22; by0 -= 22; by1 += 22;

  g.print((x, y) => {
    const r = Math.hypot(x - cx, y - cy);
    if (r > RB + 2) return 0;
    const w = solid(r - R);
    // Mist, lit from the upper left.
    const s = ((x - cx) + (y - cy)) / (Math.SQRT2 * R);
    const mist = 0.25 - 0.13 * smooth(clamp((s + 1) / 2));
    let ink = mist * w;
    if (r > R - 1.6 && r < RB) ink = Math.max(ink, 0.08);
    if (w <= 0) return ink;

    // Long track: bright core, narrow glow back to mist.
    const dL = sdPolyline(x, y, longSeg);
    if (dL < 16) {
      const t = Math.max(solid(dL - 2), 0.6 * Math.exp(-Math.max(0, dL - 2) / 3.2));
      ink = Math.max(ink, w * (mist + (0.85 - mist) * t));
    }
    // Alpha track: the brightest mass.
    const dA = sdPolyline(x, y, alphaSeg);
    if (dA < 24) {
      const t = Math.max(solid(dA - 2.5), 0.7 * Math.exp(-Math.max(0, dA - 2.5) / 3.5));
      ink = Math.max(ink, w * (mist + (1 - mist) * t));
    }
    // Faint track, no glow.
    const dF = sdPolyline(x, y, faintSeg);
    if (dF < 5) ink = Math.max(ink, w * 0.5 * solid(dF - 2));
    for (const seg of extras) {
      const d = sdPolyline(x, y, seg);
      if (d < 5) ink = Math.max(ink, w * 0.36 * solid(d - 2));
    }

    // Spiral: the orange story, pooling at its centre.
    let o = 0;
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      const dS = sdPolyline(x, y, path);
      o = 0.9 * solid(dS - 2) + 0.45 * Math.exp(-Math.max(0, dS - 2) / 4);
      o += 0.3 * Math.exp(-Math.hypot(x - sc[0], y - sc[1]) / 7);
      o = Math.min(1, o) * w;
    }
    return [ink, o];
  });

  const circle = (r) =>
    `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  g.line(circle(R), "ink");
  g.line(circle(RB), "soft");
  g.line(polyD(longSeg), "soft");
  g.line(polyD(faintSeg), "faint", { dash: "2 3" });
  for (const seg of extras) g.line(polyD(seg), "faint", { dash: "1 3" });
  g.line(polyD(path), "sig");
}
