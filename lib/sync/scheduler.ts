// Started once per server (instrumentation.ts). Checks every minute whether a sync is due.
import { isDue } from "@/lib/connections/schedule";
import { getConnection, getSchedule, lastRunStart, PLATFORMS } from "@/lib/connections/store";
import { runSync } from "./run";

let started = false;

async function tick() {
  const { schedule, tz } = await getSchedule();
  if (schedule === "manual") return;
  for (const p of PLATFORMS) {
    const conn = await getConnection(p);
    // Skip platforms not connected or waiting for a reconnect (no retry storm on a dead login).
    if (!conn || (!conn.access_token && !conn.refresh_token) || conn.last_error) continue;
    if (p === "meta" && !conn.account.page_id) continue;
    if (isDue(schedule, tz, await lastRunStart(p), new Date())) await runSync(p, "schedule");
  }
}

export function startScheduler() {
  if (started) return;
  started = true;
  const loop = () => tick().catch((err) => console.error("[sync] scheduler:", (err as Error).message));
  setTimeout(loop, 15_000); // let the server finish booting and migrations settle
  setInterval(loop, 60_000).unref();
}
