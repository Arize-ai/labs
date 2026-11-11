# Arize Labs site: Astro planning notes

A loose plan for building the Labs site in Astro. It lists the building blocks
(the "primitives") we need, how Astro provides each one, and which theme or
reference to look at for inspiration. We expect to build most of it ourselves,
with our own agents, rather than adopting a theme wholesale. The glossary at the
end explains the Astro terms used here.

Related Linear work (project **Labs**, P-PHX-23):

- PHX-1705: tech stack decision (CMS, SEO, server-side rendering)
- PHX-1832 / PHX-1845: blog layout and post template (search, find posts by
  author or label, OG images, a skill that makes OG images)
- PHX-1706: `Arize-ai/labs` monorepo
- PHX-1848: Vercel deployments
- PHX-1833: merch site integration (not scoped yet)

> Astro moves quickly (themes already target v7). Check API names against the
> docs for the version we pin before building. The links below go to
> docs.astro.build, which always shows the current version.

## What the site needs

| Area | Pages |
|---|---|
| Landing | `/`: hero (ported from the Three.js work in `website-prototype`), sections, latest posts |
| Team | `/team`: everyone. `/team/[member]`: bio, links, and their posts |
| Blog | `/blog`: paginated list. `/blog/[post]`: post. `/blog/tags/[tag]`: filtered list |
| Plumbing | RSS, sitemap, search index, OG images, 404, redirects |
| Later | projects or research, merch, newsletter signup, previews from a CMS |

## Proposed project layout

```
src/
  content.config.ts      # every content collection and its schema
  content/
    posts/               # one .md or .mdx file per post
    team/                # one file per person (yaml, json or md)
  pages/
    index.astro
    team/index.astro
    team/[id].astro
    blog/[...page].astro # paginated list
    blog/[id].astro
    blog/tags/[tag].astro
    rss.xml.ts           # endpoint
    og/[...path].png.ts  # endpoint that generates OG images at build time
  layouts/               # BaseLayout (head/SEO), PostLayout, PageLayout
  components/
    sections/            # landing-page building blocks
    heroes/              # Three.js heroes, run as client scripts
  site.config.ts         # name, nav, social links, defaults
astro.config.mjs         # site URL, integrations, adapter, redirects
```

## Primitives

Each primitive has: what it is for, how Astro does it, and where to look.

### 1. Content collections and schemas

**For:** posts, team members, and later projects. One typed source of truth that
agents can add to by writing a file.

**How:** define collections in `src/content.config.ts` with `defineCollection`.
Each one gets a **loader** (`glob()` for a folder of files, `file()` for one
JSON or YAML file) and a **Zod schema** that checks frontmatter at build time.
A bad date or a missing field fails the build, which suits agent-written
content.

```ts
// src/content.config.ts (sketch)
import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

const team = defineCollection({
  loader: glob({ pattern: "**/*.{md,yaml}", base: "./src/content/team" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      avatar: image(),
      links: z.object({ github: z.string().url().optional() }).partial(),
      order: z.number().default(100),
    }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      authors: z.array(reference("team")).min(1),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { team, posts };
```

**Look at:**
[Content collections guide](https://docs.astro.build/en/guides/content-collections/),
[`astro:content` reference](https://docs.astro.build/en/reference/modules/astro-content/),
AstroWind `src/content.config.ts`, AstroPaper `src/content.config.ts`.

### 2. Linking posts to team members

**For:** bylines on posts, and member pages that list their posts. This is the
feature no theme gave us ready-made.

**How:** `reference("team")` in the post schema (above) stores member IDs and
fails the build if an ID doesn't exist. Turn them into full entries with
`getEntries(post.data.authors)`. For a member page, filter in the other
direction:

```ts
const posts = await getCollection("posts", (p) =>
  p.data.authors.some((a) => a.id === member.id) && !p.data.draft,
);
```

**Look at:** Astrogon (an authors collection linked across other collections),
Astro Scholar (team page and author profiles),
[Kitemetric multi-author write-up](https://kitemetric.com/blogs/adding-multiple-authors-to-your-astro-blog-a-streamlined-approach),
[DEV multi-author walkthrough](https://dev.to/bekahhw/adding-multiple-authors-to-my-astro-writing-blog-a-technical-walkthrough-42n1).

### 3. Routing and generated pages

**For:** one page per post, member and tag, plus paginated lists.

**How:** file-based routing under `src/pages/`. A file named `[id].astro` is a
**dynamic route**. When building static pages it exports `getStaticPaths()`,
which returns every `params` value to build, and can pass the entry through
`props`. `[...page].astro` is a **rest route**, used with `paginate()` for
`/blog`, `/blog/2` and so on. Tag pages come from collecting every tag across
posts inside `getStaticPaths()`.

**Look at:** [Routing](https://docs.astro.build/en/guides/routing/),
AstroWind `src/pages/[...blog]/` (category, tag and paginated routes, with
paths you can configure), AstroPaper tag pages.

### 4. Rendering Markdown and MDX

**For:** post bodies, with custom components inside posts (callouts, figures,
embedded demos).

**How:** `render(entry)` from `astro:content` returns `<Content />` plus
`headings` (useful for a table of contents). The `@astrojs/mdx` integration
lets posts import components. Remark and rehype plugins add extra Markdown
handling (heading anchors, math). Shiki code highlighting is built in.

**Look at:** [Markdown](https://docs.astro.build/en/guides/markdown-content/),
[MDX integration](https://docs.astro.build/en/guides/integrations-guide/mdx/),
AstroSage (long-form technical posts with a pinned table of contents, math and
diagrams).

### 5. Layouts and landing-page sections

**For:** shared page chrome, and a landing page made of reusable sections that
can be reordered.

**How:** **layouts** are ordinary `.astro` components that wrap a page with a
`<slot />`. Sections are components with typed `Props`. A section library lets
us (and agents) build new pages from blocks instead of writing one-off markup.

**Look at:** AstroWind `src/components/widgets/` (30+ typed sections) and
`src/pages/landing/` (pages assembled from them), plus its agent-facing widget
catalogue in `.agents/skills/use-widgets.md`, a pattern worth copying for our
agents.

### 6. Interactive pieces: islands and client scripts

**For:** the Three.js heroes and playgrounds from `website-prototype`, plus search UI and
other small interactive bits. The rest of the page ships no JavaScript.

**How:** two options.

- A plain `<script>` inside an `.astro` component. Astro bundles it, and it
  runs once per page. This is the simplest way to bring over the current
  vanilla Three.js heroes, with no framework needed.
- A framework component (React, Solid, Svelte) with a `client:*` directive,
  which makes it an **island**. `client:visible` is a good default for heavy
  WebGL below the fold, and `client:only` skips server rendering for code that
  needs `window`.

**Look at:** [Islands](https://docs.astro.build/en/concepts/islands/),
[Client-side scripts](https://docs.astro.build/en/guides/client-side-scripts/),
[Directives reference](https://docs.astro.build/en/reference/directives-reference/#client-directives).

### 7. SEO head and metadata

**For:** title, description, canonical URL, Open Graph and Twitter tags,
article metadata (author, published time), and JSON-LD.

**How:** one `BaseHead.astro` (or `Seo.astro`) component that every layout
uses, fed from page props and site defaults. Set `site` in
`astro.config.mjs` so `Astro.site` and `Astro.url` can build absolute URLs.
Use `@astrojs/sitemap` for the sitemap and per-page `robots` settings for tag
pages and drafts.

**Look at:** AstroWind (SEO defaults in `src/config.yaml`, per-page robots
settings), the `BaseHead.astro` in astro-engineering-blog,
[Sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/).

### 8. OG image generation

**For:** clean social previews for every post and team member (PHX-1845), plus
a skill agents can call to make them.

**How:** an **endpoint** (`.png.ts` under `src/pages/`) with `getStaticPaths()`
that renders a card to PNG at build time. Satori turns JSX-like markup into
SVG, then sharp or resvg turns it into PNG. The head component points `og:image`
at that URL. Because the template is code, a skill can preview and adjust it.

**Look at:** AstroPaper (Satori, sharp and Astro Fonts; search the repo for
`satori`), Astro Scholar, Grimorio (social cards built at build time),
[Endpoints](https://docs.astro.build/en/guides/endpoints/),
[ogp.me](https://ogp.me/).

### 9. Search

**For:** searching posts, people and projects (PHX-1845).

**How:** Pagefind runs after `astro build`, indexes the HTML in `dist/` and
writes a static index plus a small UI. It needs no server or API key.
`data-pagefind-*` attributes control what gets indexed and which filters are
available, such as author and tag, which also covers "find posts by author or
label".

**Look at:** AstroPaper (the build runs Pagefind and copies the index into
`public/pagefind/`), Astro Scholar, Biluo, Starlight (Pagefind is built in),
[pagefind.app](https://pagefind.app/). Fuse.js in astro-engineering-blog is the
client-side alternative, which works for small sites.

### 10. Feeds

**For:** RSS for the blog, and possibly per-author or per-tag feeds.

**How:** `@astrojs/rss` in an endpoint (`src/pages/rss.xml.ts`) built from
`getCollection("posts")`.

**Look at:** [RSS guide](https://docs.astro.build/en/guides/rss/), AstroWind
`src/pages/rss.xml.ts`.

### 11. Images and fonts

**For:** avatars, post covers and brand fonts, optimized automatically.

**How:** `<Image />` and `<Picture />` from `astro:assets` resize and convert
local images at build time. Use the `image()` schema helper (see the team
collection above) so frontmatter image paths are checked and optimized. Fonts
can stay on fontsource as they are today, or move to Astro's Fonts API if our
pinned version has it.

**Look at:** [Images](https://docs.astro.build/en/guides/images/), AstroWind
(Astro Assets with Unpic).

### 12. Rendering modes and deployment

**For:** SEO and speed (static by default), with room for things that must run
per request (CMS previews, merch, forms).

**How:** the default output is **static**. Add the `@astrojs/vercel`
**adapter**, then mark individual routes `export const prerender = false` to
render them **on demand**. **Server islands** (`server:defer`) let a mostly
static page fill in one dynamic part later.

**Look at:**
[On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/),
[Server islands](https://docs.astro.build/en/guides/server-islands/),
[Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/),
AstroWind (Vercel, Netlify and Cloudflare deploy setups), Astro Scholar (preview
deploys for pull requests).

### 13. CMS (later)

**For:** letting people who aren't engineers write posts, if Markdown in git
stops being enough.

**How:** start with files in the repo, which agents handle well. Content
collections hide where content comes from, so moving to a CMS means swapping
the loader for a collection (a git-based CMS like Keystatic or TinaCMS edits
the same files; a hosted CMS like Sanity uses its own loader). Pages that call
`getCollection` don't change. **Live content collections** fetch at request
time if we ever need content that is always fresh.

**Look at:** [CMS guides](https://docs.astro.build/en/guides/cms/),
[Content Layer loaders](https://docs.astro.build/en/reference/content-loader-reference/),
Lexington themes (Sanity variants).

### 14. Site config, environment and redirects

**For:** one place for the site name, nav and social links, plus typed secrets
for later integrations.

**How:** a small `site.config.ts` that layouts import. Use `astro:env` for typed
environment variables and `redirects` in `astro.config.mjs` for moved URLs.

**Look at:** AstroWind `src/config.yaml`, AstroPaper `astro-paper.config.ts`,
[Environment variables](https://docs.astro.build/en/guides/environment-variables/).

### 15. Nice to have

- **Page transitions:** `<ClientRouter />` from `astro:transitions` gives
  animated navigation between pages, which could keep a hero running across
  routes. [View transitions](https://docs.astro.build/en/guides/view-transitions/)
- **Forms and newsletter:** Astro **Actions** for type-checked form handling on
  the server. [Actions](https://docs.astro.build/en/guides/actions/)
- **Middleware:** `src/middleware.ts` for headers or auth on preview routes.
  [Middleware](https://docs.astro.build/en/guides/middleware/)
- **Related posts and reading time:** worked out from tags at build time;
  AstroWind and Astrogon both do this.

## Suggested order

1. Scaffold Astro in this repo with the Vercel adapter (PHX-1706,
   PHX-1848).
2. Collections and schemas for `team` and `posts`, with two or three real
   entries each.
3. Routes: team list and member pages, blog list, post and tag pages.
4. Base layout and SEO head, sitemap, RSS.
5. Landing page: port one Three.js hero as a client script, plus a latest-posts
   section.
6. OG image endpoint, then the agent skill that wraps it.
7. Pagefind search with author and tag filters.
8. Section library and an agent-facing catalogue of it.
9. Revisit CMS, merch and newsletter.

## Reference themes

| Theme | Borrow |
|---|---|
| [AstroWind](https://github.com/onwidget/astrowind) | Section library, config approach, blog taxonomy routes, deploy setups, agent widget catalogue |
| [AstroPaper](https://github.com/satnaing/astro-paper) | Pagefind setup, Satori OG images, post folder structure |
| [Astro Scholar](https://github.com/shravanngoswamii/astro-scholar) | Team and author pages, projects collection, preview deploys for pull requests |
| [Astrogon](https://github.com/astrogon/astrogon) | Authors linked across several collections, categories and tags |
| [astro-engineering-blog](https://github.com/EddyVinck/astro-engineering-blog) | Multiple authors per post on a company engineering blog |

## Glossary

**Adapter.** A package (such as `@astrojs/vercel`) that lets Astro run code on
a specific host. Only needed for on-demand rendering.

**Actions.** Server functions defined in `src/actions/` that the client can call
with checked inputs. Astro's built-in way to handle forms.

**`.astro` component.** Astro's file format. A code fence (`---`) at the top
holds the **component script**, which runs at build or request time and never
reaches the browser. Below it is the HTML-like **template**.

**`Astro` global.** Available in components: `Astro.props` (inputs),
`Astro.params` (route values), `Astro.url`, `Astro.site`, `Astro.request`,
`Astro.redirect()`.

**`astro.config.mjs`.** Project configuration: `site` URL, integrations,
adapter, output, redirects, Markdown plugins.

**Client directive (`client:*`).** Marks a framework component to run in the
browser: `client:load`, `client:idle`, `client:visible`, `client:media`,
`client:only`. Without one, the component renders to HTML with no JavaScript.

**Collection.** A named set of entries of one kind (posts, team), defined in
`src/content.config.ts`.

**`content.config.ts`.** The file that defines every collection's loader and
schema.

**Content Layer.** The system behind collections. Loaders bring content in from
anywhere, and it is stored and typed the same way.

**Dynamic route.** A page file with brackets in its name (`[id].astro`) that
builds many pages. **Rest route** (`[...slug].astro`) matches several path
segments.

**Endpoint.** A `.ts` or `.js` file in `src/pages/` that exports `GET` (or other
methods) and returns a `Response`. Used for RSS, JSON and generated images.

**Entry.** One item in a collection, with `id`, `data` (checked frontmatter)
and, for Markdown, a body you can render.

**Frontmatter.** The YAML block at the top of a Markdown file. Also used,
loosely, for the script fence in `.astro` files.

**`getCollection` / `getEntry` / `getEntries`.** Functions that query
collections. `getCollection` takes an optional filter (for example, to hide
drafts).

**`getStaticPaths()`.** Exported by a dynamic route when building statically.
Returns every set of `params` (and optional `props`) to build.

**Integration.** A plugin that adds to Astro: frameworks (`@astrojs/react`),
features (`@astrojs/mdx`, `@astrojs/sitemap`), or tools.

**Island.** An interactive component on an otherwise static page. Astro loads
only the JavaScript islands need.

**Layout.** A component that wraps pages with shared structure. It is a normal
component, and the name is only a convention.

**Live content collection.** A collection fetched at request time instead of
build time, for content that changes constantly.

**Loader.** A function that supplies entries to a collection. `glob()` and
`file()` are built in. CMSs and APIs provide their own.

**MDX.** Markdown that can import and use components.

**On-demand rendering (SSR).** Rendering a page per request on a server instead
of at build time. Turned on per route with `export const prerender = false`
(given an adapter).

**`paginate()`.** A helper passed into `getStaticPaths()` that splits a list
into numbered pages.

**Prerender.** Building a page to HTML at build time. The default.

**`reference()`.** A schema helper that links an entry to an entry in another
collection by ID, and fails the build if the target is missing.

**`render()`.** Turns a Markdown or MDX entry into a `<Content />` component
plus `headings`.

**Schema.** A Zod definition of the frontmatter a collection allows. It checks
values and produces TypeScript types.

**Server island.** A component marked `server:defer` that renders on the server
after the rest of a static page, for personal or fresh content.

**Slot.** `<slot />` is where a component renders its children. Named slots
(`<slot name="hero" />`) allow several insertion points.

**Static output.** The default build mode: everything becomes HTML and assets
in `dist/`, so any static host can serve it.

**View transitions / `<ClientRouter />`.** Animated navigation between pages
without a full reload, with elements that persist across pages.

**Zod (`z`).** The validation library used for schemas. Imported from
`astro:content` (or `astro/zod`).
