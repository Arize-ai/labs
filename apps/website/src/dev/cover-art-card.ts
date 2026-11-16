/**
 * The explorer's social card: the real card renderer, driven by query
 * parameters (seed, kind, title, eyebrow and the screen as JSON).
 */
import type { APIRoute } from "astro";
import { ART_KINDS, DEFAULT_SCREEN, type ArtKind, type Screen } from "../components/art/cover-art";
import { renderCard } from "../lib/og/render";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams;
  const kind = q.get("kind");
  let screen: Screen = DEFAULT_SCREEN;
  try {
    screen = { ...DEFAULT_SCREEN, ...JSON.parse(q.get("screen") ?? "{}") };
  } catch {}
  const image = await renderCard({
    eyebrow: (q.get("eyebrow") ?? "Blog").split("·").map((s) => s.trim()).filter(Boolean),
    title: q.get("title") || "Untitled",
    subtitle: q.get("subtitle") || undefined,
    panel: { seed: q.get("seed") ?? "", art: ART_KINDS.includes(kind as ArtKind) ? (kind as ArtKind) : undefined, screen },
    alt: "",
  });
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
};
