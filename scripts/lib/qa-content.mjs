/**
 * Test fixtures written straight into the live database — every record uses a qa- prefix and
 * is removed by cleanupQa(). Real content is never modified.
 */
import { connect, loadEnv } from "../db/env.mjs";

const env = loadEnv();
export const QA_CATEGORY = { slug: "qa-test-category", name: "QA Test Category" };

export async function seedQa() {
  await cleanupQa(); // leftovers from an interrupted run
  const db = await connect();
  try {
    await db.query("begin");
    await db.query("insert into categories (slug, name, description, sort_order) values ($1, $2, 'Temporary test category', 999)", [QA_CATEGORY.slug, QA_CATEGORY.name]);
    const book = (slug, title, price, status, extra = {}) =>
      db.query(
        `insert into products (slug, title, author, description, long_description, table_of_contents, price_cents, category_slug, format, pages, language, cover_tone, featured, status, published_at)
         values ($1,$2,'QA Author',$3,$4,$5,$6,$7,'PDF',100,'English','gold',false,$8,$9)`,
        [slug, title, `Zebracorn ${title} description.`, extra.long ?? null, extra.toc ?? [], price, QA_CATEGORY.slug, status, status === "published" ? extra.date ?? "2000-01-01" : null],
      );
    await book("qa-book-alpha", "QA Book Alpha", 900, "published", { long: "First paragraph.\n\nSecond paragraph.", toc: ["One", "Two", "Three"], date: "2000-01-02" });
    await book("qa-book-beta", "QA Book Beta", 4900, "published", { date: "2000-01-01" });
    await book("qa-book-draft", "QA Book Draft", 1000, "draft");

    const article = async (slug, title, status, publishAt, tags = ["qa"]) => {
      const { rows } = await db.query(
        `insert into articles (slug, title, excerpt, content, tags, author, author_bio, status, publish_at, reading_minutes)
         values ($1,$2,$3,$4,$5,'QA Writer','A test author.',$6,$7,1) returning id`,
        [slug, title, `Excerpt for ${title}.`, "Intro.\n\n## A heading\n\n- item one\n- item two\n\n> quote\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n```\ncode\n```", tags, status, publishAt],
      );
      await db.query("insert into article_categories (article_id, category_slug, position) values ($1,$2,0)", [rows[0].id, QA_CATEGORY.slug]);
    };
    await article("qa-article-live", "QA Article Live", "published", "2000-01-02T00:00:00Z", ["qa", "zebracorn"]);
    await article("qa-article-two", "QA Article Two", "published", "2000-01-01T00:00:00Z", ["qa"]);
    await article("qa-article-draft", "QA Article Draft", "draft", null);
    await article("qa-article-future", "QA Article Future", "scheduled", "2099-01-01T00:00:00Z");
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
  await revalidate();
}

/** Removes everything the tests may have created. Safe to call repeatedly. */
export async function cleanupQa() {
  const db = await connect();
  try {
    const { rows: files } = await db.query("select path from product_files f join products p on p.id = f.product_id where p.slug like 'qa-%'");
    await db.query("delete from articles where slug like 'qa-%'");
    await db.query("delete from products where slug like 'qa-%'");
    await db.query("delete from categories where slug like 'qa-%'");
    await db.query("delete from subscribers where email like 'qa-%@example.test'");
    const { rows: objects } = await db.query("select bucket_id, name from storage.objects where name like '%qa-upload%'");
    await db.end();
    const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
    const byBucket = {};
    for (const o of objects) (byBucket[o.bucket_id] ??= []).push(o.name);
    for (const f of files) (byBucket["ebook-files"] ??= []).push(f.path);
    for (const [bucket, prefixes] of Object.entries(byBucket))
      await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}`, { method: "DELETE", headers, body: JSON.stringify({ prefixes }) });
  } catch (e) {
    await db.end().catch(() => {});
    throw e;
  }
  await revalidate().catch(() => {});
}

/** Tell the running site to refresh cached content (needs REVALIDATE_SECRET on the server). */
export async function revalidate(base = process.env.QA_BASE_URL ?? "http://localhost:3100") {
  const secret = process.env.REVALIDATE_SECRET ?? env.REVALIDATE_SECRET;
  if (!secret) throw new Error("REVALIDATE_SECRET is not set for the test run");
  const r = await fetch(`${base}/api/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
  if (!r.ok) throw new Error(`revalidate failed: ${r.status}`);
}

/** Restore site settings exactly as they were (tests edit them). */
export async function snapshotSettings() {
  const db = await connect();
  const COLS = [
    "brand_name", "tagline", "description", "contact_email", "social_links", "publisher_name", "business_country",
    "ads_enabled", "adsense_client_id", "ad_slot_home", "ad_slot_article", "ad_slot_sidebar",
  ];
  const { rows } = await db.query(`select ${COLS.join(", ")} from site_settings where id = 1`);
  await db.end();
  return async () => {
    const s = rows[0];
    const db2 = await connect();
    await db2.query(`update site_settings set ${COLS.map((c, i) => `${c}=$${i + 1}`).join(", ")} where id = 1`, COLS.map((c) => s[c]));
    await db2.end();
    await revalidate().catch(() => {});
  };
}
