"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatPercent, formatCurrency } from "@/lib/utils";

interface PerformanceData {
  symbol: string;
  holding: string;
  gainLossPercent: number;
  marketValue: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title: string;
}

export function PerformanceChart({ data, title }: PerformanceChartProps) {
  return (
    <div>
      <h3 className="text-terminal-cyan text-sm mb-4">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0, 255, 136, 0.1)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              stroke="#6b7280"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              stroke="#6b7280"
              tick={{ fill: "#00d4ff", fontSize: 12 }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f0f14",
                border: "1px solid rgba(0, 255, 136, 0.3)",
                borderRadius: "4px",
              }}
              formatter={(value: number, name: string, props: { payload: PerformanceData }) => [
                `${formatPercent(value)} (${formatCurrency(props.payload.marketValue)})`,
                props.payload.holding,
              ]}
              labelFormatter={(label) => `Symbol: ${label}`}
            />
            <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="3 3" />
            <Bar dataKey="gainLossPercent" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.gainLossPercent >= 0 ? "#00ff88" : "#ff0080"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
