"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface AllocationData {
  category: string;
  value: number;
}

interface AllocationChartProps {
  data: AllocationData[];
}

const COLORS = [
  "#00ff88", // terminal-green
  "#00d4ff", // terminal-cyan
  "#ff0080", // terminal-magenta
  "#ffcc00", // terminal-yellow
  "#ff3366", // terminal-red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f59e0b", // amber
];

export function AllocationChart({ data }: AllocationChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = data.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  return (
    <div className={isMobile ? "h-[550px] w-full" : "h-[400px] w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy={isMobile ? "40%" : "50%"}
            innerRadius={isMobile ? 100 : 80}
            outerRadius={isMobile ? 180 : 140}
            paddingAngle={2}
            dataKey="value"
            nameKey="category"
            label={isMobile ? false : ({ name, percent }) =>
              percent && percent > 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : ""
            }
            labelLine={isMobile ? false : { stroke: "#6b7280", strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#0a0a0f"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f0f14",
              border: "1px solid rgba(0, 255, 136, 0.3)",
              borderRadius: "4px",
              color: "#e0e0e0",
            }}
            labelStyle={{ color: "#00d4ff", fontWeight: "bold", marginBottom: "4px" }}
            itemStyle={{ color: "#00ff88" }}
            formatter={(value, name, props) => {
              const item = chartData.find(d => d.category === props.payload.category);
              return [
                `${formatCurrency(value as number)} (${item?.percentage.toFixed(1)}%)`,
                props.payload.category,
              ];
            }}
          />
          <Legend
            layout={isMobile ? "horizontal" : "vertical"}
            align={isMobile ? "center" : "right"}
            verticalAlign={isMobile ? "bottom" : "middle"}
            wrapperStyle={isMobile ? { paddingTop: "20px" } : { paddingLeft: "20px" }}
            formatter={(value) => {
              const item = chartData.find((d) => d.category === value);
              return (
                <span className="text-text-secondary text-xs sm:text-sm">
                  {value} ({item?.percentage.toFixed(1)}%)
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
