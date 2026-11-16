function draw(g, rand, seed, k) {
  // A glass prism splitting one beam into a fan of rays
  const { clamp, solid, glow, sdPolyline, inPolygon, polyD, num } = k;
  const deg = Math.PI / 180;

  // The prism.
  const A = [200, 78], B = [150, 165], C = [250, 165];
  const prism = [A, C, B];

  // Incoming beam: fixed source, jittered angle, entry found on the left face.
  const S = [88, 98];
  const baseAng = Math.atan2(117 - 98, 178 - 88);
  const ang = baseAng + (rand() * 2 - 1) * 3 * deg;
  const r = [Math.cos(ang), Math.sin(ang)];
  const q = [B[0] - A[0], B[1] - A[1]];
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  let te = cross([S[0] - A[0], S[1] - A[1]], r) / cross(q, r);
  te = clamp(te, 0.25, 0.65);
  const E = [A[0] + te * q[0], A[1] + te * q[1]];

  // Exit on the right face, moved along with the entry.
  const tx = clamp(0.48 + (te - 0.44) * 0.9, 0.3, 0.68);
  const X = [A[0] + tx * (C[0] - A[0]), A[1] + tx * (C[1] - A[1])];

  // The fan.
  const n = 5 + Math.floor(rand() * 3);
  const open = (30 + rand() * 10) * deg;
  const mid = 17.8 * deg;
  const tipX = 312;
  const rays = [];
  for (let i = 0; i < n; i++) {
    const a = mid - open / 2 + (open * i) / (n - 1);
    rays.push([X, [tipX, X[1] + (tipX - X[0]) * Math.tan(a)]]);
  }
  const sig = Math.ceil(n / 2); // just below the middle

  const beam = [S, E];
  const inner = [E, X];
  const beamHalf = 3;

  g.print((x, y) => {
    if (x < 78 || x > 322 || y < 68 || y > 198) return 0;
    let ink = 0, orange = 0;

    // Glass body, lit from the upper left.
    if (inPolygon(x, y, prism)) {
      const u = clamp(((x - 150) + (y - 78)) / 187);
      ink = 0.4 - 0.25 * u;
    }

    // Incoming beam: solid even band with a tight halo.
    const db = sdPolyline(x, y, beam) - beamHalf;
    ink = Math.max(ink, 0.95 * solid(db), 0.45 * glow(db, 3.5));

    // Hot spot at the entry.
    const dh = Math.hypot(x - E[0], y - E[1]) - 3;
    ink = Math.max(ink, solid(dh), 0.6 * glow(dh, 5));

    // Path through the glass.
    const di = sdPolyline(x, y, inner) - 2.5;
    ink = Math.max(ink, 0.7 * solid(di));

    // The fan.
    if (x > X[0] - 2) {
      const f = clamp((x - X[0]) / (tipX - X[0]));
      for (let i = 0; i < n; i++) {
        const d = sdPolyline(x, y, rays[i]) - 2.4;
        if (i === sig) {
          if (x > X[0] + 3) orange = Math.max(orange, 0.8 * solid(d), 0.35 * glow(d, 2.5));
        } else {
          ink = Math.max(ink, (0.55 - 0.25 * f) * solid(d));
        }
      }
    }
    return [ink, orange];
  });

  // Prism outline.
  g.line(polyD(prism, true), "ink");

  // Beam edges.
  const nb = [-r[1], r[0]];
  for (const s of [-beamHalf, beamHalf]) {
    g.line(`M${num(S[0] + s * nb[0])} ${num(S[1] + s * nb[1])}L${num(E[0] + s * nb[0])} ${num(E[1] + s * nb[1])}`, "soft");
  }

  // Fan centrelines; the pulled-out ray in orange.
  for (let i = 0; i < n; i++) {
    const [p0, p1] = rays[i];
    g.line(`M${num(p0[0])} ${num(p0[1])}L${num(p1[0])} ${num(p1[1])}`, i === sig ? "sig" : "soft");
  }

  // Table line.
  g.line(`M120 172.5H290`, "faint", { dash: "4 3" });

  // Normal at the entry, perpendicular to the left face.
  const ql = Math.hypot(q[0], q[1]);
  const nn = [-q[1] / ql, q[0] / ql];
  g.line(
    `M${num(E[0] - 12 * nn[0])} ${num(E[1] - 12 * nn[1])}L${num(E[0] + 12 * nn[0])} ${num(E[1] + 12 * nn[1])}`,
    "faint",
    { dash: "2 2" }
  );
}
