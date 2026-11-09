// Pure: decides whether an automatic sync is due. Shared by the scheduler and tests.
export type Schedule = "daily" | "6h" | "manual";
export const SCHEDULES: Record<Schedule, string> = {
  daily: "Every day at 06:00",
  "6h": "Every 6 hours",
  manual: "Only when I click Sync",
};
const DAILY_HOUR = 6;

function local(d: Date, tz: string): { date: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** lastRun = start of the platform's most recent sync of any kind (null if never). */
export function isDue(schedule: Schedule, tz: string, lastRun: Date | null, now: Date): boolean {
  if (schedule === "manual") return false;
  if (!lastRun) return true;
  if (schedule === "6h") return now.getTime() - lastRun.getTime() >= 6 * 3600_000;
  const n = local(now, tz);
  if (n.hour < DAILY_HOUR) return false;
  const l = local(lastRun, tz);
  return l.date < n.date || (l.date === n.date && l.hour < DAILY_HOUR);
}
