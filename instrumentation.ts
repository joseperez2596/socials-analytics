// Runs once when the server starts. Starts the background sync scheduler (Node runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/sync/scheduler");
    startScheduler();
  }
}
