// Generates cover art for each concept with one prompt stack, then checks each
// drawing renders with the real cover-art code.
//
//   node generate.mjs --stack b [--runs 5] [--concurrency 8] [--model opus] [--only cat,fern]
//
// A stack is a module in prompts/<name>/ exporting `label` and
// `generate(concept, { claude, check, attempts })`. Generations are saved to
// gens/<stack>/run-<n>/<slug>.js (plus any files the stack returns, such as a
// brief); existing ones are kept, so a rerun only fills in what is missing.
// Every stack draws run n of a concept with the same seed, so differences
// between stacks come from the prompts. Then run build.mjs.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./kit.mjs";
import { CONCEPTS, slug } from "./concepts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const STACK = arg("stack");
if (!STACK) throw new Error("Pass --stack <name> (a folder in prompts/).");
const RUNS = +arg("runs", 5);
const CONCURRENCY = +arg("concurrency", 8);
const MODEL = arg("model", "opus");
const ONLY = arg("only", "").split(",").filter(Boolean);
const ATTEMPTS = 3;

const stack = await import(`./prompts/${STACK}/index.mjs`);

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

async function generate(concept, run) {
  const base = join(HERE, `gens/${STACK}/run-${run}/${slug(concept)}`);
  if (existsSync(`${base}.js`)) return "kept";
  const check = (code) => render(code, `${STACK}-${slug(concept)}-${run}`, `${concept}:${run}`);
  const { code, tries, files } = await stack.generate(concept, { claude, check, attempts: ATTEMPTS });
  mkdirSync(dirname(base), { recursive: true });
  for (const [ext, text] of Object.entries(files)) writeFileSync(`${base}.${ext}`, text);
  writeFileSync(`${base}.js`, code + "\n");
  return tries === 1 ? "ok" : `ok after ${tries}`;
}

const jobs = [];
for (let run = 1; run <= RUNS; run++) for (const c of CONCEPTS) if (!ONLY.length || ONLY.includes(slug(c))) jobs.push([c, run]);

let next = 0, done = 0, failed = 0;
async function worker() {
  while (next < jobs.length) {
    const [concept, run] = jobs[next++];
    const t = Date.now();
    try {
      const status = await generate(concept, run);
      console.log(`[${++done}/${jobs.length}] ${STACK} run ${run} ${concept}: ${status} (${Math.round((Date.now() - t) / 1000)}s)`);
    } catch (e) {
      failed++;
      console.log(`[${++done}/${jobs.length}] ${STACK} run ${run} ${concept}: FAILED ${e.message.split("\n")[0]}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`done: ${jobs.length - failed} ok, ${failed} failed`);
