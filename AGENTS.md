# Arize Labs monorepo

A pnpm workspace. Each project lives under `apps/` and has its own
`AGENTS.md`; read the one for the package you are working in:

- [`apps/website/AGENTS.md`](./apps/website/AGENTS.md): the Astro site.

Install dependencies once at the root with `pnpm install`. Run a package's
scripts with `pnpm --filter <name> <script>` from the root, or `pnpm <script>`
inside the package. Keep a single `pnpm-lock.yaml` at the root.
