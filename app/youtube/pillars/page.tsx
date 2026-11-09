import { PillarCard } from "@/components/reports/pillar-card";
import { getYtVideos } from "@/lib/queries/youtube";
import { classifyByKeywords, getPillars } from "@/lib/pillar-classification";

const ACCENT = "#FF0000";

export default async function YoutubePillarsPage() {
  const YT_PILLAR_KEYWORDS = getPillars("youtube");
  const videos = await getYtVideos().catch(() => []);

  type PillarStats = {
    name: string;
    postCount: number;
    totalViews: number;
    totalWatchMin: number;
    totalSubs: number;
  };

  const pillars = videos.reduce<Record<string, PillarStats>>((acc, v) => {
    const p = classifyByKeywords(v.title, YT_PILLAR_KEYWORDS);
    if (!acc[p]) acc[p] = { name: p, postCount: 0, totalViews: 0, totalWatchMin: 0, totalSubs: 0 };
    acc[p].postCount++;
    acc[p].totalViews += v.views;
    acc[p].totalWatchMin += v.watch_minutes;
    acc[p].totalSubs += v.subscribers_gained;
    return acc;
  }, {});

  const sorted = Object.values(pillars).sort((a, b) => b.totalViews - a.totalViews);
  const totalViews = sorted.reduce((s, p) => s + p.totalViews, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">YouTube Pillars</h2>
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
              avgEngagement={
                p.totalViews > 0
                  ? (p.totalSubs / p.totalViews) * 100
                  : undefined
              }
              sharePct={totalViews > 0 ? (p.totalViews / totalViews) * 100 : 0}
              isFeatured={i === 0}
              accentColor={ACCENT}
            />
          ))}
        </div>
      )}
    </div>
  );
}
