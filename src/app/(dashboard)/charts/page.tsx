"use client";

import { useState, useEffect } from "react";
import { Terminal } from "@/components/layout/Terminal";
import { GrowthChart } from "@/components/charts/GrowthChart";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import Link from "next/link";

interface GrowthDataPoint {
  date: string;
  totalValue: number;
  bookValue: number;
  gainLoss: number;
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

export default function ChartsPage() {
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch growth data and analytics in parallel
      const [growthResponse, analyticsResponse] = await Promise.all([
        fetch("/api/analytics/growth"),
        fetch("/api/analytics"),
      ]);

      if (!growthResponse.ok || !analyticsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const growth = await growthResponse.json();
      const analytics = await analyticsResponse.json();

      setGrowthData(growth.dataPoints || []);
      setAnalyticsData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-terminal-green">
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
        <h1 className="text-2xl text-terminal-green">
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
        <h1 className="text-2xl text-terminal-green">
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
          <h1 className="text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> analytics
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Portfolio performance and allocation analysis
          </p>
        </div>
      </div>

      {/* Growth Chart */}
      {growthData.length > 1 && (
        <Terminal title="portfolio_growth">
          <GrowthChart data={growthData} />
        </Terminal>
      )}

      {/* Allocation Chart */}
      {analyticsData?.allocation && analyticsData.allocation.length > 0 && (
        <Terminal title="asset_allocation">
          <AllocationChart data={analyticsData.allocation} />
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
  );
}
