import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: number;
  accentColor?: string;
}

function formatDelta(delta: number) {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toLocaleString()}`;
}

export function KpiCard({ title, value, subtitle, delta, accentColor }: KpiCardProps) {
  return (
    <Card className="bg-paper border-ink/10">
      <CardHeader className="pb-2">
        <CardTitle
          className="text-xs font-mono uppercase tracking-widest text-ink/50"
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className="text-4xl font-bold tabular-nums"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-xs text-ink/50 mt-1">{subtitle}</p>
        )}
        {delta !== undefined && (
          <p
            className="text-sm font-medium mt-1"
            style={{ color: delta >= 0 ? "#2f6b3a" : "#9c2820" }}
          >
            {formatDelta(delta)} vs prev period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
