import { PillarCard } from "@/components/reports/pillar-card";
import { getFbPosts } from "@/lib/queries/facebook";
import { classifyByKeywords, getPillars } from "@/lib/pillar-classification";

const ACCENT = "#1877F2";

export default async function FacebookPillarsPage() {
  const PILLAR_KEYWORDS = getPillars("facebook");
  const posts = await getFbPosts(30).catch(() => []);

  type PillarStats = { name: string; postCount: number; totalInteractions: number };
  const pillars = posts.reduce<Record<string, PillarStats>>((acc, p) => {
    const pillar = classifyByKeywords(p.message, PILLAR_KEYWORDS);
    if (!acc[pillar]) acc[pillar] = { name: pillar, postCount: 0, totalInteractions: 0 };
    acc[pillar].postCount++;
    acc[pillar].totalInteractions += p.reactions + p.comments + p.shares;
    return acc;
  }, {});

  const sorted = Object.values(pillars).sort((a, b) => b.totalInteractions - a.totalInteractions);
  const total = sorted.reduce((s, p) => s + p.totalInteractions, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Facebook Pillars</h2>
      {sorted.length === 0 ? (
        <p className="text-ink/40">No post data available.</p>
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
