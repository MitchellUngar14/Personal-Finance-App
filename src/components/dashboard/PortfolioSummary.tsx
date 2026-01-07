"use client";

import { StatCard } from "./StatCard";
import { formatCurrency } from "@/lib/utils";

interface PortfolioSummaryProps {
  totalMarketValue: number | null;
  totalBookValue: number | null;
  totalGainLoss: number | null;
  totalGainLossPercent: number | null;
  holdingsCount: number | null;
  accountsCount: number | null;
}

export function PortfolioSummary({
  totalMarketValue,
  totalBookValue,
  totalGainLoss,
  totalGainLossPercent,
  holdingsCount,
  accountsCount,
}: PortfolioSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Value"
        value={formatCurrency(totalMarketValue)}
        subValue={`Book: ${formatCurrency(totalBookValue)}`}
        icon="$"
      />
      <StatCard
        label="Total Gain/Loss"
        value={formatCurrency(totalGainLoss)}
        trend={totalGainLossPercent}
        icon={totalGainLoss && totalGainLoss >= 0 ? "^" : "v"}
      />
      <StatCard
        label="Holdings"
        value={holdingsCount?.toString() || "0"}
        subValue="Active positions"
        icon="#"
      />
      <StatCard
        label="Accounts"
        value={accountsCount?.toString() || "0"}
        subValue="Tracked accounts"
        icon="@"
      />
    </div>
  );
}

// Empty state when no data
export function PortfolioSummaryEmpty() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Value" value="$0.00" icon="$" />
      <StatCard label="Total Gain/Loss" value="$0.00" icon="~" />
      <StatCard label="Holdings" value="0" subValue="No data imported" icon="#" />
      <StatCard label="Accounts" value="0" subValue="Import CSV to begin" icon="@" />
    </div>
  );
}
