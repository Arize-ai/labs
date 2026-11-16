// Generates cover art for each concept by asking Claude for a drawing function
// in the site's halftone style, then renders it with the real cover-art code.
//
//   node generate.mjs [--runs 5] [--concurrency 8] [--model opus] [--only cat,fern]
//
// Each generation is saved to gens/run-<n>/<slug>.js; existing files are kept,
// so a rerun only fills in what is missing. Then run build.mjs.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE, render } from "./kit.mjs";
import { CONCEPTS, slug } from "./concepts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const RUNS = +arg("runs", 5);
const CONCURRENCY = +arg("concurrency", 8);
const MODEL = arg("model", "opus");
const ONLY = arg("only", "")?.split(",").filter(Boolean);
const ATTEMPTS = 3;

const STYLE = readFileSync(join(HERE, "STYLE.md"), "utf8");
const REFERENCE = readFileSync(SOURCE, "utf8");

const SYSTEM = `You are a generative artist who draws cover art for the Arize Labs website in code. You write one JavaScript function that draws on the site's halftone drawing surface. You answer with that function only, in one \`\`\`js block.

${STYLE}

## The drawing surface

Here is the site's cover-art module, including the existing drawings (mark, pulse, bloom, trace, graph, signal, sandbox, verdicts). Study how they build light from distance fields and where they use rules; match their restraint and craft.

\`\`\`ts
${REFERENCE}
\`\`\``;

const task = (concept) => `Draw: **${concept}**

Write \`function draw(g, rand, seed, k) { ... }\` in plain JavaScript (no TypeScript, no imports, no Math.random).

- \`g\` is a Graphic: call \`g.print(light)\` exactly once, where \`light(x, y)\` returns an ink tone 0–1 or \`[ink, orange]\`; then add structure with \`g.line(d, stroke, { width, dash, fill })\` (stroke is "ink" | "soft" | "faint" | "sig"), \`g.fadeLine(d, color, opacity, y0, y1)\` and \`g.box(x, y, w, h, stroke)\`.
- \`rand()\` is a seeded uniform 0–1 and \`seed\` an integer; use them for variation so the drawing is deterministic.
- \`k\` holds the module's helpers and constants: W, H, X0, X1, Y0, Y1, P, clamp, smooth, makeNoise(seed) → fbm(x, y), sdBox, sdPolyline, inPolygon, solid, glow, bezier, polyD, num.
- \`light\` is called about 5,000 times; keep it cheap (precompute geometry, cull by bounding box).
- Make the subject recognisable at thumbnail size. For an abstract concept, find one concrete visual metaphor and draw it in the same technical, diagrammatic vocabulary as the examples. Orange at most once, for the point of the image.
- Start the function body with a one-line comment \`// <what the drawing shows, in under 12 words>\`.`;

function claude(system, prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", "--model", MODEL, "--setting-sources", "", "--strict-mcp-config", "--tools", "", "--no-session-persistence", "--system-prompt", system],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => child.kill(), 10 * 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(out) : reject(new Error(`claude exited ${code}: ${err.slice(-500)}`));
    });
    child.stdin.end(prompt);
  });
}

function extract(text) {
  const block = text.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/);
  const code = (block ? block[1] : text).trim();
  if (!/function\s+draw\s*\(/.test(code)) throw new Error("The answer has no `function draw(...)`.");
  return code;
}

async function generate(concept, run) {
  const file = join(HERE, `gens/run-${run}/${slug(concept)}.js`);
  if (existsSync(file)) return "kept";
  let prompt = task(concept), last;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const answer = await claude(SYSTEM, prompt);
    try {
      const code = extract(answer);
      render(code, `${slug(concept)}-${run}`, `${concept}:${run}`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, code + "\n");
      return attempt === 1 ? "ok" : `ok after ${attempt}`;
    } catch (e) {
      last = e;
      prompt = `${task(concept)}\n\nYour previous answer failed:\n\n${answer}\n\nError: ${e.message}\n\nFix it and answer with the whole function again.`;
    }
  }
  throw last;
}

const jobs = [];
for (let run = 1; run <= RUNS; run++) for (const c of CONCEPTS) if (!ONLY?.length || ONLY.includes(slug(c))) jobs.push([c, run]);

let next = 0, done = 0, failed = 0;
async function worker() {
  while (next < jobs.length) {
    const [concept, run] = jobs[next++];
    const t = Date.now();
    try {
      const status = await generate(concept, run);
      console.log(`[${++done}/${jobs.length}] run ${run} ${concept}: ${status} (${Math.round((Date.now() - t) / 1000)}s)`);
    } catch (e) {
      failed++;
      console.log(`[${++done}/${jobs.length}] run ${run} ${concept}: FAILED ${e.message.split("\n")[0]}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`done: ${jobs.length - failed} ok, ${failed} failed`);
