import { KpiCard } from "@/components/reports/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getIgSnapshot, getIgDaily, getIgMedia } from "@/lib/queries/instagram";

const ACCENT = "#E1306C";

export default async function InstagramOverviewPage() {
  const [snap, daily, media] = await Promise.all([
    getIgSnapshot().catch(() => null),
    getIgDaily(30).catch(() => []),
    getIgMedia(10).catch(() => []),
  ]);

  const reachData = [...daily]
    .reverse()
    .map((d) => ({ label: d.date.slice(5), value: d.reach }));

  const tableRows = media.map((m, i) => {
    const engRate =
      snap && snap.reach_30d > 0
        ? (((m.like_count + m.comments_count) / (snap.reach_30d / 30)) * 100).toFixed(1) + "%"
        : "—";
    return {
      rank: i + 1,
      title: m.caption || "(no caption)",
      type: m.media_type,
      thumbnail: m.thumbnail_url ?? undefined,
      href: m.permalink || undefined,
      primary: (m.like_count + m.comments_count).toLocaleString(),
      secondary: engRate,
      primaryLabel: "Interactions",
      secondaryLabel: "ER%",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Instagram Overview</h2>
        {snap && (
          <span className="font-mono text-xs text-ink/40">{snap.synced_date}</span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Followers"
          value={snap ? snap.follower_count.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Reach (30d)"
          value={snap ? snap.reach_30d.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Profile Views (30d)"
          value={snap ? snap.profile_views_30d.toLocaleString() : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="Avg Daily Reach"
          value={snap ? Math.round(snap.reach_30d / 30).toLocaleString() : "—"}
          accentColor={ACCENT}
        />
      </div>

      {reachData.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Daily Reach (30d)
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
