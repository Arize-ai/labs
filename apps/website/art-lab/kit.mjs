// Loads the site's cover-art drawing surface (src/components/art/cover-art.ts)
// unchanged, with its internals exported, and renders generated drawings with it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
export const SOURCE = join(ROOT, "src/components/art/cover-art.ts");

const INTERNALS = ["Graphic", "rng", "hashString", "makeNoise", "clamp", "smooth", "sdBox", "sdPolyline", "inPolygon", "solid", "glow", "bezier", "polyD", "num", "W", "H", "X0", "X1", "Y0", "Y1", "P"];

async function loadKit() {
  const src = readFileSync(SOURCE, "utf8").replace('from "../heroes/hero-mark"', `from ${JSON.stringify(join(ROOT, "src/components/heroes/hero-mark.ts"))}`);
  const out = join(HERE, ".kit/cover-art.ts");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${src}\nexport { ${INTERNALS.join(", ")} };\n`);
  return import(out);
}

const m = await loadKit();
const helpers = Object.fromEntries(INTERNALS.filter((n) => n !== "Graphic" && n !== "rng" && n !== "hashString").map((n) => [n, m[n]]));

/**
 * Runs a generated `function draw(g, rand, seed, k)` and returns its SVG and
 * the number of dots it printed. Throws on errors, timeouts and blank art.
 */
export function render(code, id, seedKey) {
  const seed = m.hashString(seedKey);
  const g = new m.Graphic(id, seed);
  const sandbox = { g, rand: m.rng(seed), seed, k: helpers };
  vm.runInNewContext(`${code}\n;draw(g, rand, seed, k);`, sandbox, { timeout: 30_000 });
  const svg = g.svg(id);
  const dots = (svg.match(/[Mm][-\d.]+ [-\d.]+h0/g) ?? []).length;
  if (dots < 150) throw new Error(`The drawing printed only ${dots} dots; it needs a light field that actually prints (call g.print once with tones up to ~1).`);
  return { svg, dots };
}
