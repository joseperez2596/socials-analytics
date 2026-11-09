import { KpiCard } from "@/components/reports/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getYtSnapshots } from "@/lib/queries/youtube";

const ACCENT = "#FF0000";

export default async function YoutubeMonetizationPage() {
  const snaps = await getYtSnapshots(30).catch(() => []);
  const latest = snaps[0] ?? null;

  const revenueData = [...snaps]
    .reverse()
    .map((s) => ({
      label: s.synced_date.slice(5),
      value: Number(s.estimated_revenue ?? 0),
    }));

  const YPP_THRESHOLD_VIEWS = 4000 * 60;
  const YPP_THRESHOLD_SUBS = 1000;

  const viewsPct = latest
    ? Math.min(100, ((latest.watch_minutes_365d) / YPP_THRESHOLD_VIEWS) * 100)
    : 0;
  const subsPct = latest
    ? Math.min(100, (latest.subscriber_count / YPP_THRESHOLD_SUBS) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">YouTube Monetization</h2>
        {latest && (
          <span className="font-mono text-xs text-ink/40">{latest.synced_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Est. Revenue (365d)"
          value={latest?.estimated_revenue != null ? `€${Number(latest.estimated_revenue).toFixed(2)}` : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Gross Revenue"
          value={latest?.gross_revenue != null ? `€${Number(latest.gross_revenue).toFixed(2)}` : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="RPM"
          value={latest?.rpm != null ? `€${Number(latest.rpm).toFixed(2)}` : "—"}
          subtitle="per 1000 views"
          accentColor={ACCENT}
        />
        <KpiCard
          title="CPM"
          value={latest?.cpm != null ? `€${Number(latest.cpm).toFixed(2)}` : "—"}
          subtitle="per 1000 impressions"
          accentColor={ACCENT}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {revenueData.length > 0 && (
          <Card className="border-ink/10 bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
                Revenue Trend (30d snapshots)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={revenueData}
                accentColor={ACCENT}
                format="€"
              />
            </CardContent>
          </Card>
        )}

        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              YPP Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ink/60">Subscribers</span>
                <span className="font-mono">
                  {latest?.subscriber_count?.toLocaleString() ?? "—"} / 1,000
                </span>
              </div>
              <div className="h-4 bg-ink/5 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${subsPct}%`,
                    backgroundColor: subsPct >= 100 ? "#2f6b3a" : ACCENT,
                  }}
                />
              </div>
              {subsPct >= 100 && (
                <p className="text-xs text-pos mt-1">✓ Threshold met</p>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ink/60">Watch Hours (365d)</span>
                <span className="font-mono">
                  {latest ? `${(latest.watch_minutes_365d / 60).toFixed(0)}h` : "—"} / 4,000h
                </span>
              </div>
              <div className="h-4 bg-ink/5 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${viewsPct}%`,
                    backgroundColor: viewsPct >= 100 ? "#2f6b3a" : ACCENT,
                  }}
                />
              </div>
              {viewsPct >= 100 && (
                <p className="text-xs text-pos mt-1">✓ Threshold met</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
