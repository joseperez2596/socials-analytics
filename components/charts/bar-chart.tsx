"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type FormatType = "K" | "€" | "h" | "min" | "pct" | "default";

interface BarChartProps {
  data: { label: string; value: number }[];
  accentColor?: string;
  horizontal?: boolean;
  format?: FormatType;
}

function makeFmt(format: FormatType) {
  return (v: number) => {
    switch (format) {
      case "K": return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.round(v));
      case "€": return `€${v.toFixed(2)}`;
      case "h": return `${Math.round(v)}h`;
      case "min": return `${Math.round(v)} min`;
      case "pct": return `${v.toFixed(1)}%`;
      default: return v.toLocaleString();
    }
  };
}

export function BarChart({
  data,
  accentColor = "#1a1814",
  horizontal = false,
  format = "default",
}: BarChartProps) {
  const fmt = makeFmt(format);

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#1a1814", opacity: 0.4 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 11, fill: "#1a1814" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [fmt(Number(v ?? 0)), ""]}
            contentStyle={{ background: "#f5f2eb", border: "1px solid rgba(26,24,20,0.1)", borderRadius: 6 }}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={accentColor}
                opacity={1 - i * (0.5 / Math.max(data.length, 1))}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RechartsBarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#1a1814", opacity: 0.4 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#1a1814", opacity: 0.4 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
          width={50}
        />
        <Tooltip
          formatter={(v) => [fmt(Number(v ?? 0)), ""]}
          contentStyle={{ background: "#f5f2eb", border: "1px solid rgba(26,24,20,0.1)", borderRadius: 6 }}
        />
        <Bar dataKey="value" fill={accentColor} radius={[3, 3, 0, 0]} opacity={0.85} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
