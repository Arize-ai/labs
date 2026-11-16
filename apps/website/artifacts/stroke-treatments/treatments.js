// Stroke treatments for cover-art rules, applied to a rendered cover-art SVG
// in the browser. Each treatment is a set of flags; combinations compose.
// The light and grain masks are rasters evaluated from the drawing's own
// field (coverArtField), so the rules respond to the same light as the dots.

const NS = "http://www.w3.org/2000/svg";
const W = 400, H = 250;
const EDGE_X = 44, EDGE_Y = 30;
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smooth = (t) => t * t * (3 - 2 * t);
const smoothstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));

const el = (name, attrs = {}) => {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

const fieldCache = new Map();
/** How strongly each point lights a rule: 0.32 in the dark, 1 in full light, faded toward the card edge. */
function lightRaster(seed, kind) {
  const key = `${seed}|${kind}`;
  if (fieldCache.has(key)) return fieldCache.get(key);
  const field = window.CoverArt.coverArtField(seed, kind);
  const light = (x, y) => Math.max(...field.tone(x, y, { fade: false, grain: false }));
  const out = new Float32Array(W * H);
  const r = 2.5;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = i + 0.5, y = j + 0.5;
      // Rules sit on shape edges, so take the brightest light just beside them.
      const l = Math.max(light(x, y), light(x + r, y), light(x - r, y), light(x, y + r), light(x, y - r));
      const edge = smooth(clamp(Math.min(x, W - x) / EDGE_X)) * smooth(clamp(Math.min(y, H - y) / EDGE_Y));
      out[j * W + i] = Math.pow(edge, 0.7) * (0.32 + 0.68 * smoothstep(0, 0.65, l));
    }
  }
  fieldCache.set(key, out);
  return out;
}

/** A luminance mask image, `res` pixels per drawing unit. */
function maskImage({ seed, kind, lit, grain }) {
  const res = grain ? 4 : 1;
  const cw = W * res, ch = H * res;
  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(cw, ch);
  const L = lit ? lightRaster(seed, kind) : null;
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const x = (px + 0.5) / res, y = (py + 0.5) / res;
      let v = 1;
      if (L) {
        // Bilinear lookup in the 1-per-unit light raster.
        const fx = clamp(x - 0.5, 0, W - 1.001), fy = clamp(y - 0.5, 0, H - 1.001);
        const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
        const a = L[j * W + i], b = L[j * W + i + 1], c = L[(j + 1) * W + i], d = L[(j + 1) * W + i + 1];
        v = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      }
      if (grain) {
        // Same character as the fills' grain: soft blotches plus a little tooth.
        const n = valueNoise(x / 1.3, y / 1.3) * 0.7 + hash2(px, py) * 0.3;
        v *= clamp(0.5 + 0.95 * n);
      }
      const o = (py * cw + px) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(clamp(v) * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Wraps `g` in a new group (so masks and filters stack) and returns the wrapper. */
function wrap(g, attrs) {
  const w = el("g", attrs);
  g.replaceWith(w);
  w.appendChild(g);
  return w;
}

function ruleInfo(p, svg) {
  const style = p.getAttribute("style") ?? "";
  const grad = p.getAttribute("stroke");
  let opacity = 1;
  const m = style.match(/stroke-opacity:([\d.]+)/);
  if (m) opacity = +m[1];
  if (grad?.startsWith("url(")) {
    const stop = svg.querySelector(`${grad.slice(4, -1)} stop`);
    const sm = stop?.getAttribute("style")?.match(/stop-opacity:([\d.]+)/);
    if (sm) opacity = +sm[1];
  }
  return { style, grad, opacity, sig: style.includes("--accent"), width: +(p.getAttribute("stroke-width") ?? 1) };
}

/** A copy of the rules restyled by `restyle(path, info)`; null drops a rule. */
function cloneRules(rulesG, svg, restyle) {
  const g = el("g", { fill: "none", "stroke-linejoin": "round" });
  for (const p of rulesG.querySelectorAll("path")) {
    const info = ruleInfo(p, svg);
    const attrs = restyle(p, info);
    if (!attrs) continue;
    const c = el("path", { d: p.getAttribute("d"), ...attrs });
    g.appendChild(c);
  }
  return g;
}

/** The same fade gradient as a rule's, recoloured. */
function recolorGradient(svg, grad, color, uid, scale = 1) {
  const src = svg.querySelector(grad.slice(4, -1));
  const id = `${src.id}-${uid}-${color.replace(/\W/g, "")}`;
  if (!svg.getElementById(id)) {
    const g = src.cloneNode(true);
    g.id = id;
    for (const s of g.querySelectorAll("stop")) {
      const op = +(s.getAttribute("style").match(/stop-opacity:([\d.]+)/)?.[1] ?? 1);
      s.setAttribute("style", `stop-color:${color};stop-opacity:${clamp(op * scale)}`);
    }
    svg.querySelector("defs").appendChild(g);
  }
  return `url(#${id})`;
}

export function treat(svg, t, { seed, kind, uid, dark }) {
  const defs = svg.querySelector("defs");
  const groups = svg.querySelectorAll(":scope > g");
  const dotsG = groups[0];
  let rulesG = groups[groups.length - 1];
  const ids = (n) => `${n}-${uid}`;

  if (t.lit) {
    // Room to brighten: masks only take light away.
    for (const p of rulesG.querySelectorAll("path")) {
      const s = p.getAttribute("style");
      if (s) p.setAttribute("style", s.replace(/stroke-opacity:([\d.]+)/, (_, o) => `stroke-opacity:${clamp(+o * 1.2)}`));
      const grad = p.getAttribute("stroke");
      if (grad?.startsWith("url(")) {
        for (const st of svg.querySelectorAll(`${grad.slice(4, -1)} stop`))
          st.setAttribute("style", st.getAttribute("style").replace(/stop-opacity:([\d.]+)/, (_, o) => `stop-opacity:${clamp(+o * 1.2)}`));
      }
    }
  }

  let maskId = null;
  if (t.lit || t.grain) {
    maskId = ids("rulemask");
    const mask = el("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    mask.appendChild(el("image", { href: maskImage({ seed, kind, lit: t.lit, grain: t.grain }), x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none" }));
    defs.appendChild(mask);
  }

  // Layers under the rules, bottom to top: knockout, glow, ghost.
  if (t.knockout) {
    const k = cloneRules(rulesG, svg, (p, info) => {
      const extra = info.opacity >= 0.8 ? 2.2 : info.opacity >= 0.4 ? 1.7 : 1.2;
      const attrs = { "stroke-width": info.width + extra, "stroke-linecap": "round" };
      if (info.grad?.startsWith("url(")) attrs.stroke = recolorGradient(svg, info.grad, "var(--bg)", uid, 1 / Math.max(info.opacity, 0.01));
      else attrs.style = "stroke:var(--bg)";
      return attrs;
    });
    rulesG.before(k);
    if (maskId) k.setAttribute("mask", `url(#${maskId})`);
  }
  if (t.glow) {
    const fid = ids("glowblur");
    const f = el("filter", { id: fid, filterUnits: "userSpaceOnUse", x: -20, y: -20, width: W + 40, height: H + 40 });
    f.appendChild(el("feGaussianBlur", { stdDeviation: 1.8 }));
    defs.appendChild(f);
    const g = cloneRules(rulesG, svg, (p, info) => {
      if (info.opacity < 0.8) return null;
      const color = info.sig ? "var(--accent)" : "var(--fg)";
      return { "stroke-width": 4, "stroke-linecap": "round", ...(info.grad?.startsWith("url(") ? { stroke: info.grad } : { style: `stroke:${color}` }) };
    });
    g.setAttribute("filter", `url(#${fid})`);
    g.setAttribute("opacity", dark ? 0.4 : 0.22);
    rulesG.before(g);
    if (maskId) wrap(g, { mask: `url(#${maskId})` });
  }
  if (t.ghost) {
    // A second plate, slightly out of register.
    const g = rulesG.cloneNode(true);
    g.setAttribute("transform", "translate(0.9 0.6)");
    g.setAttribute("opacity", 0.3);
    rulesG.before(g);
  }

  if (maskId) rulesG.setAttribute("mask", `url(#${maskId})`);

  if (t.grit) {
    // Broken ink: high-frequency noise thresholded into small voids.
    const fid = ids("grit");
    const f = el("filter", { id: fid, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    f.appendChild(el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.85, numOctaves: 2, seed: 7, result: "n" }));
    f.appendChild(el("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  8 0 0 0 -2.3", result: "a" }));
    f.appendChild(el("feComposite", { in: "SourceGraphic", in2: "a", operator: "in" }));
    defs.appendChild(f);
    rulesG = wrap(rulesG, { filter: `url(#${fid})` });
  }
  if (t.spread) {
    // Ink spread: edges displaced by low-amplitude noise, as on uncoated stock.
    const fid = ids("spread");
    const f = el("filter", { id: fid, filterUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    f.appendChild(el("feTurbulence", { type: "fractalNoise", baseFrequency: 0.45, numOctaves: 2, seed: 3, result: "n" }));
    f.appendChild(el("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: 1.3, xChannelSelector: "R", yChannelSelector: "G" }));
    defs.appendChild(f);
    rulesG = wrap(rulesG, { filter: `url(#${fid})` });
  }
  if (t.screened) {
    // The rule printed through a fine 45° screen at half the dot pitch.
    const pid = ids("finescreen"), mid = ids("screenmask");
    const c = 1.6, r = 0.56;
    const pat = el("pattern", { id: pid, patternUnits: "userSpaceOnUse", width: c, height: c });
    pat.appendChild(el("circle", { cx: c / 4, cy: c / 4, r, fill: "#fff" }));
    pat.appendChild(el("circle", { cx: (3 * c) / 4, cy: (3 * c) / 4, r, fill: "#fff" }));
    const mask = el("mask", { id: mid, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    mask.appendChild(el("rect", { width: W, height: H, fill: `url(#${pid})` }));
    defs.append(pat, mask);
    rulesG = wrap(rulesG, { mask: `url(#${mid})` });
  }
  if (t.blend) {
    rulesG.style.mixBlendMode = dark ? "screen" : "multiply";
  }
  if (t.reverse) {
    // Where a rule crosses printed dots it reverses out to paper. Paper-filled
    // rules keep their fill unmasked, so dots never show through them.
    const fills = cloneRules(rulesG, svg, (p, info) => (info.style.includes("fill:var(--bg)") ? { style: "fill:var(--bg);stroke:none" } : null));
    rulesG.before(fills);
    const dm = ids("dotsmask"), im = ids("gapsmask");
    const dotsWhite = dotsG.cloneNode(true);
    for (const p of dotsWhite.querySelectorAll("path")) p.setAttribute("style", "stroke:#fff");
    const dotsBlack = dotsG.cloneNode(true);
    for (const p of dotsBlack.querySelectorAll("path")) p.setAttribute("style", "stroke:#000");
    const m1 = el("mask", { id: dm, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    m1.appendChild(dotsWhite);
    const m2 = el("mask", { id: im, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    m2.append(el("rect", { width: W, height: H, fill: "#fff" }), dotsBlack);
    defs.append(m1, m2);
    const rev = cloneRules(rulesG, svg, (p, info) => {
      const attrs = { "stroke-width": info.width, ...(p.getAttribute("stroke-dasharray") ? { "stroke-dasharray": p.getAttribute("stroke-dasharray") } : {}) };
      if (info.grad?.startsWith("url(")) attrs.stroke = recolorGradient(svg, info.grad, "var(--bg)", uid, 1 / Math.max(info.opacity, 0.01));
      else attrs.style = `stroke:var(--bg);stroke-opacity:${clamp(info.opacity * 1.15)}`;
      return attrs;
    });
    rev.setAttribute("mask", `url(#${dm})`);
    rulesG.after(rev);
    rulesG = wrap(rulesG, { mask: `url(#${im})` });
  }
}
