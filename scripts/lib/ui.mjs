/** Small browser helpers shared by the end-to-end checks. */
import { DEVICES, sleep } from "./browser.mjs";

export function helpers(b) {
  // Generous default: server actions talk to Supabase, which is slow from the dev network.
  const wait = (expr, ms = 30000) =>
    b.evaluate(`new Promise(res => { const s = Date.now(); const t = () => { let v; try { v = (${expr}); } catch {}
      if (v || Date.now() - s > ${ms}) res(!!v); else setTimeout(t, 150); }; t(); })`);
  /** Sets a form field (input/textarea/select) the way a user would, so React state updates. */
  const fill = (name, value, scope = "main form") =>
    b.evaluate(`(() => { const el = document.querySelector('${scope} [name="${name}"]'); if (!el) throw new Error('no field ${name}');
      const proto = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const click = (selector) => b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('missing ' + ${JSON.stringify(selector)}); el.click(); return true; })()`);
  const clickText = (text, selector = "button") =>
    b.evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(x => x.textContent.trim() === ${JSON.stringify(text)}); if (!el) throw new Error('no ${selector} "${text}"'); el.click(); return true; })()`);
  const visible = (text) => b.evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
  const path = () => b.evaluate("location.pathname");

  /** Signs in through the real login form. */
  async function signIn(email, password, next = "") {
    await b.send("Network.clearBrowserCookies");
    await b.go(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`, DEVICES.desktop, { settle: 600 });
    await fill("email", email);
    await fill("password", password);
    await click("main form button[type=submit]");
    const ok = await wait(`location.pathname !== '/login'`, 30000);
    await sleep(300);
    return ok;
  }

  /** Sets a file on an <input type=file> from bytes (base64), triggering the upload component. */
  async function setFile(inputSelector, fileName, mime, base64) {
    return b.evaluate(`(() => { const input = document.querySelector(${JSON.stringify(inputSelector)}); if (!input) throw new Error('no file input');
      const bytes = Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0));
      const dt = new DataTransfer(); dt.items.add(new File([bytes], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mime)} }));
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  }

  return { wait, fill, click, clickText, visible, path, signIn, setFile };
}

/** Tiny valid test files. */
export const FILES = {
  // 1×1 PNG
  png: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  // minimal PDF
  pdf: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n").toString("base64"),
};

export function reporter() {
  const results = [];
  const check = (name, pass, detail) => results.push({ pass: !!pass, name, detail });
  const finish = (consoleErrors = []) => {
    const errors = consoleErrors.filter((e) => !/40[134]|THREE\.Clock/.test(e));
    check("no unexpected console errors", errors.length === 0, errors);
    for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${!r.pass && r.detail !== undefined ? `  → ${JSON.stringify(r.detail)}` : ""}`);
    console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
    return results.every((r) => r.pass) ? 0 : 1;
  };
  return { check, finish };
}
