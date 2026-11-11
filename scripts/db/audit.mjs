/** Read-only snapshot: real content counts + confirmation that no test (qa-*) data is left behind. */
import { connect } from "./env.mjs";

const db = await connect();
const q = async (sql) => (await db.query(sql)).rows[0];
const real = await q(`select
  (select count(*) from products where slug not like 'qa-%')::int books,
  (select count(*) from products where slug not like 'qa-%' and status='published')::int published,
  (select count(*) from articles where slug not like 'qa-%')::int articles,
  (select count(*) from categories where slug not like 'qa-%')::int categories,
  (select count(*) from profiles)::int accounts,
  (select count(*) from profiles where role='admin')::int admins,
  (select count(*) from subscribers)::int subscribers,
  (select brand_name from site_settings where id=1) brand`);
const leftovers = await q(`select
  (select count(*) from products where slug like 'qa-%')::int qa_books,
  (select count(*) from articles where slug like 'qa-%')::int qa_articles,
  (select count(*) from categories where slug like 'qa-%')::int qa_categories,
  (select count(*) from auth.users where email like 'qa-%@example.test')::int qa_users,
  (select count(*) from subscribers where email like '%@example.test' or email like '%@example.com')::int test_subscribers,
  (select count(*) from storage.objects where name like '%qa-upload%')::int qa_files,
  (select count(*) from orders where email like '%@example.test')::int qa_orders,
  (select count(*) from payment_events where payload->'data'->'attributes'->'urls'->>'receipt' = 'https://example.test/receipt')::int qa_events`);
console.log("Your content:", JSON.stringify(real));
console.log("Test leftovers (should all be 0):", JSON.stringify(leftovers));
await db.end();
