// Renders one composite PNG per stroke treatment per theme: a row per
// subject, the cover at header size (960 × 600) beside the three-up blog
// card (351 × 219), and writes a viewer manifest. Run from the repo root:
//   node artifacts/stroke-treatments/render.mjs [treatment ...]
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const require = createRequire(import.meta.url);
const { build } = await import(join(root, "node_modules/.pnpm/rolldown@1.2.19/node_modules/rolldown/dist/index.mjs"));
const { chromium } = require(process.env.PLAYWRIGHT ?? "/Users/rick/dev/handy/node_modules/playwright");

export const SUBJECTS = [
  { kind: "sandbox", seed: "code-mode-why-your-agent-should-code" },
  { kind: "verdicts", seed: "jev-llm-judge-consistency" },
  { kind: "graph", seed: "from-observability-to-context-platform" },
];

export const TREATMENTS = [
  { id: "00-plain", name: "Plain", note: "As shipped: flat 1px rules at a fixed opacity.", t: {} },
  { id: "01-lit", name: "1 · Lit by the field", note: "Rule opacity follows the drawing's light and the card's edge fade.", t: { lit: true } },
  { id: "02-knockout", name: "2 · Knockout", note: "A paper channel under each rule, so dots stop short of it.", t: { knockout: true } },
  { id: "03-glow", name: "3 · Soft glow", note: "A blurred halo behind ink and orange rules, as on the hero's rim.", t: { glow: true } },
  { id: "04-lit-knockout", name: "1 + 2", note: "Lit, with a knockout channel that fades with it.", t: { lit: true, knockout: true } },
  { id: "05-lit-knockout-glow", name: "1 + 2 + 3", note: "Lit, knocked out, and glowing.", t: { lit: true, knockout: true, glow: true } },
  { id: "06-grain", name: "Grain", note: "The fills' kind of grain in the rule's ink: blotchy, uneven density.", t: { grain: true } },
  { id: "07-grit", name: "Grit", note: "Broken ink: small voids from thresholded noise.", t: { grit: true } },
  { id: "08-ink-spread", name: "Ink spread", note: "Edges pushed around a fraction of a unit, as on uncoated stock.", t: { spread: true } },
  { id: "09-fine-screen", name: "Fine screen", note: "The rule printed through a 45° screen at half the dot pitch.", t: { screened: true } },
  { id: "10-overprint", name: "Overprint blend", note: "Rules blended into the print: multiply on paper, screen on ink.", t: { blend: true } },
  { id: "11-reverse", name: "Reverse out", note: "Where a rule crosses printed dots it turns to paper.", t: { reverse: true } },
  { id: "12-misregister", name: "Misregistered plate", note: "A faint second impression of the rules, slightly offset.", t: { ghost: true } },
  { id: "13-lit-knockout-grain", name: "1 + 2 + grain", note: "Lit and knocked out, with grain in the ink.", t: { lit: true, knockout: true, grain: true } },
  { id: "14-lit-knockout-grit", name: "1 + 2 + grit", note: "Lit and knocked out, with broken ink.", t: { lit: true, knockout: true, grit: true } },
];

const bundle = await build({ input: join(root, "src/components/art/cover-art.ts"), write: false, output: { format: "iife", name: "CoverArt" } });
const coverArtJs = bundle.output[0].code;
const treatmentsJs = (await readFile(join(here, "treatments.js"), "utf8")).replace(/^export /m, "");

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; }
  .light { --bg: #f6f5f2; --fg: #231f20; --accent: #ff5a1f; --rule: #d8d5ce; }
  .dark { --bg: #141213; --fg: #f6f5f2; --accent: #ff5a1f; --rule: #3a3637; }
  .sheet { display: inline-flex; flex-direction: column; gap: 24px; padding: 24px; background: color-mix(in srgb, var(--bg), var(--fg) 6%); color: var(--fg); }
  .cap { display: flex; gap: 12px; align-items: baseline; }
  .cap b { font: 600 12px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; }
  .cap span { opacity: .7; }
  .host { display: block; background: var(--bg); border: 1px solid var(--rule); overflow: hidden; }
  .host svg { display: block; width: 100%; height: 100%; }
  .row { display: flex; gap: 24px; align-items: flex-end; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 6px; }
  figcaption { font: 500 10px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; opacity: .6; }
</style></head><body><div class="sheet" id="sheet"></div>
<script>${coverArtJs}</script><script>${treatmentsJs}</script></body></html>`;

const out = join(here, "png");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const only = process.argv.slice(2);
const browser = await chromium.launch();
const tab = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1500, height: 1000 } });
await tab.setContent(page);

for (const tr of TREATMENTS) {
  if (only.length && !only.some((o) => tr.id.includes(o))) continue;
  for (const theme of ["light", "dark"]) {
    await tab.evaluate(({ subjects, tr, theme }) => {
      const sheet = document.getElementById("sheet");
      sheet.className = `sheet ${theme}`;
      let uid = 0;
      const host = (subject, w, h) => {
        const d = document.createElement("div");
        d.className = "host";
        d.style.cssText = `width:${w}px;height:${h}px`;
        d.innerHTML = window.CoverArt.coverArt(subject.seed, subject.kind);
        treat(d.querySelector("svg"), tr.t, { seed: subject.seed, kind: subject.kind, uid: `u${uid++}`, dark: theme === "dark" });
        return d;
      };
      const fig = (subject, w, h, label) => {
        const f = document.createElement("figure");
        f.append(host(subject, w, h));
        const c = document.createElement("figcaption");
        c.textContent = label;
        f.append(c);
        return f;
      };
      sheet.innerHTML = `<div class="cap"><b>${tr.name}</b><span>${tr.note}</span></div>`;
      for (const subject of subjects) {
        const row = document.createElement("div");
        row.className = "row";
        row.append(fig(subject, 960, 600, `${subject.kind} · header 960 × 600`), fig(subject, 351, 219, "blog card, three-up · 351 × 219"));
        sheet.append(row);
      }
    }, { subjects: SUBJECTS, tr, theme });
    const file = join(out, `${tr.id}-${theme}.png`);
    await tab.locator("#sheet").screenshot({ path: file });
    console.log(file);
  }
}
await browser.close();
if (!only.length) await writeFile(join(here, "index.html"), viewer(TREATMENTS.map(({ id, name, note }) => ({ id, name, note }))));

function viewer(list) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stroke treatments</title>
<style>
  :root { --bg: #e6e3dd; --fg: #231f20; --dim: #6b6663; --line: #cfcbc3; color-scheme: light; }
  :root[data-theme="dark"] { --bg: #1f1d1e; --fg: #f6f5f2; --dim: #9b958d; --line: #3a3637; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.4 ui-sans-serif, system-ui, sans-serif; }
  header { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 10px 16px; background: var(--bg); border-bottom: 1px solid var(--line); }
  .title { display: flex; gap: 12px; align-items: baseline; flex: 1 1 auto; min-width: 0; }
  .title b { font: 600 13px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
  .title span { color: var(--dim); }
  .peek { font: 600 11px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; padding: 3px 6px; border-radius: 3px; background: var(--fg); color: var(--bg); }
  .peek[hidden] { display: none; }
  .count { font: 12px ui-monospace, monospace; color: var(--dim); white-space: nowrap; }
  button, select { font: inherit; color: var(--fg); background: transparent; border: 1px solid var(--line); border-radius: 4px; padding: 4px 10px; cursor: pointer; }
  .seg { display: inline-flex; }
  .seg button { border-radius: 0; }
  .seg button:first-child { border-radius: 4px 0 0 4px; }
  .seg button:last-child { border-radius: 0 4px 4px 0; border-left: 0; }
  .seg button[aria-pressed="true"] { background: var(--fg); color: var(--bg); }
  .keys { color: var(--dim); font-size: 12px; white-space: nowrap; }
  main { padding: 16px; }
  img { display: block; width: 100%; max-width: 1400px; height: auto; margin: 0 auto; }
</style></head><body>
<header>
  <div class="title"><span class="peek" id="peek" hidden>Plain</span><b id="name"></b><span id="note"></span></div>
  <select id="pick" aria-label="Treatment"></select>
  <span class="count" id="count"></span>
  <div class="seg" role="group" aria-label="Theme"><button data-theme="light">Light</button><button data-theme="dark">Dark</button></div>
  <span class="keys">← → treatment · T theme · hold P for plain</span>
</header>
<main><img id="img" alt=""></main>
<script>
  const list = ${JSON.stringify(list)};
  const $ = (id) => document.getElementById(id);
  const pick = $("pick");
  list.forEach((t, i) => pick.add(new Option(t.name, i)));
  let state = { i: 0, theme: "light" };
  // Holding P shows the plain rules without changing the selection.
  let peeking = false;
  const read = () => {
    const [id, theme] = location.hash.slice(1).split("/");
    const i = list.findIndex((t) => t.id === id);
    state = { i: i < 0 ? 0 : i, theme: theme === "dark" ? "dark" : "light" };
  };
  const render = () => {
    const t = list[state.i];
    const shown = peeking ? list[0] : t;
    $("peek").hidden = !peeking || state.i === 0;
    $("name").textContent = t.name;
    $("note").textContent = t.note;
    $("count").textContent = (state.i + 1) + " / " + list.length;
    pick.value = state.i;
    $("img").src = "png/" + shown.id + "-" + state.theme + ".png";
    $("img").alt = shown.name + ", " + state.theme + " theme";
    document.documentElement.dataset.theme = state.theme;
    for (const b of document.querySelectorAll("[data-theme]")) if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", b.dataset.theme === state.theme);
    // Warm the neighbours so arrowing is instant.
    for (const d of [-1, 1]) new Image().src = "png/" + list[(state.i + d + list.length) % list.length].id + "-" + state.theme + ".png";
    new Image().src = "png/" + t.id + "-" + (state.theme === "dark" ? "light" : "dark") + ".png";
    for (const th of ["light", "dark"]) new Image().src = "png/" + list[0].id + "-" + th + ".png";
  };
  const go = (next) => { state = { ...state, ...next }; history.replaceState(null, "", "#" + list[state.i].id + "/" + state.theme); render(); };
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target === pick) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") go({ i: (state.i + 1) % list.length });
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go({ i: (state.i - 1 + list.length) % list.length });
    else if (e.key === "p" || e.key === "P") { if (!peeking) { peeking = true; render(); } }
    else if (e.key === "t" || e.key === "T") go({ theme: state.theme === "dark" ? "light" : "dark" });
    else return;
    e.preventDefault();
  });
  const unpeek = () => { if (peeking) { peeking = false; render(); } };
  addEventListener("keyup", (e) => { if (e.key === "p" || e.key === "P") unpeek(); });
  // A release that happens outside the window never arrives as keyup.
  addEventListener("blur", unpeek);
  pick.addEventListener("change", () => { go({ i: +pick.value }); pick.blur(); });
  for (const b of document.querySelectorAll("button[data-theme]")) b.addEventListener("click", () => go({ theme: b.dataset.theme }));
  addEventListener("hashchange", () => { read(); render(); });
  read();
  render();
</script></body></html>\n`;
}
