/**
 * Store + bag + admin book management, against the LIVE database but data-safe:
 * seeds qa-* fixtures, uses a temporary qa admin, and removes everything afterwards.
 *   REVALIDATE_SECRET=… node scripts/store-check.mjs [baseUrl]
 */
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, seedQa } from "./lib/qa-content.mjs";
import { connect } from "./db/env.mjs";
import { createUser, deleteQaUsers, env, qaEmail, qaPassword } from "./lib/qa-users.mjs";
import { FILES, helpers, reporter } from "./lib/ui.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
process.env.QA_BASE_URL = BASE;
const { check, finish } = reporter();
const status = async (p) => (await fetch(BASE + p, { redirect: "manual" })).status;
const html = async (p) => (await fetch(BASE + p)).text();
const b = await launch({ base: BASE, port: 9337 });
const { wait, fill, click, clickText, signIn, setFile } = helpers(b);
const titles = () => b.evaluate(`[...document.querySelectorAll('main article h3')].map(h => h.textContent.trim())`);

try {
  await seedQa();
  await deleteQaUsers();

  // ------------------------------------------------------------ store
  await b.go("/books", DEVICES.desktop, { settle: 800 });
  let t = await titles();
  check("published QA books listed, draft not", t.includes("QA Book Alpha") && t.includes("QA Book Beta") && !t.includes("QA Book Draft"), t);
  await b.evaluate(`(() => { const el = document.getElementById('store-search'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'zebracorn'); el.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await sleep(700);
  t = await titles();
  check("search finds exactly the QA books", t.length === 2 && t.every((x) => x.startsWith("QA Book")), t);
  check("search kept in URL", (await b.evaluate("location.search")).includes("q=zebracorn"));
  await b.go("/books?category=qa-test-category&sort=price-desc", DEVICES.desktop, { settle: 800 });
  t = await titles();
  check("category filter + price sort from URL", t.join() === "QA Book Beta,QA Book Alpha", t);

  check("draft book → 404", (await status("/books/qa-book-draft")) === 404);
  await b.go("/books/qa-book-alpha", DEVICES.desktop, { settle: 800 });
  check("book page: table of contents", (await b.evaluate(`document.querySelectorAll('#toc-heading + ol li').length`)) === 3);
  const related = await b.evaluate(`[...document.querySelectorAll('section[aria-labelledby="related-heading"] h3')].map(h => h.textContent.trim())`);
  check("related: same category first", related[0] === "QA Book Beta", related);

  // ------------------------------------------------------------ bag
  await b.evaluate("localStorage.clear(); true");
  await b.go("/books/qa-book-alpha", DEVICES.desktop, { settle: 800 });
  await clickText("Add to bag");
  check("add to bag → header count", await wait(`document.querySelector('a[href="/cart"][aria-label^="Shopping bag"]').getAttribute('aria-label') === 'Shopping bag, 1 item'`));
  await b.go("/books/qa-book-beta", DEVICES.desktop, { settle: 800 });
  await clickText("Add to bag");
  await sleep(300);
  await b.go("/cart", DEVICES.desktop, { settle: 1000 });
  const subtotal = () => b.evaluate(`[...document.querySelectorAll('aside dt')].find(d => d.textContent === 'Subtotal')?.nextElementSibling?.textContent`);
  check("bag subtotal from catalog prices ($58.00)", await wait(`[...document.querySelectorAll('aside dt')].some(d => d.textContent === 'Subtotal')`) && (await subtotal()) === "$58.00", await subtotal());
  await b.evaluate(`localStorage.setItem('bag:v1', JSON.stringify(['qa-book-alpha','qa-book-beta','qa-book-draft','{"price":0}'])); true`);
  await b.go("/cart", DEVICES.desktop, { settle: 1000 });
  await wait(`[...document.querySelectorAll('aside dt')].some(d => d.textContent === 'Subtotal')`);
  check("tampered bag: draft/invalid entries ignored", (await subtotal()) === "$58.00", await subtotal());
  await click('button[aria-label="Remove QA Book Beta"]');
  check("remove from bag", await wait(`[...document.querySelectorAll('aside dt')].find(d => d.textContent === 'Subtotal')?.nextElementSibling?.textContent === '$9.00'`));

  // ------------------------------------------------------------ admin: books
  const admin = { email: qaEmail("store-admin"), password: qaPassword() };
  await createUser(admin.email, admin.password, { role: "admin", name: "QA Store Admin" });
  check("qa admin signs in", await signIn(admin.email, admin.password, "/admin/products/new"));
  await wait(`document.querySelector('form [name=title]')`);
  await click("main form button[type=submit]");
  check("empty book form → validation errors", await wait(`document.querySelectorAll('[id$="-error"]').length >= 4`));

  await fill("title", "QA Created Book");
  check("slug auto-fills", await wait(`document.querySelector('form [name=slug]').value === 'qa-created-book'`));
  await fill("author", "QA Bot");
  await fill("price", "12.50");
  await fill("description", "Zebracorn created by the store check.");
  await fill("tableOfContents", "Alpha\nBeta");
  await fill("category", "qa-test-category");
  await click("input[name=status][value=published]");
  await setFile('input[type=file][accept^="image"]', "qa-upload-cover.png", "image/png", FILES.png);
  check("cover image uploads to storage", await wait(`/^https:\\/\\/.+qa-upload-cover\\.png$/.test(document.querySelector('form [name=coverImage]').value)`, 45000));
  await click("main form button[type=submit]");
  check("create → list with confirmation", await wait(`location.pathname === '/admin/products' && document.body.innerText.includes('Book created.')`, 30000));
  check("new book is public", (await status("/books/qa-created-book")) === 200);
  check("uploaded cover is used on the public page", (await html("/books/qa-created-book")).includes("qa-upload-cover.png"));

  // edit + ebook file upload
  await click('a[aria-label="Edit QA Created Book"]');
  await wait(`document.querySelector('main form [name=price]') && document.querySelector('input[type=file][accept*="pdf"]')`);
  await setFile('input[type=file][accept*="pdf"]', "qa-upload-book.pdf", "application/pdf", FILES.pdf);
  // Wait for the file to be uploaded AND linked (the manager then shows it with its size).
  check("eBook file uploads to private storage + is linked", await wait(`/qa-upload-book\\.pdf · /.test(document.body.innerText)`, 45000), await b.evaluate(`[...document.querySelectorAll('[role=alert],[role=status]')].map(e => e.textContent)`));
  {
    const db = await connect();
    const { rows } = await db.query("select f.path from product_files f join products p on p.id = f.product_id where p.slug = 'qa-created-book'");
    await db.end();
    const path = rows[0]?.path;
    const pub = path ? await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ebook-files/${path}`) : { status: 0 };
    const anon = path ? await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/ebook-files/${path}`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY } }) : { status: 0 };
    check("eBook file recorded in database", Boolean(path), path);
    check("private eBook file is NOT downloadable publicly or anonymously", path && pub.status >= 400 && anon.status >= 400, [pub.status, anon.status]);
  }
  await fill("price", "15");
  await click("main form button[type=submit]");
  check("edit saves", await wait(`document.body.innerText.includes('Changes saved.')`, 30000));
  check("edited price public", (await html("/books/qa-created-book")).includes("$15.00"));

  // duplicate slug
  await b.go("/admin/products/new", DEVICES.desktop, { settle: 800 });
  await fill("title", "Dup");
  await fill("slug", "qa-book-alpha");
  await fill("author", "x");
  await fill("price", "1");
  await fill("description", "x");
  await click("main form button[type=submit]");
  check("duplicate slug rejected", await wait(`document.body.innerText.includes('Another book already uses this URL slug.')`));

  // unpublish + delete
  await b.go("/admin/products", DEVICES.desktop, { settle: 800 });
  await click('button[aria-label="Unpublish QA Created Book"]');
  await wait(`document.querySelector('button[aria-label="Publish QA Created Book"]')`);
  check("unpublished → public 404", (await status("/books/qa-created-book")) === 404);
  await click('button[aria-label="Delete QA Created Book"]');
  await sleep(200);
  await b.evaluate(`[...document.querySelectorAll('[role=group] button')].find(x => x.textContent.trim() === 'Delete').click(); true`);
  check("delete removes row", await wait(`![...document.querySelectorAll('tbody tr')].some(r => r.innerText.includes('QA Created Book'))`));
  await b.shot("docs/screenshots/phase5-admin-products.png", { fullPage: true });
} catch (e) {
  check("script error", false, String(e));
} finally {
  await cleanupQa().catch((e) => check("cleanup content", false, String(e)));
  await deleteQaUsers().catch(() => {});
  b.close();
}
process.exit(finish(b.consoleErrors));
