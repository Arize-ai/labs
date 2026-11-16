// Renders every generation in gens/<stack>/run-<n>/ and writes index.html: one
// tile per concept with a column per prompt stack, side by side. ← and → step
// every tile through its runs together.
//
//   node build.mjs [--png]   (--png also writes previews/<stack>/run-<n>/<slug>.png)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./kit.mjs";
import { CONCEPTS, slug } from "./concepts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const dirs = (p) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);
const stacks = dirs(join(HERE, "gens")).sort();
const labels = Object.fromEntries(await Promise.all(stacks.map(async (s) => [s, (await import(`./prompts/${s}/index.mjs`)).label])));
const runs = [...new Set(stacks.flatMap((s) => dirs(join(HERE, "gens", s)).map((d) => +d.replace("run-", ""))))]
  .filter(Boolean)
  .sort((a, b) => a - b);
const DARK = { bg: "#161314", fg: "#f6f5f2", accent: "#ff5a1f" };
const png = process.argv.includes("--png");
const sharp = png ? (await import("sharp")).default : null;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function generation(stack, concept, run) {
  const file = join(HERE, `gens/${stack}/run-${run}/${slug(concept)}.js`);
  if (!existsSync(file)) return { html: `<div class="missing">not generated</div>`, caption: "" };
  const code = readFileSync(file, "utf8");
  const caption = code.match(/\/\/\s*(.+)/)?.[1] ?? "";
  try {
    const { svg } = render(code, `${stack}-${slug(concept)}-${run}`, `${concept}:${run}`);
    if (sharp) {
      const flat = svg.replace(/var\(--bg\)/g, DARK.bg).replace(/var\(--fg\)/g, DARK.fg).replace(/var\(--accent\)/g, DARK.accent);
      const out = join(HERE, `previews/${stack}/run-${run}/${slug(concept)}.png`);
      mkdirSync(dirname(out), { recursive: true });
      await sharp(Buffer.from(flat.replace("<svg ", `<svg width="1200" height="750" `))).flatten({ background: DARK.bg }).png().toFile(out);
    }
    return { html: svg, caption };
  } catch (e) {
    return { html: `<div class="missing">render failed: ${esc(e.message)}</div>`, caption };
  }
}

const tiles = [];
for (const concept of CONCEPTS) {
  const columns = [];
  for (const stack of stacks) {
    const gens = [];
    for (const run of runs) gens.push(await generation(stack, concept, run));
    columns.push({ stack, gens });
  }
  tiles.push({ concept, columns });
}

const gen = (i, inner, cls = "") => `<div class="gen ${cls}" data-i="${i}"${i ? " hidden" : ""}>${inner}</div>`;
const tile = ({ concept, columns }) => `
  <section class="tile">
    <h2>${esc(concept)}</h2>
    <div class="columns">${columns
      .map(
        ({ stack, gens }) => `
      <figure>
        <div class="art">${gens.map((g, i) => gen(i, g.html)).join("")}</div>
        <figcaption><span class="stack">${esc(stack.toUpperCase())}</span>${gens.map((g, i) => gen(i, esc(g.caption), "caption")).join("")}</figcaption>
      </figure>`,
      )
      .join("")}
    </div>
  </section>`;

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
  header { max-width: 1700px; margin: 0 auto 20px; display: grid; gap: 8px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; }
  h1 { font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin: 0; }
  .status, .legend { color: var(--dim); }
  .status b { color: var(--fg); font-weight: 600; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 24px; margin: 0; padding: 0; list-style: none; }
  .legend code { color: var(--fg); }
  button { font: inherit; color: inherit; background: none; border: 1px solid var(--line); border-radius: 4px; padding: 2px 10px; cursor: pointer; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 640px), 1fr)); gap: 16px; max-width: 1700px; margin: 0 auto; }
  .tile { border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
  h2 { margin: 0; padding: 8px 12px; font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; border-bottom: 1px solid var(--line); }
  .columns { display: grid; grid-template-columns: repeat(${stacks.length}, minmax(0, 1fr)); }
  figure { margin: 0; min-width: 0; }
  figure + figure { border-left: 1px solid var(--line); }
  .art { aspect-ratio: 400 / 250; background: var(--bg); }
  .art .gen, .art svg { display: block; width: 100%; height: 100%; }
  .gen[hidden] { display: none !important; }
  .missing { display: grid; place-items: center; height: 100%; color: var(--dim); padding: 16px; text-align: center; }
  figcaption { display: flex; gap: 10px; align-items: baseline; padding: 6px 12px 10px; }
  .stack { font-weight: 600; }
  .caption { color: var(--dim); font-size: 12px; }
</style>
</head>
<body>
<header>
  <div class="bar">
    <h1>Cover art lab</h1>
    <span class="status">run <b id="n">1</b> / ${runs.length} · ← → to cycle · T for theme</span>
    <span><button id="prev" aria-label="Previous run">←</button> <button id="next" aria-label="Next run">→</button> <button id="theme">Theme</button></span>
  </div>
  <ul class="legend">${stacks.map((s) => `<li>${esc(labels[s])} · <code>prompts/${s}/</code></li>`).join("")}</ul>
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
console.log(`index.html: ${CONCEPTS.length} concepts × ${stacks.length} stacks × ${runs.length} runs, ${(html.length / 1e6).toFixed(1)} MB`);
