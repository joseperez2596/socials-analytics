import { KpiCard } from "@/components/reports/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getIgSnapshot, getIgDaily } from "@/lib/queries/instagram";

const ACCENT = "#E1306C";

export default async function InstagramAudiencePage() {
  const [snap, daily] = await Promise.all([
    getIgSnapshot().catch(() => null),
    getIgDaily(30).catch(() => []),
  ]);

  const reachData = [...daily]
    .reverse()
    .map((d) => ({ label: d.date.slice(5), value: d.reach }));

  const avgReach = daily.length > 0
    ? Math.round(daily.reduce((s, d) => s + d.reach, 0) / daily.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Instagram Audience</h2>
        {snap && (
          <span className="font-mono text-xs text-ink/40">{snap.synced_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Followers"
          value={snap ? snap.follower_count.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="30d Reach"
          value={snap ? snap.reach_30d.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Avg Daily Reach"
          value={avgReach > 0 ? avgReach.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
      </div>

      {reachData.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Daily Reach Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={reachData}
              accentColor={ACCENT}
              format="K"
            />
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
              Demographics and age/gender breakdown are not stored in the database yet — they
              require the Meta Insights API <code className="font-mono text-xs bg-ink/5 px-1 rounded">/insights?metric=follower_demographics</code>.
            </p>
            <p className="text-xs text-ink/40">
              To enable this, add the demographic metrics to your Meta data sync and an{" "}
              <code className="font-mono bg-ink/5 px-1 rounded">ig_demographics</code> table.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
