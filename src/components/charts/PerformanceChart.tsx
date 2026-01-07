"use client";

import { useState, useEffect } from "react";
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div>
      <h3 className="text-terminal-cyan text-sm mb-4">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={isMobile
              ? { top: 10, right: 10, left: 0, bottom: 10 }
              : { top: 10, right: 30, left: 80, bottom: 10 }
            }
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
              tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : 12 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              stroke="#6b7280"
              tick={{ fill: "#00d4ff", fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 50 : 70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f0f14",
                border: "1px solid rgba(0, 255, 136, 0.3)",
                borderRadius: "4px",
                color: "#e0e0e0",
                maxWidth: isMobile ? "200px" : "300px",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
              wrapperStyle={{
                zIndex: 100,
                ...(isMobile && { left: "10px", right: "10px" }),
              }}
              position={isMobile ? { x: 10, y: 0 } : undefined}
              labelStyle={{ color: "#00d4ff" }}
              itemStyle={{ color: "#00ff88" }}
              formatter={(value, _name, props) => {
                const payload = props.payload as PerformanceData;
                return [
                  `${formatPercent(value as number)} (${formatCurrency(payload.marketValue)})`,
                  payload.holding,
                ];
              }}
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
