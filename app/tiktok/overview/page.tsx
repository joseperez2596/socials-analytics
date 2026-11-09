import { KpiCard } from "@/components/reports/kpi-card";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTiktokSnapshot, getTiktokVideos } from "@/lib/queries/tiktok";

const ACCENT = "#FF0050";

export default async function TiktokOverviewPage() {
  const [snap, videos] = await Promise.all([
    getTiktokSnapshot().catch(() => null),
    getTiktokVideos(15).catch(() => []),
  ]);

  const fypPenetration =
    snap && snap.follower_count > 0
      ? (snap.likes_count / snap.follower_count).toFixed(2) + "×"
      : "—";

  const avgEr =
    videos.length > 0
      ? (videos.reduce((s, v) => s + v.engagement_rate, 0) / videos.length).toFixed(2) + "%"
      : "—";

  const tableRows = videos.map((v, i) => ({
    rank: i + 1,
    title: v.title || v.video_id,
    thumbnail: v.thumbnail_url ?? undefined,
    href: v.share_url || undefined,
    primary: v.view_count.toLocaleString(),
    secondary: `${v.engagement_rate.toFixed(1)}%`,
    tertiary: v.share_count.toLocaleString(),
    primaryLabel: "Views",
    secondaryLabel: "ER%",
    tertiaryLabel: "Shares",
  }));

  const hiddenGems = videos
    .filter((v) => v.engagement_rate > 5 && v.view_count < 1000)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">TikTok Overview</h2>
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
          title="Total Likes"
          value={snap ? (snap.likes_count / 1000).toFixed(1) + "K" : "—"}
          accentColor={ACCENT}
        />
        <KpiCard
          title="FYP Penetration"
          value={fypPenetration}
          subtitle="likes / followers"
          accentColor={ACCENT}
        />
        <KpiCard
          title="Avg Engagement"
          value={avgEr}
          subtitle="across recent videos"
          accentColor={ACCENT}
        />
      </div>

      {tableRows.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Top Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PostTable rows={tableRows} accentColor={ACCENT} />
          </CardContent>
        </Card>
      )}

      {hiddenGems.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Hidden Gems (High ER, Low Views)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PostTable
              rows={hiddenGems.map((v, i) => ({
                rank: i + 1,
                title: v.title || v.video_id,
                thumbnail: v.thumbnail_url ?? undefined,
                href: v.share_url || undefined,
                primary: v.view_count.toLocaleString(),
                secondary: `${v.engagement_rate.toFixed(1)}%`,
                primaryLabel: "Views",
                secondaryLabel: "ER%",
              }))}
              accentColor={ACCENT}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
