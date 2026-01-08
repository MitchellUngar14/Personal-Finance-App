"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "@/components/layout/Terminal";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { formatCurrency } from "@/lib/utils";
import { exportChartsToPDF } from "@/lib/pdf-export";
import Link from "next/link";
import type { PortfolioSource } from "@/lib/validations";

// Data point from API (per source)
interface ApiGrowthDataPoint {
  date: string;
  totalValue: number;
  bookValue: number;
  gainLoss: number;
  externalAssets?: number;
  combinedValue?: number;
}

// Combined data point for chart (all sources merged)
interface CombinedGrowthDataPoint {
  date: string;
  rjValue?: number;
  wsValue?: number;
  totalPortfolioValue: number;
  bookValue: number;
  gainLoss: number;
  externalAssets?: number;
  combinedValue?: number;
}

interface AllocationData {
  category: string;
  value: number;
}

interface PerformanceData {
  symbol: string;
  holding: string;
  gainLossPercent: number;
  marketValue: number;
}

interface SourceAnalytics {
  source: PortfolioSource;
  label: string;
  shortLabel: string;
  summary: {
    totalMarketValue: number;
    totalBookValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  } | null;
  topPerformers: PerformanceData[];
  bottomPerformers: PerformanceData[];
  allocation: AllocationData[];
  growthData: ApiGrowthDataPoint[];
}

interface ExternalAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountType: string | null;
  latestValue: number | null;
}

const DEBT_TYPES = ["Mortgage", "Loan", "Credit Card"];

export default function ChartsPage() {
  const [sourceAnalytics, setSourceAnalytics] = useState<SourceAnalytics[]>([]);
  const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, get available sources
      const snapshotsResponse = await fetch("/api/snapshots");
      if (!snapshotsResponse.ok) throw new Error("Failed to fetch snapshots");

      const snapshotsData = await snapshotsResponse.json();
      const snapshots = snapshotsData.snapshots || [];
      const sources = Array.from(new Set(snapshots.map((s: { source: PortfolioSource }) => s.source))) as PortfolioSource[];

      // Fetch external accounts
      const externalResponse = await fetch("/api/external-accounts");
      const external = externalResponse.ok ? await externalResponse.json() : { accounts: [] };
      setExternalAccounts(external.accounts || []);

      // Fetch analytics and growth data for each source
      const analyticsPromises = sources.map(async (source) => {
        const [analyticsRes, growthRes] = await Promise.all([
          fetch(`/api/analytics?source=${source}`),
          fetch(`/api/analytics/growth?source=${source}`),
        ]);

        const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
        const growth = growthRes.ok ? await growthRes.json() : { dataPoints: [] };

        return {
          source,
          label: source === "raymond_james" ? "Raymond James" : "Wealthsimple",
          shortLabel: source === "raymond_james" ? "RJ" : "WS",
          summary: analytics?.summary || null,
          topPerformers: analytics?.topPerformers || [],
          bottomPerformers: analytics?.bottomPerformers || [],
          allocation: analytics?.allocation || [],
          growthData: growth.dataPoints || [],
        } as SourceAnalytics;
      });

      const allAnalytics = await Promise.all(analyticsPromises);
      setSourceAnalytics(allAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate external account totals
  const externalAssets = externalAccounts
    .filter(a => !DEBT_TYPES.includes(a.accountType || ""))
    .reduce((sum, a) => sum + (a.latestValue || 0), 0);
  const externalDebt = externalAccounts
    .filter(a => DEBT_TYPES.includes(a.accountType || ""))
    .reduce((sum, a) => sum + Math.abs(a.latestValue || 0), 0);

  // Calculate combined portfolio values
  const totalPortfolioValue = sourceAnalytics.reduce(
    (sum, s) => sum + (s.summary?.totalMarketValue || 0), 0
  );
  const totalBookValue = sourceAnalytics.reduce(
    (sum, s) => sum + (s.summary?.totalBookValue || 0), 0
  );
  const totalGainLoss = sourceAnalytics.reduce(
    (sum, s) => sum + (s.summary?.totalGainLoss || 0), 0
  );
  const totalGainLossPercent = totalBookValue > 0
    ? ((totalPortfolioValue - totalBookValue) / totalBookValue) * 100
    : 0;

  const totalNetWorth = totalPortfolioValue + externalAssets - externalDebt;

  // Group external accounts by bank for chart
  const externalByBank = externalAccounts.reduce((acc, account) => {
    const bankName = account.bankName;
    if (!acc[bankName]) {
      acc[bankName] = { assets: 0, debt: 0 };
    }
    if (DEBT_TYPES.includes(account.accountType || "")) {
      acc[bankName].debt += Math.abs(account.latestValue || 0);
    } else {
      acc[bankName].assets += account.latestValue || 0;
    }
    return acc;
  }, {} as Record<string, { assets: number; debt: number }>);

  // Create allocation data for external accounts (assets only)
  const externalAllocationData: AllocationData[] = Object.entries(externalByBank)
    .filter(([, values]) => values.assets > 0)
    .map(([bankName, values]) => ({
      category: bankName,
      value: values.assets,
    }));

  // Combine allocation data from all sources
  const combinedAllocation: AllocationData[] = [];
  const allocationMap = new Map<string, number>();

  for (const source of sourceAnalytics) {
    for (const item of source.allocation) {
      const current = allocationMap.get(item.category) || 0;
      allocationMap.set(item.category, current + item.value);
    }
  }

  for (const [category, value] of allocationMap) {
    combinedAllocation.push({ category, value });
  }

  // Combine top/bottom performers from all sources
  const allPerformers = sourceAnalytics.flatMap(s =>
    s.topPerformers.concat(s.bottomPerformers)
  );

  const combinedTopPerformers = [...allPerformers]
    .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
    .slice(0, 5);

  const combinedBottomPerformers = [...allPerformers]
    .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
    .slice(0, 5);

  // Combine growth data from all sources by date
  const growthByDate = new Map<string, CombinedGrowthDataPoint>();

  // Check which sources we have
  const hasRJ = sourceAnalytics.some(s => s.source === "raymond_james" && s.growthData.length > 0);
  const hasWS = sourceAnalytics.some(s => s.source === "wealthsimple" && s.growthData.length > 0);

  // First pass: collect all data points by date
  for (const source of sourceAnalytics) {
    for (const point of source.growthData) {
      const dateKey = point.date.split('T')[0]; // Normalize to date only
      const existing = growthByDate.get(dateKey);

      if (existing) {
        // Add to the appropriate source field
        if (source.source === "raymond_james") {
          existing.rjValue = (existing.rjValue || 0) + point.totalValue;
        } else if (source.source === "wealthsimple") {
          existing.wsValue = (existing.wsValue || 0) + point.totalValue;
        }
        existing.bookValue += point.bookValue;
        existing.gainLoss += point.gainLoss;
        existing.externalAssets = point.externalAssets || existing.externalAssets;
      } else {
        growthByDate.set(dateKey, {
          date: point.date,
          rjValue: source.source === "raymond_james" ? point.totalValue : undefined,
          wsValue: source.source === "wealthsimple" ? point.totalValue : undefined,
          totalPortfolioValue: 0, // Will calculate after carrying forward
          bookValue: point.bookValue,
          gainLoss: point.gainLoss,
          externalAssets: point.externalAssets,
          combinedValue: 0, // Will calculate after carrying forward
        });
      }
    }
  }

  // Sort by date
  const sortedData = Array.from(growthByDate.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Second pass: carry forward missing values and calculate totals
  let lastRJValue = 0;
  let lastWSValue = 0;
  let lastExternalAssets = 0;

  const combinedGrowthData = sortedData.map((point) => {
    // Carry forward values if not present for this date
    if (point.rjValue !== undefined) {
      lastRJValue = point.rjValue;
    }
    if (point.wsValue !== undefined) {
      lastWSValue = point.wsValue;
    }
    if (point.externalAssets !== undefined && point.externalAssets > 0) {
      lastExternalAssets = point.externalAssets;
    }

    // Use carried forward values
    const rjValue = point.rjValue ?? lastRJValue;
    const wsValue = point.wsValue ?? lastWSValue;
    const extAssets = point.externalAssets ?? lastExternalAssets;

    // Calculate totals
    const totalPortfolioValue = rjValue + wsValue;
    const combinedValue = totalPortfolioValue + extAssets;

    return {
      ...point,
      rjValue: hasRJ ? rjValue : undefined,
      wsValue: hasWS ? wsValue : undefined,
      totalPortfolioValue,
      externalAssets: extAssets,
      combinedValue,
    };
  });

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!chartsContainerRef.current) return;

    setIsExporting(true);
    try {
      await exportChartsToPDF(chartsContainerRef.current, {
        rjPortfolio: totalPortfolioValue,
        externalAssets,
        externalDebt,
        totalNetWorth,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> analytics
          </h1>
        </div>
        <div className="terminal-window p-12">
          <div className="flex justify-center">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> analytics
        </h1>
        <Terminal title="error">
          <div className="text-terminal-magenta text-center py-8">
            ERROR: {error}
          </div>
        </Terminal>
      </div>
    );
  }

  const hasPortfolioData = sourceAnalytics.some(s => s.summary !== null);
  const hasExternalData = externalAccounts.length > 0;
  const hasAnyData = hasPortfolioData || hasExternalData;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> analytics
        </h1>
        <Terminal title="charts">
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO DATA]</div>
            <p className="text-text-muted mb-6">
              Add external accounts or import portfolio data to view charts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/accounts" className="btn-terminal inline-block">
                [ADD ACCOUNTS]
              </Link>
              <Link href="/import" className="btn-terminal inline-block">
                [IMPORT CSV]
              </Link>
            </div>
          </div>
        </Terminal>
      </div>
    );
  }

  // Build net worth breakdown data
  const netWorthBreakdown: AllocationData[] = [];
  for (const source of sourceAnalytics) {
    if (source.summary && source.summary.totalMarketValue > 0) {
      netWorthBreakdown.push({
        category: source.label,
        value: source.summary.totalMarketValue,
      });
    }
  }
  for (const [bank, values] of Object.entries(externalByBank)) {
    if (values.assets > 0) {
      netWorthBreakdown.push({
        category: bank,
        value: values.assets,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> analytics
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Combined net worth breakdown and allocation analysis
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="btn-terminal text-xs sm:text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="loading-spinner w-4 h-4" />
              <span className="hidden sm:inline">EXPORTING...</span>
            </>
          ) : (
            <>
              <span className="text-terminal-cyan">[</span>
              EXPORT PDF
              <span className="text-terminal-cyan">]</span>
            </>
          )}
        </button>
      </div>

      <div ref={chartsContainerRef} className="space-y-6">

        {/* Net Worth Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Individual portfolio sources */}
          {sourceAnalytics.map((source) => (
            source.summary && (
              <div key={source.source} className="stat-card">
                <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                  {source.shortLabel} Portfolio
                </div>
                <div className={`text-lg sm:text-xl font-bold tabular-nums ${
                  source.source === "raymond_james" ? "text-terminal-green" : "text-terminal-cyan"
                }`}>
                  {formatCurrency(source.summary.totalMarketValue)}
                </div>
                <div className={`text-[10px] mt-1 ${
                  source.summary.totalGainLoss >= 0 ? "text-terminal-green" : "text-terminal-magenta"
                }`}>
                  {source.summary.totalGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(source.summary.totalGainLoss)} ({source.summary.totalGainLossPercent.toFixed(2)}%)
                </div>
              </div>
            )
          ))}

          {/* External Assets */}
          <div className="stat-card">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">External Assets</div>
            <div className="text-lg sm:text-xl text-terminal-cyan font-bold tabular-nums">
              {formatCurrency(externalAssets)}
            </div>
          </div>

          {/* External Debt */}
          <div className="stat-card">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">External Debt</div>
            <div className="text-lg sm:text-xl text-terminal-magenta font-bold tabular-nums">
              -{formatCurrency(externalDebt)}
            </div>
          </div>

          {/* Total Net Worth */}
          <div className="stat-card border-terminal-green/40">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">Total Net Worth</div>
            <div className={`text-lg sm:text-xl font-bold tabular-nums ${totalNetWorth >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
              {formatCurrency(totalNetWorth)}
            </div>
            {hasPortfolioData && (
              <div className={`text-[10px] mt-1 ${totalGainLoss >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
                Portfolio: {totalGainLoss >= 0 ? "+" : ""}{formatCurrency(totalGainLoss)} ({totalGainLossPercent.toFixed(2)}%)
              </div>
            )}
          </div>
        </div>

        {/* Growth Chart */}
        {combinedGrowthData.length >= 1 && (
          <Terminal title="combined_growth">
            <GrowthChart
              data={combinedGrowthData}
              showPortfolioLines={hasPortfolioData}
              hasRJ={hasRJ}
              hasWS={hasWS}
            />
          </Terminal>
        )}

        {/* Net Worth Breakdown - always show if we have multiple sources */}
        {netWorthBreakdown.length > 1 && (
          <Terminal title="net_worth_breakdown">
            <h3 className="text-terminal-cyan text-sm mb-4">Net Worth by Source</h3>
            <AllocationChart data={netWorthBreakdown} />
          </Terminal>
        )}

        {/* Allocation Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Combined Portfolio Allocation */}
          {combinedAllocation.length > 0 && (
            <Terminal title="portfolio_allocation">
              <h3 className="text-terminal-cyan text-sm mb-2">Combined Portfolio by Asset Type</h3>
              <AllocationChart data={combinedAllocation} />
            </Terminal>
          )}

          {/* External Accounts Allocation */}
          {externalAllocationData.length > 0 && (
            <Terminal title="external_allocation">
              <h3 className="text-terminal-cyan text-sm mb-2">External Accounts by Institution</h3>
              <AllocationChart data={externalAllocationData} />
            </Terminal>
          )}
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {combinedTopPerformers.length > 0 && (
            <Terminal title="top_performers">
              <PerformanceChart
                data={combinedTopPerformers}
                title="$ top --sort=gain --all-sources"
              />
            </Terminal>
          )}

          {combinedBottomPerformers.length > 0 && (
            <Terminal title="bottom_performers">
              <PerformanceChart
                data={combinedBottomPerformers}
                title="$ bottom --sort=gain --all-sources"
              />
            </Terminal>
          )}
        </div>

        {/* Info messages */}
        {combinedGrowthData.length === 1 && (
          <div className="text-text-muted text-sm text-center p-4 border border-terminal-green/20 rounded">
            Import more snapshots to see growth trends over time.
          </div>
        )}

        {combinedGrowthData.length === 0 && hasExternalData && (
          <div className="text-text-muted text-sm text-center p-4 border border-terminal-green/20 rounded">
            Update your account values periodically to track growth over time.
          </div>
        )}
      </div>
    </div>
  );
}
