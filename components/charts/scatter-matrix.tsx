"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface MatrixPoint {
  x: number;
  y: number;
  label: string;
  size?: number;
}

interface ScatterMatrixProps {
  data: MatrixPoint[];
  xLabel: string;
  yLabel: string;
  accentColor?: string;
  quadrantLabels?: [string, string, string, string]; // TL, TR, BL, BR
}

export function ScatterMatrix({
  data,
  xLabel,
  yLabel,
  accentColor = "#1a1814",
  quadrantLabels = ["★ Hidden Gems", "★ Scale", "⌀ Filler", "⌀ Skip"],
}: ScatterMatrixProps) {
  const xValues = data.map((d) => d.x);
  const yValues = data.map((d) => d.y);
  const xMid = (Math.min(...xValues) + Math.max(...xValues)) / 2;
  const yMid = (Math.min(...yValues) + Math.max(...yValues)) / 2;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 10, fill: "#1a1814", opacity: 0.4 }}
            axisLine={false}
            tickLine={false}
            label={{ value: xLabel, position: "insideBottom", offset: -10, fontSize: 10, fill: "#1a1814", opacity: 0.4 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fontSize: 10, fill: "#1a1814", opacity: 0.4 }}
            axisLine={false}
            tickLine={false}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 10, fill: "#1a1814", opacity: 0.4 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "rgba(26,24,20,0.2)" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as MatrixPoint;
              return (
                <div className="bg-paper border border-ink/10 rounded p-2 text-xs max-w-48">
                  <p className="font-medium text-ink truncate">{d.label}</p>
                  <p className="text-ink/50">{xLabel}: {d.x.toFixed(2)}</p>
                  <p className="text-ink/50">{yLabel}: {d.y.toFixed(2)}</p>
                </div>
              );
            }}
          />
          <ReferenceLine x={xMid} stroke="rgba(26,24,20,0.15)" strokeDasharray="4 4" />
          <ReferenceLine y={yMid} stroke="rgba(26,24,20,0.15)" strokeDasharray="4 4" />
          <Scatter data={data} fill={accentColor}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={accentColor}
                opacity={0.7}
                r={(d.size ?? 8)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {[quadrantLabels[0], quadrantLabels[1], quadrantLabels[2], quadrantLabels[3]].map(
          (label, i) => (
            <div
              key={i}
              className="text-xs text-center py-1 rounded"
              style={{
                backgroundColor: i < 2 ? `${accentColor}15` : "rgba(26,24,20,0.05)",
                color: i < 2 ? accentColor : "#1a1814",
                opacity: i < 2 ? 1 : 0.5,
              }}
            >
              {label}
            </div>
          )
        )}
      </div>
    </div>
  );
}
