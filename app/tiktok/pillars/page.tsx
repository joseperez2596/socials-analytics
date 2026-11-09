import Link from "next/link";
import { PillarCard } from "@/components/reports/pillar-card";
import { getTiktokVideos } from "@/lib/queries/tiktok";
import { classifyByKeywords } from "@/lib/pillars/classify";
import { getPillars } from "@/lib/pillars/store";

const ACCENT = "#FF0050";

export default async function TiktokPillarsPage() {
  const PILLAR_KEYWORDS = await getPillars("tiktok");
  const videos = await getTiktokVideos(30).catch(() => []);

  type PillarStats = {
    name: string;
    postCount: number;
    totalViews: number;
    totalEr: number;
  };

  const pillars = videos.reduce<Record<string, PillarStats>>((acc, v) => {
    const p = classifyByKeywords(v.title, PILLAR_KEYWORDS);
    if (!acc[p]) acc[p] = { name: p, postCount: 0, totalViews: 0, totalEr: 0 };
    acc[p].postCount++;
    acc[p].totalViews += v.view_count;
    acc[p].totalEr += v.engagement_rate;
    return acc;
  }, {});

  const sorted = Object.values(pillars).sort((a, b) => b.totalViews - a.totalViews);
  const total = sorted.reduce((s, p) => s + p.totalViews, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold">TikTok Pillars</h2>
        <Link href="/pillars?platform=tiktok" className="font-mono text-xs text-ink/50 hover:text-ink underline underline-offset-4">
          Edit keywords
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="text-ink/40">No video data available.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p, i) => (
            <PillarCard
              key={p.name}
              name={p.name}
              postCount={p.postCount}
              totalViews={p.totalViews}
              avgEngagement={p.postCount > 0 ? p.totalEr / p.postCount : undefined}
              sharePct={total > 0 ? (p.totalViews / total) * 100 : 0}
              isFeatured={i === 0}
              accentColor={ACCENT}
            />
          ))}
        </div>
      )}
    </div>
  );
}
