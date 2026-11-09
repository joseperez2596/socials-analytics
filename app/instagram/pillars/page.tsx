import Link from "next/link";
import { PillarCard } from "@/components/reports/pillar-card";
import { getIgMedia } from "@/lib/queries/instagram";
import { classifyByKeywords } from "@/lib/pillars/classify";
import { getPillars } from "@/lib/pillars/store";

const ACCENT = "#E1306C";

export default async function InstagramPillarsPage() {
  const PILLAR_KEYWORDS = await getPillars("instagram");
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
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold">Instagram Pillars</h2>
        <Link href="/pillars?platform=instagram" className="font-mono text-xs text-ink/50 hover:text-ink underline underline-offset-4">
          Edit keywords
        </Link>
      </div>
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
