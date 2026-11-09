import { PillarCard } from "@/components/reports/pillar-card";
import { getIgMedia } from "@/lib/queries/instagram";
import { classifyByKeywords, getPillars } from "@/lib/pillar-classification";

const ACCENT = "#E1306C";

export default async function InstagramPillarsPage() {
  const PILLAR_KEYWORDS = getPillars("instagram");
  const media = await getIgMedia(30).catch(() => []);

  type PillarStats = { name: string; postCount: number; totalInteractions: number };
  const pillars = media.reduce<Record<string, PillarStats>>((acc, m) => {
    const p = classifyByKeywords(m.caption, PILLAR_KEYWORDS);
    if (!acc[p]) acc[p] = { name: p, postCount: 0, totalInteractions: 0 };
    acc[p].postCount++;
    acc[p].totalInteractions += m.like_count + m.comments_count;
    return acc;
  }, {});

  const sorted = Object.values(pillars).sort((a, b) => b.totalInteractions - a.totalInteractions);
  const total = sorted.reduce((s, p) => s + p.totalInteractions, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Instagram Pillars</h2>
      {sorted.length === 0 ? (
        <p className="text-ink/40">No media data available.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p, i) => (
            <PillarCard
              key={p.name}
              name={p.name}
              postCount={p.postCount}
              totalViews={p.totalInteractions}
              sharePct={total > 0 ? (p.totalInteractions / total) * 100 : 0}
              isFeatured={i === 0}
              accentColor={ACCENT}
            />
          ))}
        </div>
      )}
    </div>
  );
}
