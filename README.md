# Arize Labs

Monorepo for Arize Labs projects, managed as a
[pnpm workspace](https://pnpm.io/workspaces).

| Path | What |
|---|---|
| [`apps/website`](./apps/website) | The Arize Labs site (Astro), deployed to <https://arize-ai.github.io/labs/> |

## Getting started

Requires Node 22.23.4+ (CI uses 24) and pnpm (the version is pinned in
`packageManager`; `corepack enable` picks it up).

```sh
pnpm install   # installs every workspace package
pnpm dev       # website dev server at localhost:4321/labs/
pnpm build     # builds every package
```

Run a command in one package with `pnpm --filter <name> <command>`, e.g.
`pnpm --filter website check`.

## Adding a package

Put apps under `apps/` (covered by `pnpm-workspace.yaml`), give each its own
`package.json` with a unique `name`, and run `pnpm install` at the root. Add
more globs to `pnpm-workspace.yaml` (for example `packages/*`) for shared
libraries.

## Deploying

The website deploys to GitHub Pages from
[`.github/workflows/deploy-website.yml`](./.github/workflows/deploy-website.yml)
on pushes to `main` that touch `apps/website/` (or the workspace's root
files). GitHub Pages serves one site per repo, so another app that needs
hosting should deploy elsewhere or be published under the website's build.
