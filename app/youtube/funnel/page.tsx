import { KpiCard } from "@/components/reports/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getYtSnapshot, getYtDaily, getYtTrafficSources } from "@/lib/queries/youtube";

const ACCENT = "#FF0000";

export default async function YoutubeFunnelPage() {
  const [snap, daily, traffic] = await Promise.all([
    getYtSnapshot().catch(() => null),
    getYtDaily(30).catch(() => []),
    getYtTrafficSources().catch(() => []),
  ]);

  const viewsData = [...daily]
    .reverse()
    .map((d) => ({ label: d.date.slice(5), value: d.views }));

  const trafficData = traffic.map((t) => ({
    label: t.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: t.views,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">YouTube Funnel</h2>
        {snap && (
          <span className="font-mono text-xs text-ink/40">{snap.synced_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Impressions (365d)"
          value={snap?.impressions ? `${(snap.impressions / 1000).toFixed(0)}K` : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="CTR"
          value={snap?.impression_ctr != null ? `${Number(snap.impression_ctr).toFixed(2)}%` : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Views (365d)"
          value={snap ? `${(snap.views_365d / 1000).toFixed(0)}K` : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Watch Time (365d)"
          value={snap ? `${(snap.watch_minutes_365d / 60).toFixed(0)}h` : "—"}
          accentColor={ACCENT}
        />
      </div>

      {snap && (
        <div className="rounded-xl border border-ink/10 bg-card p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-4">
            Funnel
          </p>
          <div className="space-y-3">
            {[
              snap.impressions
                ? { label: "Impressions", value: snap.impressions, pct: 100 }
                : null,
              snap.impressions && snap.impression_ctr != null
                ? {
                    label: "Clicks (CTR)",
                    value: Math.round(snap.impressions * Number(snap.impression_ctr) / 100),
                    pct: Number(snap.impression_ctr),
                  }
                : null,
              {
                label: "Views (365d)",
                value: snap.views_365d,
                pct: snap.impressions ? (snap.views_365d / snap.impressions) * 100 : 100,
              },
              {
                label: "Watch Minutes",
                value: snap.watch_minutes_365d,
                pct: Math.min(100, (snap.watch_minutes_365d / snap.views_365d / 10) * 100),
              },
              {
                label: "Subs Gained",
                value: snap.subscribers_gained_365d,
                pct: (snap.subscribers_gained_365d / snap.views_365d) * 100,
              },
            ].filter((r): r is { label: string; value: number; pct: number } => r !== null).map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink/60">{row.label}</span>
                  <span className="font-mono">{row.value.toLocaleString()}</span>
                </div>
                <div className="h-6 bg-ink/5 rounded overflow-hidden">
                  <div
                    className="h-full rounded flex items-center px-2"
                    style={{
                      width: `${Math.max(2, row.pct)}%`,
                      backgroundColor: ACCENT,
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {viewsData.length > 0 && (
          <Card className="border-ink/10 bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
                Daily Views (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={viewsData.slice(-30)}
                accentColor={ACCENT}
                format="K"
              />
            </CardContent>
          </Card>
        )}
        {trafficData.length > 0 && (
          <Card className="border-ink/10 bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
                Traffic Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={trafficData} accentColor={ACCENT} horizontal />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
