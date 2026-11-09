import { headers } from "next/headers";
import { ConnectionsView, type PlatformView } from "@/components/connections/connections-view";
import { CALLBACK } from "@/lib/connections/providers";
import { getConnection, getPublicUrl, getSchedule, isPlatform, PLATFORMS, recentRuns } from "@/lib/connections/store";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; error?: string; connected?: string }>;
}) {
  const q = await searchParams;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const [conns, runs, schedule, publicUrl] = await Promise.all([
    Promise.all(PLATFORMS.map((p) => getConnection(p).catch(() => null))),
    recentRuns(60),
    getSchedule(),
    getPublicUrl(),
  ]);

  // Only what the browser needs: never tokens or secrets.
  const platforms: PlatformView[] = PLATFORMS.map((p, i) => {
    const c = conns[i];
    return {
      platform: p,
      clientId: c?.client_id ?? "",
      secretHint: c?.client_secret ? c.client_secret.slice(-4) : "",
      connected: !!(c?.access_token || c?.refresh_token),
      account: c?.account ? { ...c.account } : {},
      lastError: c?.last_error ?? null,
      refreshExpiresAt: c?.refresh_expires_at?.toISOString() ?? null,
      redirectUri: (p === "tiktok" ? publicUrl || origin : origin) + CALLBACK(p),
    };
  });

  return (
    <div className="p-6 max-sm:p-4">
      <ConnectionsView
        key={`${q.p}|${q.error}|${q.connected}`}
        selected={isPlatform(q.p) ? q.p : platforms.find((p) => !p.connected)?.platform ?? "youtube"}
        platforms={platforms}
        runs={runs.map((r) => ({ ...r, started_at: r.started_at.toISOString(), finished_at: r.finished_at?.toISOString() ?? null }))}
        schedule={schedule.schedule}
        publicUrl={publicUrl}
        notice={q.error ? { text: q.error, error: true } : q.connected ? { text: "Connected. The first sync is running." } : null}
      />
    </div>
  );
}
