import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, portfolioMetrics } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortfolioSummary, PortfolioSummaryEmpty } from "@/components/dashboard/PortfolioSummary";
import { HoldingsTableWrapper } from "@/components/dashboard/HoldingsTableWrapper";
import { Terminal } from "@/components/layout/Terminal";
import Link from "next/link";
import { PortfolioTabs } from "@/components/dashboard/PortfolioTabs";

async function PortfolioContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get all snapshots grouped by source
  const allSnapshots = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.userId, session.user.id))
    .orderBy(desc(snapshots.snapshotDate));

  // Get unique sources and their latest snapshots
  const sourceMap = allSnapshots.reduce((acc, snap) => {
    if (!acc[snap.source]) {
      acc[snap.source] = snap;
    }
    return acc;
  }, {} as Record<string, typeof allSnapshots[0]>);

  const sources = Object.keys(sourceMap) as Array<"raymond_james" | "wealthsimple">;

  if (sources.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl text-terminal-green">
              <span className="text-terminal-cyan">$</span> portfolio
            </h1>
            <p className="text-text-muted text-xs sm:text-sm mt-1">
              Stock portfolio holdings
            </p>
          </div>
        </div>
        <PortfolioSummaryEmpty />
        <Terminal title="portfolio" className="mt-8">
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO DATA]</div>
            <p className="text-text-muted mb-6">
              No portfolio data found. Import a CSV to get started.
            </p>
            <Link
              href="/import"
              className="btn-terminal inline-block"
            >
              [IMPORT CSV]
            </Link>
          </div>
        </Terminal>
      </div>
    );
  }

  // Get metrics for each source
  const portfolioDataPromises = sources.map(async (source) => {
    const snapshot = sourceMap[source];
    const metrics = await db.query.portfolioMetrics.findFirst({
      where: eq(portfolioMetrics.snapshotId, snapshot.id),
    });
    return {
      source,
      label: source === "raymond_james" ? "Raymond James" : "Wealthsimple",
      shortLabel: source === "raymond_james" ? "RJ" : "WS",
      // Only pass serializable data to client component
      snapshot: {
        id: snapshot.id,
      },
      metrics: metrics ? {
        totalMarketValue: metrics.totalMarketValue,
        totalBookValue: metrics.totalBookValue,
        totalGainLoss: metrics.totalGainLoss,
        totalGainLossPercent: metrics.totalGainLossPercent,
        holdingsCount: metrics.holdingsCount,
        accountsCount: metrics.accountsCount,
      } : null,
    };
  });

  const portfolioData = await Promise.all(portfolioDataPromises);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> portfolio
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Stock portfolio holdings
          </p>
        </div>
        <Link
          href="/import"
          className="btn-terminal text-xs sm:text-sm self-start sm:self-auto"
        >
          [+ IMPORT]
        </Link>
      </div>

      {/* Portfolio Tabs - client component to handle source selection */}
      <PortfolioTabs portfolioData={portfolioData} />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl text-terminal-green">
                <span className="text-terminal-cyan">$</span> portfolio
              </h1>
              <p className="text-text-muted text-xs sm:text-sm mt-1">
                Stock portfolio holdings
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 w-24 bg-terminal-green/20 rounded" />
                <div className="h-8 w-32 bg-terminal-green/20 rounded mt-3" />
              </div>
            ))}
          </div>
          <div className="terminal-window p-8">
            <div className="flex justify-center">
              <div className="loading-spinner" />
            </div>
          </div>
        </div>
      }
    >
      <PortfolioContent />
    </Suspense>
  );
}
