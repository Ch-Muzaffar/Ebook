import dns, { type LookupAddress } from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";

/**
 * Server-side HTTP tuning for slow networks (measured on the dev machine: DNS ~9.7 s,
 * TCP connect ~5.8 s, which exceeds Node's default 10 s connect timeout):
 * - caches DNS answers for 5 minutes (Node's fetch otherwise resolves on every new connection);
 * - allows up to 30 s to establish a connection;
 * - keeps connections alive longer so later requests reuse them (~0.6 s instead of ~13 s).
 * Harmless on fast hosting. Applies to every server-side fetch (Supabase, Resend, …).
 */
type Entry = { addresses: LookupAddress[]; expires: number };
const cache = new Map<string, Entry>();
const TTL = 5 * 60 * 1000;

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function cachedLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback) {
  const hit = cache.get(hostname);
  const reply = (addresses: LookupAddress[]) => {
    const wanted = options.family ? addresses.filter((a) => a.family === options.family) : addresses;
    const list = wanted.length ? wanted : addresses;
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  };
  if (hit && hit.expires > Date.now()) return reply(hit.addresses);
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err || !addresses.length) {
      if (hit) return reply(hit.addresses); // serve stale on DNS failure
      return callback(err ?? Object.assign(new Error(`DNS lookup failed for ${hostname}`), { code: "ENOTFOUND" }), "");
    }
    cache.set(hostname, { addresses, expires: Date.now() + TTL });
    reply(addresses);
  });
}

let configured = false;
export function configureNetwork() {
  if (configured) return;
  configured = true;
  setGlobalDispatcher(
    new Agent({
      connect: { timeout: 30_000, lookup: cachedLookup as never },
      keepAliveTimeout: 60_000,
      keepAliveMaxTimeout: 10 * 60_000,
      headersTimeout: 60_000,
      bodyTimeout: 60_000,
    }),
  );
}
