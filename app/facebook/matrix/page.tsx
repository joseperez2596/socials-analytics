import { ScatterMatrix } from "@/components/charts/scatter-matrix";
import { PostTable } from "@/components/reports/post-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFbPosts } from "@/lib/queries/facebook";

const ACCENT = "#1877F2";

export default async function FacebookMatrixPage() {
  const posts = await getFbPosts(20).catch(() => []);

  const matrixData = posts.map((p) => ({
    label: p.message || p.post_id,
    x: p.reactions,
    y: p.shares,
    size: Math.min(14, 4 + Math.log10(Math.max(1, p.reactions + p.shares)) * 2),
  }));

  const tableRows = posts.slice(0, 10).map((p, i) => ({
    rank: i + 1,
    title: p.message || "(no message)",
    primary: (p.reactions + p.comments + p.shares).toLocaleString(),
    secondary: p.shares.toLocaleString(),
    primaryLabel: "Total",
    secondaryLabel: "Shares",
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Facebook Content Matrix</h2>

      <Card className="border-ink/10 bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase tracking-widest text-ink/40">
            Reactions × Shares
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matrixData.length > 0 ? (
            <ScatterMatrix
              data={matrixData}
              xLabel="Reactions"
              yLabel="Shares"
              accentColor={ACCENT}
              quadrantLabels={["★ Hidden Gems", "★ Viral", "⌀ Low impact", "⌀ Skip"]}
            />
          ) : (
            <p className="text-ink/40 text-sm">No post data available.</p>
          )}
        </CardContent>
      </Card>

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
