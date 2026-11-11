/**
 * One-time import of the interim JSON content (data/*.json) into Supabase.
 * Runs in a single transaction; refuses to run if the tables already contain rows.
 *   node scripts/db/import-json.mjs
 */
import { readFileSync } from "node:fs";
import { connect } from "./env.mjs";

const read = (f) => JSON.parse(readFileSync(`data/${f}`, "utf8"));
const categories = read("categories.json");
const products = read("products.json");
const articles = read("articles.json");

const db = await connect();
const existing = (await db.query("select (select count(*) from categories) + (select count(*) from products) + (select count(*) from articles) as n")).rows[0].n;
if (Number(existing) > 0) {
  console.log(`Tables already contain ${existing} rows — import skipped (nothing changed).`);
  await db.end();
  process.exit(0);
}

try {
  await db.query("begin");
  for (const c of categories)
    await db.query("insert into categories (slug, name, description, sort_order) values ($1,$2,$3,$4)", [c.slug, c.name, c.description ?? null, c.order ?? 0]);

  for (const p of products)
    await db.query(
      `insert into products (id, slug, title, subtitle, author, description, long_description, table_of_contents, price_cents,
         category_slug, format, pages, language, cover_image, cover_tone, featured, status, published_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [p.id, p.slug, p.title, p.subtitle ?? null, p.author, p.description, p.longDescription ?? null, p.tableOfContents ?? [],
        p.priceCents, p.category, p.format, p.pages ?? null, p.language ?? null, p.coverImage ?? null, p.coverTone,
        !!p.featured, p.status, p.publishedAt ?? null, p.updatedAt],
    );

  for (const a of articles) {
    await db.query(
      `insert into articles (id, slug, title, excerpt, content, tags, featured_image, featured_image_alt, author, author_bio,
         status, publish_at, seo_title, seo_description, reading_minutes, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [a.id, a.slug, a.title, a.excerpt, a.content, a.tags ?? [], a.featuredImage ?? null, a.featuredImageAlt ?? null, a.author,
        a.authorBio ?? null, a.status, a.publishAt ?? null, a.seoTitle ?? null, a.seoDescription ?? null, a.readingMinutes ?? 1, a.updatedAt],
    );
    for (const [i, slug] of (a.categories ?? []).entries())
      await db.query("insert into article_categories (article_id, category_slug, position) values ($1,$2,$3)", [a.id, slug, i]);
  }
  await db.query("commit");
} catch (e) {
  await db.query("rollback");
  console.log(`Import FAILED and was rolled back: ${e.message}`);
  await db.end();
  process.exit(1);
}

const counts = (await db.query(
  "select (select count(*) from categories) c, (select count(*) from products) p, (select count(*) from articles) a, (select count(*) from article_categories) ac",
)).rows[0];
console.log(`Imported: ${counts.c} categories, ${counts.p} books, ${counts.a} articles, ${counts.ac} article-category links.`);
console.log(`Source files: ${categories.length} categories, ${products.length} books, ${articles.length} articles.`);
await db.end();
