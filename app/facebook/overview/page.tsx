import { KpiCard } from "@/components/reports/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFbSnapshot, getFbDaily, getFbPosts } from "@/lib/queries/facebook";

const ACCENT = "#1877F2";

export default async function FacebookOverviewPage() {
  const [snap, daily, posts] = await Promise.all([
    getFbSnapshot().catch(() => null),
    getFbDaily(30).catch(() => []),
    getFbPosts(10).catch(() => []),
  ]);

  const engData = [...daily]
    .reverse()
    .map((d) => ({ label: d.date.slice(5), value: d.post_engagements }));

  const tableRows = posts.map((p, i) => ({
    rank: i + 1,
    title: p.message || "(no message)",
    thumbnail: p.thumbnail_url ?? undefined,
    primary: (p.reactions + p.comments + p.shares).toLocaleString(),
    secondary: p.reactions.toLocaleString(),
    tertiary: p.shares.toLocaleString(),
    primaryLabel: "Total",
    secondaryLabel: "Reactions",
    tertiaryLabel: "Shares",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Facebook Overview</h2>
        {snap && (
          <span className="font-mono text-xs text-ink/40">{snap.synced_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Page Fans"
          value={snap ? snap.fan_count.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Engagements (30d)"
          value={snap ? snap.post_engagements_30d.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Avg Daily Engagement"
          value={snap ? Math.round(snap.post_engagements_30d / 30).toLocaleString() : "—"}
          accentColor={ACCENT}
        />
      </div>

      {engData.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Daily Engagements (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={engData} accentColor={ACCENT} />
          </CardContent>
        </Card>
      )}

      {tableRows.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Recent Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PostTable rows={tableRows} accentColor={ACCENT} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
