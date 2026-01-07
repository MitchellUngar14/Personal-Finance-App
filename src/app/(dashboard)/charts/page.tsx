"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "@/components/layout/Terminal";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { formatCurrency } from "@/lib/utils";
import { exportChartsToPDF } from "@/lib/pdf-export";
import Link from "next/link";

interface GrowthDataPoint {
  date: string;
  totalValue: number;
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

interface AnalyticsData {
  summary: {
    totalMarketValue: number;
    totalBookValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  } | null;
  topPerformers: PerformanceData[];
  bottomPerformers: PerformanceData[];
  allocation: AllocationData[];
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
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch growth data, analytics, and external accounts in parallel
      const [growthResponse, analyticsResponse, externalResponse] = await Promise.all([
        fetch("/api/analytics/growth"),
        fetch("/api/analytics"),
        fetch("/api/external-accounts"),
      ]);

      if (!growthResponse.ok || !analyticsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const growth = await growthResponse.json();
      const analytics = await analyticsResponse.json();
      const external = externalResponse.ok ? await externalResponse.json() : { accounts: [] };

      setGrowthData(growth.dataPoints || []);
      setAnalyticsData(analytics);
      setExternalAccounts(external.accounts || []);
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
  const externalNetWorth = externalAssets - externalDebt;

  // Calculate total net worth
  const rjPortfolioValue = analyticsData?.summary?.totalMarketValue || 0;
  const totalNetWorth = rjPortfolioValue + externalNetWorth;

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

  // Create allocation data for external accounts (assets only, no debt)
  const externalAllocationData: AllocationData[] = Object.entries(externalByBank)
    .filter(([, values]) => values.assets > 0)
    .map(([bankName, values]) => ({
      category: bankName,
      value: values.assets,
    }));

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!chartsContainerRef.current) return;

    setIsExporting(true);
    try {
      await exportChartsToPDF(chartsContainerRef.current, {
        rjPortfolio: rjPortfolioValue,
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

  if (growthData.length === 0 && !analyticsData?.summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> analytics
        </h1>
        <Terminal title="charts">
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO DATA]</div>
            <p className="text-text-muted mb-6">
              Import portfolio data to view charts and analytics.
            </p>
            <Link href="/import" className="btn-terminal inline-block">
              [IMPORT CSV]
            </Link>
          </div>
        </Terminal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> analytics
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Portfolio performance and allocation analysis
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
      {(analyticsData?.summary || externalAccounts.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat-card">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">RJ Portfolio</div>
            <div className="text-lg sm:text-xl text-terminal-green font-bold tabular-nums">
              {formatCurrency(rjPortfolioValue)}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">External Assets</div>
            <div className="text-lg sm:text-xl text-terminal-cyan font-bold tabular-nums">
              {formatCurrency(externalAssets)}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">External Debt</div>
            <div className="text-lg sm:text-xl text-terminal-magenta font-bold tabular-nums">
              {formatCurrency(externalDebt)}
            </div>
          </div>
          <div className="stat-card border-terminal-green/40">
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">Total Net Worth</div>
            <div className={`text-lg sm:text-xl font-bold tabular-nums ${totalNetWorth >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
              {formatCurrency(totalNetWorth)}
            </div>
          </div>
        </div>
      )}

      {/* Growth Chart */}
      {growthData.length > 1 && (
        <Terminal title="portfolio_growth">
          <GrowthChart data={growthData} />
        </Terminal>
      )}

      {/* Allocation Charts Side by Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RJ Portfolio Allocation */}
        {analyticsData?.allocation && analyticsData.allocation.length > 0 && (
          <Terminal title="rj_allocation">
            <h3 className="text-terminal-cyan text-sm mb-2">Raymond James Portfolio</h3>
            <AllocationChart data={analyticsData.allocation} />
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

      {/* Combined Net Worth Breakdown */}
      {(analyticsData?.summary || externalAccounts.length > 0) && (
        <Terminal title="net_worth_breakdown">
          <h3 className="text-terminal-cyan text-sm mb-4">Net Worth Breakdown</h3>
          <AllocationChart
            data={[
              { category: "Raymond James", value: rjPortfolioValue },
              ...Object.entries(externalByBank).map(([bank, values]) => ({
                category: bank,
                value: values.assets,
              })),
            ].filter(item => item.value > 0)}
          />
        </Terminal>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analyticsData?.topPerformers && analyticsData.topPerformers.length > 0 && (
          <Terminal title="top_performers">
            <PerformanceChart
              data={analyticsData.topPerformers}
              title="$ top --sort=gain"
            />
          </Terminal>
        )}

        {analyticsData?.bottomPerformers && analyticsData.bottomPerformers.length > 0 && (
          <Terminal title="bottom_performers">
            <PerformanceChart
              data={analyticsData.bottomPerformers}
              title="$ bottom --sort=gain"
            />
          </Terminal>
        )}
      </div>

      {/* Single snapshot message */}
      {growthData.length === 1 && (
        <div className="text-text-muted text-sm text-center p-4 border border-terminal-green/20 rounded">
          Import more snapshots to see growth trends over time.
        </div>
      )}
      </div>
    </div>
  );
}
