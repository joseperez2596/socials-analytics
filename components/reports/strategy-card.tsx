import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Tag = "BIG BET" | "FIX" | "GROW" | "WATCH";
type Priority = "HIGH" | "MED" | "LOW";

const TAG_COLORS: Record<Tag, string> = {
  "BIG BET": "#FF0000",
  FIX: "#9c2820",
  GROW: "#2f6b3a",
  WATCH: "#b07d3a",
};

interface StrategyAction {
  text: string;
  priority: Priority;
}

interface StrategyCardProps {
  tag: Tag;
  title: string;
  description: string;
  actions: StrategyAction[];
  isFeatured?: boolean;
  accentColor?: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  HIGH: "#9c2820",
  MED: "#b07d3a",
  LOW: "#1a1814",
};

export function StrategyCard({
  tag,
  title,
  description,
  actions,
  isFeatured,
  accentColor,
}: StrategyCardProps) {
  return (
    <Card
      className="border-ink/10"
      style={
        isFeatured
          ? { backgroundColor: accentColor, borderColor: "transparent" }
          : { backgroundColor: "#f5f2eb" }
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded"
            style={{
              backgroundColor: isFeatured ? "rgba(255,255,255,0.2)" : TAG_COLORS[tag] + "20",
              color: isFeatured ? "#fff" : TAG_COLORS[tag],
            }}
          >
            {tag}
          </span>
        </div>
        <CardTitle
          className="text-base"
          style={{ color: isFeatured ? "#fff" : "#1a1814" }}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className="text-sm mb-3"
          style={{ color: isFeatured ? "rgba(255,255,255,0.7)" : "#1a1814", opacity: isFeatured ? 1 : 0.6 }}
        >
          {description}
        </p>
        <div className="space-y-1.5">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="text-xs font-mono font-bold shrink-0 mt-0.5"
                style={{
                  color: isFeatured ? "rgba(255,255,255,0.5)" : PRIORITY_COLORS[action.priority],
                }}
              >
                {String(i + 1).padStart(2, "0")} {action.priority}
              </span>
              <p
                className="text-xs"
                style={{ color: isFeatured ? "rgba(255,255,255,0.8)" : "#1a1814" }}
              >
                {action.text}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
