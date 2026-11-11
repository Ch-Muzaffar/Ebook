/**
 * Phase 7: SEO, legal pages, cookie consent + GTM gating, ads (off by default, on via admin),
 * ads.txt and the admin Analytics page. Data-safe: qa-* fixtures + temporary admin, and the
 * site settings snapshot is restored afterwards. Google scripts are blocked in the test browser.
 *   node scripts/seo-check.mjs [baseUrl]
 */
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, revalidate, seedQa, snapshotSettings } from "./lib/qa-content.mjs";
import { createUser, deleteQaUsers, qaEmail, qaPassword } from "./lib/qa-users.mjs";
import { connect } from "./db/env.mjs";
import { helpers, reporter } from "./lib/ui.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
process.env.QA_BASE_URL = BASE;
const { check, finish } = reporter();
const get = (p) => fetch(BASE + p, { redirect: "manual" });
const html = async (p) => (await get(p)).text();
const jsonLd = (page) => [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat());
const types = (page) => jsonLd(page).flatMap((d) => [d["@type"]].flat());

const b = await launch({ base: BASE, port: 9347 });
await b.send("Network.setBlockedURLs", { urls: ["*googletagmanager.com*", "*googlesyndication.com*", "*google-analytics.com*", "*doubleclick.net*"] });
const { wait, fill, click, signIn } = helpers(b);
const restoreSettings = await snapshotSettings();

try {
  await deleteQaUsers();
  await seedQa();
  await revalidate();

  // ------------------------------------------------------------ crawl files
  const robots = await html("/robots.txt");
  check("robots.txt allows the site and blocks private areas", /Allow: \//.test(robots) && ["/admin", "/checkout", "/dashboard", "/api"].every((p) => robots.includes(`Disallow: ${p}`)));
  check("robots.txt links the sitemap", /Sitemap: https?:\/\/\S+\/sitemap\.xml/.test(robots));
  const sitemap = await html("/sitemap.xml");
  check("sitemap lists home, legal pages, books and articles", ["/privacy", "/terms", "/refund-policy", "/books/qa-book-alpha", "/blog/qa-article-live"].every((p) => sitemap.includes(`${p}</loc>`)));
  check("sitemap excludes drafts, scheduled and private pages", !["qa-book-draft", "qa-article-draft", "qa-article-future", "/admin", "/checkout"].some((p) => sitemap.includes(p)));
  check("ads.txt is 404 while no AdSense ID is set", (await get("/ads.txt")).status === 404 || (await html("/ads.txt")).includes("google.com, pub-"));
  check("default social image renders", (await get("/opengraph-image")).headers.get("content-type")?.startsWith("image/png"));
  check("app icon renders", (await get("/icon")).headers.get("content-type")?.startsWith("image/png"));

  // ------------------------------------------------------------ metadata + structured data
  const home = await html("/");
  check("home: Organization + WebSite JSON-LD with search", types(home).includes("Organization") && jsonLd(home).some((d) => d.potentialAction?.["@type"] === "SearchAction"));
  check("home: canonical + og:image", /<link rel="canonical" href="https?:\/\/[^"]+"/.test(home) && home.includes('property="og:image"'));
  const book = await html("/books/qa-book-alpha");
  const bookLd = jsonLd(book).find((d) => [d["@type"]].flat().includes("Book"));
  check("book: Book/Product JSON-LD with USD offer", bookLd?.offers?.priceCurrency === "USD" && bookLd.offers.price === "9.00");
  check("book: breadcrumbs + canonical", types(book).includes("BreadcrumbList") && /rel="canonical" href="[^"]+\/books\/qa-book-alpha"/.test(book));
  const article = await html("/blog/qa-article-live");
  check("article: BlogPosting JSON-LD", jsonLd(article).some((d) => d["@type"] === "BlogPosting" && d.headline === "QA Article Live"));
  check("article: canonical", /rel="canonical" href="[^"]+\/blog\/qa-article-live"/.test(article));
  check("books listing is not canonicalised to the homepage", !/rel="canonical" href="https?:\/\/[^/"]+\/?"/.test(await html("/books")));
  check("JSON-LD is escaped (no raw < inside)", [...article.matchAll(/application\/ld\+json">([\s\S]*?)<\/script>/g)].every((m) => !m[1].includes("<")));

  // ------------------------------------------------------------ legal + about
  const db = await connect();
  const { rows: [s] } = await db.query("select publisher_name, business_country, contact_email from site_settings where id = 1");
  await db.end();
  for (const [path, phrase] of [["/privacy", "Lemon Squeezy"], ["/terms", "licence"], ["/refund-policy", "all sales are final"], ["/about", "Publisher information"]]) {
    const page = await html(path);
    check(`${path}: real content (no placeholder)`, page.includes(phrase) && !page.includes("Placeholder"));
    if (s.contact_email && path !== "/terms") check(`${path}: shows the contact email`, page.includes(s.contact_email));
    if (s.publisher_name && path !== "/refund-policy") check(`${path}: names the publisher`, page.includes(s.publisher_name));
  }
  check("privacy has a #cookies section", (await html("/privacy")).includes('id="cookies"'));

  // ------------------------------------------------------------ consent + GTM
  const gtm = () => b.evaluate(`!!document.querySelector('script[data-gtm]')`);
  await b.go("/", DEVICES.desktop, { settle: 1500 });
  check("cookie banner shown on first visit", await wait(`document.querySelector('[data-testid=cookie-banner]')`, 10000));
  check("no Tag Manager before consent", !(await gtm()) && !(await b.evaluate(`!!window.dataLayer`)));
  await b.evaluate(`[...document.querySelectorAll('[data-testid=cookie-banner] button')].find(x => x.textContent.trim() === 'Reject').click(); true`);
  check("reject hides the banner", await wait(`!document.querySelector('[data-testid=cookie-banner]')`, 5000));
  await b.go("/books", DEVICES.desktop, { settle: 1200 });
  check("after reject: no banner and no Tag Manager on next page", !(await b.evaluate(`!!document.querySelector('[data-testid=cookie-banner]')`)) && !(await gtm()));
  await b.evaluate(`[...document.querySelectorAll('footer button')].find(x => x.textContent.trim() === 'Cookie settings').click(); true`);
  check("footer 'Cookie settings' reopens the banner", await wait(`document.querySelector('[data-testid=cookie-banner]')`, 5000));
  await b.evaluate(`[...document.querySelectorAll('[data-testid=cookie-banner] button')].find(x => x.textContent.trim() === 'Accept').click(); true`);
  check("accept loads Tag Manager (GTM- container)", await wait(`document.querySelector('script[data-gtm^="GTM-"]') && window.dataLayer?.some(e => e.event === 'gtm.js')`, 5000));
  await b.go("/about", DEVICES.desktop, { settle: 1200 });
  check("consent remembered across pages", (await gtm()) && !(await b.evaluate(`!!document.querySelector('[data-testid=cookie-banner]')`)));
  check("no ad units while ads are disabled", (await b.evaluate(`document.querySelectorAll('ins.adsbygoogle').length`)) === 0 && !home.includes("Advertisement"));

  // ------------------------------------------------------------ admin: advertising + analytics
  const admin = { email: qaEmail("seoadmin"), password: qaPassword() };
  await createUser(admin.email, admin.password, { role: "admin", name: "QA Admin" });
  check("admin signs in", await signIn(admin.email, admin.password, "/admin/advertising"));
  await b.evaluate(`localStorage.setItem('dt-consent-v1', 'granted'); true`); // consent already given above; make it explicit
  // A client-side arrival from a tracked page reloads into a clean document (NoTracking). The reload
  // can land in the middle of a check, so poll tolerantly until the admin form is on a settled page.
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      if (await b.evaluate(`document.readyState === 'complete' && !!document.querySelector('main form [name=adsenseClientId]')`)) break;
    } catch {
      /* page was reloading — try again */
    }
  }
  await sleep(1000);
  check("admin pages never load Tag Manager", !(await gtm()));
  check("advertising nav item enabled", await b.evaluate(`!!document.querySelector('nav[aria-label=Admin] a[href="/admin/advertising"]') && !!document.querySelector('nav[aria-label=Admin] a[href="/admin/analytics"]')`));

  await fill("adsenseClientId", "");
  await click("main form input[name=adsEnabled]:not(:checked)").catch(() => {});
  await click("main form button[type=submit]");
  check("can't enable ads without a publisher ID", await wait(`document.body.innerText.includes('publisher ID before turning ads on')`));
  await fill("adsenseClientId", "ca-pub-12");
  await click("main form button[type=submit]");
  check("invalid publisher ID rejected", await wait(`document.body.innerText.includes('should look like ca-pub-')`));
  await fill("adsenseClientId", "pub-1234567890123456");
  await fill("slotArticle", "1234567890");
  await fill("slotHome", "abc");
  await click("main form button[type=submit]");
  check("non-numeric ad unit rejected", await wait(`document.body.innerText.includes('numbers only')`));
  await fill("slotHome", "");
  await click("main form button[type=submit]");
  check("ads saved and enabled", await wait(`document.body.innerText.includes('ads are live')`));

  const adsTxt = await html("/ads.txt");
  check("ads.txt published for the publisher ID", adsTxt.trim() === "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0");
  await b.go("/blog/qa-article-live", DEVICES.desktop, { settle: 1500 });
  check("article shows the in-content ad unit (consent given)", await wait(`document.querySelector('main ins.adsbygoogle[data-ad-client="ca-pub-1234567890123456"][data-ad-slot="1234567890"]')`, 8000));
  check("home has no ad (no home unit configured)", !(await html("/")).includes("Advertisement"));
  await b.go("/cart", DEVICES.desktop, { settle: 1000 });
  check("no ads on the shopping bag", (await b.evaluate(`document.querySelectorAll('ins.adsbygoogle').length`)) === 0);
  await b.go("/checkout", DEVICES.desktop, { settle: 1000 });
  check("no ads on checkout", (await b.evaluate(`document.querySelectorAll('ins.adsbygoogle').length`)) === 0);
  await b.evaluate(`localStorage.removeItem('dt-consent-v1'); true`);
  await b.go("/blog/qa-article-live", DEVICES.desktop, { settle: 1500 });
  check("without consent the ad space stays empty", (await b.evaluate(`document.querySelectorAll('ins.adsbygoogle').length`)) === 0 && (await b.evaluate(`!!document.querySelector('main aside[aria-label=Advertisement]')`)));

  await b.go("/admin/advertising", DEVICES.desktop, { settle: 800 });
  await wait(`document.querySelector('main form [name=adsEnabled]')`);
  await b.evaluate(`(() => { const c = document.querySelector('main form [name=adsEnabled]'); if (c.checked) c.click(); return true; })()`);
  await click("main form button[type=submit]");
  check("ads switched off again", await wait(`document.body.innerText.includes('ads are switched off')`));
  check("article ad removed once switched off", !(await html("/blog/qa-article-live")).includes("adsbygoogle"));

  for (const q of ["", "?range=90", "?range=365&mode=test"]) {
    await b.go(`/admin/analytics${q}`, DEVICES.desktop, { settle: 800 });
    check(`analytics page renders ${q || "(30 days)"}`, await wait(`document.body.innerText.includes('Paid orders') && document.querySelectorAll('main figure').length >= 4`, 30000));
  }
  check("analytics range filter marks the active option", await b.evaluate(`document.querySelector('a[aria-current="true"][href*="range=365"]') !== null`));
} finally {
  await restoreSettings().catch((e) => console.error("restore settings:", e.message));
  await cleanupQa().catch(() => {});
  await deleteQaUsers().catch(() => {});
  await revalidate().catch(() => {});
  b.close();
}

process.exit(finish(b.consoleErrors.filter((e) => !/ERR_BLOCKED_BY_CLIENT|googletagmanager|googlesyndication|adsbygoogle/.test(e))));
