/**
 * fetch with retries for Supabase calls, for slow or flaky networks (observed: 5–15 s connection
 * setup from the development machine, which can exceed Node's 10 s connect timeout).
 *
 * - GET/HEAD (reads): retried on any network failure.
 * - Writes: retried ONLY when the connection was never established (connect timeout / refused),
 *   so a request that may have reached the server is never sent twice.
 */
const CONNECT_ERRORS = new Set(["UND_ERR_CONNECT_TIMEOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ENETUNREACH"]);
const ATTEMPTS = 4;

export const resilientFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastError = e;
      const code = (e as { cause?: { code?: string } })?.cause?.code ?? "";
      const retryable = idempotent || CONNECT_ERRORS.has(code);
      if (!retryable || attempt === ATTEMPTS || init?.signal?.aborted) break;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastError;
};
