// Renders every generation in gens/ and writes index.html: one tile per
// concept, ← and → step every tile through its generations together.
//
//   node build.mjs [--png]   (--png also writes previews/<run>/<slug>.png)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./kit.mjs";
import { CONCEPTS, slug } from "./concepts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const runs = readdirSync(join(HERE, "gens"))
  .map((d) => +d.replace("run-", ""))
  .filter(Boolean)
  .sort((a, b) => a - b);
const DARK = { bg: "#161314", fg: "#f6f5f2", accent: "#ff5a1f" };
const png = process.argv.includes("--png");
const sharp = png ? (await import("sharp")).default : null;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const tiles = [];
for (const concept of CONCEPTS) {
  const gens = [];
  for (const run of runs) {
    const file = join(HERE, `gens/run-${run}/${slug(concept)}.js`);
    if (!existsSync(file)) {
      gens.push({ run, html: `<div class="missing">no generation</div>`, caption: "" });
      continue;
    }
    const code = readFileSync(file, "utf8");
    const caption = code.match(/\/\/\s*(.+)/)?.[1] ?? "";
    try {
      const { svg } = render(code, `${slug(concept)}-${run}`, `${concept}:${run}`);
      gens.push({ run, html: svg, caption });
      if (sharp) {
        const flat = svg.replace(/var\(--bg\)/g, DARK.bg).replace(/var\(--fg\)/g, DARK.fg).replace(/var\(--accent\)/g, DARK.accent);
        const out = join(HERE, `previews/run-${run}/${slug(concept)}.png`);
        mkdirSync(dirname(out), { recursive: true });
        await sharp(Buffer.from(flat.replace("<svg ", `<svg width="1200" height="750" style="background:${DARK.bg}" `)))
          .flatten({ background: DARK.bg })
          .png()
          .toFile(out);
      }
    } catch (e) {
      gens.push({ run, html: `<div class="missing">render failed: ${esc(e.message)}</div>`, caption });
    }
  }
  tiles.push({ concept, gens });
}

const tile = ({ concept, gens }) => `
  <figure class="tile">
    <div class="art">${gens.map((g, i) => `<div class="gen" data-i="${i}"${i ? " hidden" : ""}>${g.html}</div>`).join("")}</div>
    <figcaption>
      <span class="name">${esc(concept)}</span>
      ${gens.map((g, i) => `<span class="caption gen" data-i="${i}"${i ? " hidden" : ""}>${esc(g.caption)}</span>`).join("")}
    </figcaption>
  </figure>`;

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cover Art Lab</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; }
  :root { --bg: #f4f2ee; --fg: #161314; --dim: #6b655f; --line: rgb(22 19 20 / .12); --accent: ${DARK.accent}; }
  :root[data-theme="dark"] { --bg: ${DARK.bg}; --fg: ${DARK.fg}; --dim: #9b958d; --line: rgb(246 245 242 / .12); }
  body { background: var(--bg); color: var(--fg); font: 13px/1.4 ui-monospace, "SF Mono", Menlo, monospace; padding: 24px 16px 48px; }
  header { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; max-width: 1600px; margin: 0 auto 20px; }
  h1 { font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
  .status { color: var(--dim); }
  .status b { color: var(--fg); font-weight: 600; }
  button { font: inherit; color: inherit; background: none; border: 1px solid var(--line); border-radius: 4px; padding: 2px 10px; cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; max-width: 1600px; margin: 0 auto; }
  .tile { margin: 0; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
  .art { aspect-ratio: 400 / 250; background: var(--bg); }
  .art .gen, .art svg { display: block; width: 100%; height: 100%; }
  .gen[hidden] { display: none !important; }
  .missing { display: grid; place-items: center; height: 100%; color: var(--dim); padding: 16px; text-align: center; }
  figcaption { display: flex; gap: 12px; align-items: baseline; padding: 8px 12px 10px; border-top: 1px solid var(--line); }
  .name { text-transform: uppercase; letter-spacing: .08em; font-weight: 600; white-space: nowrap; }
  .caption { color: var(--dim); font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>Cover art lab</h1>
  <span class="status">generation <b id="n">1</b> / ${runs.length} · ← → to cycle · T for theme</span>
  <span><button id="prev" aria-label="Previous generation">←</button> <button id="next" aria-label="Next generation">→</button> <button id="theme">Theme</button></span>
</header>
<main class="grid">${tiles.map(tile).join("")}
</main>
<script>
  const total = ${runs.length};
  let i = 0;
  const show = (to) => {
    i = (to + total) % total;
    document.querySelectorAll(".gen").forEach((el) => (el.hidden = +el.dataset.i !== i));
    document.getElementById("n").textContent = i + 1;
  };
  const theme = () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  };
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") show(i + 1);
    else if (e.key === "ArrowLeft") show(i - 1);
    else if (e.key === "t" || e.key === "T") theme();
    else return;
    e.preventDefault();
  });
  document.getElementById("prev").onclick = () => show(i - 1);
  document.getElementById("next").onclick = () => show(i + 1);
  document.getElementById("theme").onclick = theme;
</script>
</body>
</html>
`;
writeFileSync(join(HERE, "index.html"), html);
console.log(`index.html: ${CONCEPTS.length} concepts × ${runs.length} generations, ${(html.length / 1e6).toFixed(1)} MB`);
