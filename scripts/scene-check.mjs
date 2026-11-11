/**
 * Dev-only check of the 3D homepage (Phase 2). Runs headless Edge/Chrome with software WebGL.
 *  - screenshots of each scroll stage (entrance, featured 1–3) on desktop and phone
 *  - demand rendering: WebGL draw calls while idle should be 0
 *  - cumulative layout shift while 3D loads
 *  - clicking a 3D book navigates to its product page (desktop)
 *  - reduced-motion and no-WebGL fallbacks render without a canvas
 *  - JS transferred on the homepage vs an inner page (three.js must not load elsewhere)
 *
 * Usage: npm run build && npx next start -p 3100, then  node scripts/scene-check.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { DEVICES, launch, sleep } from "./lib/browser.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "docs/screenshots/phase2";
mkdirSync(OUT, { recursive: true });

const INSTRUMENT = `
  window.__draws = 0;
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
    for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const orig = C.prototype[m];
      if (orig) C.prototype[m] = function (...a) { window.__draws++; return orig.apply(this, a); };
    }
  }
  window.__cls = 0;
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
    .observe({ type: 'layout-shift', buffered: true });
`;
const NO_WEBGL = `
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    return /webgl/i.test(type) ? null : origGet.call(this, type, ...a);
  };
`;

const b = await launch({ base: BASE, webgl: true, port: 9335 });
const { identifier: instrumentId } = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT });
const report = { devices: {}, reducedMotion: {}, noWebGL: {}, jsTransfer: {}, consoleErrors: b.consoleErrors };

const stageInfo = `(() => {
  const s = document.querySelector('section[aria-label^="Library"]');
  const header = document.querySelector('header').getBoundingClientRect().height;
  return { top: s.getBoundingClientRect().top + scrollY, step: innerHeight, header,
           canvas: !!s.querySelector('canvas'), ready: !!s.querySelector('.opacity-100 canvas') };
})()`;

async function waitForScene(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const i = await b.evaluate(stageInfo);
    if (i.ready) return i;
    await sleep(250);
  }
  return b.evaluate(stageInfo);
}

// Measure the worst case too: the first homepage request after content changes streams in.
// (The e2e runner runs this after the blog check, which edits content.)
for (const deviceName of ["desktop", "phone"]) {
  const device = DEVICES[deviceName];
  const r = (report.devices[deviceName] = { stages: [] });
  await b.go("/", device, { settle: 500 });
  const info = await waitForScene();
  r.canvas = info.canvas;
  r.ready = info.ready;
  await sleep(1500);
  r.clsAfterLoad = Number((await b.evaluate("window.__cls")).toFixed(4));

  for (let k = 0; k <= 3; k++) {
    // The stage starts at the page top (under the transparent header); each step is one viewport: top + k * step.
    await b.evaluate(`scrollTo(0, ${Math.round(info.top + k * info.step)})`);
    await sleep(2200); // camera damping settles
    await b.shot(`${OUT}/${deviceName}-stage-${k}.png`);
    r.stages.push(k);
  }

  // Idle: once the camera has settled, rendering must stop completely (demand frameloop).
  // Software WebGL is slow, so measure how long settling takes rather than assuming.
  // Two quiet seconds in a row: in software WebGL one frame can take >1s, which would otherwise
  // look like "settled" while the camera is still easing in.
  let settledAfterMs = null;
  let quiet = 0;
  for (let t = 0; t < 30000; t += 1000) {
    const d0 = await b.evaluate("window.__draws");
    await sleep(1000);
    quiet = (await b.evaluate("window.__draws")) === d0 ? quiet + 1 : 0;
    if (quiet === 2) {
      settledAfterMs = t + 1000;
      break;
    }
  }
  r.renderingStoppedWithinMs = settledAfterMs;
  const before = await b.evaluate("window.__draws");
  await sleep(3000);
  r.idleDrawCallsOver3s = (await b.evaluate("window.__draws")) - before;
  r.fps = await b.evaluate(`new Promise(res => { let n = 0; const s = performance.now();
    const f = () => { n++; performance.now() - s < 1000 ? requestAnimationFrame(f) : res(n); }; requestAnimationFrame(f); })`);

  // Scrolling does render (sanity check that the counter works).
  const s0 = await b.evaluate("window.__draws");
  await b.evaluate(`scrollBy(0, -${Math.round(info.step / 2)})`);
  await sleep(800);
  r.drawCallsDuringScroll = (await b.evaluate("window.__draws")) - s0;
}

// Click a 3D book (desktop): scroll to book 1 and click where it is framed (right column centre).
{
  await b.go("/", DEVICES.desktop, { settle: 500 });
  const info = await waitForScene();
  await b.evaluate(`scrollTo(0, ${Math.round(info.top + 1 * info.step)})`);
  await sleep(2200);
  const x = Math.round(DEVICES.desktop.width * 0.73);
  const y = Math.round(info.step / 2);
  // Approach like a real mouse (several moves) so R3F registers the hover first.
  for (let i = 0; i < 4; i++) {
    await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x - 15 + i * 5, y });
    await sleep(250);
  }
  const cursor = await b.evaluate("document.body.style.cursor");
  await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(60);
  await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  // Navigation fetches the book page from the server; allow a slow test machine up to 10s.
  for (let i = 0; i < 40 && !(await b.evaluate("location.pathname")).startsWith("/books/"); i++) await sleep(250);
  report.click3dBook = { clickedAt: [x, y], hoverCursor: cursor, landedOn: await b.evaluate("location.pathname") };
}

// Reduced motion → static fallback, no canvas.
await b.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await b.go("/", DEVICES.desktop, { settle: 1500 });
report.reducedMotion = await b.evaluate(stageInfo);
{
  const i = report.reducedMotion;
  await b.evaluate(`scrollTo(0, ${Math.round(i.top + i.step)})`);
  await sleep(800);
  await b.shot(`${OUT}/reduced-motion-desktop-stage-1.png`);
}
await b.send("Emulation.setEmulatedMedia", { features: [] });

// No WebGL → static fallback, no canvas.
const { identifier: noGlId } = await b.send("Page.addScriptToEvaluateOnNewDocument", { source: NO_WEBGL });
await b.go("/", DEVICES.phone, { settle: 1500 });
report.noWebGL = await b.evaluate(stageInfo);
{
  const i = report.noWebGL;
  await b.evaluate(`scrollTo(0, ${Math.round(i.top + i.step)})`);
  await sleep(800);
  await b.shot(`${OUT}/no-webgl-phone-stage-1.png`);
}
await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: noGlId });
await b.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: instrumentId });

// JS transferred (compressed bytes) — the 3D chunk must only load on the homepage.
for (const path of ["/", "/books"]) {
  await b.go(path, DEVICES.desktop, { settle: 3000 });
  report.jsTransfer[path] = await b.evaluate(`(() => {
    const js = performance.getEntriesByType('resource').filter(e => e.name.endsWith('.js'));
    return { files: js.length, kB: Math.round(js.reduce((s, e) => s + (e.transferSize || e.encodedBodySize), 0) / 1024) };
  })()`);
}

console.log(JSON.stringify(report, null, 2));
b.close();

// Assertions → exit code (so the e2e runner can report pass/fail).
const failures = [];
for (const [d, r] of Object.entries(report.devices)) {
  if (!r.canvas || !r.ready) failures.push(`${d}: 3D did not render`);
  if (r.clsAfterLoad > 0.1) failures.push(`${d}: layout shift ${r.clsAfterLoad}`);
  if (r.idleDrawCallsOver3s !== 0) failures.push(`${d}: still rendering while idle`);
  if (!(r.drawCallsDuringScroll > 0)) failures.push(`${d}: no rendering on scroll`);
}
if (!report.click3dBook?.landedOn?.startsWith("/books/")) failures.push("clicking a 3D book did not open a book page");
if (report.reducedMotion.canvas) failures.push("reduced motion still created a canvas");
if (report.noWebGL.canvas) failures.push("no-WebGL still created a canvas");
if (report.jsTransfer["/books"]?.kB >= report.jsTransfer["/"]?.kB) failures.push("3D code appears to load on /books");
const unexpected = report.consoleErrors.filter((e) => !e.includes("THREE.Clock"));
if (unexpected.length) failures.push(`console: ${unexpected.join(" | ")}`);
console.log(failures.length ? `\nFAILED:\n- ${failures.join("\n- ")}` : "\nScene check: all assertions passed.");
process.exit(failures.length ? 1 : 0);
