import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const TAGS = ["products", "articles", "categories", "settings"] as const;

/**
 * Refresh cached site content after the database was changed OUTSIDE the admin panel
 * (e.g. edits in the Supabase dashboard, imports, automated tests).
 *
 *   POST /api/revalidate      Authorization: Bearer <REVALIDATE_SECRET>
 *   body (optional): {"tags": ["products"]}   — defaults to all content tags
 *
 * Disabled unless REVALIDATE_SECRET is set (min. 24 characters).
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  if (secret.length < 24) return new Response("Not found", { status: 404 });
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response("Unauthorized", { status: 401 });

  let tags: string[] = [...TAGS];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) tags = body.tags.filter((t): t is string => (TAGS as readonly string[]).includes(t as string));
  } catch {
    /* no body → all tags */
  }
  for (const tag of tags) revalidateTag(tag, { expire: 0 }); // next request rebuilds with fresh data
  return Response.json({ revalidated: tags });
}
