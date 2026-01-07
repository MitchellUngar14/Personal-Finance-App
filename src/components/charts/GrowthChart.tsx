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
}

interface GrowthChartProps {
  data: DataPoint[];
}

export function GrowthChart({ data }: GrowthChartProps) {
  const formattedData = data.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date),
  }));

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
            }}
            labelStyle={{ color: "#00d4ff" }}
            formatter={(value, name) => [
              formatCurrency(value as number),
              name === "totalValue"
                ? "Market Value"
                : name === "bookValue"
                ? "Book Value"
                : "Gain/Loss",
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) =>
              value === "totalValue"
                ? "Market Value"
                : value === "bookValue"
                ? "Book Value"
                : "Gain/Loss"
            }
          />
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
