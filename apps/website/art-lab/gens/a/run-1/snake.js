function draw(g, rand, seed, k) {
  // A banded snake winding right, its forked tongue flicking out in orange
  const { X0, X1, Y0, Y1, clamp, smooth, solid, glow, polyD, num, makeNoise } = k;
  const fbm = makeNoise(seed + 11);
  const cy = (Y0 + Y1) / 2 + 2;
  const flip = rand() < 0.5 ? 1 : -1;
  const cycles = 1.15 + rand() * 0.25;
  const amp = 26 + rand() * 6;
  const ph = Math.PI / 2 - cycles * 2 * Math.PI; // head ends on a crest, heading right
  const xA = X0 + 6, xB = X1 - 40;
  const N = 90;

  // Body centreline with radius: thin tail, thick middle, slight neck.
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = xA + (xB - xA) * u;
    const y = cy - flip * amp * Math.sin(u * cycles * 2 * Math.PI + ph) * (0.55 + 0.45 * smooth(u));
    const r = 1.6 + 8.6 * smooth(clamp(u / 0.6)) - 1.8 * smooth(clamp((u - 0.85) / 0.15));
    pts.push([x, y, r]);
  }
  // Head: continue along the final tangent, widening then rounding to a snout.
  const [ex, ey] = pts[N], [px, py] = pts[N - 1];
  let tx = ex - px, ty = ey - py;
  const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
  const headPts = [[2, 9.2], [5, 10.2], [8, 10], [11, 9], [14, 7.2], [16, 5.6]];
  const bodyEnd = pts.length;
  for (const [o, r] of headPts) pts.push([ex + tx * o, ey + ty * o, r]);

  // Arc length and segment boxes.
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], m = Math.max(a[2], b[2]) + 24;
    segs.push({ a, b, i, x0: Math.min(a[0], b[0]) - m, x1: Math.max(a[0], b[0]) + m, y0: Math.min(a[1], b[1]) - m, y1: Math.max(a[1], b[1]) + m });
  }
  const sHead = s[bodyEnd - 1];
  const bandP = 15 + rand() * 3, bandOff = rand() * bandP;
  const lx = -0.6, ly = -0.8;

  g.print((x, y) => {
    let best = Infinity, ox = 0, oy = 0, rr = 1, ss = 0;
    for (const sg of segs) {
      if (x < sg.x0 || x > sg.x1 || y < sg.y0 || y > sg.y1) continue;
      const { a, b } = sg;
      const vx = b[0] - a[0], vy = b[1] - a[1], wx = x - a[0], wy = y - a[1];
      const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy || 1));
      const cx = a[0] + vx * t, cyy = a[1] + vy * t;
      const r = a[2] + (b[2] - a[2]) * t;
      const d = Math.hypot(x - cx, y - cyy) - r;
      if (d < best) { best = d; ox = x - cx; oy = y - cyy; rr = r; ss = s[sg.i] + (s[sg.i + 1] - s[sg.i]) * t; }
    }
    if (best === Infinity) return 0;
    // Round body lit from the upper left.
    const lit = clamp((ox * lx + oy * ly) / Math.max(rr, 1), -1, 1);
    let tone = 0.58 + 0.34 * lit;
    if (ss < sHead - 4) {
      const ph2 = ((ss + bandOff) % bandP) / bandP;
      const band = smooth(clamp((ph2 - 0.62) / 0.08)) * (1 - smooth(clamp((ph2 - 0.9) / 0.08)));
      tone *= 1 - 0.62 * band;
    } else tone += 0.06;
    tone += 0.06 * (fbm(x / 4, y / 4) - 0.5);
    // Soft cast shadow under the body, offset down-right.
    const shadow = best > 0 ? 0.12 * glow(best - 2 * Math.max(0, oy / Math.max(rr, 1)) , 7) : 0;
    return Math.max(solid(best) * clamp(tone), shadow);
  });

  // Outline: offset the centreline both ways and close around the snout.
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const [x, y, r] = pts[i];
    left.push([x - dy * r, y + dx * r]);
    right.push([x + dy * r, y - dx * r]);
  }
  const last = pts[pts.length - 1];
  const snout = [last[0] + tx * last[2], last[1] + ty * last[2]];
  g.line(polyD(left.concat([snout], right.slice().reverse()), true), "ink", { width: 1.25 });

  // Dorsal guide along the spine.
  g.line(polyD(pts.slice(6, bodyEnd).map(([x, y]) => [x, y])), "faint", { dash: "1 3" });

  // Eye on the upper side of the head.
  const nx = ty, ny = -tx; // normal; pick the upward one
  const up = ny < 0 ? 1 : -1;
  const eh = [ex + tx * 9 + nx * up * 4.2, ey + ty * 9 + ny * up * 4.2];
  g.line(`M${num(eh[0] - 1.8)} ${num(eh[1])}a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0Z`, "ink", { width: 1.25, fill: true });

  // Forked tongue: the one orange element.
  const tb = [snout[0] + tx * 1.5, snout[1] + ty * 1.5];
  const tf = [snout[0] + tx * 10, snout[1] + ty * 10];
  const f1 = [tf[0] + tx * 4 + nx * 3.2, tf[1] + ty * 4 + ny * 3.2];
  const f2 = [tf[0] + tx * 4 - nx * 3.2, tf[1] + ty * 4 - ny * 3.2];
  g.line(`${polyD([tb, tf, f1])}${polyD([tf, f2])}`, "sig", { width: 1.25 });
}
