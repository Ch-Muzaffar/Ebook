/**
 * Design pass: light (Classic Library) and dark (Modern Luxury) themes, theme toggle + persistence,
 * no-flash script, 3D book covers, text reveals, counters, 3D hall in both themes, overflow on
 * phones, and screenshots of key pages in both themes (docs/screenshots/theme-*.png).
 *   node scripts/design-check.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, revalidate, seedQa } from "./lib/qa-content.mjs";
import { helpers, reporter } from "./lib/ui.mjs";
import { connect } from "./db/env.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "docs/screenshots";
process.env.QA_BASE_URL = BASE;
mkdirSync(OUT, { recursive: true });
const { check, finish } = reporter();
const b = await launch({ base: BASE, port: 9351, webgl: true });
await b.send("Network.setBlockedURLs", { urls: ["*googletagmanager.com*", "*googlesyndication.com*"] });
const { wait } = helpers(b);

const setTheme = async (t) => {
  await b.evaluate(`localStorage.setItem('dt-theme', '${t}'); localStorage.setItem('dt-consent-v1', 'denied'); true`);
};
const theme = () => b.evaluate(`document.documentElement.dataset.theme`);
const bgLum = () =>
  b.evaluate(`(() => { const m = getComputedStyle(document.body).backgroundColor.match(/\\d+(\\.\\d+)?/g).map(Number);
    return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; })()`);
const scrollThrough = () =>
  b.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 350) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 900)); return true; })()`);

try {
  await seedQa();
  await revalidate();

  // ------------------------------------------------------------ no-flash + toggle
  const html = await (await fetch(BASE + "/")).text();
  check("theme script runs in <head> before the page paints", /<head>[\s\S]*dt-theme[\s\S]*<\/head>/.test(html));

  await b.go("/", DEVICES.desktop, { settle: 600 });
  await setTheme("light");
  await b.go("/", DEVICES.desktop, { settle: 800 });
  check("light theme: ivory page", (await theme()) === "light" && (await bgLum()) > 0.85);
  await b.evaluate(`document.querySelector('[data-testid=theme-toggle]').click(); true`);
  check("toggle switches to dark", await wait(`document.documentElement.dataset.theme === 'dark'`, 3000));
  // The colours cross-fade for 0.5s; allow for a busy machine.
  let lum = 1;
  for (let i = 0; i < 20 && lum >= 0.12; i++) {
    await sleep(250);
    lum = await bgLum();
  }
  check("dark theme: deep page background", lum < 0.12, lum);
  await b.go("/books", DEVICES.desktop, { settle: 800 });
  check("dark choice persists across pages/reloads", (await theme()) === "dark");
  check("toggle label offers the other theme", await b.evaluate(`document.querySelector('[data-testid=theme-toggle]').getAttribute('aria-label').includes('light')`));

  // ------------------------------------------------------------ components
  check("book cards render as 3D books", await b.evaluate(`document.querySelectorAll('main .book3d').length > 0`));
  check("printed covers keep their colours in dark mode", await b.evaluate(`(() => {
    const c = document.querySelector('main .book3d [aria-hidden].bg-ink, main .book3d .bg-ink'); if (!c) return true;
    return getComputedStyle(c).backgroundColor === 'rgb(37, 37, 34)'; })()`));
  await b.go("/books/qa-book-alpha", DEVICES.desktop, { settle: 1200 });
  check("book page: 3D book + foil price", await b.evaluate(`!!document.querySelector('main .book3d') && !!document.querySelector('main .text-foil')`));
  check("book page heading revealed", await wait(`document.querySelector('main h1 [data-split][data-shown]')`, 5000));

  await b.go("/", DEVICES.desktop, { settle: 1500 });
  check("hero headline reveals word by word", await wait(`document.querySelectorAll('main h1 .split-word').length > 1 && document.querySelector('main h1 [data-shown]')`, 5000));
  check("3D hall renders in dark theme", await wait(`!!document.querySelector('main canvas')`, 20000));
  await sleep(2500);
  await b.shot(`${OUT}/theme-dark-home-desktop.png`);
  // Counters: scroll to them, let them count, and compare with the store's real totals.
  await b.evaluate(`document.querySelector('section[aria-label="The library in numbers"]').scrollIntoView({ block: 'center' }); true`);
  await sleep(2500);
  const shown = await b.evaluate(`[...document.querySelectorAll('section[aria-label="The library in numbers"] .tabular-nums')].map(x => x.textContent.trim())`);
  const db = await connect();
  const one = async (sql) => String(Number((await db.query(sql)).rows[0].n));
  const expected = [
    await one("select count(*) n from products where status = 'published'"),
    await one("select count(*) n from articles where status in ('published','scheduled') and publish_at <= now()"),
    await one(`select count(*) n from categories c where exists (select 1 from products p where p.category_slug = c.slug and p.status = 'published')
      or exists (select 1 from article_categories ac join articles a on a.id = ac.article_id where ac.category_slug = c.slug and a.status in ('published','scheduled') and a.publish_at <= now())`),
  ];
  await db.end();
  check("counters show the store's real totals (books, articles, subjects)", JSON.stringify(shown) === JSON.stringify(expected), { shown, expected });

  // ------------------------------------------------------------ screenshots, both themes
  for (const t of ["dark", "light"]) {
    await setTheme(t);
    for (const [name, path, device] of [
      ["home-hero", "/", "desktop"],
      ["home", "/", "phone"],
      ["books", "/books", "desktop"],
      ["book", "/books/qa-book-alpha", "desktop"],
      ["book", "/books/qa-book-alpha", "phone"],
      ["article", "/blog/qa-article-live", "phone"],
      ["about", "/about", "desktop"],
    ]) {
      await b.go(path, DEVICES[device], { settle: 1200 });
      if (name === "home-hero") {
        await sleep(2500);
        await b.shot(`${OUT}/theme-${t}-home-hero-desktop.png`);
        // Scroll to the first featured book in the 3D hall.
        await b.evaluate(`scrollTo(0, innerHeight * 1.05); true`);
        await sleep(2500);
        await b.shot(`${OUT}/theme-${t}-home-book1-desktop.png`);
        continue;
      }
      await scrollThrough();
      await b.shot(`${OUT}/theme-${t}-${name}-${device}.png`, { fullPage: true });
      if (device === "phone") {
        const o = await b.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`);
        check(`${t} ${path} phone: no horizontal scroll`, o);
      }
    }
  }
  check("light theme restored after screenshots", (await theme()) === "light");
} finally {
  await cleanupQa().catch(() => {});
  await revalidate().catch(() => {});
  b.close();
}

process.exit(finish(b.consoleErrors.filter((e) => !/ERR_BLOCKED_BY_CLIENT|GPU stall|WebGL|swiftshader/i.test(e))));
