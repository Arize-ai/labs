/** The `function draw(...)` in a model's answer, from its first code block or the whole text. */
export function extract(text) {
  const block = text.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/);
  const code = (block ? block[1] : text).trim();
  if (!/function\s+draw\s*\(/.test(code)) throw new Error("The answer has no `function draw(...)`.");
  return code;
}
