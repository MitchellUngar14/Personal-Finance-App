"use client";

import { useState } from "react";
import { PortfolioSummary } from "./PortfolioSummary";
import { HoldingsTableWrapper } from "./HoldingsTableWrapper";
import { cn } from "@/lib/utils";
import type { PortfolioSource } from "@/lib/validations";

interface SnapshotData {
  id: number;
}

interface MetricsData {
  totalMarketValue: string | null;
  totalBookValue: string | null;
  totalGainLoss: string | null;
  totalGainLossPercent: string | null;
  holdingsCount: number | null;
  accountsCount: number | null;
}

interface PortfolioData {
  source: PortfolioSource;
  label: string;
  shortLabel: string;
  snapshot: SnapshotData;
  metrics: MetricsData | null | undefined;
}

interface PortfolioTabsProps {
  portfolioData: PortfolioData[];
}

export function PortfolioTabs({ portfolioData }: PortfolioTabsProps) {
  const [selectedSource, setSelectedSource] = useState<PortfolioSource>(
    portfolioData[0]?.source || "raymond_james"
  );

  const selectedData = portfolioData.find((p) => p.source === selectedSource);

  if (!selectedData) {
    return null;
  }

  const showTabs = portfolioData.length > 1;

  return (
    <div className="space-y-6">
      {/* Source Tabs */}
      {showTabs && (
        <div className="flex gap-2">
          {portfolioData.map((portfolio) => (
            <button
              key={portfolio.source}
              onClick={() => setSelectedSource(portfolio.source)}
              className={cn(
                "px-4 py-2 text-sm border transition-all",
                selectedSource === portfolio.source
                  ? portfolio.source === "raymond_james"
                    ? "border-terminal-green bg-terminal-green/10 text-terminal-green"
                    : "border-terminal-cyan bg-terminal-cyan/10 text-terminal-cyan"
                  : portfolio.source === "raymond_james"
                    ? "border-terminal-green/30 text-text-muted hover:text-terminal-green hover:border-terminal-green/50"
                    : "border-terminal-cyan/30 text-text-muted hover:text-terminal-cyan hover:border-terminal-cyan/50"
              )}
            >
              {portfolio.label}
            </button>
          ))}
        </div>
      )}

      {/* Portfolio Summary */}
      <PortfolioSummary
        totalMarketValue={selectedData.metrics?.totalMarketValue ? parseFloat(selectedData.metrics.totalMarketValue) : 0}
        totalBookValue={selectedData.metrics?.totalBookValue ? parseFloat(selectedData.metrics.totalBookValue) : 0}
        totalGainLoss={selectedData.metrics?.totalGainLoss ? parseFloat(selectedData.metrics.totalGainLoss) : 0}
        totalGainLossPercent={selectedData.metrics?.totalGainLossPercent ? parseFloat(selectedData.metrics.totalGainLossPercent) : 0}
        holdingsCount={selectedData.metrics?.holdingsCount || 0}
        accountsCount={selectedData.metrics?.accountsCount || 0}
      />

      {/* Holdings Table */}
      <HoldingsTableWrapper snapshotId={selectedData.snapshot.id} />
    </div>
  );
}
