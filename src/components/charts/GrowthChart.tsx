"use client";

import { useState, useEffect, useMemo } from "react";
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
  rjValue?: number;
  wsValue?: number;
  totalPortfolioValue: number;
  bookValue: number;
  gainLoss: number;
  externalAssets?: number;
  combinedValue?: number;
}

interface GrowthChartProps {
  data: DataPoint[];
  showPortfolioLines?: boolean;
  hasRJ?: boolean;
  hasWS?: boolean;
}

type TimeRange = "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

const TIME_RANGES: { value: TimeRange; label: string; months: number }[] = [
  { value: "3M", label: "3 Months", months: 3 },
  { value: "6M", label: "6 Months", months: 6 },
  { value: "1Y", label: "1 Year", months: 12 },
  { value: "3Y", label: "3 Years", months: 36 },
  { value: "5Y", label: "5 Years", months: 60 },
  { value: "ALL", label: "All Time", months: 0 },
];

const LINE_NAMES: Record<string, string> = {
  rjValue: "RJ Portfolio",
  wsValue: "WS Portfolio",
  totalPortfolioValue: "Total Portfolio",
  bookValue: "Book Value",
  gainLoss: "Gain/Loss",
  externalAssets: "External Assets",
  combinedValue: "Total Net Worth",
};

export function GrowthChart({
  data,
  showPortfolioLines = true,
  hasRJ = false,
  hasWS = false,
}: GrowthChartProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("ALL");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (selectedRange === "ALL") return data;

    const rangeConfig = TIME_RANGES.find((r) => r.value === selectedRange);
    if (!rangeConfig || rangeConfig.months === 0) return data;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - rangeConfig.months);

    return data.filter((point) => new Date(point.date) >= cutoffDate);
  }, [data, selectedRange]);

  const formattedData = filteredData.map((point) => ({
    ...point,
    dateLabel: formatDate(point.date),
  }));

  // Check if we have external assets data
  const hasExternalAssets = filteredData.some((point) => (point.externalAssets || 0) > 0);

  // Check if we have multiple portfolio sources
  const hasMultipleSources = hasRJ && hasWS;

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs">Time Range:</span>
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={`px-2 py-1 text-xs border transition-all ${
                selectedRange === range.value
                  ? "border-terminal-green bg-terminal-green/10 text-terminal-green"
                  : "border-terminal-green/30 text-text-muted hover:text-terminal-green hover:border-terminal-green/50"
              }`}
            >
              {range.value === "ALL" ? "All" : range.value}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className={`w-full ${isMobile ? "h-[320px]" : "h-[380px]"}`}>
        <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={isMobile
            ? { top: 10, right: 10, left: 0, bottom: 50 }
            : { top: 20, right: 30, left: 20, bottom: 20 }
          }
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
              maxWidth: isMobile ? "180px" : "300px",
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
            wrapperStyle={{
              zIndex: 100,
              ...(isMobile && { left: "10px", right: "auto" }),
            }}
            position={isMobile ? { x: 10, y: 50 } : undefined}
            labelStyle={{ color: "#00d4ff" }}
            itemStyle={{ color: "#00ff88" }}
            formatter={(value, name) => [
              formatCurrency(value as number),
              LINE_NAMES[name as string] || name,
            ]}
            itemSorter={(item) => -(item.value as number)}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
              paddingTop: isMobile ? "5px" : "10px",
              fontSize: isMobile ? "10px" : "12px",
            }}
            iconSize={isMobile ? 8 : 14}
            formatter={(value) => {
              const name = LINE_NAMES[value] || value;
              // Shorten names on mobile
              if (isMobile) {
                const shortNames: Record<string, string> = {
                  "RJ Portfolio": "RJ",
                  "WS Portfolio": "WS",
                  "Total Net Worth": "Net Worth",
                  "External Assets": "External",
                  "Book Value": "Book",
                };
                return shortNames[name] || name;
              }
              return name;
            }}
          />

          {/* Combined Value (Total Net Worth) - show if we have portfolio + external */}
          {showPortfolioLines && hasExternalAssets && (
            <Line
              type="monotone"
              dataKey="combinedValue"
              stroke="#ffcc00"
              strokeWidth={3}
              dot={{ fill: "#ffcc00", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#ffcc00" }}
            />
          )}

          {/* Raymond James Portfolio line */}
          {showPortfolioLines && hasRJ && (
            <Line
              type="monotone"
              dataKey="rjValue"
              stroke="#00ff88"
              strokeWidth={2}
              dot={{ fill: "#00ff88", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#00ff88" }}
            />
          )}

          {/* Wealthsimple Portfolio line */}
          {showPortfolioLines && hasWS && (
            <Line
              type="monotone"
              dataKey="wsValue"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={{ fill: "#00d4ff", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "#00d4ff" }}
            />
          )}

          {/* Book Value - only show if single source */}
          {showPortfolioLines && !hasMultipleSources && (
            <Line
              type="monotone"
              dataKey="bookValue"
              stroke="#888888"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "#888888", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: "#888888" }}
            />
          )}

          {/* External Assets */}
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
    </div>
  );
}
