// Stack A: one call. The style spec and the full cover-art source as the
// system prompt; the concept and the function contract as the task.
import { readFileSync } from "node:fs";
import { SOURCE } from "../../kit.mjs";
import { extract } from "../shared.mjs";

export const label = "A · spec + source, one call";

const STYLE = readFileSync(new URL("STYLE.md", import.meta.url), "utf8");
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

/** Returns { code, files } once `check(code)` passes; throws after `attempts` tries. */
export async function generate(concept, { claude, check, attempts }) {
  let prompt = task(concept), last;
  for (let n = 1; n <= attempts; n++) {
    const answer = await claude(SYSTEM, prompt);
    try {
      const code = extract(answer);
      check(code);
      return { code, tries: n, files: {} };
    } catch (e) {
      last = e;
      prompt = `${task(concept)}\n\nYour previous answer failed:\n\n${answer}\n\nError: ${e.message}\n\nFix it and answer with the whole function again.`;
    }
  }
  throw last;
}
