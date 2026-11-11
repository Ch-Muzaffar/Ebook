/** Generates a new 32-character webhook secret (Lemon Squeezy allows ≤ 40) and saves it. Prints no secret. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const secret = randomBytes(24).toString("base64url"); // 32 chars
const text = readFileSync(".env.local", "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
let lines = text.split(/\r?\n/).filter((l) => !/^\s*LEMONSQUEEZY_WEBHOOK_SECRET\s*=/.test(l));
while (lines.length && lines.at(-1) === "") lines.pop();
lines.push(`LEMONSQUEEZY_WEBHOOK_SECRET=${secret}`);
writeFileSync(".env.local", lines.join(eol) + eol);
console.log(`new webhook secret saved (${secret.length} chars). Restart the server, then re-register: node scripts/payments/setup.mjs --webhook <url>`);
