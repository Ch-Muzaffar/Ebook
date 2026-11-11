/** Runs once when the server starts (Next.js instrumentation hook). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { configureNetwork } = await import("./lib/server/network");
  configureNetwork();
}
