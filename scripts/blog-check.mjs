/**
 * Blog + CMS + categories against the LIVE database, data-safe (qa-* fixtures, temporary admin,
 * full cleanup). Includes a real scheduling test (~3 minutes).
 *   node scripts/blog-check.mjs [baseUrl]
 */
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, QA_CATEGORY, seedQa } from "./lib/qa-content.mjs";
import { createUser, deleteQaUsers, qaEmail, qaPassword } from "./lib/qa-users.mjs";
import { helpers, reporter } from "./lib/ui.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
process.env.QA_BASE_URL = BASE;
const { check, finish } = reporter();
const status = async (p) => (await fetch(BASE + p, { redirect: "manual" })).status;
const html = async (p) => (await fetch(BASE + p)).text();
const b = await launch({ base: BASE, port: 9339 });
const { wait, fill, click, signIn } = helpers(b);
const cardTitles = () => b.evaluate(`[...document.querySelectorAll('main article h3')].map(h => h.textContent.trim())`);
const pad = (n) => String(n).padStart(2, "0");
const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

async function createArticle({ title, content, status: st = "published", whenLocal, tags = "" }) {
  await b.go("/admin/articles/new", DEVICES.desktop, { settle: 800 });
  await wait(`document.querySelector('main form [name=title]')`);
  await fill("title", title);
  await fill("excerpt", `Excerpt for ${title}.`);
  await fill("content", content);
  await fill("author", "QA Bot");
  if (tags) await fill("tags", tags);
  await click(`input[name=categories][value="${QA_CATEGORY.slug}"]`);
  await click(`input[name=status][value=${st}]`);
  if (whenLocal) {
    await wait(`document.getElementById('publish-when')`);
    await b.evaluate(`(() => { const el = document.getElementById('publish-when'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(whenLocal)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await sleep(200);
  }
  await click("main form button[type=submit]");
  return wait(`location.pathname === '/admin/articles' && document.body.innerText.includes('Article created.')`, 30000);
}

let goLive;
try {
  await seedQa();
  await deleteQaUsers();

  // ------------------------------------------------------------ public blog
  await b.go("/blog", DEVICES.desktop, { settle: 800 });
  const t = await cardTitles();
  check("live QA articles listed; draft + future hidden", t.includes("QA Article Live") && t.includes("QA Article Two") && !t.includes("QA Article Draft") && !t.includes("QA Article Future"), t);
  check("draft article → 404", (await status("/blog/qa-article-draft")) === 404);
  check("future scheduled article → 404", (await status("/blog/qa-article-future")) === 404);
  await b.go(`/blog/category/${QA_CATEGORY.slug}`, DEVICES.desktop, { settle: 800 });
  check("category page lists only its live articles", (await cardTitles()).sort().join() === "QA Article Live,QA Article Two", await cardTitles());
  check("unknown category → 404", (await status("/blog/category/no-such-category-qa")) === 404);

  await b.go("/blog/qa-article-live", DEVICES.desktop, { settle: 800 });
  const art = await b.evaluate(`({
    h1: document.querySelectorAll('h1').length, h2: document.querySelectorAll('article h2').length,
    table: !!document.querySelector('article table'), quote: !!document.querySelector('article blockquote'),
    ul: !!document.querySelector('article ul li'), code: !!document.querySelector('article pre code'),
    tags: [...document.querySelectorAll('[aria-label=Tags] li')].map(l => l.textContent),
    related: [...document.querySelectorAll('[aria-labelledby=related-articles] h3')].map(h => h.textContent.trim()),
    canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
    ogType: document.querySelector('meta[property="og:type"]')?.content })`);
  check("article: one h1 + rendered markdown", art.h1 === 1 && art.h2 >= 1 && art.table && art.quote && art.ul && art.code, art);
  check("article: tags shown", art.tags.join() === "#qa,#zebracorn", art.tags);
  check("article: related ranks shared category/tags first", art.related[0] === "QA Article Two", art.related);
  check("article: canonical + og:type=article", art.canonical?.endsWith("/blog/qa-article-live") && art.ogType === "article", [art.canonical, art.ogType]);

  // ------------------------------------------------------------ admin articles
  const admin = { email: qaEmail("blog-admin"), password: qaPassword() };
  await createUser(admin.email, admin.password, { role: "admin", name: "QA Blog Admin" });
  check("qa admin signs in", await signIn(admin.email, admin.password, "/admin/articles"));

  await b.go("/admin/articles/new", DEVICES.desktop, { settle: 800 });
  await wait(`document.querySelector('main form [name=title]')`);
  await click("main form button[type=submit]");
  check("empty article → validation errors", await wait(`document.body.innerText.includes('Write the article content.')`));
  await fill("content", "## Preview heading\n\nSome **bold** text.");
  await b.evaluate(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent === 'preview').click(); true`);
  check("editor preview renders markdown", await wait(`[...document.querySelectorAll('main form h2')].some(h => h.textContent === 'Preview heading')`));

  const XSS = "Safe text.\n\n<script>window.__pwned = 1</script>\n\n<img src=x onerror=\"window.__pwned=2\">\n\n[click me](javascript:window.__pwned=3)";
  check("create published article", await createArticle({ title: "QA Created Article", content: XSS, tags: "qa, testing" }));
  check("created article is live", (await status("/blog/qa-created-article")) === 200);
  await b.go("/blog/qa-created-article", DEVICES.desktop, { settle: 1000 });
  const x = await b.evaluate(`({ pwned: window.__pwned ?? null, script: !!document.querySelector('article script'), onerror: !!document.querySelector('article img[onerror]'),
    js: [...document.querySelectorAll('article a')].filter(a => (a.getAttribute('href') || '').toLowerCase().startsWith('javascript')).length })`);
  await b.evaluate(`[...document.querySelectorAll('article a')].find(a => a.textContent === 'click me')?.click(); true`);
  await sleep(300);
  check("markdown is XSS-safe", x.pwned === null && !x.script && !x.onerror && x.js === 0 && (await b.evaluate("window.__pwned ?? null")) === null, x);

  await b.go("/admin/articles", DEVICES.desktop, { settle: 800 });
  await click('a[aria-label="Edit QA Created Article"]');
  await wait(`document.querySelector('main form [name=title]')?.value === 'QA Created Article'`);
  await fill("title", "QA Created Article Edited");
  await click("main form button[type=submit]");
  check("edit saves", await wait(`document.body.innerText.includes('Changes saved.')`, 30000));
  check("edit visible publicly, slug unchanged", (await html("/blog/qa-created-article")).includes("QA Created Article Edited"));

  check("create draft", await createArticle({ title: "QA Created Draft", content: "Draft body.", status: "draft" }));
  check("draft not public", (await status("/blog/qa-created-draft")) === 404);
  await click('a[aria-label="Preview QA Created Draft"]');
  check("admin preview shows draft", await wait(`document.body.innerText.includes('Preview · Draft') && document.body.innerText.includes('Draft body.')`));

  const past = await createArticle({ title: "QA Past Schedule", content: "x", status: "scheduled", whenLocal: localInput(new Date(Date.now() - 3600_000)) });
  check("scheduling in the past rejected", !past && (await wait(`document.body.innerText.includes('Scheduled time must be in the future')`)));

  goLive = new Date(Date.now() + 120_000);
  goLive.setSeconds(0, 0);
  check("create scheduled article", await createArticle({ title: "QA Scheduled Article", content: "Scheduled body.", status: "scheduled", whenLocal: localInput(goLive) }));
  check("scheduled article hidden before its time", (await status("/blog/qa-scheduled-article")) === 404);

  // ------------------------------------------------------------ categories
  await b.go("/admin/categories", DEVICES.desktop, { settle: 800 });
  const row = (slug) => `[...document.querySelectorAll('main form')].find(f => f.innerText.includes('/${slug}'))`;
  await wait(row(QA_CATEGORY.slug));
  await b.evaluate(`(() => { const f = ${row(QA_CATEGORY.slug)}; const el = f.querySelector('[name=name]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'QA Renamed & Category');
    el.dispatchEvent(new Event('input', { bubbles: true })); f.querySelector('button[type=submit]').click(); return true; })()`);
  check("rename category saves", await wait(`${row(QA_CATEGORY.slug)}?.innerText.includes('Saved.')`));
  await b.go("/books/qa-book-alpha", DEVICES.desktop, { settle: 600 });
  check("renamed category shows on public pages", await wait(`document.querySelector('nav[aria-label=Breadcrumb]')?.innerText.includes('QA Renamed & Category')`));
  await b.go("/admin/categories", DEVICES.desktop, { settle: 800 });
  await wait(row(QA_CATEGORY.slug));
  check("deleting an in-use category is blocked", await b.evaluate(`${row(QA_CATEGORY.slug)}.querySelector('button[aria-label^="Delete"]').disabled`));
  await b.evaluate(`(() => { const f = [...document.querySelectorAll('main form')].at(-1); const el = f.querySelector('[name=name]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'QA Temp Category'); el.dispatchEvent(new Event('input', { bubbles: true }));
    f.querySelector('button[type=submit]').click(); return true; })()`);
  check("create category", await wait(`document.body.innerText.includes('/qa-temp-category')`));
  check("new category page exists", (await status("/blog/category/qa-temp-category")) === 200);
  await b.evaluate(`${row("qa-temp-category")}.querySelector('button[aria-label^="Delete"]').click(); true`);
  await sleep(200);
  await b.evaluate(`[...${row("qa-temp-category")}.querySelectorAll('button')].find(x => x.textContent.trim() === 'Confirm delete').click(); true`);
  check("delete unused category", await wait(`!document.body.innerText.includes('/qa-temp-category')`));

  // ------------------------------------------------------------ unpublish + delete
  await b.go("/admin/articles", DEVICES.desktop, { settle: 800 });
  await click('button[aria-label="Unpublish QA Created Article Edited"]');
  await wait(`!document.querySelector('button[aria-label="Unpublish QA Created Article Edited"]')`);
  check("unpublish → 404", (await status("/blog/qa-created-article")) === 404);
  await click('button[aria-label="Delete QA Created Draft"]');
  await sleep(200);
  await b.evaluate(`[...document.querySelectorAll('[role=group] button')].find(x => x.textContent.trim() === 'Delete').click(); true`);
  check("delete article", await wait(`![...document.querySelectorAll('tbody tr')].some(r => r.innerText.includes('QA Created Draft'))`));
  await b.shot("docs/screenshots/phase5-admin-articles.png", { fullPage: true });

  // ------------------------------------------------------------ scheduled goes live on its own
  const ms = goLive.getTime() - Date.now();
  console.error(`waiting ~${Math.round(ms / 1000) + 65}s for the scheduled article…`);
  await sleep(Math.max(0, ms) + 65_000);
  let s = 0;
  for (let i = 0; i < 12 && s !== 200; i++) {
    s = await status("/blog/qa-scheduled-article");
    if (s !== 200) await sleep(10_000);
  }
  check("scheduled article goes live automatically", s === 200, s);
  check("…and appears in the blog list", (await html("/blog")).includes("QA Scheduled Article"));
} catch (e) {
  check("script error", false, String(e));
} finally {
  await cleanupQa().catch((e) => check("cleanup content", false, String(e)));
  await deleteQaUsers().catch(() => {});
  b.close();
}
process.exit(finish(b.consoleErrors));
