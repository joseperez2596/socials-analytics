import { ScatterMatrix } from "@/components/charts/scatter-matrix";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTiktokVideos } from "@/lib/queries/tiktok";

const ACCENT = "#FF0050";

export default async function TiktokMatrixPage() {
  const videos = await getTiktokVideos(20).catch(() => []);

  const matrixData = videos.map((v) => ({
    label: v.title || v.video_id,
    x: v.view_count,
    y: v.engagement_rate,
    size: Math.min(14, 4 + Math.log10(Math.max(1, v.view_count)) * 1.5),
  }));

  const tableRows = videos.slice(0, 10).map((v, i) => ({
    rank: i + 1,
    title: v.title || v.video_id,
    thumbnail: v.thumbnail_url ?? undefined,
    href: v.share_url || undefined,
    primary: v.view_count.toLocaleString(),
    secondary: `${v.engagement_rate.toFixed(1)}%`,
    tertiary: `${v.virality_score.toFixed(3)}`,
    primaryLabel: "Views",
    secondaryLabel: "ER%",
    tertiaryLabel: "Virality",
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">TikTok Content Matrix</h2>

      <Card className="border-ink/10 bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
            Views × Engagement Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matrixData.length > 0 ? (
            <ScatterMatrix
              data={matrixData}
              xLabel="Views"
              yLabel="ER %"
              accentColor={ACCENT}
              quadrantLabels={["★ Hidden Gems", "★ Scale", "⌀ Low ER", "⌀ Skip"]}
            />
          ) : (
            <p className="text-ink/40 text-sm">No video data available.</p>
          )}
        </CardContent>
      </Card>

      {tableRows.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Top Videos by Views
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
