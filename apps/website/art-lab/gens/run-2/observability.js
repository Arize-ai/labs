function draw(g, rand, seed, k) {
  // A magnifying lens over a dim service graph, revealing one fault
  const { X0, X1, Y0, Y1, clamp, solid, glow, sdBox, num } = k;

  // The system: a grid of service nodes with sparse connections.
  const cols = 8, rows = 5, hs = 4;
  const nodes = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      nodes.push([X0 + 8 + (i * (X1 - X0 - 16)) / (cols - 1), Y0 + 10 + (j * (Y1 - Y0 - 20)) / (rows - 1)]);
  const at = (i, j) => nodes[j * cols + i];
  const edges = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      if (i < cols - 1 && rand() < 0.7) edges.push([at(i, j), at(i + 1, j)]);
      if (j < rows - 1 && rand() < 0.5) edges.push([at(i, j), at(i, j + 1)]);
      if (i < cols - 1 && j < rows - 1 && rand() < 0.15) edges.push([at(i, j), at(i + 1, j + 1)]);
    }

  // The lens, magnifying m× about its centre, with a handle down-right.
  const R = 50, m = 1.45;
  const cx = 172 + rand() * 56, cy = 110 + rand() * 10;
  const ux = Math.SQRT1_2, uy = Math.SQRT1_2;
  const s0 = R + 3, s1 = R + 44, hw = 5;
  const mag = ([x, y]) => [cx + (x - cx) * m, cy + (y - cy) * m];

  // The fault: a node close enough to the centre that its magnified image sits inside.
  const ox = cx + (rand() - 0.5) * 30, oy = cy + (rand() - 0.5) * 20;
  let fault = null, best = Infinity;
  for (const n of nodes) {
    const dc = Math.hypot(n[0] - cx, n[1] - cy);
    const d = Math.hypot(n[0] - ox, n[1] - oy);
    if (dc < R / m - 9 && d < best) { best = d; fault = n; }
  }

  const segD = (ax, ay, bx, by, x, y) => {
    const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1));
    return Math.hypot(wx - ex * t, wy - ey * t);
  };

  g.print((x, y) => {
    // The handle sits over everything.
    const rx = x - cx, ry = y - cy;
    const along = rx * ux + ry * uy, across = -rx * uy + ry * ux;
    const hd = sdBox(along, across, (s0 + s1) / 2, 0, (s1 - s0) / 2, hw, 2);
    if (hd < 2) {
      const sh = 0.9 - 0.3 * clamp((along - s0) / (s1 - s0)) - 0.15 * clamp((across + hw) / (2 * hw));
      return [solid(hd) * sh, 0];
    }
    const ld = Math.hypot(rx, ry) - R;
    if (ld < 0) {
      // Inside the glass: the system seen magnified and lit.
      const qx = cx + rx / m, qy = cy + ry / m;
      let ink = 0.05 + 0.1 * clamp(1 - Math.hypot(x - (cx - R * 0.45), y - (cy - R * 0.45)) / R);
      let sig = 0;
      for (const [a, b] of edges) {
        if (Math.max(a[0], b[0]) < qx - 8 || Math.min(a[0], b[0]) > qx + 8) continue;
        if (Math.max(a[1], b[1]) < qy - 8 || Math.min(a[1], b[1]) > qy + 8) continue;
        ink = Math.max(ink, 0.28 * glow(segD(a[0], a[1], b[0], b[1], qx, qy) * m, 3));
      }
      for (const n of nodes) {
        if (Math.abs(n[0] - qx) > 14 || Math.abs(n[1] - qy) > 14) continue;
        const d = sdBox(qx, qy, n[0], n[1], hs, hs, 0.5) * m;
        if (n === fault) sig = Math.max(sig, solid(d) + 0.4 * glow(d, 7));
        else {
          const sh = 1 - 0.25 * clamp((qx - n[0] + hs) / (2 * hs));
          ink = Math.max(ink, solid(d) * 0.9 * sh + 0.22 * glow(d, 5));
        }
      }
      return [ink * smooth01(-ld), sig];
    }
    // Outside: the system is barely there; a soft halo hugs the rim.
    let ink = 0.14 * glow(ld, 6);
    for (const n of nodes) {
      if (Math.abs(n[0] - x) > 8 || Math.abs(n[1] - y) > 8) continue;
      ink = Math.max(ink, 0.2 * solid(sdBox(x, y, n[0], n[1], hs, hs, 0.5)));
    }
    return [ink, 0];
  });
  function smooth01(d) { return 0.75 + 0.25 * clamp(d / 3); }

  // Segment ∩ disc as a parameter interval.
  const clip = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], fx = a[0] - cx, fy = a[1] - cy;
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - R * R;
    const disc = B * B - 4 * A * C;
    if (disc <= 0) return null;
    const s = Math.sqrt(disc);
    return [(-B - s) / (2 * A), (-B + s) / (2 * A)];
  };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const seg = (a, b, t0, t1) => {
    const p = lerp(a, b, t0), q = lerp(a, b, t1);
    return `M${num(p[0])} ${num(p[1])}L${num(q[0])} ${num(q[1])}`;
  };

  // Edges: faint outside the glass, magnified ink inside it.
  let faint = "", inner = "";
  for (const [a, b] of edges) {
    const c = clip(a, b);
    if (!c || c[1] <= 0 || c[0] >= 1) faint += seg(a, b, 0, 1);
    else {
      if (c[0] > 0) faint += seg(a, b, 0, c[0]);
      if (c[1] < 1) faint += seg(a, b, c[1], 1);
    }
    const ma = mag(a), mb = mag(b), mc = clip(ma, mb);
    if (mc && mc[1] > 0 && mc[0] < 1) inner += seg(ma, mb, Math.max(0, mc[0]), Math.min(1, mc[1]));
  }
  if (faint) g.line(faint, "faint");
  if (inner) g.line(inner, "ink", { width: 1.25 });
  for (const n of nodes)
    if (Math.hypot(n[0] - cx, n[1] - cy) > R + 7) g.box(n[0] - hs, n[1] - hs, 2 * hs, 2 * hs, "faint");

  // The lens: a double rim and the handle outline.
  const circ = (r) =>
    `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  g.line(circ(R), "ink", { width: 1.5 });
  g.line(circ(R - 3), "soft");
  const corner = (s, w) => [cx + ux * s - uy * w, cy + uy * s + ux * w];
  const hp = [corner(s0, -hw), corner(s1, -hw), corner(s1, hw), corner(s0, hw)];
  g.line("M" + hp.map(([x, y]) => `${num(x)} ${num(y)}`).join("L") + "Z", "ink", { width: 1.25 });
  g.line(`M${num(cx + ux * R)} ${num(cy + uy * R)}L${num(cx + ux * s0)} ${num(cy + uy * s0)}`, "ink", { width: 1.5 });
}
