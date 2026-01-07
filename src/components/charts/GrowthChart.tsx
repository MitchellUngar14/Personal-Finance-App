"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DataPoint {
  date: string;
  totalValue: number;
  bookValue: number;
  gainLoss: number;
  externalAssets?: number;
  combinedValue?: number;
}

interface GrowthChartProps {
  data: DataPoint[];
}

const LINE_NAMES: Record<string, string> = {
  totalValue: "RJ Portfolio",
  bookValue: "Book Value",
  gainLoss: "Gain/Loss",
  externalAssets: "External Assets",
  combinedValue: "Total Net Worth",
};

export function GrowthChart({ data }: GrowthChartProps) {
  const formattedData = data.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date),
  }));

  // Check if we have external assets data
  const hasExternalAssets = data.some((point) => (point.externalAssets || 0) > 0);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0, 255, 136, 0.1)"
          />
          <XAxis
            dataKey="dateLabel"
            stroke="#6b7280"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={{ stroke: "#6b7280" }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={{ stroke: "#6b7280" }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f0f14",
              border: "1px solid rgba(0, 255, 136, 0.3)",
              borderRadius: "4px",
              color: "#e0e0e0",
            }}
            labelStyle={{ color: "#00d4ff" }}
            itemStyle={{ color: "#00ff88" }}
            formatter={(value, name) => [
              formatCurrency(value as number),
              LINE_NAMES[name as string] || name,
            ]}
            itemSorter={(item) => -(item.value as number)}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => LINE_NAMES[value] || value}
          />
          {/* Combined Value (Total Net Worth) - only show if we have external assets */}
          {hasExternalAssets && (
            <Line
              type="monotone"
              dataKey="combinedValue"
              stroke="#ffcc00"
              strokeWidth={3}
              dot={{ fill: "#ffcc00", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#ffcc00" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="totalValue"
            stroke="#00ff88"
            strokeWidth={2}
            dot={{ fill: "#00ff88", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#00ff88" }}
          />
          <Line
            type="monotone"
            dataKey="bookValue"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={{ fill: "#00d4ff", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#00d4ff" }}
          />
          {/* External Assets - only show if we have data */}
          {hasExternalAssets && (
            <Line
              type="monotone"
              dataKey="externalAssets"
              stroke="#ff0080"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "#ff0080", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#ff0080" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
