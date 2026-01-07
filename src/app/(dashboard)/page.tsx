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

async function DashboardContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get latest snapshot
  const latestSnapshot = await db.query.snapshots.findFirst({
    where: eq(snapshots.userId, session.user.id),
    orderBy: [desc(snapshots.snapshotDate)],
  });

  if (!latestSnapshot) {
    return (
      <div className="space-y-6">
        <PortfolioSummaryEmpty />
        <Terminal title="dashboard" className="mt-8">
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

  // Get portfolio metrics
  const metrics = await db.query.portfolioMetrics.findFirst({
    where: eq(portfolioMetrics.snapshotId, latestSnapshot.id),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> portfolio_status
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Snapshot: {latestSnapshot.snapshotDate?.toLocaleDateString()}
          </p>
        </div>
        <Link
          href="/import"
          className="btn-terminal text-sm"
        >
          [+ IMPORT]
        </Link>
      </div>

      {/* Portfolio Summary Cards */}
      <PortfolioSummary
        totalMarketValue={metrics?.totalMarketValue ? parseFloat(metrics.totalMarketValue) : null}
        totalBookValue={metrics?.totalBookValue ? parseFloat(metrics.totalBookValue) : null}
        totalGainLoss={metrics?.totalGainLoss ? parseFloat(metrics.totalGainLoss) : null}
        totalGainLossPercent={metrics?.totalGainLossPercent ? parseFloat(metrics.totalGainLossPercent) : null}
        holdingsCount={metrics?.holdingsCount || null}
        accountsCount={metrics?.accountsCount || null}
      />

      {/* Holdings Table */}
      <HoldingsTableWrapper snapshotId={latestSnapshot.id} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
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
      <DashboardContent />
    </Suspense>
  );
}
