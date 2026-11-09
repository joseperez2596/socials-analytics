import { ScatterMatrix } from "@/components/charts/scatter-matrix";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getIgMedia, getIgSnapshot } from "@/lib/queries/instagram";
import { classifyByKeywords, getPillars } from "@/lib/pillar-classification";

const ACCENT = "#E1306C";

export default async function InstagramMatrixPage() {
  const PILLAR_KEYWORDS = getPillars("instagram");
  const [media, snap] = await Promise.all([
    getIgMedia(20).catch(() => []),
    getIgSnapshot().catch(() => null),
  ]);

  const matrixData = media.map((m) => {
    const interactions = m.like_count + m.comments_count;
    return {
      label: m.caption || m.media_type,
      x: m.like_count,
      y: m.comments_count > 0 ? m.comments_count : 0.5,
      size: Math.min(14, 4 + Math.log10(Math.max(1, interactions)) * 2),
    };
  });

  const tableRows = media.slice(0, 10).map((m, i) => ({
    rank: i + 1,
    title: m.caption || "(no caption)",
    type: m.media_type,
    thumbnail: m.thumbnail_url ?? undefined,
    href: m.permalink || undefined,
    primary: m.like_count.toLocaleString(),
    secondary: m.comments_count.toLocaleString(),
    primaryLabel: "Likes",
    secondaryLabel: "Comments",
  }));

  const pillarTotals = media.reduce<Record<string, number>>((acc, m) => {
    const p = classifyByKeywords(m.caption, PILLAR_KEYWORDS);
    acc[p] = (acc[p] ?? 0) + m.like_count + m.comments_count;
    return acc;
  }, {});

  const maxPillar = Math.max(...Object.values(pillarTotals));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Instagram Content Matrix</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Likes × Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {matrixData.length > 0 ? (
              <ScatterMatrix
                data={matrixData}
                xLabel="Likes"
                yLabel="Comments"
                accentColor={ACCENT}
                quadrantLabels={["★ Hidden Gems", "★ Scale", "⌀ Filler", "⌀ Skip"]}
              />
            ) : (
              <p className="text-ink/40 text-sm">No media data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Pillar Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(pillarTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([pillar, total]) => (
                  <div key={pillar}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink/70">{pillar}</span>
                      <span className="font-mono">{total.toLocaleString()}</span>
                    </div>
                    <div className="h-4 bg-ink/5 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${(total / maxPillar) * 100}%`,
                          backgroundColor: ACCENT,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {tableRows.length > 0 && (
        <Card className="border-ink/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
              Top Posts
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
