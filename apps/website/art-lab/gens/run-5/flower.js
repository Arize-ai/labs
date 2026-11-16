function draw(g, rand, seed, k) {
  // A daisy-like flower on a stem, its orange centre the point.
  const { clamp, solid, glow, sdPolyline, polyD, num, Y1, X0, X1 } = k;

  // Head geometry.
  const n = 5 + Math.floor(rand() * 3);
  const cx = 200 + (rand() - 0.5) * 10, cy = 96;
  const r0 = 21, a = 18, R = r0 + a, rc = 10;
  const b = Math.min(10.5, r0 * Math.sin(Math.PI / n) * 0.85);
  const rot = rand() * Math.PI * 2;
  const petals = Array.from({ length: n }, (_, i) => {
    const t = rot + (i * 2 * Math.PI) / n, c = Math.cos(t), s = Math.sin(t);
    return { t, c, s, x: cx + r0 * c, y: cy + r0 * s };
  });
  const petalD = (x, y, p) => {
    const dx = x - p.x, dy = y - p.y;
    const u = dx * p.c + dy * p.s, v = -dx * p.s + dy * p.c;
    return (Math.hypot(u / a, v / b) - 1) * b;
  };
  const headD = (x, y) => {
    let d = Infinity;
    for (const p of petals) d = Math.min(d, petalD(x, y, p));
    return d;
  };

  // Stem: a gentle quadratic curve from the head down to the ground.
  const lean = (rand() - 0.5) * 24;
  const S = [cx, cy + rc], E = [cx + lean, Y1], C = [cx - lean * 0.6, (S[1] + E[1]) / 2];
  const N = 30;
  const stem = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N, u = 1 - t;
    return [u * u * S[0] + 2 * u * t * C[0] + t * t * E[0], u * u * S[1] + 2 * u * t * C[1] + t * t * E[1]];
  });

  // Leaf: an ellipse leaning up and out from the stem.
  const side = rand() < 0.5 ? -1 : 1;
  const base = stem[Math.round(N * 0.68)];
  const la = 17, lb = 6;
  const lt = Math.atan2(-Math.sin(0.6), side * Math.cos(0.6));
  const leaf = { c: Math.cos(lt), s: Math.sin(lt), x: base[0] + la * Math.cos(lt), y: base[1] + la * Math.sin(lt) };
  const leafD = (x, y) => {
    const dx = x - leaf.x, dy = y - leaf.y;
    const u = dx * leaf.c + dy * leaf.s, v = -dx * leaf.s + dy * leaf.c;
    return (Math.hypot(u / la, v / lb) - 1) * lb;
  };

  const stemX0 = Math.min(S[0], C[0], E[0]) - 14, stemX1 = Math.max(S[0], C[0], E[0]) + 14;

  g.print((x, y) => {
    let ink = 0, sig = 0;
    // Light from the upper left.
    const lit = clamp(0.5 - (x - cx + (y - cy)) / (1.6 * R));
    const hr = Math.hypot(x - cx, y - cy);
    if (hr < R + 30) {
      const d = headD(x, y);
      ink = Math.max(ink, solid(d) * (0.55 + 0.4 * lit) + 0.16 * glow(d, 7));
      const dd = hr - rc;
      sig = solid(dd) * (0.85 + 0.15 * lit) + 0.3 * glow(dd, 5);
    }
    if (y > cy + rc - 2 && x > stemX0 && x < stemX1) {
      const ds = sdPolyline(x, y, stem) - 1.2;
      if (headD(x, y) > 0) ink = Math.max(ink, 0.5 * solid(ds) + 0.14 * glow(ds, 4));
    }
    if (Math.hypot(x - leaf.x, y - leaf.y) < la + 14) {
      const dl = leafD(x, y);
      const ll = clamp(0.5 - (x - leaf.x + (y - leaf.y)) / (2.2 * la));
      ink = Math.max(ink, solid(dl) * (0.35 + 0.3 * ll) + 0.12 * glow(dl, 5));
    }
    return [ink, sig];
  });

  const ellipse = (ex, ey, ea, eb, t) => {
    const c = Math.cos(t), s = Math.sin(t), deg = num((t * 180) / Math.PI);
    const p1 = `${num(ex + ea * c)} ${num(ey + ea * s)}`, p2 = `${num(ex - ea * c)} ${num(ey - ea * s)}`;
    return `M${p1}A${num(ea)} ${num(eb)} ${deg} 0 1 ${p2}A${num(ea)} ${num(eb)} ${deg} 0 1 ${p1}Z`;
  };
  const circle = (x, y, r) => `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;

  // A dotted guide circle around the head, and the ground.
  g.line(circle(cx, cy, R + 7), "faint", { dash: "1 3" });
  g.line(`M${num(X0 + 40)} ${Y1 + 0.5}H${num(X1 - 40)}`, "faint", { dash: "1 3" });

  // Stem from where it leaves the petals, then the leaf and its midrib.
  const from = stem.findIndex(([x, y]) => headD(x, y) > 1);
  g.line(polyD(stem.slice(Math.max(from, 0))), "ink", { width: 1.25 });
  g.line(ellipse(leaf.x, leaf.y, la, lb, lt), "ink");
  g.line(polyD([base, [leaf.x + (la - 3) * leaf.c, leaf.y + (la - 3) * leaf.s]]), "soft");

  // Petal outlines with dotted midribs.
  for (const p of petals) {
    g.line(ellipse(p.x, p.y, a, b, p.t), "ink");
    g.line(polyD([[cx + (rc + 3) * p.c, cy + (rc + 3) * p.s], [cx + (R - 5) * p.c, cy + (R - 5) * p.s]]), "faint", { dash: "1 3" });
  }
  g.line(circle(cx, cy, rc), "sig");
}
