import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts, postUrl } from "../lib/content";
import { site } from "../site.config";

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: `${site.name} blog`,
    description: site.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
      categories: post.data.tags,
    })),
  });
}
