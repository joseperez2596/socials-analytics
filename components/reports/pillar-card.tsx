import { Card, CardContent } from "@/components/ui/card";

interface PillarCardProps {
  name: string;
  postCount: number;
  totalViews: number;
  avgEngagement?: number;
  sharePct: number;
  isFeatured?: boolean;
  accentColor?: string;
}

export function PillarCard({
  name,
  postCount,
  totalViews,
  avgEngagement,
  sharePct,
  isFeatured,
  accentColor,
}: PillarCardProps) {
  return (
    <Card
      className="border-ink/10"
      style={
        isFeatured
          ? { backgroundColor: accentColor, borderColor: "transparent" }
          : { backgroundColor: "#f5f2eb" }
      }
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <h3
            className="text-sm font-bold"
            style={{ color: isFeatured ? "#fff" : "#1a1814" }}
          >
            {name}
          </h3>
          <span
            className="text-xs font-mono"
            style={{ color: isFeatured ? "rgba(255,255,255,0.7)" : "#1a1814", opacity: isFeatured ? 1 : 0.4 }}
          >
            {sharePct.toFixed(1)}%
          </span>
        </div>
        <div
          className="text-2xl font-bold tabular-nums mb-0.5"
          style={{ color: isFeatured ? "#fff" : accentColor ?? "#1a1814" }}
        >
          {totalViews.toLocaleString()}
        </div>
        <p
          className="text-xs mb-1"
          style={{ color: isFeatured ? "rgba(255,255,255,0.5)" : "#1a1814", opacity: isFeatured ? 1 : 0.35 }}
        >
          views
        </p>
        <p
          className="text-xs"
          style={{ color: isFeatured ? "rgba(255,255,255,0.6)" : "#1a1814", opacity: isFeatured ? 1 : 0.5 }}
        >
          {postCount} posts
          {avgEngagement !== undefined && ` · ${avgEngagement.toFixed(1)}% ER`}
        </p>
        <div className="mt-3 h-1 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, sharePct)}%`,
              backgroundColor: isFeatured ? "rgba(255,255,255,0.5)" : accentColor ?? "#1a1814",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
