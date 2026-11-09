import { ScatterMatrix } from "@/components/charts/scatter-matrix";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getYtVideos } from "@/lib/queries/youtube";
import { classifyByKeywords, getPillars } from "@/lib/pillar-classification";

const ACCENT = "#FF0000";

export default async function YoutubeMatrixPage() {
  const YT_PILLAR_KEYWORDS = getPillars("youtube");
  const videos = await getYtVideos().catch(() => []);

  const matrixData = videos.map((v) => ({
    label: v.title,
    x: v.views > 0 ? Math.log10(v.views) : 0,
    y: v.views > 0 ? v.watch_minutes / v.views : 0,
    size: Math.min(16, 4 + Math.log10(Math.max(1, v.views)) * 1.5),
  }));

  const tableRows = videos.slice(0, 10).map((v, i) => ({
    rank: i + 1,
    title: v.title,
    thumbnail: `https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`,
    href: `https://www.youtube.com/watch?v=${v.video_id}`,
    primary: v.views.toLocaleString(),
    secondary: `${v.watch_minutes.toLocaleString()} min`,
    tertiary: `+${v.subscribers_gained}`,
    primaryLabel: "Views",
    secondaryLabel: "Watch min",
    tertiaryLabel: "Subs",
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">YouTube Content Matrix</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Views × Avg Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matrixData.length > 0 ? (
              <ScatterMatrix
                data={matrixData}
                xLabel="log(Views)"
                yLabel="min/view"
                accentColor={ACCENT}
                quadrantLabels={["★ Hidden Gems", "★ Scale", "⌀ Filler", "⌀ Skip"]}
              />
            ) : (
              <p className="text-ink/40 text-sm">No video data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Pillar Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(
                  videos.reduce<Record<string, number>>((acc, v) => {
                    const p = classifyByKeywords(v.title, YT_PILLAR_KEYWORDS);
                    acc[p] = (acc[p] ?? 0) + v.views;
                    return acc;
                  }, {})
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([pillar, views]) => {
                    const max = Math.max(
                      ...Object.values(
                        videos.reduce<Record<string, number>>((acc, v) => {
                          const p = classifyByKeywords(v.title, YT_PILLAR_KEYWORDS);
                          acc[p] = (acc[p] ?? 0) + v.views;
                          return acc;
                        }, {})
                      )
                    );
                    return (
                      <div key={pillar}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-ink/70">{pillar}</span>
                          <span className="font-mono">{views.toLocaleString()} views</span>
                        </div>
                        <div className="h-4 bg-ink/5 rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${(views / max) * 100}%`,
                              backgroundColor: ACCENT,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-ink/40 text-sm">No data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-ink/10 bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
            Top Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tableRows.length > 0 ? (
            <PostTable rows={tableRows} accentColor={ACCENT} />
          ) : (
            <p className="text-ink/40 text-sm">No video data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
