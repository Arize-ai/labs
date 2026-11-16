function draw(g, rand, seed, k) {
  // A banded snake slithering right, lit from the upper left, orange tongue
  const { clamp, smooth, solid, glow, polyD, num } = k;
  const phase = rand() * Math.PI * 2, amp = 22 + rand() * 8, waves = 1.6 + rand() * 0.3;
  const cy = 128, xa = 92, xb = 276;
  const N = 72;
  const pts = [], rad = [], us = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = xa + (xb - xa) * u;
    const y = cy + amp * Math.sin(2 * Math.PI * waves * u + phase) * (0.45 + 0.55 * u);
    pts.push([x, y]);
    us.push(u);
    const neck = 1 - 0.14 * Math.exp(-(((u - 0.95) / 0.035) ** 2));
    rad.push((1.2 + 9.6 * Math.pow(u, 0.6)) * neck);
  }
  const tan = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  });
  const nor = tan.map(([tx, ty]) => [-ty, tx]);

  // Head: an ellipse just past the end of the spine, aligned with it.
  const dir = tan[N], hn = nor[N], end = pts[N];
  const ha = 13, hb = 9.5;
  const hc = [end[0] + dir[0] * 4, end[1] + dir[1] * 4];
  const topSide = hn[1] < 0 ? 1 : -1;
  const eye = [hc[0] + dir[0] * 4 + hn[0] * 4.2 * topSide, hc[1] + dir[1] * 4 + hn[1] * 4.2 * topSide];
  const L = [-0.6, -0.8];

  // Segment bounding boxes for culling.
  const segs = [];
  for (let i = 1; i <= N; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], r = Math.max(rad[i - 1], rad[i]) + 16;
    segs.push({ i, x0: Math.min(ax, bx) - r, x1: Math.max(ax, bx) + r, y0: Math.min(ay, by) - r, y1: Math.max(ay, by) + r });
  }

  g.print((x, y) => {
    if (x < 70 || x > 330 || y < 50 || y > 200) return 0;
    let best = Infinity, bu = 0, bq = 0, br = 1, bi = 1;
    for (const s of segs) {
      if (x < s.x0 || x > s.x1 || y < s.y0 || y > s.y1) continue;
      const i = s.i;
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey));
      const px = wx - ex * t, py = wy - ey * t;
      const r = rad[i - 1] + (rad[i] - rad[i - 1]) * t;
      const sd = Math.hypot(px, py) - r;
      if (sd < best) {
        best = sd; bu = us[i - 1] + (us[i] - us[i - 1]) * t; br = r; bi = i;
        const n = nor[i];
        bq = px * n[0] + py * n[1];
      }
    }
    // Head in its own frame.
    const lx = (x - hc[0]) * dir[0] + (y - hc[1]) * dir[1];
    const ly = (x - hc[0]) * hn[0] + (y - hc[1]) * hn[1];
    const hd = (Math.hypot(lx / ha, ly / hb) - 1) * hb;
    const facing = hn[0] * L[0] + hn[1] * L[1];
    let ink = 0;
    if (hd < best) {
      const shade = clamp(0.8 + 0.2 * (ly / hb) * facing + 0.08 * (-lx / ha));
      ink = solid(hd) * 0.92 * shade + 0.2 * glow(hd, 6);
    } else {
      const n = nor[bi];
      const f = n[0] * L[0] + n[1] * L[1];
      const shade = clamp(0.76 + 0.24 * clamp(bq / br, -1, 1) * f);
      const band = smooth(clamp(0.5 + 0.9 * Math.cos(bu * Math.PI * 2 * 9)));
      ink = solid(best) * shade * (0.5 + 0.42 * band) + 0.2 * glow(best, 6);
    }
    const ed = Math.hypot(x - eye[0], y - eye[1]) - 2;
    if (ed < 0) ink = 0;
    return ink;
  });

  // Outline: left flank to the neck, round the head's snout, back down the right flank.
  const uN = Math.round(N * 0.93);
  const left = [], right = [];
  for (let i = 0; i <= uN; i++) {
    const [x, y] = pts[i], [nx, ny] = nor[i], r = rad[i];
    left.push([x + nx * r, y + ny * r]);
    right.push([x - nx * r, y - ny * r]);
  }
  const headArc = [];
  for (let s = 0; s <= 24; s++) {
    const phi = (2 * Math.PI) / 3 - (s / 24) * (4 * Math.PI) / 3;
    const ca = Math.cos(phi) * ha, sb = Math.sin(phi) * hb;
    headArc.push([hc[0] + dir[0] * ca + hn[0] * sb, hc[1] + dir[1] * ca + hn[1] * sb]);
  }
  g.line(polyD([...left, ...headArc, ...right.reverse()], true), "ink", { width: 1.25 });

  // The spine as a dotted guide, and the eye.
  g.line(polyD(pts.slice(2, uN)), "faint", { dash: "1 3" });
  g.line(`M${num(eye[0] - 2)} ${num(eye[1])}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z`, "ink");

  // The forked tongue: the one orange mark.
  const tip = [hc[0] + dir[0] * ha, hc[1] + dir[1] * ha];
  const fork = [tip[0] + dir[0] * 9, tip[1] + dir[1] * 9];
  const prong = (s) => {
    const a = 0.45 * s, c = Math.cos(a), sn = Math.sin(a);
    const dx = dir[0] * c - dir[1] * sn, dy = dir[0] * sn + dir[1] * c;
    return [fork[0] + dx * 5.5, fork[1] + dy * 5.5];
  };
  g.line(polyD([tip, fork, prong(1)]) + polyD([fork, prong(-1)]), "sig", { width: 1.25 });
}
