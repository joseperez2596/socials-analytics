import { StrategyCard } from "@/components/reports/strategy-card";
import { getStrategyContent } from "@/lib/queries/strategy";

const ACCENT = "#1877F2";

export default async function FacebookStrategyPage() {
  const stored = await getStrategyContent("facebook").catch(() => null);
  const strategies = stored?.cards ?? [];
  const generatedAt = stored?.generated_at;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Facebook Strategy</h2>
        {generatedAt && (
          <span className="font-mono text-xs text-ink/40">
            generated {generatedAt.slice(0, 10)}
          </span>
        )}
      </div>
      {strategies.length === 0 && (
        <p className="font-mono text-sm text-ink/40">
          No strategy generated yet. Cards appear here once a row exists in the strategy_content table.
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {strategies.map((s, i) => (
          <StrategyCard key={i} {...s} accentColor={ACCENT} />
        ))}
      </div>
    </div>
  );
}
