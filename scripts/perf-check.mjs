/**
 * Rough interaction-performance probe (headless browser): frame times while scrolling the books
 * page and the homepage, and how long a theme switch blocks the page.
 *   node scripts/perf-check.mjs [baseUrl]
 */
import { DEVICES, launch, sleep } from "./lib/browser.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
// WEBGL=1 uses software WebGL so the 3D hall renders (much slower than a real GPU).
const b = await launch({ base: BASE, port: 9371, webgl: process.env.WEBGL === "1" });
await b.send("Network.setBlockedURLs", { urls: ["*googletagmanager.com*", "*googlesyndication.com*"] });

// Scroll smoothly for ~3s and record every frame interval.
const scrollProbe = `(async () => {
  const gaps = []; let last = performance.now(); let run = true;
  const tick = (t) => { gaps.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const max = document.documentElement.scrollHeight - innerHeight;
  const start = performance.now();
  await new Promise((done) => { const step = () => { const p = (performance.now() - start) / 3000;
    scrollTo(0, Math.min(p, 1) * Math.min(max, 4000)); p < 1 ? requestAnimationFrame(step) : done(); }; step(); });
  run = false; await new Promise(r => setTimeout(r, 50));
  gaps.sort((a, b) => a - b);
  const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  return { frames: gaps.length, avgMs: +avg.toFixed(1), p95Ms: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1), over50ms: gaps.filter(g => g > 50).length };
})()`;

const themeProbe = `(async () => {
  const btn = document.querySelector('[data-testid=theme-toggle]');
  const t0 = performance.now(); btn.click();
  // Time until the theme attribute changes and two frames have been painted after it.
  const target = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  while (document.documentElement.dataset.theme !== target) await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const gaps = []; let last = performance.now();
  for (let i = 0; i < 30; i++) { await new Promise(r => requestAnimationFrame(r)); const n = performance.now(); gaps.push(n - last); last = n; }
  return { switchMs: Math.round(performance.now() - t0), worstFrameAfterMs: Math.round(Math.max(...gaps)) };
})()`;

const out = {};
for (const [name, path] of [["books", "/books"], ["home", "/"]]) {
  await b.go(path, DEVICES.desktop, { settle: 4000 });
  await b.evaluate(`localStorage.setItem('dt-consent-v1','denied'); true`);
  out[`${name}Scroll`] = await b.evaluate(scrollProbe);
}
await b.go("/books", DEVICES.desktop, { settle: 3000 });
out.themeSwitchBooks = await b.evaluate(themeProbe);
await sleep(800);
out.themeSwitchBack = await b.evaluate(themeProbe);
console.log(JSON.stringify(out, null, 1));
b.close();
process.exit(0);
