"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  data: { label: string; value: number }[];
  accentColor?: string;
  formatValue?: (v: number) => string;
}

const PALETTE = [
  "#FF0000", "#E1306C", "#1877F2", "#FF0050",
  "#2f6b3a", "#b07d3a", "#8b5cf6", "#0ea5e9",
];

export function DonutChart({ data, accentColor, formatValue }: DonutChartProps) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={72}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? (accentColor ?? PALETTE[0]) : PALETTE[i] ?? "#ccc"}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [fmt(Number(v ?? 0)), ""]}
            contentStyle={{ background: "#f5f2eb", border: "1px solid rgba(26,24,20,0.1)", borderRadius: 6 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: i === 0 ? (accentColor ?? PALETTE[0]) : PALETTE[i] ?? "#ccc" }}
              />
              <span className="text-xs text-ink/70 truncate max-w-32">{d.label}</span>
            </div>
            <span className="text-xs font-mono text-ink/50 ml-2">
              {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
