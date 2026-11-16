function draw(g, rand, seed, k) {
  // Two stars in a binary orbit around a shared empty centre
  const { clamp, solid, polyD, num } = k;
  const D = Math.PI / 180;
  const bx = 196, by = 125;

  const tilt = (4 + rand() * 10) * D;
  const phase = (rand() * 40 - 20) * D;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  // Counter-clockwise on the page (y points down).
  const rot = (x, y) => [bx + x * ct + y * st, by - x * st + y * ct];
  const ell = (a, b, phi) => rot(a * Math.cos(phi), b * Math.sin(phi));

  // Base phase: the one that lands the small star nearest (250, 129) at the brief's 8° tilt.
  const c8 = Math.cos(8 * D), s8 = Math.sin(8 * D);
  const lx = 54 * c8 - 4 * s8, ly = 54 * s8 + 4 * c8;
  const phi0 = Math.atan2(ly / 22, lx / 54);
  const phi = phi0 + phase;

  const rL = 18, rS = 12;
  const [Lx, Ly] = ell(36, 15, phi + Math.PI);
  const [Sx, Sy] = ell(54, 22, phi);

  // The bridge runs from the small star's limb to the large star's limb and arcs upward.
  const ux = Lx - Sx, uy = Ly - Sy, ul = Math.hypot(ux, uy);
  const dx = ux / ul, dy = uy / ul;
  const A = [Sx + dx * rS, Sy + dy * rS];
  const B = [Lx - dx * rL, Ly - dy * rL];
  let nx = -dy, ny = dx;
  if (ny > 0) { nx = -nx; ny = -ny; } // the normal that points up the page
  const sag = 7.5;
  const C = [(A[0] + B[0]) / 2 + nx * sag * 2, (A[1] + B[1]) / 2 + ny * sag * 2];
  const bridge = [], upper = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, m = 1 - t;
    const px = m * m * A[0] + 2 * m * t * C[0] + t * t * B[0];
    const py = m * m * A[1] + 2 * m * t * C[1] + t * t * B[1];
    let tx = 2 * m * (C[0] - A[0]) + 2 * t * (B[0] - C[0]);
    let ty = 2 * m * (C[1] - A[1]) + 2 * t * (B[1] - C[1]);
    const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    let ox = -ty, oy = tx;
    if (oy > 0) { ox = -ox; oy = -oy; }
    bridge.push([px, py]);
    upper.push([px + ox * 2.2, py + oy * 2.2]);
  }
  const bx0 = Math.min(A[0], B[0]) - 6, bx1 = Math.max(A[0], B[0]) + 6;
  const by0 = Math.min(A[1], B[1], C[1]) - 6, by1 = Math.max(A[1], B[1]) + 6;
  const segD = (x, y) => {
    let best = 1e9;
    for (let i = 0; i < bridge.length - 1; i++) {
      const [x0, y0] = bridge[i], [x1, y1] = bridge[i + 1];
      const vx = x1 - x0, vy = y1 - y0;
      const h = clamp(((x - x0) * vx + (y - y0) * vy) / (vx * vx + vy * vy));
      const d = Math.hypot(x - x0 - vx * h, y - y0 - vy * h);
      if (d < best) best = d;
    }
    return best;
  };

  g.print((x, y) => {
    if (x < 60 || x > 330 || y < 30 || y > 220) return 0;
    const dL = Math.hypot(x - Lx, y - Ly), dS = Math.hypot(x - Sx, y - Sy);
    const orange = solid(Math.hypot(x - bx, y - by) - 2.5);

    // The stars: hard discs with a gentle fall from core to rim.
    if (dL < rL + 1) {
      const h = Math.hypot(x - (Lx - 4), y - (Ly - 4));
      return [Math.max(0.85, 0.85 + 0.15 * clamp(1 - h / rL)) * solid(dL - rL), 0];
    }
    if (dS < rS + 1) {
      const h = Math.hypot(x - (Sx - 2.5), y - (Sy - 2.5));
      return [Math.max(0.7, 0.7 + 0.15 * clamp(1 - h / rS)) * solid(dS - rS), 0];
    }

    // The round glows add together, which warms the gap between the stars.
    let ink = 0.6 * clamp(1 - (dL - rL) / 62) + 0.5 * clamp(1 - (dS - rS) / 46);

    // The bridge rides on top of the glow so it still reads where the glow is warm.
    if (x > bx0 && x < bx1 && y > by0 && y < by1) {
      const d = segD(x, y);
      if (d < 5) {
        const t = clamp(((x - A[0]) * (B[0] - A[0]) + (y - A[1]) * (B[1] - A[1])) / (ul - rL - rS) ** 2);
        const tone = 0.55 - 0.2 * (1 - Math.abs(2 * t - 1));
        ink += tone * solid(d - 2.2);
      }
    }
    return [clamp(ink, 0, 0.95), orange];
  });

  // The orbits: half-strength, short even dashes.
  for (const [a, b] of [[36, 15], [54, 22]]) {
    const pts = [];
    for (let i = 0; i < 96; i++) pts.push(ell(a, b, (i / 96) * 2 * Math.PI));
    g.line(polyD(pts, true), "soft", { dash: "2 2.5" });
  }

  // The rims of the stars.
  const circle = (cx, cy, r) =>
    `M${num(cx - r)} ${num(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  g.line(circle(Lx, Ly, rL), "ink");
  g.line(circle(Sx, Sy, rS), "ink");

  // The upper edge of the bridge.
  g.line(polyD(upper), "faint");

  // The chart crosshair at the barycentre, gapped so the orange dot stays clear.
  const g0 = 3.2, g1 = 6;
  g.line(
    `M${num(bx - g1)} ${num(by)}H${num(bx - g0)}M${num(bx + g0)} ${num(by)}H${num(bx + g1)}` +
    `M${num(bx)} ${num(by - g1)}V${num(by - g0)}M${num(bx)} ${num(by + g0)}V${num(by + g1)}`,
    "faint"
  );
}
