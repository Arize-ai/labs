// Stack B: two calls. An art director who never sees code writes a
// composition brief; a print technician with an API reference and one worked
// example turns it into the drawing. Repairs go to the technician only, so the
// brief survives a failed render.
import { readFileSync } from "node:fs";
import { extract } from "../shared.mjs";

export const label = "B · director brief → engineer, two calls";

const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const DIRECTOR = read("director.md");
const ENGINEER = read("engineer.md").replace("{{EXAMPLE}}", read("example.js").trim());

export async function generate(concept, { claude, check, attempts }) {
  const brief = (await claude(DIRECTOR, `The essay's cover word is: ${concept}\n\nWrite the brief.`)).trim();
  const build = `Here is the brief.\n\n${brief}`;
  let prompt = build, last;
  for (let n = 1; n <= attempts; n++) {
    const answer = await claude(ENGINEER, prompt);
    try {
      const code = extract(answer);
      check(code);
      return { code, tries: n, files: { "brief.md": brief + "\n" } };
    } catch (e) {
      last = e;
      prompt = `${build}\n\nYour plate failed on the press:\n\n${answer}\n\nError: ${e.message}\n\nFix it and answer with the whole function again.`;
    }
  }
  throw last;
}
