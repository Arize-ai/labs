// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  // TODO: replace with the production domain once it is decided.
  site: "https://labs.arize.com",
  // Static by default. Individual routes can opt into on-demand rendering
  // with `export const prerender = false`.
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  redirects: {},
});
