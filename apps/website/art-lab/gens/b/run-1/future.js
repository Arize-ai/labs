function draw(g, rand, seed, k) {
  // A forecast cone fanning out from a single bright point of now
  const { clamp, smooth, solid, glow, sdPolyline, polyD, num } = k;

  // Present point and cone geometry
  const px = 182, py = 138, pr = 5;
  const farX = 306, topY = 74, botY = 188, peakX = 312;
  const ctrlX = 2 * peakX - farX; // quadratic control so the arc peaks at 312
  const arcX = (y) => { const t = clamp((y - topY) / (botY - topY)); return farX + 2 * (ctrlX - farX) * t * (1 - t); };
  const arcPt = (t) => [farX + 2 * (ctrlX - farX) * t * (1 - t), topY + (botY - topY) * t];

  // Edge half-planes
  const uvx = farX - px, uvy = topY - py, ul = Math.hypot(uvx, uvy);
  const lvx = farX - px, lvy = botY - py, ll = Math.hypot(lvx, lvy);
  const dUp = (x, y) => -(uvx * (y - py) - uvy * (x - px)) / ul; // >0 above the upper edge
  const dLo = (x, y) => (lvx * (y - py) - lvy * (x - px)) / ll;  // >0 below the lower edge

  // Past track: quadratic through start, a wobbled middle and the present point
  const a = [92, 172 + (rand() * 2 - 1) * 2];
  const m = [135 + (rand() * 2 - 1) * 3, 160 + (rand() * 2 - 1) * 3];
  const b = [px, py];
  const c = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
  const wobA = (rand() * 2 - 1) * 2.5, wobF = 2 + rand() * 1.5;
  const track = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, s = 1 - t;
    const x = s * s * a[0] + 2 * s * t * c[0] + t * t * b[0];
    const y = s * s * a[1] + 2 * s * t * c[1] + t * t * b[1] + wobA * Math.sin(Math.PI * t * wobF) * Math.sin(Math.PI * t);
    track.push([x, y]);
  }

  // Fan of five possible paths
  const baseT = [0.12, 0.31, 0.5, 0.69, 0.88];
  const bowAmp = [6, 7, 1.5, 7, 6];
  const paths = baseT.map((t0, i) => {
    const jit = i === 2 ? 0.02 : 8 / (botY - topY);
    const t = clamp(t0 + (rand() * 2 - 1) * jit, 0.08, 0.92);
    const ep = arcPt(t);
    const end = [ep[0] - 2, ep[1]];
    let bow = (rand() * 2 - 1) * bowAmp[i];
    if (i === 0) bow = Math.abs(bow);      // outer paths bend toward the centre, never out of the cone
    if (i === 4) bow = -Math.abs(bow);
    const ctl = [(px + end[0]) / 2, (py + end[1]) / 2 + bow];
    const pts = [];
    for (let j = 0; j <= 28; j++) {
      const u = j / 28, s = 1 - u;
      const x = s * s * px + 2 * s * u * ctl[0] + u * u * end[0];
      const y = s * s * py + 2 * s * u * ctl[1] + u * u * end[1];
      if (Math.hypot(x - px, y - py) > pr + 1.5) pts.push([x, y]);
    }
    return pts;
  });

  g.print((x, y) => {
    if (x < 86 || x > 320 || y < 60 || y > 196) return 0;
    let ink = 0;

    // Cone interior: bright at the root, thinning toward the far arc
    if (x > px - 4 && x < ctrlX) {
      const d1 = dUp(x, y), d2 = dLo(x, y), d3 = x - arcX(y);
      const sd = Math.max(d1, d2, d3);
      if (sd < 4) {
        const u = clamp((x - px) / (arcX(y) - px));
        let tone = 0.6 - 0.45 * u;
        tone += 0.1 * glow(-d1, 5) * (d1 < 0 ? 1 : 0); // lift along the upper edge
        ink = Math.max(ink, tone * solid(sd));
      }
    }

    // Past track: a steady band, no glow
    if (x < px + 6) {
      const td = sdPolyline(x, y, track) - 3;
      ink = Math.max(ink, 0.35 * solid(td));
    }

    // Present point and its tight orange glow
    const r = Math.hypot(x - px, y - py);
    let orange = 0;
    if (r < 24) {
      const disc = solid(r - pr);
      orange = Math.max(disc, 0.7 * smooth(clamp(1 - (r - pr) / 17)));
      if (disc > 0.5) ink = 0;
    }
    return [ink, orange];
  });

  // Past track
  g.line(polyD(track), "ink");
  // Cone edges
  g.line(`M${px} ${py}L${farX} ${topY}`, "soft");
  g.line(`M${px} ${py}L${farX} ${botY}`, "soft");
  // Far arc
  g.line(`M${farX} ${topY}Q${ctrlX} ${(topY + botY) / 2} ${farX} ${botY}`, "faint", { dash: "2 3" });
  // Fan of paths
  paths.forEach((pts, i) => {
    if (pts.length < 2) return;
    if (i === 2) g.line(polyD(pts), "soft", { dash: "4 3" });
    else g.line(polyD(pts), "faint", { dash: "2 3" });
  });
  // Present point outline
  g.line(`M${num(px - pr)} ${py}A${pr} ${pr} 0 1 0 ${num(px + pr)} ${py}A${pr} ${pr} 0 1 0 ${num(px - pr)} ${py}Z`, "ink");
}
