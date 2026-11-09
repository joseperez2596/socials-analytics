import { KpiCard } from "@/components/reports/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFbSnapshot, getFbDaily } from "@/lib/queries/facebook";

const ACCENT = "#1877F2";

export default async function FacebookAudiencePage() {
  const [snap, daily] = await Promise.all([
    getFbSnapshot().catch(() => null),
    getFbDaily(30).catch(() => []),
  ]);

  const engData = [...daily]
    .reverse()
    .map((d) => ({ label: d.date.slice(5), value: d.post_engagements }));

  const avgEng =
    daily.length > 0
      ? Math.round(daily.reduce((s, d) => s + d.post_engagements, 0) / daily.length)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Facebook Audience</h2>
        {snap && (
          <span className="font-mono text-xs text-ink/40">{snap.synced_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Page Fans" value={snap ? snap.fan_count.toLocaleString() : "—"} accentColor={ACCENT} />
        <KpiCard title="30d Engagements" value={snap ? snap.post_engagements_30d.toLocaleString() : "—"} accentColor={ACCENT} />
        <KpiCard title="Avg Daily Engagement" value={avgEng > 0 ? avgEng.toLocaleString() : "—"} accentColor={ACCENT} />
      </div>

      {engData.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Engagement Trend (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={engData} accentColor={ACCENT} />
          </CardContent>
        </Card>
      )}

      <Card className="border-ink/10 bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
            Audience Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-ink/60">
            <p>
              Age/gender and city-level demographic data require the{" "}
              <code className="font-mono text-xs bg-ink/5 px-1 rounded">page_fans_country</code> and{" "}
              <code className="font-mono text-xs bg-ink/5 px-1 rounded">page_fans_gender_age</code>{" "}
              metrics in your Meta data sync.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
