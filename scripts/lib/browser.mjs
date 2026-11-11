/**
 * Tiny DevTools-protocol driver for the local Edge/Chrome (dev-only; no dependencies).
 * Shared by scripts/visual-check.mjs and scripts/scene-check.mjs.
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export { sleep };

export const DEVICES = {
  phone: { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 },
  tablet: { width: 820, height: 1180, mobile: true, deviceScaleFactor: 1 },
  desktop: { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 },
};

const DEFAULT_BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];

/**
 * @param {{ base: string, browserPath?: string, port?: number, webgl?: boolean }} opts
 *   webgl: use SwiftShader software WebGL so 3D renders headless without a GPU.
 */
export async function launch({ base, browserPath, port = 9333, webgl = false }) {
  const exe = browserPath ?? DEFAULT_BROWSERS.find(existsSync);
  if (!exe) throw new Error("No Edge/Chrome found; pass a browser path.");
  // Fresh profile every run: a cached profile can serve JS chunks from an older build and
  // produce false failures ("module factory is not available", spurious layout shifts).
  const profile = join(tmpdir(), `cdp-profile-${port}`);
  rmSync(profile, { recursive: true, force: true });
  const args = [
    "--headless=new", `--remote-debugging-port=${port}`, "--hide-scrollbars", "--no-first-run",
    `--user-data-dir=${profile}`, "--disk-cache-size=1",
    ...(webgl ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : ["--disable-gpu"]),
    "about:blank",
  ];
  const proc = spawn(exe, args, { stdio: "ignore" });

  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch { /* starting */ }
    if (!wsUrl) await sleep(250);
  }
  if (!wsUrl) throw new Error("Browser did not start");

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let nextId = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      consoleErrors.push(`exception: ${d.exception?.description ?? d.text}`);
    } else if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
      consoleErrors.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
    } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      consoleErrors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url ?? ""}`);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.clearBrowserCache");

  async function go(path, device, { settle = 300 } = {}) {
    await send("Emulation.setDeviceMetricsOverride", device);
    await send("Emulation.setTouchEmulationEnabled", { enabled: device.mobile });
    await send("Page.navigate", { url: base + path });
    for (let i = 0; i < 60; i++) {
      await sleep(150);
      if ((await evaluate("document.readyState")) === "complete") break;
    }
    await evaluate("document.fonts.ready.then(() => true)");
    await sleep(settle);
  }

  async function shot(file, { fullPage = false } = {}) {
    const params = { format: "png" };
    if (fullPage) {
      const { cssContentSize: s } = await send("Page.getLayoutMetrics");
      params.captureBeyondViewport = true;
      params.clip = { x: 0, y: 0, width: s.width, height: Math.min(s.height, 8000), scale: 1 };
    }
    const { data } = await send("Page.captureScreenshot", params);
    writeFileSync(file, Buffer.from(data, "base64"));
  }

  async function key(keyName, code, vk) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: keyName, code, windowsVirtualKeyCode: vk });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code, windowsVirtualKeyCode: vk });
  }

  function close() {
    ws.close();
    proc.kill();
  }

  return { send, evaluate, go, shot, key, close, consoleErrors };
}
